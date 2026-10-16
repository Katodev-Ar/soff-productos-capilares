# SOFF / Sofía Productos Capilares
## Informe de modificaciones, mejoras y entrega técnica — versión 1.0.14

**Fecha del informe:** 16 de octubre de 2026  
**Destinatario:** titular / responsable técnico del proyecto Sofía Productos Capilares (SOFF)  
**Versión de partida:** proyecto original entregado para auditoría  
**Versión final desarrollada y compilada localmente:** **1.0.14**  
**Alcance:** catorce parches incrementales (P001–P014) y preparación del proyecto para despliegue controlado.  
**Estado:** **CÓDIGO COMPILADO CORRECTAMENTE EN WINDOWS; INTEGRACIONES, MIGRACIONES SQL Y HABILITACIÓN COMERCIAL PENDIENTES.**

> **Mensaje principal para quien recibe el proyecto:** se corrigieron vulnerabilidades y errores de diseño en seguridad, cobros, pedidos, inventario, usuarios, administración, registro fiscal y catálogo, y se mejoró la experiencia de compra. La versión 1.0.14 pasó `npm ci`, TypeScript y `npm run build` en Windows. Sin embargo, estas mejoras **no están instaladas automáticamente en la web ni en Supabase**. Para que funcionen, el responsable deberá desplegar el código, aplicar las migraciones SQL en el orden indicado, configurar las credenciales reales y realizar pruebas en un entorno de ensayo antes de permitir ventas.

---

## 1. ¿Qué es SOFF?

Sistema de comercio electrónico y administración para una tienda de productos capilares. El código utiliza **Next.js, React y TypeScript**, con **Supabase** para persistencia, usuarios y almacenamiento, y está preparado para su publicación en **Vercel** u otro alojamiento compatible. Contempla catálogo, venta a distintos perfiles de clientes, carrito y checkout, transferencias, gestión de pedidos, inventario, cupones, reportes, administración móvil y probador virtual de tinturas.

La revisión inicial abarcó un catálogo semilla de **511 productos**. La auditoría encontró, entre otros datos, **150 registros sin imagen**, **7 con stock negativo**, descripciones e instrucciones de uso pendientes, posibles duplicados y listas de precios que requieren validación del titular. Son datos iniciales del paquete auditado: **no equivalen necesariamente al estado actual de la base de producción**.

## 2. Resumen ejecutivo de los cambios

| Área | Antes / riesgo identificado | Qué se desarrolló y beneficio |
|---|---|---|
| Seguridad de usuarios | Un usuario podía intentar modificar su rol | Reglas de protección de perfiles, comprobación de administrador y controles de identidad; requieren activar y probar SQL/RLS. |
| Privacidad de comprobantes | Archivos bancarios públicos | Bucket privado y enlaces temporales para consultas autorizadas; exige migración y validación en Supabase. |
| Compras y precios | Importe del pedido y descuentos dependían de valores enviados por el navegador | Recalcular desde el servidor, validar el rol, los productos, cantidades, promociones y total. |
| Inventario | Sobreventas, existencias sin movimientos ni reversión | Reserva transaccional, control de concurrencia, historial de movimientos y restitución controlada. |
| Transferencias | El comprobante podía confundirse con un pago aprobado | Pago pendiente hasta conciliación administrativa verificada; referencias y montos controlados. |
| Mercado Pago | Flujo sin conciliación extremo a extremo comprobada | Recepción preparada de webhooks y verificación, pero **inicio de cobros deshabilitado** hasta completar integración y pruebas. |
| Administración | Estados inconsistentes, importación CSV frágil | API de cambios de estado, importación por identificadores con vista previa, validaciones y control de cupones. |
| Facturación | No existía un circuito suficiente de control documental | Registro de comprobantes ya emitidos, CAE informado, notas de crédito y exportación de control. **No emite facturas en ARCA.** |
| Catálogo | Fichas incompletas, posibles precios incoherentes, stock negativo | Auditor de calidad, exportación de observaciones y editor con controles. **No se modifican precios ni existencias automáticamente.** |
| Probador virtual | Precios/stock ficticios | Vinculación de tinturas con productos reales por identificador y bloqueo de compra sin datos confiables. |
| Mantenimiento técnico | Parches manuales y controles insuficientes | Gestor de actualizaciones, integridad SHA-256, reportes y comprobación dinámica de versiones. |
| Compilación | Fallos de TypeScript e inicialización sin Supabase | P013 y P014 permiten compilar; sin conexión válida, el sitio queda deliberadamente en modo de configuración pendiente. |

