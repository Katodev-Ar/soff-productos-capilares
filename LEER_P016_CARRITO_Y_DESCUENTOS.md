# SOFF P016 — Sincronización de carrito y políticas de descuentos (v1.0.16)

## Alcance implementado

1. El carrito conserva los identificadores y cantidades, pero **no confía en los precios guardados** en `localStorage`.
2. `/api/cart/prices` consulta en el **servidor** los precios de la lista correspondiente al usuario autenticado. Un visitante utiliza lista minorista; un token inválido **no** se trata como invitado. Solo devuelve el precio permitido para cada artículo; no expone las otras tres listas ni el costo.
3. El carrito se vuelve a validar cuando se carga, al cambiar sus productos, cuando hay eventos relevantes de inicio/cierre de sesión y al regresar a la pestaña. Ante error de red, artículo eliminado, falta de stock o precio inválido, **no se habilita el checkout**.
4. El checkout vuelve a verificar el carrito antes de confirmar transferencia. La cotización y los importes finales siguen recalculándose del lado servidor mediante `calculateQuote`; el navegador no puede imponer un precio.
5. Si cambia el importe, se invalida el comprobante cargado para evitar reutilizar una captura de otro total.
6. Se centralizaron las reglas promocionales en `web/src/lib/commercialPricingPolicy.ts`, utilizadas por la interfaz y por el checkout seguro. Las listas especiales no acumulan promociones minoristas automáticamente.
7. Los cupones se restringen también en `/api/checkout/coupon` y en `calculateQuote`, no solamente en la interfaz. **No se hizo ninguna modificación a las órdenes ya emitidas.**

## Reglas provisionales, explícitas, sujetas a aprobación comercial

| Canal | Precio | Descuento automático por importe | Cupón minorista |
|---|---|---|---|
| Minorista (incluye administrador al comprar) | Minorista | 5% desde $45.000; 10% desde $70.000 | Permitido |
| Mayorista | Mayorista | No se acumula | No se acumula |
| Revendedor | Revendedor | No se acumula | No se acumula |
| Peluquero | Peluquero | No se acumula | No se acumula |

Los descuentos minoristas existentes se preservan. **No se inventan compras mínimas ni porcentajes comerciales adicionales.** Los precios listados deben confirmarse con el titular. Este parche no crea un panel para cambiar las reglas; una eventual configuración por canal debe añadirse en otro parche controlado, junto con validación transaccional y pruebas.

## Instalación, dependencia y compatibilidad

- El parche ZIP requiere exactamente **SOFF v1.0.15** ya instalada mediante **P015**. No aplicar sobre v1.0.14 ni copiar archivos manualmente.
- Instalar `SOFF_P016_CARRITO_Y_DESCUENTOS_v1.0.16.zip` con `ACTUALIZAR_WINDOWS.cmd`, dejando el ZIP original sin extraer en Descargas o PARCHES.
- Ejecutar `CONTROL_FINAL_WINDOWS.cmd` después de instalar. El actualizador hace respaldo del código y verifica SHA-256; **no publica ni cambia Supabase**.
- **Sin migración SQL nueva.** Sigue siendo obligatorio aplicar/verificar **P002, P004, P005, P006, P007, P011 y P015** en la base real antes de lanzar el sistema.
- `/api/cart/prices` requiere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` del servidor, correctamente configurados en Vercel (nunca publicar la `SERVICE_ROLE_KEY` en el cliente).
- Si la versión que tiene tu amigo en Vercel difiere de 1.0.15, debe comparar y fusionar antes de desplegar. Primero ejecutar pruebas en **staging**, con copia de respaldo y cuatro usuarios de prueba.

## Pruebas esenciales en staging

1. Invitado con carrito anterior: el servidor le asigna precios minoristas y actualiza los importes, no permite precio falso guardado localmente.
2. Usuario logueado minorista: descuento 0%, 5% o 10% en $44.999, $45.000, $69.999 y $70.000. Cupón válido; comprobar importe final servidor y pantalla.
3. Usuarios mayorista, revendedor y peluquero: ver únicamente sus precios; ningún descuento automático por importe, ningún cupón minorista; rechazo también si envían un código por API.
4. Administrador aprueba cambio de categoría mientras el usuario tiene carrito: al recuperar el foco, se recotizan todos los ítems; se informa el cambio. Cerrar sesión y abrir otra cuenta debe recotizar a la lista de esta última.
5. Sin conexión a Supabase, precio comercial cero, producto inexistente o sin stock: bloquear ir al checkout y mostrar mensaje de reintento o retirada.
6. Si cambia el total durante el checkout, invalidar el comprobante OCR anterior; el servidor debe rechazar montos inconsistentes (409).
7. Reintentos concurrentes del pedido y stock deben probarse con P004/P005 en base real; P016 no sustituye estas pruebas.
8. Usar teléfonos y equipos de escritorio, validar foco/pestañas, cupones, cantidad, envío y redondeo en transferencia.

## Limitaciones conocidas

- No se instalaron cambios en Supabase, Vercel ni medios de pago reales.
- Los costos de envío y umbral gratuito continúan siendo generales para todos los perfiles. La decisión de variar estas condiciones por canal queda pendiente.
- El resumen minorista en pantallas antiguas fuera del carrito podría tardar en actualizarse tras cambios remotos de perfil. En checkout y creación del pedido rige la autoridad del servidor.
- No se habilitó Mercado Pago; permanece expresamente desactivado hasta cierre de integración y conciliación.
- Revertir el parche local no deshace pedidos, migraciones, operaciones en Supabase ni despliegues.
