# SOFF P015 — Gestión comercial y cuatro listas de precios (v1.0.15)

**Qué incluye**

- Panel administrativo `/admin/comercial`: solicitudes pendientes, aprobación/rechazo, asignación manual de categorías minorista, mayorista, revendedor y peluquero.
- Cuatro precios por artículo en una tabla editable; el sistema **ya tenía** los cuatro campos en `products`, se añade una interfaz específica, validación en el servidor e historial auditable de cambios realizados desde este panel.
- Costo **real** de adquisición (opcional) guardado en tabla privada, separado de `price_base`. Estimación del margen bruto comercial para cada una de las cuatro listas (cuando exista costo y precio positivo). Se excluyen tributos, fletes, comisiones, promociones, devoluciones y otros costos indirectos.
- Portal del cliente `/cuenta/comercial`: solicitud de perfil comercial y consulta de estado.
- Enlaces desde el perfil del comprador, el registro y la página de mayoristas.
- Roles asignados por procedimiento exclusivo de servidor; un cliente no puede asignarse una lista especial desde el navegador. Administradores no pueden ser degradados por este panel.
- Auditoría histórica de categorías y precios/costo. Los pedidos existentes mantienen los valores históricos.

## Instalación local: parche incremental, NO reinstalar toda la web

1. Comprobar que la carpeta `SOFF_ACTUALIZABLE` esté en la versión **1.0.14** y que `CONTROL_FINAL_WINDOWS.cmd` no encuentre divergencias no explicadas.
2. Guardar externamente copia del código, configuración Vercel y respaldo verificado de Supabase antes de desplegar cualquier cambio.
3. Dejar el ZIP `SOFF_P015_GESTION_COMERCIAL_v1.0.15.zip` **sin descomprimir** en Descargas o en `PARCHES` junto al proyecto.
4. Doble clic en `ACTUALIZAR_WINDOWS.cmd`. Debe pasar a **1.0.15**. Verificar con `CONTROL_FINAL_WINDOWS.cmd`.
5. **El doble clic NO instala nada en Vercel, NO ejecuta SQL y NO cambia precios reales ni clientes.**

## Migración SQL obligatoria (tarea del responsable técnico)

`supabase/migrations/20261016_p015_commercial_management.sql`

**Antes:** validar que se aplicaron P002, P004, P005, P006, P007 y P011. Comparar con esquema real, revisar roles y privilegios, tomar backups de base y Storage, y aplicar primero a un proyecto de ensayo. **No ejecutar scripts base `01_schema.sql` a `06_seed_settings.sql` sobre datos existentes.**

El SQL introduce tablas de solicitudes, historial de cambios de categoría, costos reales privados e historial de cambios de precios. Crea procedimientos `SECURITY DEFINER` restringidos a `service_role` para realizar las transiciones y auditoría atómicamente. Se requieren validaciones con tokens de visitantes, minoristas, especiales y administradores. Si falta la migración, el nuevo panel no funciona; se muestra aviso de error. **No publicarlo a clientes hasta que estén código, SQL y credenciales coordinados.**

## Comprobaciones de aceptación en staging

1. Registrar un comprador nuevo: rol inicial `minorista` aunque intente enviar `role=admin` en metadatos de registro.
2. Solicitar categoría `mayorista`, `revendedor` o `peluquero`. Debe permanecer minorista y existir **una sola solicitud pendiente** (no duplicación en simultáneo).
3. Un administrador aprueba: el rol cambia, se registra quién y cuándo; rechazo mantiene categoría y deja nota. Repetir una decisión: se rechaza por procesada.
4. Un cliente no puede leer solicitudes ajenas, costos, historial ni modificar su rol por REST de Supabase ni invocar procedimientos SQL directamente.
5. El administrador no puede degradar otro admin. Cambio manual de rol requiere motivo y registra auditoría.
6. Guardar cuatro precios y costo. Ver los valores en el panel; confirmar que precios antiguos de pedidos no cambian; el costo NO aparece en catálogo ni endpoints de comprador.
7. Producto sin costo: margen `—`. Precio especial 0: producto no vendible en ese canal; minorista siempre >0.
8. Simular compradores con roles distintos, verificar precios visibles en catálogo, cotización final del **servidor** y recibos. Comprobar luego qué ocurre al cambiar de rol con un carrito ya creado: el precio del carrito puede permanecer cacheado; **la cotización final del servidor sigue siendo la autoridad**. Se recomienda corregir sincronización de carrito en un parche posterior.
9. Verificar importación masiva de productos y editor antiguo: conservan comportamiento previo; los cambios realizados **fuera del nuevo panel** no se registran automáticamente en `soff_commercial_price_history`.
10. Revisar de manera conjunta tarifas mínimas, descuentos automáticos (actualmente 5%/10% por volumen), compatibilidad de cupones, envíos y políticas por canal. **Este parche no cambia todavía esas reglas de negocio** para no definirlas sin autorización del dueño.

## Límites de esta entrega

- Los precios por rol estaban implementados antes de P015. Este parche habilita su operación administrativa integrada, no reemplaza el checkout existente.
- Costos y porcentajes se cargan **manualmente**; no hay integración con facturas de proveedores, ARCA ni inventario valorizado.
- No se ha conectado ni probado contra Supabase, Vercel o pagos de la tienda real. Los scripts SQL son para revisión y aplicación controlada por un responsable con acceso.
- El panel carga hasta 10.000 registros por cada conjunto (productos/clientes/solicitudes); ante mayor volumen se necesita paginación del lado del servidor.
- No actualizar producción sin comparar la versión instalada en Vercel. Un rollback local NO revierte migraciones ni operaciones comerciales realizadas.