---

## 3. Detalle de los catorce parches

### P001 — Configuración bancaria (v1.0.1)

- **Problema:** las variables de entorno declaradas y las que leía el código bancario no coincidían; existían valores bancarios de respaldo dentro de la aplicación.
- **Cambio:** se alinearon las variables `NEXT_PUBLIC_BUSINESS_*`, se retiró el uso de cuentas predeterminadas y se impide habilitar transferencia si faltan los datos reales obligatorios de la cuenta receptora.
- **Beneficio:** evita mostrar una cuenta equivocada por un error de configuración. **El titular debe cargar y comprobar sus propios datos bancarios.**

### P002 — Seguridad y privacidad (v1.0.2)

- Se prepararon restricciones para impedir que clientes alteren roles o puntos desde su perfil.
- Se reemplazó la disponibilidad pública de los comprobantes por Storage privado y enlaces firmados de duración limitada.
- Se añadieron comprobaciones de identidad para pedidos y comprobantes, límites de archivos y redirección de usuarios no administradores.
- **Pendiente obligatorio:** aplicar `supabase/patches/P002_SEGURIDAD_SUPABASE.sql` y verificar reglas RLS/Storage con clientes, invitados y administradores reales de prueba.

### P003 — Precios, descuentos y checkout (v1.0.3)

- Se preparó el recálculo de precios y totales **del lado del servidor** en vez de confiar en el navegador.
- Validación de listas de precios por tipo de cliente, cantidades, stock y cupones.
- El comprobante de transferencia deja el pedido como **recibido/pendiente**, no como «pago aprobado».
- Se deshabilitó la creación de cobros con Mercado Pago hasta disponer de conciliación segura.
- La transacción íntegra de pedido/inventario se completó en P004: **P003 por sí solo no se debe publicar como checkout final**.

### P004 — Inventario transaccional (v1.0.4)

- Creación transaccional de pedido, líneas y reserva/descuento de stock mediante SQL/RPC.
- Bloqueo de registros de productos para evitar vender simultáneamente la última unidad.
- Movimientos auditables de inventario, controles contra pedidos duplicados, cancelaciones y restitución del stock reservado, evitando dobles devoluciones.
- Un pedido por transferencia **reserva stock aun con cobro pendiente**; la cancelación debe revisarse y, si hubo cobro, gestionar reintegro.
- **Pendiente:** `supabase/migrations/20261016_p004_inventory.sql`. Sin esta migración el checkout puede responder 503. No se regularizaron automáticamente los stocks negativos ya existentes.

### P005 — Conciliación de pagos (v1.0.5)

- Función administrativa para confirmar una transferencia **solamente después de verificar la acreditación bancaria**.
- Control de importe coincidente, referencia bancaria no repetida, permisos y trazabilidad de quién confirmó el pago.
- Panel `/admin/conciliacion` e historial de operaciones.
- Preparación de webhook de Mercado Pago con validación de firma y consulta al proveedor. **No se habilitó un circuito de cobro y conciliación de Mercado Pago de punta a punta.**
- **Pendiente:** `supabase/migrations/20261016_p005_payment_reconciliation.sql`, integración real del banco y pruebas de seguridad. El OCR de un comprobante **no acredita fondos**.

### P006 — Administración, importación y cupones (v1.0.6)

- Importación CSV con vista previa, identificación por código en lugar de nombre, separadores admitidos y rechazo de valores inválidos/duplicados.
- Aplicación masiva concebida como operación completa o rechazo, no actualización parcial.
- Cambios de estado de pedidos controlados desde el servidor y corrección del panel móvil para que no marque pagos sin conciliación.
- Alerta sobre reservas de más de 72 horas, sin liberar inventario automáticamente por el riesgo de cobros aún no conciliados.
- Controles de descuentos, límites de uso y vigencia de cupones.
- **Pendiente:** `supabase/migrations/20261016_p006_admin_operations.sql` y pruebas del circuito real de pedidos.

