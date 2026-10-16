-- SOFF P004 | 2026-10-16 | STOCK TRANSACCIONAL
-- MIGRACIÓN SOLO MANUAL (después de P002), probar primero en staging.
-- No ejecutar sobre producción sin respaldo. No borra datos existentes.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS soff_request_key uuid,
  ADD COLUMN IF NOT EXISTS soff_stock_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS soff_coupon_id uuid REFERENCES public.coupons(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS soff_orders_request_key_uk
  ON public.orders (soff_request_key) WHERE soff_request_key IS NOT NULL;

-- NOT VALID no bloquea la migración si existen existencias negativas anteriores.
-- Sí impide que se inserten o modifiquen filas dejando stock negativo o nulo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'soff_products_stock_nonnegative' AND conrelid = 'public.products'::regclass) THEN
    ALTER TABLE public.products ADD CONSTRAINT soff_products_stock_nonnegative
      CHECK (stock IS NOT NULL AND stock >= 0) NOT VALID;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason text NOT NULL CHECK (reason IN ('order_reserved', 'order_cancelled', 'manual_adjustment')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT soff_movement_order_reason_check CHECK
    ((order_id IS NULL AND reason = 'manual_adjustment') OR
     (order_id IS NOT NULL AND reason <> 'manual_adjustment'))
);
CREATE INDEX IF NOT EXISTS soff_movements_product_date_idx ON public.inventory_movements(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS soff_movements_order_idx ON public.inventory_movements(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS soff_movements_order_unique_idx
 ON public.inventory_movements(order_id, product_id, reason) WHERE order_id IS NOT NULL;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFF admins can read stock movements" ON public.inventory_movements;
CREATE POLICY "SOFF admins can read stock movements"
  ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.inventory_movements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

-- Movimientos de ajustes directos de stock por administrador (editor/CSV).
-- Los movimientos de reserva/cancelación se registran por su propia operación SQL.
CREATE OR REPLACE FUNCTION public.soff_record_manual_stock_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('soff.inventory_context', true) IS DISTINCT FROM 'checkout'
     AND current_setting('soff.inventory_context', true) IS DISTINCT FROM 'cancel' THEN
    IF NEW.stock IS NULL OR NEW.stock < 0 THEN
      RAISE EXCEPTION 'No se permiten ajustes de stock negativos o nulos';
    END IF;
    IF NEW.stock - COALESCE(OLD.stock,0) <> 0 THEN
      INSERT INTO public.inventory_movements(product_id, quantity_delta, stock_after, reason, actor_id)
      VALUES (NEW.id, NEW.stock - COALESCE(OLD.stock,0), NEW.stock, 'manual_adjustment', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS soff_products_audit_stock ON public.products;
CREATE TRIGGER soff_products_audit_stock AFTER UPDATE OF stock ON public.products
  FOR EACH ROW WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
  EXECUTE FUNCTION public.soff_record_manual_stock_change();

-- Compra atómica. Solo service_role puede ejecutarla; jamás se expone al navegador.
CREATE OR REPLACE FUNCTION public.soff_create_transfer_order_atomic(
  p_request_key uuid,
  p_user_id uuid,
  p_items jsonb,
  p_total numeric,
  p_shipping_address text,
  p_receipt_reference text,
  p_transfer_reference text,
  p_receipt_warning text,
  p_coupon_id uuid DEFAULT NULL,
  p_coupon_expected_uses integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_existing record;
  v_order_id uuid;
  v_role text;
  v_item record;
  v_product record;
  v_expected_price numeric;
  v_subtotal numeric := 0;
  v_stock_after integer;
  v_coupon record;
  v_seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_request_key IS NULL OR p_user_id IS NULL OR p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50
     OR p_total IS NULL OR p_total <= 0 OR p_total > 1000000000
     OR p_shipping_address IS NULL OR length(trim(p_shipping_address)) NOT BETWEEN 1 AND 500
     OR p_receipt_reference IS NULL OR p_receipt_reference NOT LIKE 'receipts/%' THEN
    RAISE EXCEPTION 'Pedido incompleto o inválido';
  END IF;

  SELECT id, user_id, total INTO v_existing FROM public.orders WHERE soff_request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id OR v_existing.total <> p_total THEN
      RAISE EXCEPTION 'Identificador de pedido reutilizado con datos distintos';
    END IF;
    RETURN jsonb_build_object('order_id',v_existing.id, 'replayed',true);
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comprador no encontrado'; END IF;
  IF v_role NOT IN ('admin','minorista','mayorista','peluquero','revendedor') THEN v_role := 'minorista'; END IF;

  -- Procesar UUID en orden estable; bloqueos previenen compras simultáneas del último artículo.
  FOR v_item IN
    SELECT (x.obj->>'id')::uuid AS id,
           (x.obj->>'quantity')::integer AS qty,
           (x.obj->>'price')::numeric AS price
    FROM jsonb_array_elements(p_items) AS x(obj)
    ORDER BY (x.obj->>'id')::uuid
  LOOP
    IF v_item.id IS NULL OR v_item.qty IS NULL OR v_item.qty NOT BETWEEN 1 AND 1000
       OR v_item.price IS NULL OR v_item.price <= 0 OR v_item.id = ANY(v_seen) THEN
      RAISE EXCEPTION 'Carrito inválido o con productos repetidos';
    END IF;
    v_seen := array_append(v_seen,v_item.id);
    SELECT id, name, stock, price_minorista, price_mayorista, price_peluquero, price_revendedor
      INTO v_product FROM public.products WHERE id=v_item.id FOR UPDATE;
    -- Reintento concurrente: el primer checkout pudo confirmar mientras
    -- esperábamos el bloqueo, y el stock disponible ya es menor.
    SELECT id, user_id, total INTO v_existing FROM public.orders WHERE soff_request_key = p_request_key;
    IF FOUND THEN
      IF v_existing.user_id <> p_user_id OR v_existing.total <> p_total THEN
        RAISE EXCEPTION 'Identificador de pedido reutilizado con datos distintos';
      END IF;
      RETURN jsonb_build_object('order_id',v_existing.id, 'replayed',true);
    END IF;
    IF v_product.id IS NULL OR v_product.stock IS NULL OR v_product.stock < v_item.qty THEN
      RAISE EXCEPTION 'Stock insuficiente o producto inexistente: %', v_item.id;
    END IF;
    v_expected_price := CASE v_role
       WHEN 'mayorista' THEN v_product.price_mayorista
       WHEN 'peluquero' THEN v_product.price_peluquero
       WHEN 'revendedor' THEN v_product.price_revendedor
       ELSE v_product.price_minorista END;
    IF v_expected_price IS NULL OR v_expected_price <= 0 OR v_expected_price <> v_item.price THEN
      RAISE EXCEPTION 'El precio cambió para el producto: %', v_product.name;
    END IF;
    v_subtotal := v_subtotal + v_item.price * v_item.qty;
  END LOOP;
  IF v_subtotal <= 0 OR p_total > v_subtotal + 1000000 THEN
    RAISE EXCEPTION 'Total fuera de límites';
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT id, current_uses, max_uses, is_active INTO v_coupon
      FROM public.coupons WHERE id=p_coupon_id FOR UPDATE;
    IF NOT FOUND OR v_coupon.is_active IS DISTINCT FROM true
      OR v_coupon.current_uses IS DISTINCT FROM p_coupon_expected_uses
      OR (v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses) THEN
      RAISE EXCEPTION 'Cupón modificado o agotado';
    END IF;
  END IF;

  -- Si otra petición con el mismo token se confirmó mientras esperábamos bloqueos,
  -- devolver el pedido existente en vez de descontar dos veces.
  SELECT id, user_id, total INTO v_existing FROM public.orders WHERE soff_request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id OR v_existing.total <> p_total THEN
      RAISE EXCEPTION 'Identificador de pedido reutilizado con datos distintos';
    END IF;
    RETURN jsonb_build_object('order_id',v_existing.id, 'replayed',true);
  END IF;

  INSERT INTO public.orders (
    soff_request_key, soff_stock_reserved, soff_coupon_id,
    user_id, total, status, shipping_address, mp_payment_id, transfer_reference, receipt_warning
  ) VALUES (
    p_request_key, true, p_coupon_id,
    p_user_id, p_total, 'pendiente', p_shipping_address,
    p_receipt_reference, left(COALESCE(p_transfer_reference,''),100), p_receipt_warning
  ) RETURNING id INTO v_order_id;

  PERFORM set_config('soff.inventory_context','checkout',true);
  FOR v_item IN
    SELECT (x.obj->>'id')::uuid AS id,
           (x.obj->>'quantity')::integer AS qty,
           (x.obj->>'price')::numeric AS price
    FROM jsonb_array_elements(p_items) AS x(obj)
    ORDER BY (x.obj->>'id')::uuid
  LOOP
    UPDATE public.products SET stock=stock-v_item.qty WHERE id=v_item.id AND stock>=v_item.qty
      RETURNING stock INTO v_stock_after;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente al confirmar'; END IF;
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
      VALUES (v_order_id, v_item.id, v_item.qty, v_item.price);
    INSERT INTO public.inventory_movements
      (product_id, order_id, quantity_delta, stock_after, reason, actor_id)
      VALUES (v_item.id, v_order_id, -v_item.qty, v_stock_after, 'order_reserved', p_user_id);
  END LOOP;
  IF p_coupon_id IS NOT NULL THEN
    UPDATE public.coupons SET current_uses=current_uses+1 WHERE id=p_coupon_id;
  END IF;
  RETURN jsonb_build_object('order_id', v_order_id, 'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.soff_create_transfer_order_atomic(
 uuid,uuid,jsonb,numeric,text,text,text,text,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soff_create_transfer_order_atomic(
 uuid,uuid,jsonb,numeric,text,text,text,text,uuid,integer) TO service_role;

-- Una cancelación de un pedido nuevo restituye stock y cupón en la MISMA transacción.
CREATE OR REPLACE FUNCTION public.soff_order_status_guard_and_restock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_item record;
  v_stock integer;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'cancelado' THEN
    RAISE EXCEPTION 'El pedido cancelado es definitivo: crear una nueva orden';
  END IF;
  IF NOT ((OLD.status='pendiente' AND NEW.status IN ('pagado','cancelado')) OR
          (OLD.status='pagado' AND NEW.status IN ('en_preparacion','cancelado')) OR
          (OLD.status='en_preparacion' AND NEW.status IN ('enviado','cancelado')) OR
          (OLD.status='enviado' AND NEW.status='entregado') OR
          (OLD.status='entregado' AND NEW.status='entregado')) THEN
    RAISE EXCEPTION 'Transición de pedido no admitida: % -> %', OLD.status, NEW.status;
  END IF;
  IF NEW.status <> 'cancelado' OR OLD.soff_stock_reserved IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- Nunca devolver stock dos veces (único cambio permitido hacia cancelado).
  PERFORM set_config('soff.inventory_context','cancel',true);
  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS qty
      FROM public.order_items WHERE order_id=OLD.id GROUP BY product_id ORDER BY product_id
  LOOP
    IF v_item.product_id IS NULL OR v_item.qty IS NULL OR v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Pedido sin referencia íntegra al producto: revisión manual';
    END IF;
    UPDATE public.products SET stock=stock+v_item.qty WHERE id=v_item.product_id
      RETURNING stock INTO v_stock;
    IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró producto al devolver stock'; END IF;
    INSERT INTO public.inventory_movements
      (product_id, order_id, quantity_delta, stock_after, reason, actor_id)
      VALUES (v_item.product_id,OLD.id,v_item.qty,v_stock,'order_cancelled',auth.uid());
  END LOOP;
  IF OLD.soff_coupon_id IS NOT NULL THEN
    UPDATE public.coupons SET current_uses=current_uses-1
      WHERE id=OLD.soff_coupon_id AND current_uses > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupón inconsistente, cancelar mediante revisión manual'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS soff_orders_restock_on_cancel ON public.orders;
CREATE TRIGGER soff_orders_restock_on_cancel BEFORE UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.soff_order_status_guard_and_restock();

-- Evitar que pedidos con stock reservado queden borrados por error.
CREATE OR REPLACE FUNCTION public.soff_guard_order_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.soff_stock_reserved IS TRUE THEN
   RAISE EXCEPTION 'No borrar pedidos con inventario reservado: cancelarlos desde administración';
 END IF;
 RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS soff_orders_no_delete_reserved ON public.orders;
CREATE TRIGGER soff_orders_no_delete_reserved BEFORE DELETE ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.soff_guard_order_deletion();

-- Sin esta barrera, un cliente podría insertar pedidos/ítems por REST sin descontar stock.
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;
GRANT UPDATE (status) ON public.orders TO authenticated;
-- RLS existente solo autoriza a un administrador a cambiar el estado.
GRANT ALL ON public.orders, public.order_items, public.products, public.coupons TO service_role;

COMMIT;

-- COMPROBACIONES SOLO DE LECTURA (cuando exista acceso):
-- SELECT to_regprocedure('public.soff_create_transfer_order_atomic(uuid,uuid,jsonb,numeric,text,text,text,text,uuid,integer)');
-- SELECT COUNT(*) AS stock_negativo_historico FROM public.products WHERE stock < 0 OR stock IS NULL;
-- SELECT COUNT(*) AS movimientos FROM public.inventory_movements;
-- SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name LIKE 'soff_%';
