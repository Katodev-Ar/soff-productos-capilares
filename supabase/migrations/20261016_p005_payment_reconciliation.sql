-- SOFF P005: conciliación manual de transferencias y recepción auditada MP
-- REQUIERE migraciones P002 y P004. NO se ejecuta por ACTUALIZAR_WINDOWS.cmd.
-- Respaldar y probar en STAGING antes de producción. No conecta cuentas bancarias.
BEGIN;

CREATE TABLE IF NOT EXISTS public.soff_payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method='transferencia'),
  bank_reference text NOT NULL UNIQUE CHECK (length(bank_reference) BETWEEN 6 AND 100),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ARS' CHECK (currency='ARS'),
  bank_statement_checked boolean NOT NULL CHECK (bank_statement_checked = true),
  confirmed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  confirmation_note text NOT NULL DEFAULT '',
  confirmed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soff_confirmations_date ON public.soff_payment_confirmations(confirmed_at DESC);
ALTER TABLE public.soff_payment_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFF admins read confirmed payments" ON public.soff_payment_confirmations;
CREATE POLICY "SOFF admins read confirmed payments" ON public.soff_payment_confirmations
 FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.soff_payment_confirmations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.soff_payment_confirmations TO authenticated;
GRANT ALL ON public.soff_payment_confirmations TO service_role;

CREATE TABLE IF NOT EXISTS public.soff_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soff_payment_events_order ON public.soff_payment_events(order_id,created_at DESC);
ALTER TABLE public.soff_payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFF admins read payment events" ON public.soff_payment_events;
CREATE POLICY "SOFF admins read payment events" ON public.soff_payment_events
 FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.soff_payment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.soff_payment_events TO authenticated;
GRANT ALL ON public.soff_payment_events TO service_role;

-- Se registra únicamente metadata mínima del pago de MP. No hay API de venta MP activa.
CREATE TABLE IF NOT EXISTS public.soff_mp_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL CHECK (length(payment_id) BETWEEN 1 AND 80),
  payment_status text NOT NULL CHECK (length(payment_status) BETWEEN 1 AND 50),
  external_reference text,
  payment_amount numeric(14,2),
  currency text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id,payment_status)
);
ALTER TABLE public.soff_mp_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SOFF admins read MP notifications" ON public.soff_mp_notifications;
CREATE POLICY "SOFF admins read MP notifications" ON public.soff_mp_notifications
 FOR SELECT TO authenticated USING (public.is_admin());
REVOKE ALL ON public.soff_mp_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.soff_mp_notifications TO authenticated;
GRANT ALL ON public.soff_mp_notifications TO service_role;

-- Impide saltar la verificación del banco cambiando manualmente estado a pagado.
CREATE OR REPLACE FUNCTION public.soff_require_payment_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='pagado' AND OLD.status IS DISTINCT FROM 'pagado' THEN
    IF NOT EXISTS (
       SELECT 1 FROM public.soff_payment_confirmations p
       WHERE p.order_id=NEW.id AND p.amount=NEW.total
    ) THEN
      RAISE EXCEPTION 'Pago no conciliado: no se puede marcar como pagado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS soff_orders_require_payment_confirmation ON public.orders;
CREATE TRIGGER soff_orders_require_payment_confirmation
 BEFORE UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.soff_require_payment_confirmation();