### P007 — Registro fiscal y control contable (v1.0.7)

- Nuevo panel `/admin/facturacion`: identifica operaciones cobradas sin comprobante registrado.
- Vinculación de cada pedido con la **factura emitida externamente**: numeración, datos fiscales, importes y CAE informado.
- Registro de notas de crédito asociadas a la factura original, con controles de duplicidad, total y crédito acumulado.
- Reportes CSV de conciliación documental y registro de operador/fecha.
- **No hace emisión de facturas electrónicas, no obtiene ni verifica CAE en ARCA, no liquida impuestos automáticamente y no sustituye registraciones fiscales oficiales.**
- **Pendiente:** `supabase/migrations/20261016_p007_fiscal_registry.sql`, CUIT real del emisor y revisión de su situación tributaria; definir IVA y comprobantes aplicables antes de operar.

### P008 — Calidad del catálogo y controles comerciales (v1.0.8)

- Panel `/admin/calidad-catalogo` para detectar faltantes de fotografías, descripciones, instrucciones, códigos o categorías; stock negativo o agotado; duplicados; precios fuera de parámetros y productos que requieren control sanitario.
- Exportación a CSV de las observaciones y editor administrativo con validación desde el servidor.
- Separación de ajustes de stock de la edición de la ficha; retiro de la acción de borrado del panel para preservar historial comercial.
- **No se modificó el contenido de los 511 registros automáticamente.** No está acreditado que `price_base` represente costo de compra; las alertas de margen deben interpretarse con ese dato confirmado.
- Revisar documentación, composición y situación sanitaria de artículos clasificados como «ALISADO CON FORMOL», sin prejuzgar su legalidad a partir de la categoría.

### P009 — Tienda y probador virtual (v1.0.9)

- Se quitaron precios y existencias ficticios de referencias del probador de tinturas.
- Se vincularon las trece referencias de tonos al catálogo mediante identificadores; no se permite agregar al carrito si no se obtiene precio o disponibilidad válidos.
- Mejoras en buscador (varias palabras, orden variable, tildes), filtro «Solo disponibles», carga de imágenes y accesibilidad.
- Corrección de un uso condicional de Hooks de React en el detalle del producto y metadatos de SEO.
- La simulación de color es **orientativa**, no garantía del resultado químico o estético.

### P010 — Verificador local y preparación de lanzamiento (v1.0.10)

- Se agregó `CONTROL_FINAL_WINDOWS.cmd` para comprobar integridad de archivos, versión, fuentes SQL y presencia de rutas críticas.
- Se agregó `GET /api/health`, que indica disponibilidad básica de Next.js, **sin certificar conexión a banco, Supabase o ARCA**.
- Cabeceras HTTP básicas, pruebas automáticas del verificador y `CHECKLIST_LANZAMIENTO.md`.
- Los informes separan errores locales de **verificaciones externas pendientes**.

### P011 — Estabilización integral de seguridad (v1.0.11)

- Corrección del registro y de la recuperación de contraseña; se separó el intento de acceso de la creación de cuentas.
- Preparación de una vista de catálogo `soff_catalog_public` para impedir que los clientes consulten precios base y listas reservadas a otros perfiles.
- Restricción de lectura pública de cupones y validación mediante API autorizada.
- Conservación del historial de pedidos: restricciones a eliminaciones que antes podían propagarse desde usuarios.
- Corrección del tratamiento de timestamps en notificaciones de Mercado Pago; comprobaciones de configuración del checkout.
- **Pendiente:** `supabase/migrations/20261016_p011_stabilization.sql`, imprescindible para que la protección de precios, cupones y antecedentes opere efectivamente en la base.

### P012 — Versiones del verificador (v1.0.12)

- Se corrigió la detección falsa de error tras instalar una versión posterior a 1.0.10.
- El verificador ahora compara el estado del gestor, la versión de `web/package.json` y el último parche registrado.
- Se agregó reconocimiento de la migración P011 y se ampliaron los escenarios de prueba.
- **Sin cambios comerciales ni SQL nuevo.**

