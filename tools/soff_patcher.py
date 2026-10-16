#!/usr/bin/env python3
"""SOFF patch manager v1.0.0. Python 3.9+, standard library only.

Offline patch application for tracked project files. Does not deploy to Vercel,
run SQL migrations, access production credentials, or verify the patch author's identity.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
CONTROL = ROOT / '.soff'
STATE_FILE = CONTROL / 'state.json'
SCHEMA = 1
MAX_PATCH_FILES = 2000
MAX_PATCH_BYTES = 120 * 1024 * 1024
SKIP_PARTS = {'.git', '.next', '.vercel', 'node_modules', '__pycache__', '.turbo'}
SKIP_FILES = {'.DS_Store', 'next-env.d.ts'}


class PatchError(Exception):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            raise ValueError('No es un objeto JSON')
        return data
    except (ValueError, OSError) as exc:
        raise PatchError(f'No se pudo leer {path}: {exc}') from exc


def atomic_write(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name('.soff-tmp-' + uuid.uuid4().hex)
    try:
        tmp.write_bytes(data)
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def write_json(path: Path, data: dict):
    atomic_write(path, (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8'))


def valid_path(name: str, for_patch: bool = True) -> str:
    if not isinstance(name, str) or not name or '\\' in name or '\x00' in name or ':' in name:
        raise PatchError(f'Ruta no permitida: {name!r}')
    if name.startswith('/') or name.endswith('/') or '//' in name:
        raise PatchError(f'Ruta no permitida: {name!r}')
    parts = name.split('/')
    if any(x in ('', '.', '..') for x in parts):
        raise PatchError(f'Ruta insegura: {name!r}')
    if for_patch and (parts[0] == '.soff' or parts[0] == 'tools'):
        raise PatchError(f'Una actualización no puede modificar el gestor ni su estado: {name}')
    if should_skip(name):
        raise PatchError(f'Ruta local/excluida: {name}')
    return name


def should_skip(relative: str) -> bool:
    parts = relative.split('/')
    if parts[0] == '.soff' or any(x in SKIP_PARTS for x in parts):
        return True
    if parts[-1] in SKIP_FILES or parts[-1].endswith('.tsbuildinfo'):
        return True
    if any(x.startswith('.env') for x in parts) and not parts[-1].endswith('.example'):
        return True
    if parts[-1].endswith(('.pyc', '.log')):
        return True
    return False


def safe_file(rel: str, for_patch: bool = True) -> Path:
    valid_path(rel, for_patch=for_patch)
    current = ROOT
    for part in rel.split('/'):
        current = current / part
        if current.is_symlink():
            raise PatchError(f'Symlink no permitido: {current}')
    return current


def load_state() -> dict:
    state = read_json(STATE_FILE)
    if state.get('schema') != SCHEMA or state.get('app') != 'soff' or not isinstance(state.get('files'), dict):
        raise PatchError('Estado del proyecto no compatible o corrupto.')
    for p, h in state['files'].items():
        valid_path(p, for_patch=False)
        if not is_hash(h):
            raise PatchError('Hash inválido en estado')
    return state


def is_hash(value: object) -> bool:
    return isinstance(value, str) and bool(re.fullmatch('[a-f0-9]{64}', value))


def scan_files(base: Path) -> dict:
    result = {}
    for p in sorted(base.rglob('*')):
        if not p.is_file() and not p.is_symlink():
            continue
        rel = p.relative_to(base).as_posix()
        if should_skip(rel):
            continue
        valid_path(rel, for_patch=False)
        if p.is_symlink():
            raise PatchError(f'No se permiten symlinks en el proyecto: {rel}')
        result[rel] = sha256(p.read_bytes())
    return result


def verify(state: dict) -> list:
    issues = []
    for rel, expected in state['files'].items():
        p = safe_file(rel, for_patch=False)
        if not p.is_file():
            issues.append(f'FALTA: {rel}')
        elif sha256(p.read_bytes()) != expected:
            issues.append(f'MODIFICADO: {rel}')
    current = scan_files(ROOT)
    for rel in sorted(current.keys() - state['files'].keys()):
        issues.append(f'NO REGISTRADO: {rel}')
    return issues


def read_patch(patch_path: Path) -> tuple[dict, dict[str, bytes]]:
    try:
        with zipfile.ZipFile(patch_path) as arc:
            infos = arc.infolist()
            if len(infos) > MAX_PATCH_FILES + 1 or sum(i.file_size for i in infos) > MAX_PATCH_BYTES:
                raise PatchError('Parche demasiado grande; revisar manualmente.')
            names = [i.filename for i in infos]
            if len(set(names)) != len(names) or 'manifest.json' not in names:
                raise PatchError('Parche sin manifest o con rutas duplicadas.')
            if any(i.is_dir() for i in infos):
                raise PatchError('El parche no debe contener entradas de directorio.')
            for info in infos:
                if (info.external_attr >> 16) & 0o170000 == 0o120000:
                    raise PatchError('El ZIP contiene symlinks.')
                if info.filename != 'manifest.json':
                    if not info.filename.startswith('files/'):
                        raise PatchError(f'Entrada inesperada: {info.filename}')
                    valid_path(info.filename[6:])
            manifest = json.loads(arc.read('manifest.json'))
            if not isinstance(manifest, dict):
                raise PatchError('Manifest inválido')
            payloads = {info.filename[6:]: arc.read(info) for info in infos if info.filename.startswith('files/')}
    except (zipfile.BadZipFile, KeyError, OSError, ValueError, UnicodeError) as exc:
        raise PatchError(f'No se pudo abrir el parche: {exc}') from exc
    validate_manifest(manifest, payloads)
    return manifest, payloads


def validate_manifest(m: dict, payloads: dict[str, bytes]):
    if m.get('schema') != SCHEMA or m.get('app') != 'soff':
        raise PatchError('Parche no corresponde a SOFF o formato incompatible.')
    for k in ('id', 'from_version', 'to_version', 'title'):
        if not isinstance(m.get(k), str) or not m[k].strip():
            raise PatchError(f'Falta {k} en el manifiesto')
    if not re.fullmatch(r'[A-Za-z0-9_-]{3,70}', m['id']):
        raise PatchError('ID de parche inválido.')
    if m['from_version'] == m['to_version']:
        raise PatchError('La versión destino debe ser diferente.')
    operations = m.get('operations')
    if not isinstance(operations, list) or not operations:
        raise PatchError('Un parche debe tener operaciones.')
    seen = set()
    expected_payloads = set()
    for op in operations:
        if not isinstance(op, dict) or op.get('op') not in ('add', 'modify', 'delete'):
            raise PatchError('Operación desconocida.')
        p = valid_path(op.get('path'))
        if p in seen:
            raise PatchError(f'Ruta repetida: {p}')
        seen.add(p)
        if op['op'] == 'add':
            if op.get('before_sha256') is not None or not is_hash(op.get('after_sha256')):
                raise PatchError(f'Hash ADD inválido: {p}')
        elif op['op'] == 'modify':
            if not is_hash(op.get('before_sha256')) or not is_hash(op.get('after_sha256')):
                raise PatchError(f'Hash MODIFY inválido: {p}')
        else:
            if not is_hash(op.get('before_sha256')) or op.get('after_sha256') is not None:
                raise PatchError(f'Hash DELETE inválido: {p}')
        if op['op'] != 'delete':
            expected_payloads.add(p)
            if p not in payloads or sha256(payloads[p]) != op['after_sha256']:
                raise PatchError(f'El contenido del parche no coincide con su SHA-256: {p}')
    if set(payloads) != expected_payloads:
        raise PatchError('El ZIP trae archivos no declarados o le faltan archivos.')


def preflight(m: dict, state: dict):
    if m['from_version'] != state['version']:
        raise PatchError(f'Versión incompatible: instalado={state["version"]}; el parche requiere={m["from_version"]}.')
    if any(x.get('id') == m['id'] for x in state.get('applied', [])):
        raise PatchError('El parche ya está aplicado.')
    for op in m['operations']:
        p, rel = safe_file(op['path']), op['path']
        existing = p.is_file()
        if op['op'] == 'add':
            if existing or rel in state['files'] or p.exists():
                raise PatchError(f'ADD espera archivo inexistente: {rel}')
        else:
            if not existing or rel not in state['files']:
                raise PatchError(f'No existe archivo esperado: {rel}')
            actual = sha256(p.read_bytes())
            if actual != op['before_sha256'] or actual != state['files'][rel]:
                raise PatchError(f'Archivo cambiado respecto de versión esperada: {rel}')


def apply_patch(patch_path: Path, dry: bool):
    state = load_state()
    m, data = read_patch(patch_path)
    preflight(m, state)
    print(f'PARCHE: {m["id"]} | {m["from_version"]} -> {m["to_version"]}')
    print('Objetivo:', m['title'])
    for op in m['operations']:
        print(f'  {op["op"].upper():6} {op["path"]}')
    print('Pasos manuales:', len(m.get('manual_steps', [])))
    if dry:
        print('SIMULACIÓN CORRECTA: no se modificó ningún archivo.')
        return
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup_rel = f'{m["id"]}-{stamp}-{uuid.uuid4().hex[:8]}'
    backup_dir = CONTROL / 'backups' / backup_rel
    original = {}
    completed = []
    backup_dir.mkdir(parents=True, exist_ok=False)
    try:
        for op in m['operations']:
            if op['op'] == 'add':
                original[op['path']] = None
                continue
            content = safe_file(op['path']).read_bytes()
            original[op['path']] = content
            dst = backup_dir / 'files' / op['path']
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(content)
        write_json(backup_dir / 'recovery.json', {
            'patch': m, 'previous_version': state['version'], 'previous_files': state['files']
        })
        for op in m['operations']:
            target = safe_file(op['path'])
            if op['op'] == 'delete':
                target.unlink()
            else:
                atomic_write(target, data[op['path']])
            completed.append(op['path'])
        new_state = dict(state)
        new_state['version'] = m['to_version']
        new_state['files'] = dict(state['files'])
        for op in m['operations']:
            if op['op'] == 'delete':
                new_state['files'].pop(op['path'], None)
            else:
                new_state['files'][op['path']] = op['after_sha256']
        new_state['applied'] = list(state.get('applied', [])) + [{
            'id': m['id'], 'from_version': m['from_version'], 'to_version': m['to_version'],
            'backup': backup_rel, 'utc': stamp,
        }]
        write_json(STATE_FILE, new_state)
    except Exception as exc:
        for rel in reversed(completed):
            target = safe_file(rel)
            try:
                if original[rel] is None:
                    target.unlink(missing_ok=True)
                else:
                    atomic_write(target, original[rel])
            except Exception as recovery_exc:
                print(f'ALERTA - restauración fallida en {rel}: {recovery_exc}', file=sys.stderr)
        raise PatchError(f'Falló actualización, se intentó restaurar: {exc}') from exc
    print(f'PARCHE APLICADO. Nueva versión: {m["to_version"]}. Respaldo local: .soff/backups/{backup_rel}')
    for step in m.get('manual_steps', []):
        print('  PENDIENTE MANUAL:', step)
    print('Ejecutar: python tools/soff_patcher.py verify')


def rollback():
    state = load_state()
    if not state.get('applied'):
        raise PatchError('No hay parches instalados para revertir.')
    item = state['applied'][-1]
    recovery = read_json(CONTROL / 'backups' / item['backup'] / 'recovery.json')
    m = recovery['patch']
    if item['id'] != m['id'] or state['version'] != m['to_version']:
        raise PatchError('Historial de respaldo inconsistente.')
    for op in m['operations']:
        target = safe_file(op['path'])
        if op['op'] == 'delete':
            if target.exists():
                raise PatchError(f'Se creó manualmente un archivo eliminado: {op["path"]}')
        elif not target.is_file() or sha256(target.read_bytes()) != op['after_sha256']:
            raise PatchError(f'Se modificó archivo después de parche: {op["path"]}. Restauración detenida.')
    # Verificar todos los respaldos antes de restaurar un solo archivo.
    for op in m['operations']:
        if op['op'] == 'add':
            continue
        backup_path = CONTROL / 'backups' / item['backup'] / 'files' / op['path']
        if not backup_path.is_file() or sha256(backup_path.read_bytes()) != op['before_sha256']:
            raise PatchError(f'Backups alterados: {op["path"]}')
    for op in reversed(m['operations']):
        target = safe_file(op['path'])
        if op['op'] == 'add':
            target.unlink(missing_ok=True)
        else:
            backup_path = CONTROL / 'backups' / item['backup'] / 'files' / op['path']
            data = backup_path.read_bytes()
            if sha256(data) != op['before_sha256']:
                raise PatchError(f'Backups alterados: {op["path"]}')
            atomic_write(target, data)
    new = dict(state)
    new['version'] = recovery['previous_version']
    new['files'] = recovery['previous_files']
    new['applied'] = state['applied'][:-1]
    write_json(STATE_FILE, new)
    print(f'REVERTIDO {item["id"]}. Versión actual: {new["version"]}.')
    print('IMPORTANTE: esto NO revierte migraciones SQL, datos, despliegues Vercel ni pagos.')


def create_patch(args):
    state = load_state()
    if not args.updated.is_dir():
        raise PatchError('Directorio --updated no encontrado.')
    valid_id = re.fullmatch(r'[A-Za-z0-9_-]{3,70}', args.id)
    if not valid_id:
        raise PatchError('ID de parche inválido.')
    issues = verify(state)
    if issues:
        raise PatchError('El directorio base tiene cambios no registrados:\n' + '\n'.join(issues[:15]))
    updated_files = scan_files(args.updated)
    baseline_files = state['files']
    # Do not publish tool/control updates inside a normal patch.
    updated_files = {k: v for k, v in updated_files.items() if not k.startswith('tools/')}
    baseline_files = {k: v for k, v in baseline_files.items() if not k.startswith('tools/')}
    ops = []
    for rel in sorted(baseline_files.keys() | updated_files.keys()):
        before, after = baseline_files.get(rel), updated_files.get(rel)
        if before == after:
            continue
        if before is None:
            kind = 'add'
        elif after is None:
            kind = 'delete'
        else:
            kind = 'modify'
        valid_path(rel)
        ops.append({'op': kind, 'path': rel, 'before_sha256': before, 'after_sha256': after})
    if not ops:
        raise PatchError('No hay cambios entre el proyecto instalado y --updated.')
    removals = [op for op in ops if op['op'] == 'delete']
    if removals and not args.allow_delete:
        raise PatchError(f'Hay {len(removals)} eliminaciones. Revisar carpeta --updated y repetir con --allow-delete si son deliberadas.')
    manifest = {
        'schema': SCHEMA, 'app': 'soff', 'id': args.id,
        'from_version': state['version'], 'to_version': args.to_version,
        'title': args.title, 'created_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'manual_steps': list(args.manual_step or []),
        'operations': ops,
    }
    payloads = {op['path']: (args.updated / op['path']).read_bytes() for op in ops if op['op'] != 'delete'}
    validate_manifest(manifest, payloads)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=8) as out:
        out.writestr('manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + '\n')
        for rel, content in sorted(payloads.items()):
            out.writestr('files/' + rel, content)
    print(f'PARCHE GENERADO: {args.output}\n  {len(ops)} operaciones, {args.output.stat().st_size:,} bytes')


def cli():
    parser = argparse.ArgumentParser(description='Gestor offline de parches SOFF | Python 3.9+')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('status', help='Mostrar versión e historial')
    sub.add_parser('verify', help='Verificar SHA-256 de archivos registrados')
    inspect = sub.add_parser('inspect', help='Mostrar el contenido de un parche')
    inspect.add_argument('patch', type=Path)
    apply = sub.add_parser('apply', help='Simular o aplicar un parche')
    apply.add_argument('patch', type=Path)
    apply.add_argument('--yes', action='store_true', help='Aplicar realmente: por defecto, solo simulación')
    roll = sub.add_parser('rollback', help='Revertir SOLO el último parche de archivos')
    roll.add_argument('--yes', action='store_true')
    create = sub.add_parser('create', help='Crear ZIP diferencial desde una copia editada completa')
    create.add_argument('--updated', type=Path, required=True)
    create.add_argument('--id', required=True)
    create.add_argument('--to-version', required=True)
    create.add_argument('--title', required=True)
    create.add_argument('--output', type=Path, required=True)
    create.add_argument('--manual-step', action='append')
    create.add_argument('--allow-delete', action='store_true', help='Permitir eliminaciones declaradas de archivos')
    args = parser.parse_args()
    try:
        if args.command == 'status':
            state = load_state()
            print('SOFF | Versión:', state['version'])
            print('Archivos controlados:', len(state['files']))
            print('Parches aplicados:', ', '.join(x['id'] for x in state.get('applied', [])) or 'ninguno')
        elif args.command == 'verify':
            issues = verify(load_state())
            if issues:
                print('\n'.join(issues[:60]))
                raise PatchError(f'{len(issues)} divergencias. No aplicar parches hasta resolverlas.')
            print('OK: todos los archivos registrados coinciden con SHA-256 de la versión instalada.')
        elif args.command == 'inspect':
            m, _ = read_patch(args.patch)
            print(json.dumps(m, indent=2, ensure_ascii=False))
        elif args.command == 'apply':
            apply_patch(args.patch, dry=not args.yes)
        elif args.command == 'rollback':
            if not args.yes:
                print('SIMULACIÓN: para revertir el último parche, usar rollback --yes')
            else:
                rollback()
        elif args.command == 'create':
            create_patch(args)
    except PatchError as exc:
        print('ERROR:', str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(cli())
