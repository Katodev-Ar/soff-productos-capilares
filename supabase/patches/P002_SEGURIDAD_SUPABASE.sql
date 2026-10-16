-- SOFF / P002 - MIGRACION DE SEGURIDAD (NO AUTOMATICA)
-- Ejecutar UNA VEZ en Supabase > SQL Editor sobre el proyecto correcto.
-- Idempotente. NO elimina clientes, pedidos, imágenes ni archivos.
-- IMPORTANTE: aplicar junto con la publicación del código P002 en Vercel.
BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Una política RLS por filas no protege el campo role. Hay que restringir columnas.
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (first_name, last_name, phone, dni, avatar_url,
              address, city, postal_code, addresses)
  ON TABLE public.profiles TO authenticated;

-- Revoca la capacidad anónima de crear notificaciones falsas.
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Los comprobantes son privados y solo el backend puede subir/firmar los archivos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public Access Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anon Uploads Receipts" ON storage.objects;

COMMIT;

-- COMPROBACION (ejecutar luego por separado):
-- SELECT id, public FROM storage.buckets WHERE id = 'receipts';  -- public debe ser false
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND table_name='profiles' AND privilege_type='UPDATE';
-- REVISAR: si hay otras políticas personalizadas sobre storage.objects para bucket receipts,
-- pueden continuar dando acceso; revocar esas políticas tras auditarlas.