### P013 — Error de compilación fiscal (v1.0.13)

- Se corrigió el error TypeScript `TS18047` en `src/app/api/admin/fiscal/route.ts` provocado por un acumulador inferido como potencialmente nulo.
- Se tipó explícitamente el acumulador numérico, sin suprimir los controles de importes inválidos.
- **Sin cambios en los datos ni en las reglas fiscales. Sin SQL nuevo.**

### P014 — Compilación sin credenciales de Supabase (v1.0.14)

- Se corrigió la inicialización de Supabase que hacía fallar el prerender de `/checkout`, `/historial` y `/_not-found` cuando faltaban variables de entorno.
- Sin configuración válida, se utiliza un cliente inerte sin conexión y se muestra una página de **configuración pendiente**, en lugar de aparentar que la tienda puede cobrar.
- Cuando el titular configure las variables reales, debe **recompilar y volver a desplegar** la aplicación para que las variables públicas queden incorporadas al cliente.
- **Sin SQL nuevo y sin habilitar ventas en ausencia de Supabase.**

---

## 4. Pruebas realizadas y evidencia de compilación

**Evidencia más reciente:** archivo `SOFF_PRUEBA_COMPILACION.txt` generado en Windows el **16/10/2026, 01:25 hora local del equipo**, para la versión **1.0.14**.

| Control ejecutado | Resultado constatado |
|---|---|
| Node.js y npm | Node **v24.21.0**, npm **11.19.0** |
| Instalación de dependencias (`npm ci`) | **Correcta: 392 paquetes instalados** |
| Chequeo de TypeScript | **Correcto, sin errores** |
| Compilación de Next.js | **Correcta**, Next.js **16.3.3** |
| Generación estática | **53 de 53 páginas generadas** |
| Resultado final (`npm run build`) | **[OK] Next.js build** |
| Gestor de parches | Instalación, hash SHA-256 y reversión probados durante el desarrollo de parches |
| Conexión a Supabase, banco, Mercado Pago, ARCA y Vercel | **No probada en servicios reales** |

La compilación completa confirma que el proyecto puede construirse sin las credenciales del titular gracias al modo de configuración pendiente; **no prueba el funcionamiento de compras, seguridad de datos o transacciones en el entorno real**. Las advertencias de npm relativas a ESLint y scripts de instalación deberán revisarse con una auditoría de dependencias, pero no impidieron el build registrado.

## 5. Qué debe recibir el titular: entrega de archivos

Este archivo `.md` **es el informe**, no el sistema. Para publicar la versión actualizada, entregar **además** la carpeta `SOFF_ACTUALIZABLE` **con los catorce parches aplicados y versión 1.0.14** (preferiblemente un ZIP con esa copia vigente), incluyendo:

- `web/` — aplicación Next.js y archivo `web/package.json` con versión 1.0.14;
- `supabase/` — esquema de referencia y migraciones SQL preparadas;
- `vercel/`, si está incluida — documentación/configuración del despliegue original;
- `README_ACTUALIZACIONES.md`, `REGISTRO_PARCHES.md`, `CHECKLIST_LANZAMIENTO.md` y archivos `LEER_P...md` — historial y procedimientos;
- `ACTUALIZAR_WINDOWS.cmd`, `CONTROL_FINAL_WINDOWS.cmd`, `tools/` y `.soff/state.json` — control de versiones local, si el propietario desea conservar el método de parches.

**No hace falta que vuelva a instalar los catorce parches si recibe una copia íntegra y verificada de la versión 1.0.14.** Los parches anteriores se conservan solamente como historial y material de restauración.

**Excluir del paquete y nunca compartir:** `.env.local`, contraseñas, claves privadas, `SUPABASE_SERVICE_ROLE_KEY` real, token privado de Mercado Pago, certificados fiscales, comprobantes personales, respaldos de clientes, `.next/`, `node_modules/`, archivos temporales y registros que contengan secretos. Conservar los respaldos seguros fuera del paquete de distribución. **Un RAR antiguo de versión 1.0.12 no sustituye la copia actualizada a 1.0.14.**

## 6. Instrucciones de despliegue para el responsable técnico

