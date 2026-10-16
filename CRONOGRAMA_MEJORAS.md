# SOFF — Cronograma de actualizaciones y mejoras
**Fecha de planificación:** 15/10/2026  
**Alcance:** remediaciones derivadas de la auditoría al ZIP original de Sofía Productos Capilares.  
**Modalidad:** parches incrementales independientes y secuenciales, probados en entorno de ensayo antes de promoverlos a producción.  
**Carácter de las fechas:** objetivo estimativo de planificación para un equipo con desarrollo full stack, revisión de BD y validación del negocio. No implica tareas programadas ni ejecución automática.

## Hitos de calidad
- **Puerta A (inicio):** obtener respaldo de Vercel, Supabase y credenciales *fuera* del ZIP; no operar con datos de producción en pruebas; confirmar que el código coincide con la instalación real.
- **Puerta B (seguridad + ventas):** no habilitar checkout real hasta superar las pruebas de permisos, importes del servidor, sesiones, inventario y confirmación de pagos de P002–P005; para efectuar ventas deben estar resueltos, además, facturación (P007) y controles de productos (P008).
- **Puerta C (operación y regulación):** verificar facturación y conciliación con la condición tributaria del titular, revisión sanitaria y textos regulatorios.
- **Puerta D (salida):** pruebas de regresión, rollback probado, revisión funcional del cliente y aprobación documentada.

| Parche | Objetivo de trabajo | Fechas objetivo | Prioridad | Dependencia | Entregable y criterio de aceptación |
|---|---|---|---|---|---|
| **P001** | Configuración bancaria y guía de despliegue; primer parche demostrativo del gestor | 16–20 oct 2026 | P0 | Base v1.0.0 | No hay datos bancarios incrustados, las variables coinciden y transferencias no se tramitan sin cuenta configurada |
| **P002** | Roles/perfiles y privacidad de comprobantes; políticas RLS y Storage | 21–27 oct 2026 | P0 | P001 + respaldo SQL | Un cliente no puede hacerse admin; un comprobante ajeno no es accesible; migración SQL revisada/aplicada en staging |
| **P003** | Checkout seguro: identidad de sesión, precios, descuentos e integridad de pedidos | 28 oct–6 nov 2026 | P0 | P002 | Pedido imposible con total manipulado o usuario ajeno; operación de pedido y detalle sin estados parciales |
| **P004** | Inventario transaccional y movimientos de stock; cancelaciones | 9–16 nov 2026 | P0 | P003 | Dos compras simultáneas de la última unidad: solo una confirma reserva; registro auditable de cada movimiento |
| **P005** | Pagos: transferencia no acreditada, comprobantes, MP webhook, conciliación | 17–27 nov 2026 | P0 | P004 | Un comprobante falso nunca marca «pagado»; webhook duplicado no duplica; concilia operación/cobro/pedido |
| **P006** | Unificar estados, panel administrativo, importador de SKUs y cupones | 30 nov–7 dic 2026 | P1 | P005 | Admin móvil/web coinciden, importación con identificador interno único, cupón validado del lado servidor |
| **P007** | Facturación y control contable/fiscal, IVA, CAE o integración externa | 9–22 dic 2026 | P1 | P005 + definiciones fiscales | Venta y cobro trazables a factura, impuestos y ajustes; diseño tributario validado por estudio/cliente |
| **P008** | Catálogo: 511 registros, 150 fotos, stock negativo, costos/listas, normativa sanitaria | 4–13 ene 2027 | P1 | P004 + definición comercial | 7 stocks negativos resueltos; precios excepcionales revisados; 23 artículos de categoría «alisado con formol» verificados antes de su oferta |
| **P009** | Derechos del consumidor, devoluciones, rendimiento, SEO, probador virtual conectado al catálogo | 14–21 ene 2027 | P2 | P006 + P008 | Circuito de arrepentimiento validado; probador refleja stock/precio real; pruebas móviles y accesibilidad |
| **P010** | Automatización QA, monitoreo, deploy controlado, simulacros de recuperación | 22–29 ene 2027 | P0 de lanzamiento | P001–P009 | Pruebas de aceptación registradas; respaldo y restauración verificados; acta go/no-go |

## Reglas de cada entrega
1. Cada parche incluye manifest JSON con versión de origen/destino, operaciones diferenciales y SHA-256 de cada archivo afectado; se genera un respaldo antes de aplicar.
2. Un parche se prueba primero sobre **copia** del proyecto/ambiente staging. Se instala en orden y nunca sobre archivos editados sin registrar.
3. Cambios de código ≠ despliegue ni actualización de la base en uso. Supabase requiere migraciones SQL específicas y respaldo; Vercel requiere despliegue del repositorio ya actualizado.
4. Cada fase registra evidencia: cambio realizado, pruebas de regresión, aprobador, estado y plan de reversión. No se acepta como «terminado» simplemente por copiar archivos.
5. Si una prueba P0 falla, no se publica el siguiente cambio comercial ni se habilitan cobros reales.

