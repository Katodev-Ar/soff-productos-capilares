# SOFF — Registro de mejoras realizadas y plan de actualizaciones

**Proyecto:** Sofía Productos Capilares / SOFF  
**Edición:** 16 de octubre de 2026  
**Última versión de código preparada:** 1.0.10 (P010)  
**Propósito:** explicar qué se modificó, para qué sirve y cuáles son las mejoras pendientes.

> **Importante — alcance real:** P001 a P009 fueron preparados y entregados como parches; P010 se prepara con esta edición. La persona que los instala confirmó P001 y P002 en Windows; no contamos con confirmación explícita de instalación de P003 a P009. No tenemos acceso a Supabase, Vercel, el banco ni la cuenta Mercado Pago. Por tanto, **"parche instalado" no equivale a "mejora funcionando en la web"**. Las migraciones y pruebas de producción siguen pendientes y deben realizarlas personas autorizadas.

## 1. Qué es el sistema

Sofía Productos Capilares es una tienda web para vender productos capilares al consumidor final y a compradores con listas de precios especiales. Utiliza Next.js/React, una base de datos PostgreSQL a través de Supabase y contempla almacenamiento de comprobantes, administración de productos, usuarios, pedidos, descuentos y stock. Contiene un probador virtual de tinturas y elementos para gestión móvil.

La auditoría inicial descubrió fallas en roles administrativos, importes recibidos desde el navegador, archivos bancarios públicos, comprobación de transferencias, stock, conciliación, calidad del catálogo y documentación comercial. Los parches priorizan esas áreas antes de sumar funciones nuevas.

## 2. Diferencia entre código, instalación y producción

1. **Código preparado:** existe un ZIP con las modificaciones que se pueden instalar localmente.
2. **Instalación local:** el archivo `ACTUALIZAR_WINDOWS.cmd` detecta el ZIP descargado, verifica la versión, hace respaldo y actualiza archivos. No utiliza Supabase ni Vercel.
3. **Migración de datos:** las nuevas tablas, permisos y funciones de PostgreSQL requieren ejecutar el SQL en Supabase, con respaldo previo. Los ZIP no realizan este paso automáticamente.
4. **Despliegue:** el propietario deberá publicar la nueva versión de la web en su alojamiento (por ejemplo Vercel).
5. **Validación real:** se comprueban permisos, pagos, reservas de stock, operaciones concurrentes y coherencia del sistema en un entorno de pruebas antes de la producción.

**Hoy las etapas 3 a 5 siguen pendientes.** No se deben presentar estas actualizaciones como protecciones ya activas en el sitio público.

## 3. Mejoras ya preparadas y entregadas

### BASE — v1.0.0: mecanismo de parches

**Problema anterior:** para incorporar mejoras se corría el riesgo de reemplazar manualmente toda la carpeta del sistema y perder cambios.

**Solución:** se normalizó el proyecto, se eliminaron 67 archivos duplicados idénticos y se creó un gestor de parches que reconoce versiones y verifica hashes SHA-256. Respalda archivos modificados y permite revertir el último parche de código.

**Beneficio:** actualizaciones pequeñas, trazables, más rápidas de instalar y con una forma de recuperar archivos si una actualización falla.

**Limitación:** el actualizador no autentica criptográficamente quién creó el parche; solo hay que instalar ZIP de fuente confiable. No aplica SQL, no despliega a la nube y no revierte pagos ni datos.

### P001 — v1.0.1: configuración bancaria

**Problema anterior:** la plantilla de variables y el código usaban nombres diferentes para los datos bancarios y podía mostrarse una cuenta predeterminada equivocada.

**Solución:** se unificaron los nombres de las variables de entorno, se quitaron los datos receptores incrustados y el servidor bloquea transferencias cuando no hay una cuenta válida configurada.

**Beneficio:** reduce el riesgo de dirigir transferencias a datos erróneos.

**Limitación:** el titular debe proporcionar los datos bancarios verdaderos en las variables de entorno del despliegue. No verifica por sí mismo que la cuenta le pertenezca.

### P002 — v1.0.2: permisos y privacidad de comprobantes

**Problema anterior:** el usuario podía modificar su rol y los comprobantes tenían políticas de almacenamiento públicas.

**Solución:** se prepararon restricciones de permisos, políticas de almacenamiento privado y enlaces temporales para consultar comprobantes sin exponerlos públicamente.

**Beneficio:** reduce el riesgo de escalamiento de privilegios y divulgación de documentos bancarios.

**Pendiente:** aplicar la migración P002 en Supabase, probar acceso cliente/administrador e implementar el despliegue. Haber copiado el ZIP local **no** cambió la seguridad de la base online.

