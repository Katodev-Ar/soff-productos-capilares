# SOFF ACTUALIZABLE — Actualizaciones de un clic para Windows

## Cómo actualizar (sin elegir rutas y sin introducir comandos)

1. Extraé la **base** una sola vez, y abrí la carpeta `SOFF_ACTUALIZABLE`.
2. Descargá el archivo del parche, por ejemplo `SOFF_P001_CONFIG_BANCO_v1.0.1.zip`. **No lo descomprimas**. Puede quedar en **Descargas**.
3. Hacé **doble clic en `ACTUALIZAR_WINDOWS.cmd`**, directamente desde `SOFF_ACTUALIZABLE`.

Listo. El programa busca automáticamente ZIP válidos en Descargas, junto al proyecto y en la carpeta `PARCHES` si existe, determina qué parche es compatible con la versión actual, comprueba los hashes, guarda copia de los archivos que modifica y aplica los parches consecutivos en orden. No pregunta por ninguna ruta ni por confirmaciones. **Si no encuentra actualizaciones compatibles, no modifica el programa**. La ventana se queda abierta para informar el resultado. Se requiere Python 3.9+ con el lanzador `py` (instalado en Windows con Python).

**Importante:** descargá parches solamente de una fuente confiable. Los hashes garantizan la integridad respecto del manifiesto, **no la identidad del autor**. Los archivos `.sql`, las cuentas de cobro, los datos y el despliegue de Vercel requieren procedimientos separados; el doble clic no actualiza sistemas en la nube. Nunca instalar en producción sin pruebas y respaldo externo.

### Para quien ya descomprimió la base anterior

No hace falta volver a extraer los 12 MB: descargá **solo `ACTUALIZAR_WINDOWS.cmd`**, copialo a la **carpeta principal `SOFF_ACTUALIZABLE`** (al mismo nivel que `web`, `supabase` y `tools`) y hacé doble clic. Su primer uso agrega ese lanzador al inventario controlado, tras resguardar `.soff/state.json` y comprobar los archivos originales. El gestor anterior sigue disponible en `tools/` como utilidad técnica.

---

Esta es una **copia preparada para recibir actualizaciones incrementales** del código original. No es una versión auditada como apta para producción. La base corresponde a **v1.0.0**. El primer parche separado es **P001_CONFIG_BANCO** (v1.0.1) y sirve de ejemplo funcional de actualización real.

## Qué se conservó y qué cambió en el empaquetado
- Se conservan archivos del programa original (`web/`, `supabase/`, `vercel/`, `SISTEMA_COMPLETO.md`) sin alterar su contenido, salvo por retirar **67 copias idénticas** dentro de `web/src/src/` que duplicaban exactamente `web/src/`.
- Se corrigieron los separadores de carpetas del ZIP (la distribución original guardaba barras invertidas `\\` como nombres de entrada); ahora se puede descomprimir tanto en Windows como en macOS/Linux.
- Se añadieron `tools/soff_patcher.py`, manual, cronograma y `.soff/state.json`. **Esta etapa no corrige por sí misma las vulnerabilidades halladas.**
- Los parches no exigen reinstalar los archivos del catálogo ni los binarios WASM de aproximadamente 35 MB si no fueron modificados.

## Requisitos previos
1. **Extraer completamente** `SOFF_BASE_ACTUALIZABLE_v1.0.0.zip` en una carpeta de trabajo. Dentro estará `SOFF_ACTUALIZABLE/`.
2. Tener instalado **Python 3.9 o superior**. En Windows, usar `py -3`; si no está disponible, probar `python`.
3. Obtener un respaldo **externo** antes de actuar: repositorio de código, configuración Vercel, respaldos gestionados por Supabase/exportación de SQL y archivos Storage. El parche **no** realiza backup de datos de producción.
4. Antes de conectar con una instalación real, confirmar si el código desplegado coincide con esta copia. Si difiere, no aplicar a ciegas.

## Uso avanzado — desarrolladores (opcional)

No necesitás lo siguiente para instalar parches en Windows: **hacé doble clic en `ACTUALIZAR_WINDOWS.cmd` en la carpeta principal**. Los comandos que siguen se ofrecen únicamente para diagnóstico, creación y reversión controlada.

Desde la carpeta `SOFF_ACTUALIZABLE`, abrir PowerShell y ejecutar:

