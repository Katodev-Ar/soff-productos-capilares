#!/usr/bin/env python3
"""SOFF - auditoría LOCAL de la versión instalada, Python 3.9+. Sin red ni credenciales.
No verifica Supabase ni pagos ni certifica aptitud para producción.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
STATE=ROOT/'.soff/state.json'
REPORT=ROOT/'.soff/qa/ULTIMO_CONTROL.txt'
REPORT_JSON=ROOT/'.soff/qa/ULTIMO_CONTROL.json'
MIGRATIONS=[
'supabase/patches/P002_SEGURIDAD_SUPABASE.sql',
'supabase/migrations/20261016_p004_inventory.sql',
'supabase/migrations/20261016_p005_payment_reconciliation.sql',
'supabase/migrations/20261016_p006_admin_operations.sql',
'supabase/migrations/20261016_p007_fiscal_registry.sql',
'supabase/migrations/20261016_p011_stabilization.sql',
]
CRITICAL_CODE=[
'src/lib/serverCheckout.ts',
'src/app/api/checkout/transfer/route.ts',
'src/app/api/checkout/mercadopago/route.ts',
'src/app/api/webhooks/mercadopago/route.ts',
'src/app/api/receipts/[orderId]/route.ts',
'src/app/api/admin/orders/confirm-transfer/route.ts',
'src/app/admin/calidad-catalogo/page.tsx',
'src/app/admin/facturacion/page.tsx',
'src/app/api/health/route.ts',
]
P016_FILES=[
'src/lib/commercialPricingPolicy.ts',
'src/app/api/cart/prices/route.ts',
'src/context/CartContext.tsx',
'src/lib/serverCheckout.ts',
'qa/test_p016_prices.cjs',
'LEER_P016_CARRITO_Y_DESCUENTOS.md',
]
P017_FILES=[
'supabase/migrations/20261016_p017_channel_terms.sql',
'src/lib/serverCommercialTerms.ts',
'src/app/admin/condiciones-comerciales/page.tsx',
'src/app/api/admin/commercial/terms/route.ts',
'qa/test_p017_terms.cjs',
'LEER_P017_CONDICIONES_COMERCIALES.md',
]
P015_FILES=[
'supabase/migrations/20261016_p015_commercial_management.sql',
'src/app/admin/comercial/page.tsx',
'src/app/cuenta/comercial/page.tsx',
'src/app/api/admin/commercial/route.ts',
'src/app/api/commercial/request/route.ts',
]
# Cada verificación externa exige evidencia del dueño / técnico. La herramienta local
# siempre informa PENDIENTE: no puede conocer el estado de servicios externos.
REQUIRED_EXTERNAL=[
'Coincidencia entre código y despliegue real; backups con restauración ensayada',
'P002 RLS/Storage, políticas y comprobantes privados probados con usuarios de prueba',
'Migraciones P004, P005, P006, P007, P011 y P015 aplicadas EN ORDEN en staging y luego producción',
'Prueba de compra concurrente / liberación y movimientos de stock con BD real',
'Prueba de transferencia acreditada vs. recibo falso y pagos duplicados',
'Configuración bancaria y credenciales seguras, verificación de webhooks',
'Mercado Pago desactivado hasta conciliación extremo a extremo aprobada',
'Conciliación fiscal, CUIT, emisión externa de factura y criterio ARCA revisado',
'Catálogo de 511 productos revisado, margen/stock e idoneidad sanitaria verificados',
'Botón de arrepentimiento, devoluciones, contacto y condiciones legales validados',
'Pruebas reales móviles, navegador, SEO, accesibilidad y carga del probador',
'Revisión de dependencias/vulnerabilidades, build y despliegue staging ejecutados',
'P016: recotización por categoría, ausencia de descuentos especiales, caída de API y cambio de precio/comprobante probados',
'P017: migración aplicada y RLS/roles/cuatro canales, compra mínima, cupones, envío y modificaciones de condiciones probadas en staging',
'Aprobación explícita del titular y registro GO/NO-GO firmado',
]
@dataclass
class Result:
    category:str
    status:str
    detail:str

def sha256(p:Path)->str:
    d=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            d.update(chunk)
    return d.hexdigest()

def check_integrity(root:Path=ROOT)->list[Result]:
    out=[]
    file=root/'.soff/state.json'
    if not file.is_file():return [Result('Integridad','ERROR','Falta .soff/state.json')]
    try:
        state=json.loads(file.read_text(encoding='utf-8'))
    except (OSError,ValueError) as exc:
        return [Result('Integridad','ERROR',f'Estado JSON ilegible: {type(exc).__name__}')]
    # La versión se valida contra la aplicación y el último parche, no contra
    # un número grabado en este programa (lo que fallaba desde P011).
    version=state.get('version')
    try:
        package=json.loads((root/'package.json').read_text(encoding='utf-8'))
        package_version=package.get('version')
    except (OSError,ValueError,TypeError,AttributeError):
        package_version=None
    applied=state.get('applied',[])
    latest_version=(applied[-1].get('to_version') if isinstance(applied,list)
                    and applied and isinstance(applied[-1],dict) else None)
    valid_format=isinstance(version,str) and re.fullmatch(r'\d+\.\d+\.\d+',version) is not None
    coherent=(valid_format and package_version==version and
              (latest_version is None or latest_version==version))
    detail=f'Estado: {version or "desconocido"}; aplicación: {package_version or "desconocida"}'
    if latest_version is not None:
        detail+=f'; último parche: {latest_version}'
    if not coherent:detail+='; comprobar versiones antes de continuar'
    out.append(Result('Versión','OK' if coherent else 'ERROR',detail))
    changed=[]
    files=state.get('files',{})
    if not isinstance(files,dict):return out+[Result('Integridad','ERROR','Inventario inválido')]
    for rel,exp in files.items():
        # Nunca salir del árbol base; el inventario es local.
        if not isinstance(rel,str) or '..' in Path(rel).parts or Path(rel).is_absolute():
            changed.append('Ruta insegura en estado');continue
        path=root/rel
        if not path.is_file() or path.is_symlink() or sha256(path)!=exp:changed.append(rel)
    if changed:out.append(Result('Integridad','ERROR',f'{len(changed)} archivos no coinciden: '+', '.join(changed[:6])))
    else:out.append(Result('Integridad','OK',f'{len(files)} archivos rastreados coinciden por SHA-256'))
    return out

def check_structure(root:Path=ROOT)->list[Result]:
    out=[]
    missing=[x for x in MIGRATIONS if not (root/x).is_file()]
    out.append(Result('Migraciones','ERROR' if missing else 'OK',
      'Faltan fuentes SQL: '+', '.join(missing) if missing else 'Las 6 fuentes SQL de P002/P004/P005/P006/P007/P011 están presentes. NO acredita aplicación en Supabase.'))
    missing=[x for x in CRITICAL_CODE if not (root/x).is_file()]
    out.append(Result('Código clave','ERROR' if missing else 'OK',
        'Faltan: '+', '.join(missing) if missing else 'Rutas críticas presentes; no acredita su funcionamiento en producción.'))
    # Cada parche incorpora su propio control sin invalidar las pruebas de versiones previas.
    try:
        version=json.loads((root/'package.json').read_text(encoding='utf-8')).get('version','')
        parts=tuple(int(x) for x in version.split('.'))
    except (OSError, ValueError, AttributeError):
        parts=()
    if parts >= (1,0,15):
        new_missing=[x for x in P015_FILES if not (root/x).is_file()]
        out.append(Result('Módulo P015','ERROR' if new_missing else 'OK',
            'Faltan: '+', '.join(new_missing) if new_missing else
            'Panel, API, cuenta comercial y migración P015 presentes; NO acredita aplicación SQL.'))
    if parts >= (1,0,16):
        missing=[x for x in P016_FILES if not (root/x).is_file()]
        out.append(Result('Módulo P016','ERROR' if missing else 'OK',
            'Faltan: '+', '.join(missing) if missing else
            'API de precios, política por canal, sincronización de carrito y pruebas locales presentes; no acredita prueba con Supabase.'))
    if parts >= (1,0,17):
        missing=[x for x in P017_FILES if not (root/x).is_file()]
        out.append(Result('Módulo P017','ERROR' if missing else 'OK',
            'Faltan: '+', '.join(missing) if missing else
            'Reglas por canal, migración, panel y pruebas locales presentes; NO acredita ejecución SQL.'))
    pkg=root/'package.json'
    try:
        data=json.loads(pkg.read_text(encoding='utf-8'))
        out.append(Result('Proyecto','OK' if all(k in data.get('scripts',{}) for k in ('build','lint')) else 'ERROR',
            f"Scripts disponibles: {', '.join(data.get('scripts',{}))}. Ejecutar con dependencias instaladas en staging."))
    except (OSError,ValueError):out.append(Result('Proyecto','ERROR','No se pudo leer package.json'))
    return out

def check_configuration(root:Path=ROOT)->list[Result]:
    result=[]
    # No leer contenido de .env.local ni imprimir valores sensibles.
    configured=(root/'.env.local').is_file()
    result.append(Result('Variables','PENDIENTE',
        '.env.local existe (contenido no inspeccionado).' if configured else
        'No hay .env.local local. Configuración en Vercel/Supabase NO verificada.'))
    server_key_bad=[]
    for file in (root/'src').rglob('*'):
        if not file.is_file() or file.suffix not in ('.ts','.tsx','.js','.jsx'):continue
        try:content=file.read_text(encoding='utf-8')
        except UnicodeError:continue
        if re.search(r'NEXT_PUBLIC_(?:SUPABASE_SERVICE_ROLE_KEY|MERCADOPAGO_ACCESS_TOKEN|.*(?:SECRET|PRIVATE_KEY))',content):
            server_key_bad.append(file.relative_to(root).as_posix())
    result.append(Result('Claves privadas','ERROR' if server_key_bad else 'OK',
        'Posible uso inseguro NEXT_PUBLIC: '+', '.join(server_key_bad[:5]) if server_key_bad
        else 'Sin nombres evidentes de secretos con NEXT_PUBLIC; requiere auditoría de credenciales real.'))
    mp=(root/'src/app/api/checkout/mercadopago/route.ts')
    if mp.is_file():
        txt=mp.read_text(encoding='utf-8')
        safe='status: 503' in txt and 'temporalmente deshabilitado' in txt
        result.append(Result('Mercado Pago','OK' if safe else 'PENDIENTE',
            'Inicio de cobro deshabilitado explícitamente en fuente' if safe else
            'Revisar manualmente creación de cobros, webhook y conciliación'))
    return result

def run(root:Path=ROOT)->dict:
    items=check_integrity(root)+check_structure(root)+check_configuration(root)
    items += [Result('Verificación externa','PENDIENTE',x) for x in REQUIRED_EXTERNAL]
    blockers=sum(i.status=='ERROR' for i in items)
    pending=sum(i.status=='PENDIENTE' for i in items)
    try:
        state=json.loads((root/'.soff/state.json').read_text(encoding='utf-8'))
        detected_version=str(state.get('version','DESCONOCIDA')) if isinstance(state,dict) else 'DESCONOCIDA'
    except (OSError,ValueError):
        detected_version='DESCONOCIDA'
    return {'date_utc':dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
            'version':detected_version,'decision':'NO APTO PARA PRODUCCIÓN',
            'local_errors':blockers,'external_pending':pending,
            'results':[i.__dict__ for i in items]}

def render(report:dict)->str:
    rows=['SOFF - INFORME DE PREPARACIÓN (LOCAL)',
          'Fecha: '+report['date_utc'], 'Versión instalada: '+str(report['version']),
          'RESULTADO: '+report['decision'],
          f"Errores locales: {report['local_errors']}; pendientes de verificación: {report['external_pending']}",
          'Esta herramienta NO se conecta a banco, ARCA, Vercel ni Supabase.',
          'No reemplaza npm build, npm audit ni pruebas funcionales reales.','']
    for row in report['results']:
        rows.append(f"[{row['status']}] {row['category']}: {row['detail']}")
    rows += ['', 'Acciones para el titular: ver CHECKLIST_LANZAMIENTO.md y LEER_P010_CONTROL_FINAL.md',
             'Incluso si no hay errores locales, la publicación sigue pendiente de pruebas y aprobación.']
    return '\n'.join(rows)+'\n'

def main():
    result=run()
    out=render(result)
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(out,encoding='utf-8')
    REPORT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(out)
    print('Informes guardados:',REPORT.relative_to(ROOT),'y',REPORT_JSON.relative_to(ROOT))
    # Error local -> señal de fallo para CI. Pendientes externos no se ocultan.
    return 2 if result['local_errors'] else 0

if __name__=='__main__':sys.exit(main())