> Si ya existe una web en producción, **no sustituirla sin comparar el código existente, verificar el estado real de la base y crear respaldos**. El procedimiento siguiente debe ejecutarse primero en **staging/ensayo** y con acceso autorizado del propietario.

### A. Preparación

1. Confirmar que se recibió **SOFF v1.0.14** y que corresponde al proyecto real del titular.
2. Respaldar **base PostgreSQL, datos de Storage, código publicado y configuración de despliegue**. Comprobar que se podrían recuperar.
3. Crear un entorno de ensayo con datos de prueba, separado de producción; identificar tablas, columnas y funciones SQL preexistentes antes de ejecutar scripts.
4. **No ejecutar automáticamente** los scripts de esquema o semillas `supabase/01_schema.sql` a `06_seed_settings.sql` sobre una base que ya tiene operaciones. Revisar las diferencias y migrar lo que corresponda.

### B. Migraciones de Supabase — aplicar en este orden, previa revisión

Los siguientes **seis scripts están incluidos como archivos, pero no están acreditados como ejecutados en Supabase**:

1. `supabase/patches/P002_SEGURIDAD_SUPABASE.sql` — perfiles/RLS y recibos bancarios privados.
2. `supabase/migrations/20261016_p004_inventory.sql` — stock, reservas y movimientos.
3. `supabase/migrations/20261016_p005_payment_reconciliation.sql` — confirmación y registro de transferencias.
4. `supabase/migrations/20261016_p006_admin_operations.sql` — administración, importaciones y estados.
5. `supabase/migrations/20261016_p007_fiscal_registry.sql` — registro y control fiscal.
6. `supabase/migrations/20261016_p011_stabilization.sql` — protección adicional de catálogo, cupones, usuarios e historial.

Ejecutar **solo las migraciones necesarias que no estén aplicadas**, tras revisar dependencias, estructura de la base y posibles conflictos con datos existentes. **Primero en staging**, con verificación de políticas RLS, privilegios, funciones RPC, índices, triggers y compatibilidad de cada cambio. En producción, coordinar ventana de mantenimiento y puesta en marcha de código/SQL para no dejar versiones incompatibles. Revertir el código de Windows **no revierte la base de datos**.

### C. Configuración de Vercel u otro alojamiento

