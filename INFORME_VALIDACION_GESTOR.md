# Verificación técnica del sistema de parches SOFF

**Fecha de verificación:** 15–16/10/2026 (hora del entorno de generación).  
**Alcance:** herramienta local de actualización de archivos, **no** pruebas E2E del negocio.

## Pruebas ejecutadas y superadas
1. `status` y `verify` de base v1.0.0: sin diferencias.
2. `inspect` y simulación de P001: sin modificar archivos.
3. Instalación efectiva de P001 sobre copia: cinco archivos reemplazados; versión 1.0.1; `verify` OK.
4. Reintento del mismo parche: rechazado por versión incompatible.
5. `rollback --yes` de P001: restauración local de los cinco archivos; `verify` OK.
6. Cambio manual previo de un archivo: parche rechazado por SHA-256 diferente.
7. Parche sintético de QA con alta/modificación/baja: requiere `--allow-delete`, instala y revierte correctamente.
8. Parche sintético con `../` en ruta del ZIP: rechazado por validación contra path traversal.

## Pruebas aún pendientes y limitaciones
- Sin acceso a instancias reales Vercel/Supabase/Mercado Pago, datos bancarios de producción ni cuentas de clientes.
- No se ejecutó una compilación completa de Next.js con dependencias descargadas, ni pruebas funcionales de la plataforma en un navegador.
- El sistema de parches es **local**. No firma criptográficamente la autoría del parche, no instala dependencias de npm, no migra SQL ni publica el sitio.
- Los respaldos `.soff/backups` sirven solo para versiones previas de archivos actualizados, no respaldan toda la base ni sistemas externos. Se requiere respaldo adicional antes de cada despliegue.

**Dictamen limitado:** gestor listo para usarse en copias controladas del código. La tienda continúa **no apta para producción** hasta corregir hallazgos P0 y validar integralmente.
