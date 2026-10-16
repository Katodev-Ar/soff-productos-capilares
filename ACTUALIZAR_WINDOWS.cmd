@echo off & chcp 65001 >nul & py -3 -x "%~f0" & pause & exit /b
# -*- coding: utf-8 -*-
"""SOFF actualización sin rutas: descargar parche ZIP y doble clic (Python 3.9+).

Este archivo se distribuye como un único .cmd híbrido de Windows/Python.
Solo el primer renglón es código CMD y Python lo ignora mediante -x.
No accede a Internet, no ejecuta scripts dentro de ZIP y no despliega sistemas.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path


LEGACY_TOOLS_CMD_SHA256 = '44a994135bd6c69f5570482b27cb3343bdd34ac19940de38fdc48f9c8df933c8'
MAX_PATCH_ARCHIVE_SIZE = 120 * 1024 * 1024
PATCH_NAME = re.compile(r'(?i)^(?:SOFF[_-])?P\d{3}[A-Za-z0-9_\-(). ]*\.zip$')
MAX_CHAIN = 30


def log(msg=''):
    print(msg, flush=True)


def say_error(msg):
    log('\nERROR: ' + str(msg))


def locate_root(script):
    for possible in (script.parent, script.parent.parent):
        if (possible / '.soff' / 'state.json').is_file() and (possible / 'tools' / 'soff_patcher.py').is_file():
            return possible
    raise RuntimeError('Deja ACTUALIZAR_WINDOWS.cmd DENTRO de SOFF_ACTUALIZABLE (carpeta principal) y ejecutalo alli.')


def patch_folders(root):
    """Carpetas conocidas, búsqueda sin recursión y sin leer otros documentos."""
    paths = [root / '.soff' / 'parches', root / 'PARCHES', root, root.parent]
    home = Path.home()
    paths.extend([home / 'Downloads', home / 'Descargas', home / 'Desktop', home / 'Escritorio'])
    if sys.platform == 'win32':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                 r'Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders') as k:
                value, _ = winreg.QueryValueEx(k, '{374DE290-123F-4565-9164-39C4925E467B}')
                paths.insert(0, Path(os.path.expandvars(value)))
        except (ImportError, OSError):
            pass
    folders = []
    seen = set()
    for p in paths:
        try:
            resolved = p.resolve()
        except OSError:
            continue
        if resolved not in seen and resolved.is_dir():
            folders.append(resolved)
            seen.add(resolved)
    return folders


def discover_zips(root):
    result = []
    seen = set()
    for folder in patch_folders(root):
        try:
            files = list(folder.iterdir())
        except OSError:
            continue
        for p in files:
            if not PATCH_NAME.fullmatch(p.name) or not p.is_file():
                continue
            try:
                if p.stat().st_size > MAX_PATCH_ARCHIVE_SIZE:
                    log(f'AVISO: archivo demasiado grande, ignorado: {p.name}')
                    continue
                path = p.resolve()
                if path not in seen:
                    result.append(path)
                    seen.add(path)
            except OSError:
                pass
    return result


def json_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')
    fd, tmp = tempfile.mkstemp(prefix='.soff-setup-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(blob)
        os.replace(tmp, path)
    finally:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass


def register_launcher(script, root, core):
    """Solo alta del lanzador, o sustitución del CMD original conocido.

    Los demás archivos del proyecto siguen controlados. El antiguo usuario
    puede simplemente copiar este único archivo en la carpeta principal.
    """
    rel = script.relative_to(root).as_posix()
    if rel not in ('ACTUALIZAR_WINDOWS.cmd', 'tools/ACTUALIZAR_WINDOWS.cmd'):
        raise RuntimeError('Ubicación de actualizador no permitida.')
    state = core.load_state()
    own_hash = hashlib.sha256(script.read_bytes()).hexdigest()
    existing = state['files'].get(rel)
    if existing == own_hash:
        return
    allowed = (existing is None and rel == 'ACTUALIZAR_WINDOWS.cmd') or (
        existing == LEGACY_TOOLS_CMD_SHA256 and rel == 'tools/ACTUALIZAR_WINDOWS.cmd'
    )
    if not allowed:
        raise RuntimeError('El lanzador difiere de la versión registrada y no se puede autorregistrar. Contactar soporte.')
    # Registrar solamente el instalador, tras comprobar que todos los otros
    # archivos registrados siguen intactos. Ignorar parches ZIP conocidos.
    for oldrel, expected in state['files'].items():
        if oldrel == rel:
            continue
        target = core.safe_file(oldrel, for_patch=False)
        if not target.is_file() or core.sha256(target.read_bytes()) != expected:
            raise RuntimeError(f'Hay un archivo modificado antes de la actualización: {oldrel}. No se modificó el estado.')
    backup_dir = root / '.soff' / 'setup_backups'
    backup_dir.mkdir(parents=True, exist_ok=True)
    old = root / '.soff' / 'state.json'
    stamp = dt.datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    (backup_dir / f'estado_anterior_{stamp}.json').write_bytes(old.read_bytes())
    state['files'][rel] = own_hash
    json_atomic(old, state)
    log('Gestor de un clic preparado. Se respaldó el estado anterior.')


def check_integrity(root, core, known_zips):
    state = core.load_state()
    issues = core.verify(state)
    allowed_zips = set()
    for path in known_zips:
        try:
            allowed_zips.add(path.relative_to(root).as_posix())
        except ValueError:
            pass
    actual_issues = []
    for issue in issues:
        if issue.startswith('NO REGISTRADO: ') and issue[len('NO REGISTRADO: '):] in allowed_zips:
            continue
        actual_issues.append(issue)
    if actual_issues:
        raise RuntimeError('Hay archivos distintos de los esperados. No se aplicó nada:\n' + '\n'.join(actual_issues[:15]))


def load_candidates(root, core):
    found = discover_zips(root)
    manifests = []
    invalid = []
    for p in found:
        try:
            m, _ = core.read_patch(p)
            manifests.append((p, m, hashlib.sha256(p.read_bytes()).hexdigest()))
        except Exception as exc:
            invalid.append((p.name, str(exc)))
    return found, manifests, invalid


def auto_update(root, core):
    log('=' * 56)
    log('SOFF - ACTUALIZADOR AUTOMATICO')
    log('=' * 56)
    log('No tenés que seleccionar archivos ni escribir rutas.')
    log('Buscando parches en Descargas y en la carpeta del sistema...\n')

    found, candidates, invalid = load_candidates(root, core)
    for filename, why in invalid:
        log(f'AVISO: ZIP de parche inválido ignorado: {filename} ({why})')

    state = core.load_state()
    log(f'Version actual: {state["version"]}')
    check_integrity(root, core, [c[0] for c in candidates])

    if not candidates:
        log('\nNo encontré parches de SOFF válidos.')
        log('Descargá el ZIP del parche y dejalo en Descargas, sin descomprimirlo.')
        log('Volvé a abrir ACTUALIZAR_WINDOWS.cmd.')
        return 0

    applied = 0
    for _ in range(MAX_CHAIN):
        state = core.load_state()
        version = state['version']
        possible = [(p, m, h) for p, m, h in candidates if m['from_version'] == version
                    and m['id'] not in [x['id'] for x in state.get('applied', [])]]
        if not possible:
            break
        by_target = {(m['id'], m['to_version'], h) for p, m, h in possible}
        if len(by_target) > 1:
            log('\nSe encontraron parches distintos para la misma version:')
            for p, m, h in possible:
                log(f' - {p.name} ({m["id"]}: {m["from_version"]} -> {m["to_version"]})')
            raise RuntimeError('Hay actualizaciones alternativas. Por seguridad, no elegiré una automáticamente.')
        path, manifest, _ = possible[0]
        log(f'\nInstalando {manifest["id"]}: {version} -> {manifest["to_version"]}')
        core.apply_patch(path, dry=True)
        core.apply_patch(path, dry=False)
        applied += 1
        check_integrity(root, core, [c[0] for c in candidates])
    else:
        raise RuntimeError('Demasiados parches consecutivos. Revisar el historial.')

    if applied:
        log('\n' + '=' * 56)
        log(f'ACTUALIZACION COMPLETA: {applied} parche(s) instalado(s).')
        log(f'Nueva version: {core.load_state()["version"]}')
        log('Los respaldos de codigo quedaron en .soff/backups.')
        log('IMPORTANTE: esto NO actualiza Vercel, Supabase ni datos reales.')
        log('Leé las indicaciones manuales de los parches instalados.')
    else:
        log('\nYa tenés todos los parches encontrados instalados, o son de otra versión.')
        log(f'Version actual: {core.load_state()["version"]}')
    return 0


def main():
    script = Path(__file__).resolve()
    try:
        root = locate_root(script)
        sys.path.insert(0, str(root / 'tools'))
        import soff_patcher as core
        register_launcher(script, root, core)
        return auto_update(root, core)
    except Exception as exc:
        say_error(exc)
        log('No se continuó con más parches. Conservá los respaldos si había cambios previos.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