## Equipo y aprobaciones recomendados
**Desarrollo:** backend/Next.js y frontend. **Base de datos:** responsable PostgreSQL/Supabase. **QA:** persona distinta del autor del parche. **Negocio:** responsable del catálogo y de los cobros. **Fiscal y legal:** contador/asesoría jurídica según el caso. Estas funciones pueden distribuirse entre menos personas, pero no deben omitirse las verificaciones.

## Indicadores semanales
- Vulnerabilidades P0 abiertas/cerradas, pruebas realizadas/aprobadas, cambios SQL aplicados, pedidos conciliados con cobro y factura, diferencias de inventario, productos con imágenes y fichas completas, incidencias tras despliegue.
- Semáforo: **rojo** = pago/permisos/stock inseguro; **amarillo** = pendiente funcional sin riesgo P0; **verde** = pruebas y aceptación acreditadas.

**Importante:** los parches entregados no modifican automáticamente bases de datos, credenciales en Vercel o infraestructura; tampoco crean copias de la base viva. Estas operaciones requieren acceso y permisos concretos del propietario.

## P004 entregado en código (SQL pendiente)
Versión 1.0.4: preparado el mecanismo de stock transaccional, consulta de movimientos, reversión por cancelación y migración manual a Supabase. No está activado en ningún servidor ni se probó contra una base real.

## Actualización de seguimiento — P005
P005 v1.0.5 entregado en código: conciliación manual de transferencias verificadas en banco, RPC transaccional con referencia única, bitácora de pago, historial en panel administrador, receptor opcional de notificaciones MP. **El checkout Mercado Pago no se habilita con P005**. SQL y pruebas en Supabase/Vercel pendientes. Para descripción integral de cada fase, ver `SOFF_HISTORIAL_Y_PLAN_DE_MEJORAS.md`.

## Avance de P006 — código v1.0.6
Preparados: importación CSV con vista previa y clave única, estado seguro de pedidos, avisos de reservas >72 h sin cancelación automática, gestión de cupones desde backend y SQL diferido. Ejecución con Supabase y staging pendiente. Ver `SOFF_HISTORIAL_Y_PLAN_DE_MEJORAS.md` y `LEER_P006_ADMINISTRACION.md`.

## Avance de P007 — código v1.0.7
Registro de comprobantes fiscales **emitidos externamente** con control de factura/nota de crédito y CAE transcripto, reporte de pedidos con factura pendiente, exportación CSV protegida, migración SQL diferida. No emite comprobantes, no valida CAE ante ARCA y no determina IVA automáticamente. Pendientes configuración fiscal real y pruebas en Supabase. Ver `LEER_P007_CONTROL_FISCAL.md`.

## Avance P008 — código v1.0.8
Se prepara un panel de auditoría de datos, exportación CSV y editor más controlado. **No se corrigieron automáticamente los 511 registros históricos**, porque se necesitan los datos y decisiones del propietario. Ver `LEER_P008_CATALOGO.md`.

## Avance P009 — código v1.0.9
Se eliminaron precios, stock e imágenes ficticias del probador. Al seleccionar tono se consulta el catálogo real y se limita la compra según precio/stock. Búsqueda por múltiples términos, accesibilidad y metadatos SEO. Sin nuevos cambios de Supabase. Pendiente validar en staging, privacidad, devoluciones y botón de arrepentimiento. Ver LEER_P009_EXPERIENCIA.md.

## Avance P010 — código 1.0.10
Entregado sistema de control local con doble clic (`CONTROL_FINAL_WINDOWS.cmd`), auditoría de integridad, fuentes de migraciones y presencia de módulos críticos; endpoint de salud solo liveness y cabeceras de seguridad básicas. Pruebas unitarias del chequeador y acta `CHECKLIST_LANZAMIENTO.md`. **No hay evidencia de despliegue ni autorización del titular: NO-GO de producción.**


## Extensión P011 — v1.0.11
Etapa extraordinaria de estabilización derivada de la auditoría 1.0.10. Código local entregado; SQL, build completo, seguridad por roles y pruebas externas pendientes. No altera el calendario original P001–P010.

## Extensión P012 — 1.0.12
Corrección del falso error de versión del control local posterior a P011. Validación dinámica y seis fuentes SQL reconocidas. No incorpora requisitos de infraestructura ni autoriza producción.
