# SOFF — Checklist para el titular (antes de publicar)

**Estado inicial: NO APTO PARA PRODUCCIÓN.** Este documento es un registro de trabajo, no una constancia de cumplimiento. Cada casilla requiere evidencia, fecha, ambiente y responsable; no basta con marcarla.

## Control mínimo de salida

- [ ] Se identificó qué código tiene publicado el negocio y coincide con la versión 1.0.10 revisada.
- [ ] Backups de PostgreSQL, Supabase Storage, credenciales configuradas y código; restauración probada.
- [ ] Se ensayaron en **staging** las migraciones P002, P004, P005, P006, P007 en orden, con rollback y permisos restringidos.
- [ ] Se probaron perfiles cliente/administrador, comprobantes privados y lectura autorizada.
- [ ] Pedido manipulado en navegador se rechaza y la cotización del servidor coincide con los artículos.
- [ ] Dos compras simultáneas de la última unidad: solo una reserva; movimientos de stock trazables.
- [ ] Transferencia falsa no acredita pedido; transferencia real se concilia sin duplicados, cancelaciones y reembolsos comprobados.
- [ ] Mercado Pago permanece deshabilitado o se implementó de forma independiente, con webhook, reconciliación y aprobación del titular.
- [ ] Facturación conforme condición fiscal del contribuyente: factura real, CUIT, CAE, notas de crédito, impuestos, conciliación.
- [ ] Se corrigieron los 7 stocks negativos originales, revisaron precios por debajo de base y se depuraron los 511 productos.
- [ ] Se revisaron composición, rotulado y situación sanitaria de artículos regulados.
- [ ] Botón de arrepentimiento, mecanismos de devolución/cancelación y datos de contacto son accesibles y fueron revisados jurídicamente.
- [ ] Se probó compilación `npm ci`, `npm run lint`, `npm run build` y auditoría de dependencias con conectividad segura.
- [ ] Se probaron navegadores, teléfonos, recuperación de contraseñas, correos, accesibilidad, rendimiento y privacidad del probador.
- [ ] Monitoreo, alertas, procedimiento de incidentes, responsable de soporte y presupuesto de servicios definidos.
- [ ] El titular autorizó **por escrito** la fecha y condiciones de publicación.

**Evidencia / responsable / fecha por punto:** completar junto al ticket o acta correspondiente. Este archivo no se modifica automáticamente al aplicar un parche.

## Orden de SQL (no ejecutar automáticamente)

1. `supabase/patches/P002_SEGURIDAD_SUPABASE.sql`
2. `supabase/migrations/20261016_p004_inventory.sql`
3. `supabase/migrations/20261016_p005_payment_reconciliation.sql`
4. `supabase/migrations/20261016_p006_admin_operations.sql`
5. `supabase/migrations/20261016_p007_fiscal_registry.sql`

**Advertencia:** revisar primero el esquema existente de la base con un técnico. Los SQL no son instrucciones universales para reinstalar un sistema ni debe suponerse que pueden ejecutarse directamente sobre producción sin ensayos.

## Resultado Go / No-Go (solo el titular puede autorizar)

- Decisión: **NO-GO (hasta verificar evidencias)**.
- Responsable técnico: ______________
- Responsable comercial: ______________
- Fecha de revisión: ______________
- Incidentes críticos abiertos: ______________
- Firma / constancia: ______________

## P015 — Comercial
- [ ] Comparar cambios P015 con código en Vercel y respaldar.
- [ ] Aplicar migración P015 en staging, tras migraciones previas, y verificar RLS.
- [ ] Probar solicitudes, duplicados, aprobación/rechazo y seguridad de perfiles.
- [ ] Validar precios de los cuatro canales con carrito/checkout reales.
- [ ] Confirmar costos reales y márgenes (sin asumir que price_base sea costo).
- [ ] Definir reglas de descuentos, cupones y mínimos por canal antes de comercializar.
- [ ] Desplegar Vercel recién con SQL y validaciones completas; no habilitar cobros aún por mera compilación.

### P016 — Política comercial y recotización del carrito
- [ ] Aplicar P016 sobre P015 (1.0.15), ejecutar control local de integridad y compilar para Vercel.
- [ ] Confirmar con el titular política transitoria: minorista 5%/10% y cupones, sin promociones acumulables para mayorista/revendedor/peluquero.
- [ ] Ensayar cuatro clientes aprobados + invitado, cambio de rol, sesión, recotización en foco, stock agotado y caída de API.
- [ ] Verificar que el servidor rechace cupones especiales incluso enviados manualmente y que el precio no dependa de `localStorage`.
- [ ] Comprobar que el comprobante de transferencia anterior se invalide si varía el importe.
- [ ] Verificar P015/P011 + migraciones anteriores en Supabase antes de lanzar.

### P017 — Condiciones comerciales configurables
- [ ] Instalar P017 **sobre v1.0.16**, verificar hashes, ejecutar pruebas Node y compilar Next.js.
- [ ] Aplicar SQL `20261016_p017_channel_terms.sql` después de P015 **en staging**, sin reejecutar semillas destructivas.
- [ ] Probar 4 usuarios aprobados más visitante, mínimos, escalones, cupones, envío gratis por lista y cambios simultáneos.
- [ ] Comprobar que no se expongan otras listas ni condiciones administrativas en la API pública, y que RLS bloquee edición sin rol admin.
- [ ] Confirmar en servidor pagos con importes y descuentos recalculados y bloqueo al faltar SQL.
- [ ] Aprobar importes mínimos/reglas por parte del titular antes de producción.
