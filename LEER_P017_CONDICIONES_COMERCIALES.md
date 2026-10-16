# SOFF — P017 (versión 1.0.17): condiciones comerciales por canal

## Funciones desarrolladas
- Nuevo panel `https://<tu-dominio>/admin/condiciones-comerciales` para los canales **minorista, mayorista, revendedor y peluquero**.
- Compra mínima configurable por canal, calculada sobre **subtotal de artículos antes de descuentos**; el checkout la vuelve a verificar en el servidor (HTTP 409 si no alcanza).
- Hasta dos escalones no acumulativos de descuento por importe. El segundo sustituye al primero.
- Posibilidad de habilitar cupones por canal (por defecto solo minoristas). Las API y el servidor de pedidos respetan esta política.
- Envío gratis: **heredar umbral general**, **umbral propio**, **siempre** o **nunca**, aplicado solamente a envío a domicilio sobre monto después de descuentos. Se mantiene el cálculo estimativo vigente de tarifa.
- Carrito obtiene políticas del servidor con su categoría autorizada; las actualiza con el carrito al cargar, cambiar sesión o recuperar foco. Si no puede verificar, **bloquea checkout**.
- Auditoría SQL de cambios, con usuario, motivo, antes/después y fecha. API solo para sesión administradora validada.
- Se corrigió el guardado del umbral general en el dashboard para que no confirme falsamente el éxito; usa API administradora. En fichas públicas se aclaró que el envío depende del canal.

## Valores iniciales conservadores (NO inventar compras mínimas)
| Canal | Mínimo | Primer escalón | Segundo escalón | Cupones | Envío |
|---|---:|---|---|---|---|
| Minorista | $0 | $45.000 → 5% | $70.000 → 10% | Sí | Hereda umbral general |
| Mayorista | $0 | Ninguno | Ninguno | No | Hereda umbral general |
| Revendedor | $0 | Ninguno | Ninguno | No | Hereda umbral general |
| Peluquero | $0 | Ninguno | Ninguno | No | Hereda umbral general |

No se modifican precios unitarios, pedidos anteriores, clientes ni stock. El dueño debe decidir los importes mínimos y demás políticas finales.

## Instalación incremental — IMPORTANTE
1. Requiere una base **SOFF v1.0.16 íntegra**, con **P015 y P016 ya aplicados**. No instalar sobre un ZIP/RAR que esté en v1.0.14.
2. Conservar respaldo completo fuera del directorio; comparar la rama actual de GitHub y el despliegue en Vercel con la copia local ANTES de usar el parche.
3. Descargar **`SOFF_P017_CONDICIONES_COMERCIALES_v1.0.17.zip`** y dejarlo sin descomprimir en Descargas o `PARCHES`.
4. Ejecutar `ACTUALIZAR_WINDOWS.cmd` y luego `CONTROL_FINAL_WINDOWS.cmd`. Comprobar versión **1.0.17** e integridad. Instalar código **no** publica en GitHub/Vercel ni aplica SQL.
5. **Migración manual nueva obligatoria:** `supabase/migrations/20261016_p017_channel_terms.sql`, después de `20261016_p015_commercial_management.sql` y scripts previos. Revisar y ejecutar primero en **staging**, con respaldo probado.
6. En staging desplegar el código P017 junto al SQL; verificar cuentas, RLS, precios y checkout; luego coordinar publicación real. **No desplegar código P017 antes de SQL P017**: el checkout quedará en error de configuración, deliberadamente para evitar precios inconsistentes.
7. El parche mantiene `SUPABASE_SERVICE_ROLE_KEY` solamente en servidor. **Nunca agregar claves reales a ZIP/parches/repo**.

## Pruebas obligatorias en staging
- Cuatro cuentas de perfiles: cada una ve solo su lista y condiciones comerciales; invitado recibe política minorista. Ninguna cuenta puede editar condiciones vía navegador directamente.
- Guardar mínimo mayorista de prueba $100.000: $99.999 rechazado tanto en pantalla como servidor; $100.000 admitido. Restaurar regla autorizada.
- Cambiar escalones minoristas: comprobar 44.999/45.000/69.999/70.000, límites de % y no acumulación entre escalones.
- Habilitar/deshabilitar cupones por rol y verificar rechazo por API y cálculo final de transferencia.
- Envío gratis «nunca», «siempre», heredado y umbral propio: probar con y sin coordenadas y con descuentos; pickup/WhatsApp/Uber Moto conservan lógica anterior.
- Modificar política desde otra sesión mientras carrito abierto: refrescar, bloquear comprobante anterior si cambia total y volver a calcular.
- Simular caída o falta de SQL P017: mensaje de error, no aceptar pedidos sin validación. La mera existencia del script local NO significa que se aplicó.
- Verificar trigger audit `soff_channel_terms_audit`, motivo y actor; simular dos administradores modificando la misma regla y confirmar conflicto HTTP 409.
- Ensayar rollback local en carpeta de prueba. Revertir código NO revierte tablas, pagos ni datos de Supabase.

## Límites y pendientes
- `npm run build` completo y pruebas reales de Supabase/Vercel no se certifican con las pruebas locales.
- P004 valida precios de líneas y existencias; la exactitud de descuentos/envíos/total se valida del lado servidor de Next.js en `calculateQuote`; confirmar flujo integrado con RPC en staging.
- No hay integración real de tarifación ni confirmación de Mercado Pago. Se mantiene el bloqueo de cobro que viene de versiones anteriores.
- La opción «Heredar» utiliza el umbral general de `store_settings`. No anula reglas diferenciadas ni contratos de transporte.
- Reglas por canal se aplican a pedidos futuros; no se rehacen pedidos históricos.