-- RPC transaccional: valida administrador (por tabla), importe del banco, referencia
-- única y pedido pendiente; emite comprobación, auditoría y marca pagado todo junto.
CREATE OR REPLACE FUNCTION public.soff_confirm_transfer_payment(
 p_order_id uuid, p_bank_reference text, p_verified_amount numeric,
 p_admin_id uuid, p_bank_statement_checked boolean, p_note text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_confirm public.soff_payment_confirmations%ROWTYPE;
  v_ref text := upper(btrim(COALESCE(p_bank_reference,'')));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin') THEN
    RAISE EXCEPTION 'No autorizado para conciliación';
  END IF;
  IF p_bank_statement_checked IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Debe verificarse la acreditación en el banco';
  END IF;
  IF length(v_ref)<6 OR length(v_ref)>100 OR v_ref !~ '^[A-Z0-9._/-]+$' THEN
    RAISE EXCEPTION 'Referencia bancaria inválida';
  END IF;
  IF p_note IS NOT NULL AND length(p_note)>500 THEN
    RAISE EXCEPTION 'Nota demasiado extensa';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido inexistente'; END IF;
  SELECT * INTO v_confirm FROM public.soff_payment_confirmations WHERE order_id=p_order_id;
  IF FOUND THEN
    IF v_confirm.bank_reference=v_ref AND v_confirm.amount=p_verified_amount
       AND v_order.status IN ('pagado','en_preparacion','enviado','entregado') THEN
      RETURN jsonb_build_object('order_id',p_order_id,'replayed',true);
    END IF;
    RAISE EXCEPTION 'Este pedido ya tiene otra conciliación';
  END IF;
  IF v_order.status <> 'pendiente' THEN
    RAISE EXCEPTION 'Solo se concilian pedidos pendientes';
  END IF;
  IF v_order.mp_payment_id IS NULL OR v_order.mp_payment_id NOT LIKE 'receipts/%' THEN
    RAISE EXCEPTION 'El pedido no es de transferencia';
  END IF;
  IF p_verified_amount IS NULL OR p_verified_amount <= 0 OR
      round(p_verified_amount,2) <> round(v_order.total,2) THEN
    RAISE EXCEPTION 'El importe acreditado no coincide con el pedido';
  END IF;
  INSERT INTO public.soff_payment_confirmations(
    order_id, method,bank_reference,amount,bank_statement_checked,confirmed_by,confirmation_note
  ) VALUES (p_order_id,'transferencia',v_ref,p_verified_amount,true,p_admin_id,COALESCE(p_note,''));
  INSERT INTO public.soff_payment_events(order_id,event_type,actor_id,detail)
   VALUES (p_order_id,'transfer_confirmed',p_admin_id,'Acreditación bancaria confirmada por administrador');
  UPDATE public.orders SET status='pagado' WHERE id=p_order_id;
  RETURN jsonb_build_object('order_id',p_order_id,'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.soff_confirm_transfer_payment(uuid,text,numeric,uuid,boolean,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soff_confirm_transfer_payment(uuid,text,numeric,uuid,boolean,text)
 TO service_role;

-- Las notificaciones MP firmadas y contrastadas mediante GET de API solo se registran.
-- Un webhook por sí solo NO altera pedidos ni acredita pagos.
CREATE OR REPLACE FUNCTION public.soff_log_mp_payment(
 p_payment_id text, p_status text, p_reference text, p_amount numeric, p_currency text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 IF length(COALESCE(p_payment_id,''))<1 OR length(COALESCE(p_payment_id,''))>80
    OR length(COALESCE(p_status,''))<1 OR length(COALESCE(p_status,''))>50 THEN
    RAISE EXCEPTION 'Notificación MP inválida';
 END IF;
 INSERT INTO public.soff_mp_notifications(payment_id,payment_status,external_reference,payment_amount,currency)
 VALUES (p_payment_id,p_status,left(p_reference,120),p_amount,p_currency)
 ON CONFLICT (payment_id,payment_status) DO NOTHING
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('logged',v_id IS NOT NULL,'duplicate',v_id IS NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.soff_log_mp_payment(text,text,text,numeric,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soff_log_mp_payment(text,text,text,numeric,text)
 TO service_role;
COMMIT;

-- Solo lectura para verificación futura:
-- SELECT COUNT(*) FROM public.soff_payment_confirmations;
-- SELECT COUNT(*) FROM public.soff_mp_notifications;
-- SELECT to_regprocedure('public.soff_confirm_transfer_payment(uuid,text,numeric,uuid,boolean,text)');
