-- SOFF P006 - ADMINISTRACIÓN, CUPONES Y CSV - MIGRACIÓN DIFERIDA
-- Requiere P002 + P004 + P005. Ejecutar con autorización, BACKUP y pruebas en staging.
-- El instalador de Windows NO ejecuta este SQL.
BEGIN;

CREATE TABLE IF NOT EXISTS public.soff_order_status_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
 old_status text NOT NULL, new_status text NOT NULL,
 admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soff_status_events_order_date ON public.soff_order_status_events(order_id,created_at DESC);
ALTER TABLE public.soff_order_status_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFF admin lee cambios de pedido" ON public.soff_order_status_events;
CREATE POLICY "SOFF admin lee cambios de pedido" ON public.soff_order_status_events
 FOR SELECT TO authenticated USING(public.is_admin());
REVOKE ALL ON public.soff_order_status_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.soff_order_status_events TO authenticated;
GRANT ALL ON public.soff_order_status_events TO service_role;

-- Centraliza y audita transiciones. No permite cancelar pedidos pagados:
-- un circuito de reintegros requiere conciliación y controles adicionales.
CREATE OR REPLACE FUNCTION public.soff_admin_change_order_status(
 p_admin_id uuid,p_order_id uuid,p_status text,p_reason text,p_bank_checked boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin') THEN
   RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_order_id IS NULL OR p_status NOT IN ('en_preparacion','enviado','entregado','cancelado')
    OR length(coalesce(p_reason,''))>400 THEN RAISE EXCEPTION 'Cambio de estado inválido'; END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
 IF v_order.status=p_status THEN RETURN jsonb_build_object('status',p_status,'replayed',true); END IF;
 IF NOT (
    (v_order.status='pagado' AND p_status='en_preparacion') OR
    (v_order.status='en_preparacion' AND p_status='enviado') OR
    (v_order.status='enviado' AND p_status='entregado') OR
    (v_order.status='pendiente' AND p_status='cancelado' AND p_bank_checked IS TRUE)
 ) THEN RAISE EXCEPTION 'Transición no autorizada (para pagos/reintegros usar conciliación)'; END IF;
 -- Evita cancelar pedidos si ya existe conciliación bancaria.
 IF p_status='cancelado' AND EXISTS (
    SELECT 1 FROM public.soff_payment_confirmations WHERE order_id=p_order_id
 ) THEN RAISE EXCEPTION 'Pedido con pago confirmado: requiere reintegro'; END IF;
 -- Ejecuta también la restitución transaccional preparada en P004.
 PERFORM set_config('soff.actor_id',p_admin_id::text,true);
 UPDATE public.orders SET status=p_status WHERE id=p_order_id;
 INSERT INTO public.soff_order_status_events(order_id,old_status,new_status,admin_id,reason)
 VALUES(p_order_id,v_order.status,p_status,p_admin_id,coalesce(p_reason,''));
 RETURN jsonb_build_object('status',p_status,'replayed',false);
END;$$;
REVOKE ALL ON FUNCTION public.soff_admin_change_order_status(uuid,uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.soff_admin_change_order_status(uuid,uuid,text,text,boolean) TO service_role;
-- El cambio de estado debe circular por el RPC auditado, no por REST con sesión del administrador.
REVOKE UPDATE(status) ON public.orders FROM authenticated;

-- Los cupones se administran mediante el servidor. La compra conserva acceso con service_role.
REVOKE INSERT,UPDATE,DELETE ON public.coupons FROM authenticated,anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='soff_coupon_percent_valid' AND conrelid='public.coupons'::regclass) THEN
  ALTER TABLE public.coupons ADD CONSTRAINT soff_coupon_percent_valid
  CHECK (discount_percentage>0 AND discount_percentage<=80) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='soff_coupon_limits_valid' AND conrelid='public.coupons'::regclass) THEN
  ALTER TABLE public.coupons ADD CONSTRAINT soff_coupon_limits_valid
  CHECK(current_uses>=0 AND (max_uses IS NULL OR (max_uses>0 AND max_uses>=current_uses))) NOT VALID;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.soff_admin_upsert_coupon(
 p_admin_id uuid,p_id uuid,p_code text,p_discount numeric,p_max_uses integer,p_is_active boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_code text:=upper(btrim(coalesce(p_code,'')));v_current integer;v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF v_code !~ '^[A-Z0-9_-]{3,40}$' OR p_discount<=0 OR p_discount>80
    OR p_discount IS NULL OR p_is_active IS NULL OR (p_max_uses IS NOT NULL AND p_max_uses<1) THEN
    RAISE EXCEPTION 'Datos de cupón inválidos'; END IF;
 IF p_id IS NOT NULL THEN
   SELECT current_uses INTO v_current FROM public.coupons WHERE id=p_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Cupón no encontrado'; END IF;
   IF p_max_uses IS NOT NULL AND p_max_uses<v_current THEN RAISE EXCEPTION 'Límite menor a usos registrados'; END IF;
   UPDATE public.coupons SET code=v_code,discount_percentage=p_discount,max_uses=p_max_uses,
      is_active=p_is_active WHERE id=p_id RETURNING id INTO v_id;
 ELSE
   INSERT INTO public.coupons(code,discount_percentage,max_uses,is_active)
   VALUES(v_code,p_discount,p_max_uses,p_is_active) RETURNING id INTO v_id;
 END IF;
 RETURN jsonb_build_object('id',v_id);
END;$$;
REVOKE ALL ON FUNCTION public.soff_admin_upsert_coupon(uuid,uuid,text,numeric,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.soff_admin_upsert_coupon(uuid,uuid,text,numeric,integer,boolean) TO service_role;

-- Conserva actor en movimientos registrados por el trigger de P004 al importar con service_role.
CREATE OR REPLACE FUNCTION public.soff_record_manual_stock_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid;
BEGIN
 IF current_setting('soff.inventory_context', true) IS DISTINCT FROM 'checkout'
    AND current_setting('soff.inventory_context', true) IS DISTINCT FROM 'cancel' THEN
  IF NEW.stock IS NULL OR NEW.stock<0 THEN RAISE EXCEPTION 'Stock inválido'; END IF;
  v_actor:=coalesce(auth.uid(),nullif(current_setting('soff.actor_id',true),'')::uuid);
  IF NEW.stock-COALESCE(OLD.stock,0)<>0 THEN
    INSERT INTO public.inventory_movements(product_id,quantity_delta,stock_after,reason,actor_id)
    VALUES(NEW.id,NEW.stock-COALESCE(OLD.stock,0),NEW.stock,'manual_adjustment',v_actor);
  END IF;
 END IF;
 RETURN NEW;
END;$$;

-- Proceso atómico: si alguna fila presenta clave ambigua, código inexistente,
-- inconsistencia o validación inválida, NO aplica NINGUNA modificación.
CREATE OR REPLACE FUNCTION public.soff_admin_apply_catalog_batch(p_admin_id uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_row jsonb;v_key text;v_type text;v_id uuid;v_found int;
 v_seen uuid[]:=ARRAY[]::uuid[];v_stock integer;v_price numeric;v_count integer:=0;
 v_field text;v_changes jsonb;v_product public.products%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 600 THEN
   RAISE EXCEPTION 'Cantidad de filas inválida'; END IF;
 PERFORM set_config('soff.actor_id',p_admin_id::text,true);
 FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) ORDER BY value::text LOOP
  IF jsonb_typeof(v_row)<>'object' THEN RAISE EXCEPTION 'Fila inválida'; END IF;
  IF (v_row ? 'id')::integer+(v_row ? 'internal_code')::integer+(v_row ? 'barcode')::integer<>1 THEN
   RAISE EXCEPTION 'Una sola clave por fila'; END IF;
  v_type:=CASE WHEN v_row ? 'id' THEN 'id' WHEN v_row ? 'internal_code' THEN 'internal_code' ELSE 'barcode' END;
  v_key:=btrim(v_row->>v_type);
  IF length(v_key)=0 OR length(v_key)>100 THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF v_type='id' THEN
    BEGIN v_id:=v_key::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'UUID inválido'; END;
    SELECT count(*),(array_agg(id))[1] INTO v_found,v_id FROM public.products WHERE id=v_id;
  ELSIF v_type='internal_code' THEN
    SELECT count(*),(array_agg(id))[1] INTO v_found,v_id FROM public.products WHERE upper(btrim(internal_code))=upper(v_key);
  ELSE
    SELECT count(*),(array_agg(id))[1] INTO v_found,v_id FROM public.products WHERE upper(btrim(barcode))=upper(v_key);
  END IF;
  IF v_found<>1 THEN RAISE EXCEPTION 'Identificador inexistente o duplicado: %',v_key; END IF;
  IF v_id=ANY(v_seen) THEN RAISE EXCEPTION 'Producto repetido en CSV: %',v_key; END IF;
  v_seen:=array_append(v_seen,v_id);
  IF NOT (v_row ? 'stock' OR v_row ? 'price_minorista' OR v_row ? 'price_mayorista'
   OR v_row ? 'price_peluquero' OR v_row ? 'price_revendedor') THEN RAISE EXCEPTION 'Fila sin cambios'; END IF;
  FOREACH v_field IN ARRAY ARRAY['stock','price_minorista','price_mayorista','price_peluquero','price_revendedor'] LOOP
    IF v_row ? v_field THEN
      IF jsonb_typeof(v_row->v_field)<>'number' THEN RAISE EXCEPTION 'Dato numérico incorrecto'; END IF;
      v_price:=(v_row->>v_field)::numeric;
      IF v_field='stock' THEN
        IF v_price<0 OR v_price>1000000 OR v_price<>trunc(v_price) THEN RAISE EXCEPTION 'Stock inválido'; END IF;
      ELSIF v_price<=0 OR v_price>100000000 OR v_price<>round(v_price,2) THEN RAISE EXCEPTION 'Precio inválido'; END IF;
    END IF;
  END LOOP;
  -- Bloquear y aplicar sobre el registro real (evita reemplazos por nombre duplicado).
  SELECT * INTO v_product FROM public.products WHERE id=v_id FOR UPDATE;
  UPDATE public.products SET
   stock=CASE WHEN v_row ? 'stock' THEN (v_row->>'stock')::integer ELSE stock END,
   price_minorista=CASE WHEN v_row ? 'price_minorista' THEN (v_row->>'price_minorista')::numeric ELSE price_minorista END,
   price_mayorista=CASE WHEN v_row ? 'price_mayorista' THEN (v_row->>'price_mayorista')::numeric ELSE price_mayorista END,
   price_peluquero=CASE WHEN v_row ? 'price_peluquero' THEN (v_row->>'price_peluquero')::numeric ELSE price_peluquero END,
   price_revendedor=CASE WHEN v_row ? 'price_revendedor' THEN (v_row->>'price_revendedor')::numeric ELSE price_revendedor END
  WHERE id=v_id;
  v_count:=v_count+1;
 END LOOP;
 RETURN jsonb_build_object('updated',v_count);
END;$$;
REVOKE ALL ON FUNCTION public.soff_admin_apply_catalog_batch(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.soff_admin_apply_catalog_batch(uuid,jsonb) TO service_role;
COMMIT;

-- Validaciones propuestas para staging:
-- 1. usuario no admin intenta RPC -> error
-- 2. UUID, barcode o internal_code ambiguo -> falla lote entero
-- 3. stock inválido o precio no positivo -> rollback total
-- 4. cambio válido de stock -> inventario manual con actor admin
-- 5. cancelar pendiente libera stock (P004); pagado no se cancela
-- 6. compra/cupón con usos agotados se rechaza (P003/P004)
