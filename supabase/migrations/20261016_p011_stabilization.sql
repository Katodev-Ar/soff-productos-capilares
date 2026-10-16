-- SOFF P011 | ESTABILIZACION: roles, precios, cupones, historial y alta.
-- Orden: P002, P004, P005, P006, P007, LUEGO P011.
-- Aplicar solamente en staging con backup probado y después en producción.
-- No ejecutar automáticamente desde Windows. Revisión técnica obligatoria.
BEGIN;

-- 1. Catálogo: nunca conceder lectura directa a usuarios no administradores.
-- La vista publica contiene solo el precio minorista o el de la lista autorizada.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.products;
-- Conservamos la política administrativa "Solo admin modifica productos" (FOR ALL).
REVOKE SELECT ON TABLE public.products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;

CREATE OR REPLACE VIEW public.soff_catalog_public
WITH (security_barrier=true)
AS
SELECT
    p.id, p.name, p.description, p.how_to_use, p.image_url, p.stock,
    p.category, p.barcode, p.internal_code,
    NULL::numeric AS price_base,
    p.price_minorista,
    CASE WHEN public.is_admin()
           OR EXISTS (SELECT 1 FROM public.profiles x WHERE x.id=auth.uid() AND x.role='mayorista')
         THEN p.price_mayorista ELSE NULL::numeric END AS price_mayorista,
    CASE WHEN public.is_admin()
           OR EXISTS (SELECT 1 FROM public.profiles x WHERE x.id=auth.uid() AND x.role='peluquero')
         THEN p.price_peluquero ELSE NULL::numeric END AS price_peluquero,
    CASE WHEN public.is_admin()
           OR EXISTS (SELECT 1 FROM public.profiles x WHERE x.id=auth.uid() AND x.role='revendedor')
         THEN p.price_revendedor ELSE NULL::numeric END AS price_revendedor,
    p.created_at
FROM public.products p;
-- IMPORTANTE: vista security DEFINER por defecto; creada por administrador DB,
-- evaluará auth.uid() de la sesión real, y el propietario puede leer products.
REVOKE ALL ON public.soff_catalog_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.soff_catalog_public TO anon, authenticated;

-- 2. Cupones: solo admin ve tabla; visitantes usan API verificada por backend.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
REVOKE SELECT ON TABLE public.coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coupons TO authenticated;
-- Política previa FOR ALL admin sigue autorizando su lectura por administradores.

-- 3. No destruir registros de ventas por eliminación de auth.users/perfiles.
-- RESTRICT bloquea la baja física de usuarios con pedidos históricos.
-- La baja lógica y anonimización futura requerirán un proceso documentado.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
CREATE OR REPLACE FUNCTION public.soff_forbid_order_deletion()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'No se pueden eliminar pedidos comerciales. Utilice estados y notas de crédito.';
END;
$$;
DROP TRIGGER IF EXISTS soff_preserve_orders ON public.orders;
CREATE TRIGGER soff_preserve_orders BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.soff_forbid_order_deletion();

-- 4. Perfil creado mediante trigger, no INSERT desde navegador.
-- No se acepta role ni privilegios desde user_metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_data jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_addresses jsonb;
BEGIN
  v_full_name := COALESCE(v_data->>'full_name',v_data->>'name','');
  v_first_name := COALESCE(NULLIF(btrim(v_data->>'first_name'),''),
      NULLIF(split_part(v_full_name,' ',1),''),'Usuario');
  v_last_name := COALESCE(NULLIF(btrim(v_data->>'last_name'),''),
      NULLIF(btrim(substr(v_full_name,length(split_part(v_full_name,' ',1))+2)),''),'');
  v_addresses := CASE WHEN jsonb_typeof(v_data->'addresses')='array'
      THEN v_data->'addresses' ELSE '[]'::jsonb END;
  INSERT INTO public.profiles
     (id,email,first_name,last_name,avatar_url,phone,dni,addresses,role)
  VALUES (NEW.id,NEW.email,LEFT(v_first_name,120),LEFT(v_last_name,120),
          COALESCE(v_data->>'avatar_url',v_data->>'picture'),
          LEFT(COALESCE(v_data->>'phone',''),60),
          LEFT(COALESCE(v_data->>'dni',''),35),
          v_addresses,'minorista')
  ON CONFLICT (id) DO UPDATE SET
     email=COALESCE(EXCLUDED.email,public.profiles.email),
     first_name=COALESCE(public.profiles.first_name,EXCLUDED.first_name),
     last_name=COALESCE(public.profiles.last_name,EXCLUDED.last_name),
     avatar_url=COALESCE(public.profiles.avatar_url,EXCLUDED.avatar_url),
     phone=COALESCE(public.profiles.phone,EXCLUDED.phone),
     dni=COALESCE(public.profiles.dni,EXCLUDED.dni),
     addresses=CASE WHEN public.profiles.addresses IS NULL OR
                  public.profiles.addresses='[]'::jsonb
                  THEN EXCLUDED.addresses ELSE public.profiles.addresses END;
  RETURN NEW;
END;
$$;
-- El trigger existente de P002/schema sigue apuntando a esta función.
-- Recuperaciones de perfiles anteriores: revisar manualmente cuentas incompletas.

COMMIT;

-- COMPROBACIONES MANUALES POST-MIGRACION (ejecutar con tokens anon/admin reales):
-- (a) anon: SELECT * FROM public.products => sin filas/sin acceso privado
-- (b) anon: SELECT price_base,price_mayorista FROM public.soff_catalog_public => NULL
-- (c) autent. mayorista: precio solo de su lista; su rol no se puede autoeditar
-- (d) anon/cliente: SELECT * FROM coupons => no devuelve códigos
-- (e) admin: consultar productos/cupones; controles pedidos existentes
-- (f) intento de borrar perfil con pedidos históricos: BLOQUEADO
-- (g) registrar email con confirmación: perfil completo, sin INSERT manual
