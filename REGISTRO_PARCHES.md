# SOFF — Registro de parches

| Versión | Parche | Código | Pendiente externo |
|---|---|---|---|
| 1.0.0 | Base actualizable | Preparada y probada localmente | Despliegue y conexión |
| 1.0.1 | P001 — cuenta bancaria | Entregado; usuario confirmó instalación | Variables bancarias reales |
| 1.0.2 | P002 — permisos y comprobantes | Entregado; usuario confirmó instalación | SQL P002 y pruebas |
| 1.0.3 | P003 — precios y pedidos | Entregado; instalación no confirmada expresamente | Pruebas en Supabase |
| 1.0.4 | P004 — stock y reservas | Entregado; instalación no confirmada expresamente | SQL P004 y pruebas |
| 1.0.5 | P005 — conciliación | Entregado; instalación no confirmada expresamente | SQL P005 y pruebas bancarias |
| 1.0.6 | P006 — administración/CSV/cupones | Preparado como parche local | SQL P006, staging y despliegue |
| 1.0.7 | P007 — registro fiscal y control contable | Preparado como parche local, instalación del usuario sin confirmar | SQL P007, CUIT de emisor y pruebas; NO emite factura |
| 1.0.8 | P008 — auditoría de catálogo y editor | Preparado como parche; instalación sin confirmar | Pruebas con catálogo real y revisión comercial |
| 1.0.9 | P009 — probador y búsqueda | Preparado para instalación local | Pruebas con catálogo real y revisiones UX/legales |
| 1.0.10 | P010 — control final y traspaso | Preparado como parche local, instalación del usuario sin confirmar | Verificar staging, migraciones, legalidad, facturación, pruebas y aprobación del titular |

| 1.0.11 | P011 — estabilización integral | Correcciones agrupadas de seguridad, alta, login, cupones, precios y conservación de pedidos | SQL P011, staging y pruebas reales pendientes |
| 1.0.12 | P012 — control de versiones automático | Corrige falso error del verificador, pruebas y metadatos | Sin SQL nuevo; comprobaciones externas y build pendientes |

La instalación local **no** actualiza la base de datos ni la web publicada.

| 1.0.13 | P013 — corrección TypeScript fiscal | Soluciona TS18047 en acumulador de importes fiscales y actualiza versión | Repetir compilación Next.js; sin SQL nuevo |

| 1.0.14 | P014 — compilación sin Supabase | Inicialización inerte, mantenimiento seguro, versión 1.0.14 | Repetir build en Windows; sin SQL nuevo |

| 1.0.15 | P015 — gestión comercial | Cuatro listas, aprobación de perfiles y costos reales privados; preparado como ZIP incremental. | SQL P015, staging, despliegue y validación de seguridad pendientes |

## P016 — v1.0.16 | Precios verificados en carrito y descuentos por canal
- Endpoint de validación segura del carrito por usuario autenticado o visitante, sin exponer listas ajenas.
- Sincronización en carga, cambios de artículos, sesión y regreso al sitio; bloqueo de checkout si los precios no pudieron comprobarse.
- Promociones minoristas previas 5%/10%; sin descuentos automáticos ni cupones minoristas acumulables sobre listas comerciales.
- Comprobación en API de cupones, servidor de checkout y pantalla; reinicio de comprobante si cambia total.
- Sin SQL nuevo. Dependencia **P015** y migraciones anteriores. Documento: `LEER_P016_CARRITO_Y_DESCUENTOS.md`.

## P017 — v1.0.17 | Condiciones comerciales administrables
- Mínimos, dos escalones de descuento, cupones y reglas de envío gratis por minorista/mayorista/revendedor/peluquero; dashboard y API de guardado seguro.
- Reglas consultadas y verificadas por servidor; bloqueo de checkout si falta SQL o no se cumple mínimo.
- Tabla y auditoría `soff_channel_terms`/`soff_channel_terms_audit` con RLS, actor y motivo; exige SQL manual en Supabase después de P015.
- Corregido el mensaje de confirmación del umbral general, y la promesa genérica de envío gratis en fichas públicas.
- Instalación y reversión mediante gestor de parches; no publica en GitHub ni Vercel.