### P003 — v1.0.3: precios, usuarios y pedidos

**Problema anterior:** el servidor recibía importes y datos del pedido desde el navegador y podía aceptar valores manipulados. Una pantalla trataba una transferencia presentada como si estuviera pagada.

**Solución:** se implementó el cálculo de totales según datos confiables en servidor, validaciones de carrito, descuentos y sesión, y se reemplazó «Pago aprobado» por «Pedido recibido». Se deshabilitó temporalmente la generación de preferencias de Mercado Pago hasta tener conciliación segura.

**Beneficio:** evita confiar en precios enviados por el comprador y reduce mensajes incorrectos sobre acreditaciones.

**Pendiente:** probar reglas de negocio con el catálogo real, configuraciones de envío, descuentos y credenciales del propietario; comprobar funcionamiento en web publicada.

### P004 — v1.0.4: inventario transaccional

**Problema anterior:** pedidos y descuentos de stock no formaban parte de la misma operación, con riesgo de pedidos incompletos y sobreventa.

**Solución:** se preparó una función SQL para registrar pedido, detalle, cupón, reserva y movimientos de stock en una transacción, con controles de concurrencia e identificadores de reintento. También se agregó restitución de stock al cancelar pedidos compatibles, historial y normalización de estados en el panel móvil.

**Beneficio:** cuando se aplique la migración y se valide, dos compras concurrentes de la última unidad no deberían poder reservar ambas la mercadería; permite rastrear cambios de inventario.

**Pendiente:** SQL `supabase/migrations/20261016_p004_inventory.sql`, pruebas simultáneas y regularizar los stocks negativos legados. El stock se reserva al crear un pedido de transferencia aun si no se acreditó dinero; P006 incorpora alertas de pedidos pendientes de más de 72 horas y liberación manual previa revisión bancaria; la caducidad automática sigue sin implementarse.

### P005 — v1.0.5: conciliación de transferencias y preparación de Mercado Pago

**Problema anterior:** el comprobante presentado por un cliente no prueba acreditación bancaria. El administrador podía cambiar manualmente el pedido a «pagado» sin un asiento de conciliación asociado.

**Solución:** se agrega un formulario de conciliación al panel de pedidos y un endpoint protegido para administradores. El operador deberá verificar el extracto bancario, ingresar referencia e importe, marcar la comprobación y confirmar. La función SQL comprobará importe, estado y unicidad de referencia, guardará quién verificó el pago y recién entonces cambiará el estado a «pagado». Un disparador impide efectuar el cambio de estado omitiendo el registro de conciliación.

**También incluye:** nueva pantalla «Conciliación de cobros» con historial de transferencias y notificaciones de Mercado Pago. Se prepara un receptor de webhook que valida firma HMAC, consulta el pago directamente a la API oficial y registra información mínima sin modificar pedidos. Mercado Pago continúa deshabilitado para iniciar nuevos cobros porque falta el flujo de creación de órdenes MP y pruebas de extremo a extremo.

**Beneficio:** mayor trazabilidad de quién confirmó un cobro, cuándo, por cuánto y con qué referencia. Detección de duplicados e importes discordantes. Preparación más segura para una futura integración de MP.

**Limitaciones fundamentales:** la confirmación bancaria es **manual** y se basa en la verificación humana en el extracto del banco. No existe una conexión bancaria que pruebe automáticamente el ingreso. El webhook MP permanece apagado salvo activación explícita del propietario y **no acredita órdenes por sí solo**. La conciliación de reintegros, contracargos y liquidaciones netas sigue pendiente de la habilitación y pruebas de integración.

**Pendientes:** SQL `supabase/migrations/20261016_p005_payment_reconciliation.sql` (requiere P002 y P004), despliegue y pruebas con permisos reales, lectura del extracto y credenciales MP cuando el dueño las aporte. No ejecutar el SQL en una base de producción sin respaldo y ensayo.

### P006 — v1.0.6: administración de pedidos, importación CSV y cupones (PREPARADO)

**Problemas:** se importaba inventario por nombre (inseguro ante nombres repetidos), la carga tenía un parser frágil y utilizaba columnas de precios inexistentes, el panel móvil todavía podía marcar pagos como verificados y los estados se modificaban directamente desde el navegador.