- Usar `web/` como **Root Directory** de la aplicación Next.js.
- Configurar las variables de entorno según `web/.env.example`. Como mínimo, revisar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SITE_URL`.
- Cargar **los datos bancarios reales** en las variables `NEXT_PUBLIC_BUSINESS_*` utilizadas por el sitio. Verificar titular, alias y CBU/CVU con el dueño, sin usar datos de muestra.
- Mantener las credenciales de servidor **exclusivamente en variables secretas del alojamiento**. La clave `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` **no deben aparecer en `NEXT_PUBLIC_*`, archivos distribuidos ni capturas**.
- Dejar `SOFF_ENABLE_MP_WEBHOOK` deshabilitado hasta que exista un entorno de prueba autorizado y se validen firma, secreto y callback; el flujo de inicio de pagos Mercado Pago permanece deshabilitado.
- **Recompilar y publicar** después de cargar las variables de Supabase: no es suficiente configurar claves en un despliegue antiguo.
- Confirmar dominio, HTTPS, URL de retorno, correo y responsables operativos con el propietario.

### D. Pruebas funcionales y de seguridad indispensables antes de abrir ventas

1. **Usuarios:** alta, login, recuperación, roles reales, bloqueo de edición de permisos; confirmar que un usuario normal no accede a áreas admin.
2. **Catálogo:** perfiles minorista/mayorista, precios autorizados, ausencia de exposición de `price_base`, productos sin stock y precios por rol; imágenes y filtros.
3. **Cupones:** impedir consultar códigos reservados, validar fechas, límites, usos simultáneos y aplicación efectiva del descuento.
4. **Stock:** dos pedidos simultáneos de la última unidad, reintentos, cancelación una sola vez, historial de movimientos, ajustes e importación CSV completa o fallida.
5. **Transferencias:** cobro real versus comprobante falso; identidad del administrador, importe exacto, referencia duplicada, bloqueo de cambio directo a pagado y política de reintegros.
6. **Comprobantes:** bucket `receipts` privado; negar lectura de comprobantes de terceros y cargas anónimas; enlaces temporales funcionales.
7. **Fiscal:** registrar únicamente comprobantes efectivamente autorizados; cotejar importes, CUIT, CAE, notas de crédito, exportaciones y situación frente al IVA.
8. **Mercado Pago:** mantener deshabilitado hasta completar preferencias, webhooks, identificación de pedido, conciliación de pagos, comisiones, reintegros y contracargos.
9. **Experiencia:** navegación móvil/escritorio, carrito, mensajes de error, probador, compatibilidad de navegadores, accesibilidad y rendimiento.
10. **Requisitos comerciales/legales:** botón de arrepentimiento y devoluciones aplicables a venta a distancia; condiciones de compra, contacto, privacidad y revisión sanitaria del catálogo.
11. **Seguridad técnica:** `npm audit`, revisión de dependencias, backups restaurables, HTTPS, cabeceras y registro de errores; no publicar hasta cerrar hallazgos relevantes.

### E. Validación del catálogo por el dueño

El sistema de auditoría **señala** registros que requieren revisión, pero **no sanea automáticamente** los datos. Confirmar existencias físicas, precios por canal y su significado contable, márgenes, fotografías, descripciones, duplicados, advertencias de uso y situación sanitaria de los productos correspondientes. Registrar los ajustes mediante los mecanismos auditables del inventario, no con modificaciones directas no documentadas.

## 7. Decisiones que debe tomar el titular

- Si la web reemplazará una instalación existente o se publicará como nueva.
- Quién administra usuarios y qué perfiles comerciales están autorizados.
- Qué cuenta bancaria recibe cobros y **quién controla el extracto** antes de confirmar transferencias.
- Política sobre reservas de stock, plazos para pagar, cancelaciones, reintegros, entregas y envíos.
- Costos, listas de precios y descuentos; definición exacta del campo `price_base`.
- Condición fiscal, identificación del emisor y proceso vigente de emisión de comprobantes ante ARCA.
- Integración futura de Mercado Pago y autorización de cuentas/secrets.
- Revisión de textos legales y documentación sanitaria de artículos capilares.
- Aprobación final del pase a producción luego de las pruebas.

## 8. Situación final y criterio de aceptación

**Confirmado por pruebas locales del código:** actualización a 1.0.14 según informe de compilación, TypeScript correcto y `npm run build` exitoso en Windows (53/53 páginas estáticas). Se prepararon el gestor y las migraciones descritas.

**No confirmado todavía:** publicación efectiva, aplicación de las seis migraciones en Supabase, funcionamiento de permisos y Storage reales, compra/pago reales, integridad de stock y conciliación con base efectiva, conexión fiscal ARCA, revisión legal/sanitaria y aprobación del propietario.

**Dictamen de entrega:** **APTO PARA ENTREGAR AL RESPONSABLE TÉCNICO PARA CONFIGURACIÓN Y PRUEBAS. NO APTO PARA HABILITAR VENTAS REALES SIN LOS CONTROLES PENDIENTES.**

---

### Archivos de consulta dentro del proyecto

- `SOFF_HISTORIAL_Y_PLAN_DE_MEJORAS.md`: historial acumulado de P001 a P014 (algunas referencias a pruebas pendientes pueden ser anteriores al último build exitoso).
- `REGISTRO_PARCHES.md`: cambios registrados por versión.
- `LEER_P002_SEGURIDAD.md` a `LEER_P014_COMPILACION_SIN_SUPABASE.md` (según número de parche): instrucciones específicas y limitaciones.
- `CHECKLIST_LANZAMIENTO.md`: pendientes de producción.
- `supabase/patches/` y `supabase/migrations/`: SQL pendiente de implementar según el estado real de la base.
- `SOFF_PRUEBA_COMPILACION.txt` del 16/10/2026, 01:25: evidencia del build aprobado en Windows (si se decide adjuntarlo, revisar que no incluya información privada).

**Nota:** este informe describe cambios preparados en el código entregado y pruebas documentadas, sin atribuirse acceso a las cuentas del titular ni afirmar cambios aplicados en los servicios externos.