```powershell
py -3 tools/soff_patcher.py status
py -3 tools/soff_patcher.py verify
py -3 tools/soff_patcher.py apply "C:\ruta\SOFF_P001_CONFIG_BANCO_v1.0.1.zip"
```
El tercer comando es **solo una simulación**. Si los cambios y la versión requerida son correctos:

```powershell
py -3 tools/soff_patcher.py apply "C:\ruta\SOFF_P001_CONFIG_BANCO_v1.0.1.zip" --yes
py -3 tools/soff_patcher.py verify
```
En Windows es más simple ejecutar `ACTUALIZAR_WINDOWS.cmd` en la carpeta principal. Detecta e instala automáticamente los parches descargados.

Si algo falla en los **archivos locales** después de actualizar, ejecutar:

```powershell
py -3 tools/soff_patcher.py rollback --yes
```
Solo se revierte **el último parche** y únicamente si sus archivos no volvieron a modificarse. No revierte SQL, pagos, datos de clientes ni despliegues publicados. Los respaldos quedan en `.soff/backups/` y deben conservarse.

## Comandos del gestor

| Comando | Función |
|---|---|
| `status` | Versión instalada y lista de parches |
| `verify` | Control SHA-256 de los archivos rastreados |
| `inspect PARCHE.zip` | Muestra contenidos/acciones previstos |
| `apply PARCHE.zip` | Simula y valida un parche sin tocar archivos |
| `apply PARCHE.zip --yes` | Aplica un parche tras validar hashes y versión |
| `rollback --yes` | Restaura solo el último parche aplicado |
| `create --updated CARPETA --id ID --to-version X --title TEXTO --output PARCHE.zip` | Compara copia modificada contra base y crea ZIP diferencial |

## Cómo generar el siguiente parche (para desarrollo)
1. Copiar el proyecto completo a otra carpeta, sin `.soff/backups`, `.env.local` ni dependencias descargadas.
2. Modificar en esa copia solo los archivos requeridos; conservar el resto. `web/` contiene Next.js y `supabase/` archivos SQL.
3. Desde la carpeta **original que está en la versión anterior**, crear un parche:

```powershell
py -3 tools/soff_patcher.py create --updated "C:\ruta\SOFF_EN_DESARROLLO" --id P002_SEGURIDAD --to-version 1.0.2 --title "Seguridad de perfiles y recibos" --output "C:\ruta\SOFF_P002_SEGURIDAD.zip" --manual-step "Aplicar migraciones SQL en staging, previa copia de seguridad y validación de RLS"
```
4. Probar el parche sobre otra copia limpia de la versión correspondiente con `apply` y `verify`.
5. Publicar el parche y el resultado de sus pruebas; instalar en secuencia P001, P002, etc. No omitir versiones.

**Importante:** al crear un parche, la carpeta `--updated` debe ser una copia *completa* de la misma versión de SOFF. Una carpeta incompleta hará que el generador marque archivos faltantes como eliminaciones. Los archivos de secretos (`.env.local`, etc.) están excluidos automáticamente. No utilizar parches recibidos de fuentes desconocidas: los hashes SHA-256 detectan errores/manipulaciones accidentales pero **no prueban la identidad ni la legitimidad del autor**.

## Despliegue con Vercel y Supabase
- **Vercel:** el directorio raíz de la aplicación es `web/`, no la raíz del repositorio. Ajustar *Root Directory = web* y despliegues separados para `staging` y producción. El gestor de parches actúa en una carpeta de código y **no hace `git push` ni despliega por sí solo**.
- **Supabase:** los `.sql` distribuidos con un parche son scripts/referencias, **no migraciones ya aplicadas**. Los cambios sobre una base existente requieren migración separada validada, respaldo, pruebas de acceso real y plan de recuperación. No volver a ejecutar los scripts originales `01_schema.sql` a `06_seed_settings.sql` en una base con operaciones.
- **Variables bancarias y secretas:** `web/.env.example` es solamente plantilla; no incluir valores de clientes ni claves privadas en parches. `SUPABASE_SERVICE_ROLE_KEY` y `MERCADOPAGO_ACCESS_TOKEN` **nunca** deben llevar prefijo `NEXT_PUBLIC_`.
- **No habilitar pagos reales** hasta resolver también identidad e importes de pedidos, rol, RLS, Storage, inventario, conciliación, facturación y revisión de productos regulados (P002–P005, P007–P008).

