# SOFF — Sofía Productos Capilares

> Plataforma integral de comercio electrónico B2C y B2B especializada en productos capilares profesionales, con arquitectura Next.js 16, Supabase PostgreSQL, control de stock transaccional, validación de pagos con OCR y segmentación multicanal.

---

## 📌 Tabla de Contenidos

- [Propósito del Proyecto](#-propósito-del-proyecto)
- [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
- [Funcionalidades Principales](#-funcionalidades-principales)
  - [Canal Comercial y Segmentación B2B/B2C](#canal-comercial-y-segmentación-b2b-b2c)
  - [Checkout y Comprobantes de Pago](#checkout-y-comprobantes-de-pago)
  - [Control Transaccional de Stock](#control-transaccional-de-stock)
  - [Panel de Administración](#panel-de-administración)
- [Seguridad y Políticas RLS](#-seguridad-y-políticas-rls)
- [Variables de Entorno](#-variables-de-entorno)
- [Instalación y Desarrollo Local](#-instalación-y-desarrollo-local)
- [Migraciones de Base de Datos](#-migraciones-de-base-de-datos)
- [Despliegue](#-despliegue)

---

## 🎯 Propósito del Proyecto

**SOFF Productos Capilares** es una solución de e-commerce diseñada para cubrir la venta minorista directa y la distribución comercial mayorista a peluquerías, distribuidores y revendedores en Argentina. 

El sistema garantiza:
1. **Precios y visibilidad segmentada**: Los clientes solo visualizan los precios autorizados según su perfil (`minorista`, `mayorista`, `revendedor`, `peluquero`).
2. **Operaciones transaccionales seguras**: El stock se reserva atómicamente al confirmar el pedido y se restituye de forma automática ante cancelaciones.
3. **Validación inteligente de transferencias**: Extracción asistida por OCR en cliente (Tesseract / unpdf) con comprobación de destinatario, CVU/CBU e importes, generando alertas preventivas para comprobantes en duda.
4. **Control fiscal y conciliación**: Historial auditable de eventos de pago, registro fiscal inmutable y auditoría de cambios comerciales.

---

## 🛠 Arquitectura y Stack Tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| **Framework Web** | [Next.js 16 (App Router)](https://nextjs.org/) | Renderizado híbrido (SSR / RSC / Client Components) |
| **Biblioteca UI** | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) | Interfaz responsive moderna, micro-interacciones con Framer Motion |
| **Base de Datos** | [Supabase](https://supabase.com/) (PostgreSQL 15+) | RLS, RPCs PL/pgSQL, Triggers y vistas seguras |
| **Autenticación** | Supabase Auth | Sesiones JWT seguras con sincronización automática de perfiles |
| **Almacenamiento** | Supabase Storage | Bucket privado `receipts` para comprobantes de transferencia |
| **OCR y Documentos** | Tesseract.js & unpdf | Extracción en navegador de texto e importes en comprobantes PDF e imágenes |
| **Hosting & CI/CD** | [Vercel](https://vercel.com/) | Integración continua vinculada a ramas GitHub |

---

## 🚀 Funcionalidades Principales

### Canal Comercial y Segmentación B2B/B2C
- **Cuatro listas de precios**: Minorista, Mayorista, Revendedor y Peluquero.
- **Vista pública protegida (`soff_catalog_public`)**: El costo base y los precios de canales especiales se mantienen ocultos y solo se exponen vía backend o vistas seguras autorizadas.
- **Solicitud de cuenta comercial**: Clientes pueden solicitar cambio de categoría adjuntando documentación comercial; el administrador aprueba o rechaza con registro histórico (`soff_commercial_role_history`).
- **Condiciones comerciales por canal (P017)**:
  - Mínimos de compra diferenciados por canal.
  - Escalones de descuento automáticos por volumen (ej: 5% a partir de \$45.000, 10% a partir de \$70.000).
  - Reglas de cupones y modos de envío gratis (`inherit`, `disabled`, `threshold`, `always`).

### Checkout y Comprobantes de Pago
- **Transferencia bancaria con OCR**:
  - Procesamiento en el navegador con zoom interactivo y previsualización.
  - Detección de importe, entidad bancaria, número de operación y destinatario.
  - Comparación automática contra el total del pedido con alertas de comprobante en revisión.
- **Mercado Pago Webhook**:
  - Registro de notificaciones entrantes y eventos de pago idempotentes.
- **Cálculo de envío**: Integración con logística local y cálculo dinámico de tarifa por distancia / tipo de envío.

### Control Transaccional de Stock
- **RPC Atómica (`soff_create_transfer_order_atomic`)**:
  - Bloqueo `FOR UPDATE` en orden estricto de IDs para prevenir *deadlocks*.
  - Validación de precios y disponibilidad de stock en el momento exacto de la compra.
  - Registro contable en `inventory_movements`.
  - Idempotencia garantizada mediante clave única (`soff_request_key`).
- **Trigger de restitución**: Al cancelar un pedido con stock reservado, el inventario se reintegra automáticamente con evento auditado.

### Panel de Administración
- `/admin`: Métricas en tiempo real de facturación, órdenes y stock crítico.
- `/admin/pedidos`: Gestión integral con línea de tiempo (`soff_order_status_events`), modal de detalle y enlace a comprobantes firmados.
- `/admin/comercial`: Gestión de solicitudes de clientes, asignación de listas y costos reales privados.
- `/admin/condiciones-comerciales`: Configuración interactiva de reglas por canal.
- `/admin/usuarios`: Gestión de clientes registrados con selector inline de roles (`minorista`, `mayorista`, `revendedor`, `peluquero`, `admin`).
- `/admin/inventario`: Historial de movimientos de stock con motivos (`venta`, `cancelacion`, `ajuste_manual`).
- `/admin/calidad-catalogo`: Auditoría de títulos, descripciones, imágenes faltantes y márgenes.
- `/admin/conciliacion`: Monitoreo de transferencias y conciliación manual / automática.
- `/admin/facturacion`: Registro fiscal inmutable con trazabilidad para control contable.
- `/admin/cupones`, `/admin/combos`, `/admin/banners`: Control dinámico de promociones y portada.

---

## 🔒 Seguridad y Políticas RLS

1. **Protección de Escalación de Roles**:
   - Trigger `tr_protect_profile_system_fields` en PostgreSQL que bloquea cualquier intento de usuarios no-administradores de modificar `role`, `loyalty_points` o `id`.
   - Asignación de rol admin asegurada mediante `handle_new_user()` y control en APIs de backend (`/api/admin/users/role`).
2. **Aislamiento de Pedidos**:
   - RLS en `orders`: cada cliente solo puede consultar y operar sobre pedidos donde `auth.uid() = user_id`. Los administradores validan mediante la función segura `public.is_admin()`.
3. **Bucket de Comprobantes Privado**:
   - El almacenamiento de comprobantes bancarios no es público. Solo se accede mediante URLs firmadas de corta duración generadas en `/api/receipts/[orderId]`.
4. **Vistas de Catálogo con Enmascaramiento**:
   - `soff_catalog_public` enmascara precios mayoristas a usuarios no calificados y omite totalmente el costo del producto.

---

## ⚙️ Variables de Entorno

Crear un archivo `.env.local` en la raíz del proyecto basándose en el siguiente esquema:

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://ubghnuqehmydbkluwimt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# --- Datos Bancarios para Transferencias ---
NEXT_PUBLIC_BUSINESS_NAME="Cristian Benjamin Corbalan"
NEXT_PUBLIC_BUSINESS_ALIAS="corbalan.cristian.b"
NEXT_PUBLIC_BUSINESS_CVU="0000003100071749630487"
NEXT_PUBLIC_BUSINESS_BANK="Mercado Pago"

# --- Contacto y WhatsApp ---
NEXT_PUBLIC_WHATSAPP_PHONE="5493816253929"

# --- Mercado Pago (Opcional) ---
MP_ACCESS_TOKEN="APP_USR-..."
MP_WEBHOOK_SECRET="..."

# --- URL Base de Producción ---
NEXT_PUBLIC_SITE_URL="https://soff-productos-capilares.vercel.app"
```

---

## 💻 Instalación y Desarrollo Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Katodev-Ar/soff-productos-capilares.git
   cd soff-productos-capilares
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

4. **Compilar para producción (Build)**:
   ```bash
   npm run build
   ```

---

## 🗄 Migraciones de Base de Datos

Las migraciones SQL deben aplicarse en Supabase en el siguiente orden secuencial:

1. `supabase/migrations/20261016_p002_receipts_bucket_private.sql`: Cierre de bucket público y protección RLS.
2. `supabase/migrations/20261016_p004_inventory.sql`: Control de stock atómico, movimientos y triggers de restitución.
3. `supabase/migrations/20261016_p005_payment_reconciliation.sql`: Conciliación de cobros y eventos de pago.
4. `supabase/migrations/20261016_p006_order_events.sql`: Línea de tiempo de pedidos y gestión de cupones.
5. `supabase/migrations/20261016_p007_fiscal_registry.sql`: Registro fiscal inmutable para control contable.
6. `supabase/migrations/20261016_p011_catalog_view.sql`: Vista segura de catálogo `soff_catalog_public`.
7. `supabase/migrations/20261016_p015_commercial_management.sql`: Gestión comercial, 4 listas de precios y costos privados.
8. `supabase/migrations/20261016_p017_channel_terms.sql`: Reglas y condiciones comerciales por canal con auditoría.

---

## 🌐 Despliegue

El proyecto se despliega automáticamente en **Vercel** ante cada push a la rama `main`:
- **Producción**: [https://soff-productos-capilares.vercel.app](https://soff-productos-capilares.vercel.app)
- **Monitoreo de Salud**: `/api/health` retorna estado 200 y confirmación de conectividad.
