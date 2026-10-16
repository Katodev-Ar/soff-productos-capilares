# SOFF · Integración consolidada P015 + P016 + P017

**Versión del código:** 1.0.17. **Base utilizada:** ZIP de rama `main` entregado por el titular, declarado 1.0.14. 

## Qué se integró
- P015: panel comercial, cuatro listas de precios, solicitudes/aprobación, costo y auditoría.
- P016: carrito recotizado por perfil y descuentos con validación en servidor.
- P017: compras mínimas, descuentos, cupones y reglas de envío configurables por canal.
- Adaptación de rutas originales `web/` a la raíz real de este repositorio GitHub.
- `package-lock.json` sincronizado con la versión 1.0.17.
- Ajuste de seguridad: `src/lib/paymentConfig.ts` ya no usa datos bancarios fijos de reserva.
- Se restaura el gestor de parches `tools/soff_patcher.py` y `.soff/state.json` para futuros parches **con rutas de GitHub**.
- Pruebas `qa/test_p016_prices.cjs` y `qa/test_p017_terms.cjs` adaptadas a raíz del proyecto.

## Orden de puesta en marcha — NO publicar ventas hasta verificar
1. Crear rama `integracion-p015-p017` en GitHub, subir estos cambios y solicitar revisión a quien controla Vercel/Supabase. Verificar que ningún compañero haya cambiado `main` desde la descarga base.
2. Realizar `npm ci`, `npx tsc --noEmit`, `node qa/test_p016_prices.cjs`, `node qa/test_p017_terms.cjs` y `npm run build` en un entorno controlado con configuración de **staging**.
3. Respaldar base y Storage de Supabase y verificar qué migraciones están ya aplicadas. No ejecutar automáticamente los scripts de esquema semilla `01_schema.sql`–`06_seed_settings.sql`.
4. En Supabase **staging**, revisar y aplicar **solo migraciones faltantes**, en este orden: `P002_SEGURIDAD_SUPABASE.sql`, `20261016_p004_inventory.sql`, `20261016_p005_payment_reconciliation.sql`, `20261016_p006_admin_operations.sql`, `20261016_p007_fiscal_registry.sql`, `20261016_p011_stabilization.sql`, `20261016_p015_commercial_management.sql`, `20261016_p017_channel_terms.sql`.
5. Configurar en Vercel **staging** las variables necesarias sin publicar claves privadas en el repositorio. Comprobar que `Root Directory` esté vacío o `./` (aplicación en raíz), a diferencia del RAR original que usaba `web/`.
6. Probar registros y categorías, políticas RLS, precios y stock, carrito, cupones, checkout, envíos, transferencias y cancelaciones. Mercado Pago permanece no habilitado sin conciliación real comprobada.
7. Solo tras aprobación del titular, coordinar **base de producción + código** para que no convivan versiones incompatibles. Merge a `main` después de confirmar configuración del despliegue automático y habilitación de Vercel.

**El ZIP integrado no ejecuta SQL, no configura Vercel y no prueba entornos reales.** La sincronización en GitHub se debe realizar mediante commit y preferentemente Pull Request; no subir el ZIP como un único archivo esperando que Vercel lo abra.

## Actualizaciones futuras
Los parches P018 y siguientes deben construirse con rutas de **raíz GitHub** (por ejemplo, `src/app/...`, no `web/src/app/...`). El instalador Windows usa `.soff/state.json` y `tools/soff_patcher.py`. Al trabajar en GitHub, los cambios directos de otros colaboradores pueden alterar hashes, por lo que deben conciliarse con el estado del gestor antes de instalar nuevos parches. Cada actualización debe ir en su propia rama/commit para conservar historial.

## Limitaciones de pruebas
El código provenía de un ZIP de GitHub y no se dispone aquí de credenciales de Supabase o Vercel. Las pruebas locales y la preparación de rama **no son certificación de producción**. Si el equipo no puede compilar en un entorno real, NO fusionar a `main` hasta resolverlo.
