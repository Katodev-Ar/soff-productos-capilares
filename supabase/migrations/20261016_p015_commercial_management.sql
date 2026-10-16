-- SOFF / P015 / v1.0.15 — Gestión comercial, cuatro precios, aprobación y costos.
-- SOLO tras P002/P004/P005/P006/P007/P011 y respaldo. Primero staging.
-- El parche de Windows no ejecuta SQL. Requiere revisión del esquema real.
BEGIN;

CREATE TABLE IF NOT EXISTS public.soff_commercial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_role text NOT NULL CHECK (requested_role IN ('mayorista','revendedor','peluquero')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  review_note text NOT NULL DEFAULT '' CHECK (char_length(review_note) <= 500)
);
CREATE UNIQUE INDEX IF NOT EXISTS soff_one_pending_request_per_user
  ON public.soff_commercial_requests(user_id) WHERE status = 'pendiente';
CREATE INDEX IF NOT EXISTS soff_commercial_requests_created_idx
  ON public.soff_commercial_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS public.soff_commercial_role_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  old_role text NOT NULL,
  new_role text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('solicitud','asignacion_manual')),
  request_id uuid REFERENCES public.soff_commercial_requests(id) ON DELETE RESTRICT,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soff_role_history_user_created_idx
 ON public.soff_commercial_role_history(user_id,created_at DESC);

-- El costo real es confidencial: NUNCA agregarlo a products ni a soff_catalog_public.
CREATE TABLE IF NOT EXISTS public.soff_product_costs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE RESTRICT,
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.soff_commercial_price_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  old_prices jsonb NOT NULL,
  new_prices jsonb NOT NULL,
  old_cost numeric(14,2),
  new_cost numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soff_commercial_price_history_product_idx
 ON public.soff_commercial_price_history(product_id,created_at DESC);

-- Todas las operaciones se canalizan por APIs de servidor con sesión validada.
-- Se prohíbe acceso directo desde navegador incluso para usuarios autenticados.
ALTER TABLE public.soff_commercial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soff_commercial_role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soff_product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soff_commercial_price_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.soff_commercial_requests,public.soff_commercial_role_history,
 public.soff_product_costs,public.soff_commercial_price_history FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.soff_commercial_requests TO service_role;
GRANT SELECT,INSERT ON public.soff_commercial_role_history TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.soff_product_costs TO service_role;
GRANT SELECT,INSERT ON public.soff_commercial_price_history TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.soff_commercial_role_history_id_seq TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.soff_commercial_price_history_id_seq TO service_role;