**Cambios de código:** importador por UUID/SKU/código de barras, vista previa con confirmación, CSV con comillas y separadores estándar, límite de valores y rechazo de claves repetidas. Un endpoint y RPC SQL harán que la importación sea atómica. Se quita «Marcar pago verificado» del móvil; los cambios de estado de ambos paneles pasan por servidor con autorización administrativa, transiciones controladas y bitácora de cambios. La cancelación de una orden pagada queda bloqueada mientras no exista el circuito de reintegros. Se agrega alerta visual de pedidos pendientes más de 72 h, con revisión/cancelación manual previa consulta bancaria, sin liberación automática. Cupones: validación de códigos/límites, desactivación en vez de eliminación y servidor autorizado.

**Beneficios esperados al desplegar:** evitar actualizaciones en el producto equivocado, impedir importaciones parciales, conservar historial y asegurar que no se marquen cobros sin conciliación.

**Pendiente:** migración `supabase/migrations/20261016_p006_admin_operations.sql` (requiere P002/P004/P005), despliegue en staging, pruebas de CSV ambivalente, permisos y cancelaciones. **No se han aplicado esos cambios a una base real.** Más detalles y criterios de pruebas en `LEER_P006_ADMINISTRACION.md`.

## 4. Próximas mejoras planificadas (todavía NO desarrolladas)

### P007 — v1.0.7: registro fiscal externo y reporte contable (PREPARADO)

**Problema anterior:** los pedidos y cobros no tenían una referencia verificable al comprobante fiscal, no había control de facturas pendientes, notas de crédito ni exportación fiscal.

**Solución de código:** se crea `/admin/facturacion` para listar pedidos y detectar acreditados sin factura registrada. Se prepara un endpoint restringido a administradores y tablas SQL para registrar **facturas y notas de crédito YA EMITIDAS FUERA DE SOFF**, relacionarlas con pedidos, cargar numeración, CAE, datos del receptor e importes extraídos del documento real; se impide duplicar facturas, sobrepasar el crédito acumulado y alterar registros fiscales existentes. Se incorpora reporte CSV para control contable.

**Controles:** la factura debe pertenecer a un pedido acreditado, coincidir con su total y utilizar la CUIT de emisor configurada por el propietario; no se inventan alícuotas. La captura manual del CAE **no constituye verificación electrónica**, ni el sistema lo solicita a ARCA. No genera una factura legal ni sustituye las obligaciones de registración del contribuyente.

**Pendientes:** SQL `supabase/migrations/20261016_p007_fiscal_registry.sql`, CUIT real del emisor, datos de cliente, condición tributaria, prueba en staging, publicación y validación contable. La emisión automática con ARCA/WSFEv1 **NO está implementada**. La facturación parcial, notas de débito, tipos especiales, percepciones, comisiones, reintegros e informes oficiales quedan como trabajos futuros.

**Más detalles y pruebas:** `LEER_P007_CONTROL_FISCAL.md`. 

### P008 — v1.0.8: diagnóstico de catálogo y editor seguro

**Problema anterior:** fichas vacías, stocks negativos históricos, duplicaciones, precios sin revisar y un editor que permitía borrar registros o modificar stock sin separación de responsabilidades. Algunas fichas publicaban instrucciones genéricas no verificadas.

**Solución preparada:** módulo de auditoría del catálogo conectado a los productos reales cuando haya Supabase, filtro de observaciones, exportación CSV, validaciones de precio y códigos, editor con endpoint administrativo y campos permitidos, eliminación del botón de borrado y eliminación de textos de uso inventados. No se alteró ninguna de las 511 filas originales del archivo semilla.

**Beneficio:** el responsable comercial puede conocer y priorizar problemas de calidad sin ejecutar modificaciones masivas ni borrar registros asociados a pedidos.

**Limitaciones y pendientes:** falta confirmar costos y márgenes; corregir fotografías/stock/documentación uno por uno; comprobar productos etiquetados como `ALISADO CON FORMOL`; reforzar permisos de lectura y eliminación en PostgreSQL. La detección de códigos repetidos previa al guardado no es un índice único transaccional. Esta versión NO sanea automáticamente el catálogo ni garantiza rentabilidad.

**Detalles:** `LEER_P008_CATALOGO.md`. No requiere SQL nuevo para mostrar el diagnóstico, pero las dependencias SQL de P002–P007 y el despliegue siguen pendientes.

### P009 — v1.0.9: búsqueda y probador vinculado al catálogo (PREPARADO)

**Problema:** el probador llevaba precios/imagenes desactualizados y una existencia ficticia de 10 unidades; el visitante podía agregar productos sin consultar la base. El buscador solamente comparaba la frase completa, y había pequeños problemas de accesibilidad y reglas de Hooks de React.