## Reglas de control de versiones
- `1.0.0`: paquete base preparado para parches (mismo código de negocio del original, sin duplicados).
- `1.0.1`: P001_CONFIG_BANCO — primera corrección acotada de configuración/guardas bancarias; **no es una corrección integral del checkout**.
- Futuras versiones se definen al entregar cada parche. El cronograma indica contenido previsto, no parches ya creados.

## P004: stock e inventario (1.0.4)
Descargá `SOFF_P004_STOCK_INVENTARIO_v1.0.4.zip`, dejalo en Descargas y ejecutá `ACTUALIZAR_WINDOWS.cmd` desde la carpeta principal. Leé `LEER_P004_STOCK.md`. La migración `supabase/migrations/20261016_p004_inventory.sql` es manual y debe ejecutarse por el propietario tras P002. **No publicar código 1.0.4 sin su migración**, porque checkout fallará intencionalmente con HTTP 503.


## P007 — Facturación/control fiscal (v1.0.7)
Instalar después de P006. El Windows CMD SOLO actualiza código. Antes de usar el panel fiscal en el sitio se requiere aplicar en Supabase las migraciones anteriores y `20261016_p007_fiscal_registry.sql`, configurar la CUIT del emisor y desplegar en un entorno de pruebas. No emite ni autoriza facturas en ARCA. Consultar `LEER_P007_CONTROL_FISCAL.md`.

## P008 — Catálogo y revisión comercial (v1.0.8)
Instalación local con `ACTUALIZAR_WINDOWS.cmd` sobre v1.0.7. Se agrega diagnóstico en `/admin/calidad-catalogo` y controles al editor de productos. No se cambian los registros de la base; las pruebas reales y la revisión sanitaria, contable y de precios quedan pendientes. Ver `LEER_P008_CATALOGO.md`.

## P009 — v1.0.9
Descargar ZIP P009 a Descargas, ejecutar ACTUALIZAR_WINDOWS.cmd en raiz del proyecto 1.0.8. No ejecutar SQL nuevo. Ver LEER_P009_EXPERIENCIA.md.

## P010 — Control final (1.0.10)
Instalar mediante `ACTUALIZAR_WINDOWS.cmd` como siempre. Después, ejecutar `CONTROL_FINAL_WINDOWS.cmd` desde la carpeta principal. Se crea `.soff/qa/ULTIMO_CONTROL.txt`. **Nunca se presume aptitud para producción** sin validar SQL, despliegue, transacciones, normativa y aprobación del propietario. Consultar `LEER_P010_CONTROL_FINAL.md` y `CHECKLIST_LANZAMIENTO.md`.

## P011 — Estabilización integral (1.0.11)
Parche único tras auditoría de v1.0.10. Instalación con ACTUALIZAR_WINDOWS.cmd desde Descargas. Requiere SQL adicional en `supabase/migrations/20261016_p011_stabilization.sql` después de P002/P004/P005/P006/P007. La tabla products deja de ser consultable desde navegadores no administradores: utilizar la vista `soff_catalog_public`. La tienda no se considera apta para producción. Leer `LEER_P011_ESTABILIZACION.md`.

## P012 — Corrección del control final (1.0.12)
El verificador ya no compara la versión contra un número fijo: comprueba estado del gestor, `web/package.json` y último parche. Después de instalar P012, ejecutar `CONTROL_FINAL_WINDOWS.cmd`. No necesita nuevo SQL. Ver `LEER_P012_CONTROL_VERSIONES.md`.

## P013 — Corrección del TypeScript fiscal (1.0.13)
Parche diferencial para resolver el error TS18047 detectado en la compilación real de Windows. Sin SQL nuevo. Después de instalarlo, repetir `PROBAR_COMPILACION_SOFF_WINDOWS.cmd` y compartir el reporte. Ver `LEER_P013_CORRECCION_TYPESCRIPT.md`.

## P014 — Compilación sin Supabase (1.0.14)
Cuando no están configuradas las dos variables públicas, el sitio muestra mantenimiento y no opera. La inicialización no interrumpe la importación de módulos para el build. Repetir la compilación en Windows. Ver `LEER_P014_COMPILACION_SIN_SUPABASE.md`.