-- La identidad se valida con auth.getUser() en API; p_actor llega SOLO desde servidor.
-- Se vuelve a verificar privilegio en la base por defensa adicional.
CREATE OR REPLACE FUNCTION public.soff_commercial_submit(
  p_user_id uuid,p_requested_role text,p_details text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_role text;v_id uuid;
BEGIN
 IF p_requested_role NOT IN ('mayorista','revendedor','peluquero') THEN
  RAISE EXCEPTION 'Categoría comercial inválida.';
 END IF;
 IF p_details IS NULL OR char_length(btrim(p_details)) > 500 THEN
  RAISE EXCEPTION 'Detalle inválido.';
 END IF;
 SELECT role INTO v_role FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND OR v_role='admin' THEN RAISE EXCEPTION 'Cuenta no habilitada para solicitar.'; END IF;
 IF v_role=p_requested_role THEN RAISE EXCEPTION 'La cuenta ya tiene esa categoría.'; END IF;
 IF EXISTS(SELECT 1 FROM public.soff_commercial_requests WHERE user_id=p_user_id AND status='pendiente') THEN
  RAISE EXCEPTION 'Ya existe una solicitud pendiente.';
 END IF;
 IF EXISTS (SELECT 1 FROM public.soff_commercial_requests
            WHERE user_id=p_user_id AND created_at>now()-interval '24 hours') THEN
  RAISE EXCEPTION 'Esperá 24 horas para enviar otra solicitud.';
 END IF;
 INSERT INTO public.soff_commercial_requests(user_id,requested_role,details)
 VALUES(p_user_id,p_requested_role,btrim(p_details)) RETURNING id INTO v_id;
 RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.soff_commercial_decide(
 p_actor_id uuid,p_request_id uuid,p_approve boolean,p_note text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.soff_commercial_requests%ROWTYPE; v_old_role text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN
  RAISE EXCEPTION 'Sin autorización.';
 END IF;
 IF p_note IS NULL OR char_length(btrim(p_note))>500 THEN RAISE EXCEPTION 'Nota inválida.'; END IF;
 SELECT * INTO v_request FROM public.soff_commercial_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR v_request.status<>'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue procesada o no existe.'; END IF;
 SELECT role INTO v_old_role FROM public.profiles WHERE id=v_request.user_id FOR UPDATE;
 IF NOT FOUND OR v_old_role='admin' THEN RAISE EXCEPTION 'No se puede modificar un administrador.'; END IF;
 IF p_approve THEN
  IF v_old_role=v_request.requested_role THEN RAISE EXCEPTION 'El cliente ya pertenece a esa categoría.'; END IF;
  UPDATE public.profiles SET role=v_request.requested_role WHERE id=v_request.user_id;
  INSERT INTO public.soff_commercial_role_history(user_id,actor_id,old_role,new_role,origin,request_id,note)
  VALUES(v_request.user_id,p_actor_id,v_old_role,v_request.requested_role,'solicitud',p_request_id,btrim(p_note));
 END IF;
 UPDATE public.soff_commercial_requests
 SET status=CASE WHEN p_approve THEN 'aprobada' ELSE 'rechazada' END,
     reviewed_by=p_actor_id, reviewed_at=now(), review_note=btrim(p_note)
 WHERE id=p_request_id;
END;$$;

CREATE OR REPLACE FUNCTION public.soff_commercial_assign(
 p_actor_id uuid,p_user_id uuid,p_role text,p_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old_role text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN RAISE EXCEPTION 'Sin autorización.'; END IF;
 IF p_role NOT IN ('minorista','mayorista','revendedor','peluquero') THEN RAISE EXCEPTION 'Categoría inválida.'; END IF;
 IF p_note IS NULL OR char_length(btrim(p_note))<8 OR char_length(btrim(p_note))>500 THEN
  RAISE EXCEPTION 'Informá un motivo de 8 a 500 caracteres.';
 END IF;
 SELECT role INTO v_old_role FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND OR v_old_role='admin' OR p_user_id=p_actor_id THEN RAISE EXCEPTION 'No se puede modificar esa cuenta.'; END IF;
 IF v_old_role=p_role THEN RAISE EXCEPTION 'El cliente ya tiene esa categoría.'; END IF;
 UPDATE public.profiles SET role=p_role WHERE id=p_user_id;
 INSERT INTO public.soff_commercial_role_history(user_id,actor_id,old_role,new_role,origin,note)
 VALUES(p_user_id,p_actor_id,v_old_role,p_role,'asignacion_manual',btrim(p_note));
 -- Evitar dejar pendiente una solicitud incompatible con la asignación manual.
 UPDATE public.soff_commercial_requests
 SET status=CASE WHEN requested_role=p_role THEN 'aprobada' ELSE 'rechazada' END, reviewed_by=p_actor_id,
  reviewed_at=now(),review_note='Resuelta por asignación administrativa: '||LEFT(btrim(p_note),450)
 WHERE user_id=p_user_id AND status='pendiente';
END;$$;

CREATE OR REPLACE FUNCTION public.soff_commercial_save_prices(
 p_actor_id uuid,p_product_id uuid,p_minorista numeric,p_mayorista numeric,
 p_revendedor numeric,p_peluquero numeric,p_cost numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_prev public.products%ROWTYPE;v_prev_cost numeric;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN RAISE EXCEPTION 'Sin autorización.'; END IF;
 IF p_minorista IS NULL OR p_minorista<=0 OR p_minorista>1000000000 OR
    p_mayorista IS NULL OR p_mayorista<0 OR p_mayorista>1000000000 OR
    p_revendedor IS NULL OR p_revendedor<0 OR p_revendedor>1000000000 OR
    p_peluquero IS NULL OR p_peluquero<0 OR p_peluquero>1000000000 OR
    p_minorista<>round(p_minorista,2) OR p_mayorista<>round(p_mayorista,2) OR
    p_revendedor<>round(p_revendedor,2) OR p_peluquero<>round(p_peluquero,2) OR
    (p_cost IS NOT NULL AND (p_cost<0 OR p_cost>1000000000 OR p_cost<>round(p_cost,2)))
 THEN RAISE EXCEPTION 'Precios o costo inválidos.'; END IF;
 SELECT * INTO v_prev FROM public.products WHERE id=p_product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto inexistente.'; END IF;
 SELECT unit_cost INTO v_prev_cost FROM public.soff_product_costs WHERE product_id=p_product_id;
 UPDATE public.products SET price_minorista=p_minorista,price_mayorista=p_mayorista,
  price_revendedor=p_revendedor,price_peluquero=p_peluquero WHERE id=p_product_id;
 IF p_cost IS NULL THEN
  DELETE FROM public.soff_product_costs WHERE product_id=p_product_id;
 ELSE
  INSERT INTO public.soff_product_costs(product_id,unit_cost,updated_by)
  VALUES(p_product_id,p_cost,p_actor_id)
  ON CONFLICT(product_id) DO UPDATE SET unit_cost=EXCLUDED.unit_cost,updated_by=EXCLUDED.updated_by,updated_at=now();
 END IF;
 INSERT INTO public.soff_commercial_price_history
 (product_id,actor_id,old_prices,new_prices,old_cost,new_cost)
 VALUES(p_product_id,p_actor_id,
  jsonb_build_object('minorista',v_prev.price_minorista,'mayorista',v_prev.price_mayorista,'revendedor',v_prev.price_revendedor,'peluquero',v_prev.price_peluquero),
  jsonb_build_object('minorista',p_minorista,'mayorista',p_mayorista,'revendedor',p_revendedor,'peluquero',p_peluquero),v_prev_cost,p_cost);
END;$$;

REVOKE ALL ON FUNCTION public.soff_commercial_submit(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.soff_commercial_decide(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.soff_commercial_assign(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.soff_commercial_save_prices(uuid,uuid,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.soff_commercial_submit(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.soff_commercial_decide(uuid,uuid,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.soff_commercial_assign(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.soff_commercial_save_prices(uuid,uuid,numeric,numeric,numeric,numeric,numeric) TO service_role;
COMMIT;
-- Validar en staging: clientes normales no pueden consultar costo, historial ni solicitudes ajenas.
-- Validar que no se puede autoasignar rol/admin y que concurrencia no duplique decisiones.
-- Verificar precios en checkout y reversión de cambios desde un backup, NO con rollback de Windows.