**Solución:** se eliminaron todos los precios, fotos y stocks incrustados del probador. Solo quedan identificadores referenciales de productos. Al elegir tono se consulta Supabase en ese momento, se determina el precio según el rol, y solo se habilita comprar cuando hay stock y precio positivo. Si falta conexión, ficha o permiso, se muestra un mensaje y no se habilita el carrito. Se evitan resultados de consultas viejas al cambiar tono. Se mejoró búsqueda de varios términos sin importar tildes ni orden, filtro "Solo disponibles", textos accesibles, metadatos SEO y carga diferida de fotos.

**Beneficio:** la interfaz deja de informar importes y existencias ficticias; se navega más fácilmente y se evita confundir simulación visual con resultado garantizado.

**Limitaciones y pendientes:** las consultas y la política real de precios dependen del proyecto Supabase del propietario y de las migraciones previas. El servidor debe volver a validar al confirmar la operación (P003/P004); esta modificación no habilita ventas. La simulación NO garantiza color final. Las fotos del probador se procesan localmente según el diseño existente, pero las dependencias/modelos pueden descargarse de proveedores externos; revisar privacidad real. Cumplimiento de botón de arrepentimiento, devoluciones, textos legales, métricas de rendimiento reales, SEO de fichas individuales y pruebas de dispositivos quedan pendientes de P010/propietario; no declararlos implementados.

**Detalles:** `LEER_P009_EXPERIENCIA.md`.

### P010 — Control final offline y traspaso (v1.0.10)

**Problema:** instalar los parches en Windows no acredita que Supabase, pagos, facturación ni funcionalidades críticas funcionen en internet. El último parche debe impedir interpretaciones engañosas de un estado «actualizado».

**Solución entregada:** un segundo acceso de un clic `CONTROL_FINAL_WINDOWS.cmd` ejecuta `qa/soff_final_check.py`, verifica la versión, integridad SHA-256, fuentes de migraciones, rutas críticas y señales de configuración sensible; genera informes `.soff/qa/ULTIMO_CONTROL.txt` y `.json`. Se agrega una prueba automatizada del verificador con casos positivos y negativos, cabeceras HTTP básicas y `GET /api/health` (indica solamente que responde Next.js).

**Documentos:** `CHECKLIST_LANZAMIENTO.md` enumera evidencias requeridas; `LEER_P010_CONTROL_FINAL.md` explica instrucciones y limitaciones. El reporte **siempre muestra «NO APTO PARA PRODUCCIÓN»**, porque ninguna herramienta offline puede verificar las condiciones externas.

**Pendientes reales:** migraciones y RLS en Supabase, backups y recuperación, pruebas con banco y MP, ARCA/registración fiscal, botón de arrepentimiento y devoluciones, catálogo y controles sanitarios, seguridad y QA de staging, auditoría de dependencias y firma de aprobación del titular.

**Resultado:** cronograma de parches de código completo; **no** significa tienda habilitada para operar.

## 5. Plan de instalación de código en la computadora

1. Conservar la carpeta principal `SOFF_ACTUALIZABLE` con `ACTUALIZAR_WINDOWS.cmd` en su raíz (no dentro de `tools`).
2. Descargar el ZIP del nuevo parche, sin descomprimirlo, a **Descargas**.
3. Hacer doble clic en `ACTUALIZAR_WINDOWS.cmd`.
4. Comprobar el mensaje de éxito y la nueva versión. Los parches son secuenciales, no se pueden saltear: P003 → P004 → P005 → P006 → P007 → P008 → P009 → P010.
5. Guardar el ZIP y este documento como constancia.

**Si aparece «versión incompatible» o «archivo modificado», no reemplazar los archivos a mano:** hay que revisar la versión instalada y el mensaje exacto del actualizador.

## 6. Lista de trabajos que deberá realizar el propietario

- Confirmar código desplegado vs. código del ZIP y obtener un respaldo de base de datos, Storage y entorno de producción.
- Aplicar P002, P004, P005, P006 y P007 en Supabase, **por ese orden**, en un proyecto de pruebas primero. P003 también exige revisar precios/stock y roles con datos reales.
- Configurar variables bancarias reales y credenciales de Supabase sin compartir secretos por WhatsApp ni incluirlos en ZIP.
- Publicar la versión actualizada en Vercel (u otro alojamiento), validar cada pantalla y asegurar HTTPS.
- Definir cómo se verifican depósitos en banco, quién aprueba cobros, qué se hace ante pago incorrecto, devolución, pedido sin pago o contracargo.
- Mantener MP desactivado hasta implementar y probar la creación de preferencias, identificación de orden, verificación de webhook y conciliación de desembolsos/comisiones.

## 7. Riesgos pendientes y criterio de aceptación

