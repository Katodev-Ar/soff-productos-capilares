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