- **Críticos sin validar:** integridad de permisos en Supabase, confidencialidad de comprobantes, concurrencia de stock, conciliación y cobros reales.
- **Administrativos:** inventario inicial negativo, precios inconsistentes, vencimientos de pedidos, devoluciones y facturación.
- **Regulatorios:** datos fiscales, derechos del consumidor y control sanitario del catálogo.
- **Pruebas locales realizadas:** compatibilidad de los ZIP y su gestor; las pruebas de banco, Supabase, Vercel y comercio real quedan expresamente pendientes.

**Criterio de salida:** no habilitar cobros públicos ni afirmar «listo para producción» por el solo hecho de que Windows indique que instaló el último ZIP. Los controles dependen de las migraciones, credenciales, pruebas y aprobación del propietario.

---

**Referencias técnicas internas:** `REGISTRO_PARCHES.md`, `CRONOGRAMA_MEJORAS.md`, `LEER_P002_SEGURIDAD.md`, `LEER_P003_PRECIOS_Y_PEDIDOS.md`, `LEER_P004_STOCK.md`, `LEER_P005_PAGOS.md`, `LEER_P006_ADMINISTRACION.md`, `LEER_P007_CONTROL_FISCAL.md`, `LEER_P008_CATALOGO.md`, `LEER_P009_EXPERIENCIA.md`, `LEER_P010_CONTROL_FINAL.md`, `CHECKLIST_LANZAMIENTO.md` y migraciones SQL de cada fase.


## P011 — Estabilización posauditoría (v1.0.11)
Correcciones unificadas: registro por trigger y recuperación de acceso, login sin altas automáticas, catálogo visible por rol con vista SQL, cupones privados validados por API, conservación de pedidos, timestamps de webhooks, inicialización segura del checkout y versiones coherentes. **SQL P011 pendiente de aplicar por titular**. Los 511 productos requieren depuración documental. Controles fiscales, legales, migraciones y pruebas reales siguen pendientes. Detalle en `LEER_P011_ESTABILIZACION.md`.


## P012 — Corrección del control local de versiones (1.0.12)

El P011 se había instalado correctamente, pero el control final todavía exigía literalmente 1.0.10. El P012 elimina esa comparación fija; valida la versión que el gestor registró contra la aplicación y el historial de parches. Además contempla la existencia del SQL P011 y refuerza las pruebas del verificador. No modifica datos comerciales ni instala SQL ni hace despliegues. Las revisiones externas continúan pendientes y no hay autorización de salida a producción. Consultar `LEER_P012_CONTROL_VERSIONES.md`.


## P013 — Corrección del bloqueo de compilación fiscal (1.0.13)

**Qué sucedía:** la compilación en Windows instaló correctamente 392 dependencias y compiló el código Next.js, pero falló en el control de tipos por `TS18047` al sumar `number | null` en `src/app/api/admin/fiscal/route.ts`.

**Qué cambiamos:** el acumulador fiscal ahora es explícitamente `number`; la verificación original de montos nulos y consistencia contable permanece activa. Se sincronizó `package.json` y `package-lock.json` a la versión 1.0.13. No se alteran los datos del catálogo ni la base de datos y no se agrega migración SQL.

**Estado:** la corrección pasó un control local de TypeScript sobre la operación y la prueba de instalación del parche; falta repetir `npm run build` en Windows. El proyecto aún **no es apto para producción** hasta completar las migraciones y verificaciones operativas, contables y legales.

Consultar `LEER_P013_CORRECCION_TYPESCRIPT.md`.


## P014 — Inicio seguro sin Supabase durante la compilación (1.0.14)

El informe real de Windows confirmó compilación de código y tipos en 1.0.13, pero la generación estática se interrumpía porque la URL de Supabase aún no está configurada. Se incorpora validación de la configuración pública, cliente deshabilitado sin conexión a red cuando faltan datos y página de mantenimiento para impedir operaciones aparentes. Con credenciales reales, el comportamiento de la tienda vuelve al modo normal tras **recompilar y desplegar**. Pendiente: ejecutar `npm run build` en Windows y comprobar el resultado; sin SQL nuevo y sin habilitación comercial. Ver `LEER_P014_COMPILACION_SIN_SUPABASE.md`.

### P016 (v1.0.16) — Carrito verificado y descuentos por perfil
El carrito sincroniza precios vigentes de Supabase mediante endpoint autenticado; se bloquea checkout si no puede verificar. El cálculo final servidor conserva autoridad. Promociones minoristas 5%/10% vigentes; precios comerciales diferenciados sin descuentos automáticos ni cupones minoristas acumulables hasta resolución del titular. No hay migración SQL nueva. Leer `LEER_P016_CARRITO_Y_DESCUENTOS.md`.
