-- SOFF P007 — Registro fiscal/contable de comprobantes emitidos EXTERNAMENTE.
-- NO EMITE COMPROBANTES, NO SOLICITA CAE, NO VALIDA EN ARCA POR INTERNET.
-- Requiere P002, P004, P005 y P006. Respaldar y probar en staging antes de aplicar.
-- ATENCIÓN: completar la CUIT del emisor en soff_fiscal_settings ANTES de cargar documentos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.soff_fiscal_settings (
  code text PRIMARY KEY CHECK (code='emisor'),
  issuer_cuit text NOT NULL CHECK (issuer_cuit ~ '^[0-9]{11}$'),
  inserted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.soff_fiscal_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.soff_fiscal_settings FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.soff_fiscal_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.soff_fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  document_class text NOT NULL CHECK(document_class IN ('factura','nota_credito')),
  voucher_type text NOT NULL CHECK(voucher_type IN ('A','B','C','M')),
  issuer_cuit text NOT NULL CHECK(issuer_cuit ~ '^[0-9]{11}$'),
  recipient_doc_type text NOT NULL CHECK(recipient_doc_type IN ('CUIT','DNI','CF')),
  recipient_doc_number text NOT NULL CHECK(recipient_doc_number ~ '^[0-9]{1,11}$'),
  point_of_sale integer NOT NULL CHECK(point_of_sale BETWEEN 1 AND 99999),
  voucher_number integer NOT NULL CHECK(voucher_number BETWEEN 1 AND 99999999),
  issued_on date NOT NULL,
  cae text NOT NULL CHECK(cae ~ '^[0-9]{14}$'),
  cae_expiration date NOT NULL CHECK(cae_expiration>=issued_on),
  currency text NOT NULL DEFAULT 'ARS' CHECK(currency='ARS'),
  net_amount numeric(14,2) NOT NULL CHECK(net_amount>=0),
  vat_amount numeric(14,2) NOT NULL CHECK(vat_amount>=0),
  exempt_amount numeric(14,2) NOT NULL CHECK(exempt_amount>=0),
  non_taxable_amount numeric(14,2) NOT NULL CHECK(non_taxable_amount>=0),
  other_taxes_amount numeric(14,2) NOT NULL CHECK(other_taxes_amount>=0),
  total_amount numeric(14,2) NOT NULL CHECK(total_amount>0),
  reference_document_id uuid REFERENCES public.soff_fiscal_documents(id) ON DELETE RESTRICT,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Importes copiados del comprobante real, NO estimados automáticamente por este sitio.
  CONSTRAINT soff_fiscal_sum_valid CHECK (
    net_amount+vat_amount+exempt_amount+non_taxable_amount+other_taxes_amount=total_amount
  ),
  CONSTRAINT soff_fiscal_c_no_iva CHECK (voucher_type<>'C' OR vat_amount=0),
  CONSTRAINT soff_fiscal_reference_valid CHECK (
    (document_class='factura' AND reference_document_id IS NULL) OR
    (document_class='nota_credito' AND reference_document_id IS NOT NULL)
  ),
  UNIQUE(issuer_cuit,document_class,voucher_type,point_of_sale,voucher_number),
  UNIQUE(issuer_cuit,cae,document_class,voucher_type,point_of_sale,voucher_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS soff_fiscal_one_invoice_per_order
 ON public.soff_fiscal_documents(order_id) WHERE document_class='factura';
CREATE INDEX IF NOT EXISTS soff_fiscal_by_order_date ON public.soff_fiscal_documents(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS soff_fiscal_by_date ON public.soff_fiscal_documents(issued_on);
ALTER TABLE public.soff_fiscal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.soff_fiscal_documents FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.soff_fiscal_documents TO service_role;

CREATE TABLE IF NOT EXISTS public.soff_fiscal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES public.soff_fiscal_documents(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.soff_fiscal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.soff_fiscal_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.soff_fiscal_events TO service_role;

-- Una vez registrado, el documento permanece inmutable. Las correcciones fiscales se
-- instrumentan con notas de crédito/debito autorizadas, nunca borrando un registro.
CREATE OR REPLACE FUNCTION public.soff_deny_fiscal_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Registro fiscal inmutable: no se modifica ni elimina'; END;
$$;
DROP TRIGGER IF EXISTS soff_fiscal_document_immutable ON public.soff_fiscal_documents;
CREATE TRIGGER soff_fiscal_document_immutable BEFORE UPDATE OR DELETE
 ON public.soff_fiscal_documents FOR EACH ROW EXECUTE FUNCTION public.soff_deny_fiscal_edit();

CREATE OR REPLACE FUNCTION public.soff_register_external_fiscal_document(
 p_actor_id uuid, p_order_id uuid, p_document_class text, p_voucher_type text,
 p_issuer_cuit text, p_recipient_type text, p_recipient_number text,
 p_pos integer, p_number integer, p_issued_on date,
 p_cae text, p_cae_expiration date, p_net numeric, p_vat numeric,
 p_exempt numeric, p_non_taxable numeric, p_other_taxes numeric, p_total numeric,
 p_reference_document uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_order public.orders%ROWTYPE;
 v_invoice public.soff_fiscal_documents%ROWTYPE;
 v_record_id uuid;
 v_credits numeric(14,2);
 v_config_cuit text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN
   RAISE EXCEPTION 'No autorizado';
 END IF;
 SELECT issuer_cuit INTO v_config_cuit FROM public.soff_fiscal_settings WHERE code='emisor';
 IF v_config_cuit IS NULL THEN RAISE EXCEPTION 'Falta configurar CUIT del emisor verificado'; END IF;
 IF p_issuer_cuit<>v_config_cuit THEN RAISE EXCEPTION 'CUIT emisor no coincide con configuración'; END IF;
 IF p_document_class NOT IN ('factura','nota_credito') OR p_voucher_type NOT IN ('A','B','C','M') THEN
   RAISE EXCEPTION 'Clase o tipo de documento no admitidos';
 END IF;
 IF p_recipient_type NOT IN ('CUIT','DNI','CF') OR p_recipient_number !~ '^[0-9]{1,11}$' OR
   (p_recipient_type='CUIT' AND p_recipient_number !~ '^[0-9]{11}$') THEN
   RAISE EXCEPTION 'Documento de receptor inválido';
 END IF;
 IF p_cae !~ '^[0-9]{14}$' OR p_issued_on>current_date OR p_cae_expiration<p_issued_on THEN
   RAISE EXCEPTION 'CAE o fechas no válidas';
 END IF;
 IF p_pos NOT BETWEEN 1 AND 99999 OR p_number NOT BETWEEN 1 AND 99999999 THEN
   RAISE EXCEPTION 'Punto de venta o número fuera de rango';
 END IF;
 IF p_net IS NULL OR p_vat IS NULL OR p_exempt IS NULL OR p_non_taxable IS NULL OR
    p_other_taxes IS NULL OR p_total IS NULL OR p_total<=0 OR
    LEAST(p_net,p_vat,p_exempt,p_non_taxable,p_other_taxes)<0 OR
    round(p_net+p_vat+p_exempt+p_non_taxable+p_other_taxes,2)<>round(p_total,2) OR
    (p_voucher_type='C' AND p_vat<>0) THEN
   RAISE EXCEPTION 'Los componentes del comprobante no coinciden con el total';
 END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido inexistente'; END IF;
 IF p_document_class='factura' THEN
   IF v_order.status NOT IN ('pagado','en_preparacion','enviado','entregado') THEN
     RAISE EXCEPTION 'Solo se pueden registrar facturas de pedidos acreditados';
   END IF;
   IF p_reference_document IS NOT NULL THEN RAISE EXCEPTION 'La factura no tiene comprobante asociado'; END IF;
   IF round(v_order.total,2)<>round(p_total,2) THEN
     RAISE EXCEPTION 'Total de factura y pedido no coinciden: requiere revisión';
   END IF;
 ELSE
   IF p_reference_document IS NULL THEN RAISE EXCEPTION 'Nota de crédito sin factura vinculada'; END IF;
   SELECT * INTO v_invoice FROM public.soff_fiscal_documents
    WHERE id=p_reference_document AND order_id=p_order_id AND document_class='factura';
   IF NOT FOUND THEN RAISE EXCEPTION 'Factura de referencia inexistente para ese pedido'; END IF;
   SELECT COALESCE(SUM(total_amount),0) INTO v_credits FROM public.soff_fiscal_documents
    WHERE reference_document_id=p_reference_document AND document_class='nota_credito';
   IF round(p_total,2)>round(v_invoice.total_amount-v_credits,2) THEN
     RAISE EXCEPTION 'Nota de crédito supera el saldo de la factura';
   END IF;
 END IF;
 INSERT INTO public.soff_fiscal_documents(
    order_id,document_class,voucher_type,issuer_cuit,recipient_doc_type,recipient_doc_number,
    point_of_sale,voucher_number,issued_on,cae,cae_expiration,
    net_amount,vat_amount,exempt_amount,non_taxable_amount,other_taxes_amount,
    total_amount,reference_document_id,recorded_by
 ) VALUES (
    p_order_id,p_document_class,p_voucher_type,p_issuer_cuit,p_recipient_type,p_recipient_number,
    p_pos,p_number,p_issued_on,p_cae,p_cae_expiration,
    p_net,p_vat,p_exempt,p_non_taxable,p_other_taxes,
    p_total,p_reference_document,p_actor_id
 ) RETURNING id INTO v_record_id;
 INSERT INTO public.soff_fiscal_events(order_id,document_id,actor_id,detail)
 VALUES(p_order_id,v_record_id,p_actor_id,'Registro manual de comprobante ya autorizado fuera de SOFF');
 RETURN jsonb_build_object('id',v_record_id,'class',p_document_class,'is_arca_verified',false);
END;
$$;
REVOKE ALL ON FUNCTION public.soff_register_external_fiscal_document(
 uuid,uuid,text,text,text,text,text,integer,integer,date,text,date,
 numeric,numeric,numeric,numeric,numeric,numeric,uuid
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.soff_register_external_fiscal_document(
 uuid,uuid,text,text,text,text,text,integer,integer,date,text,date,
 numeric,numeric,numeric,numeric,numeric,numeric,uuid
) TO service_role;
COMMIT;

-- PASO EXTERNO OBLIGATORIO (solo luego de validar la condición del titular):
-- INSERT INTO public.soff_fiscal_settings(code,issuer_cuit)
-- VALUES('emisor','CUIT_REAL_11_DIGITOS')
-- ON CONFLICT(code) DO UPDATE SET issuer_cuit=excluded.issuer_cuit;
-- NO usar CUIT de prueba en un sistema comercial.
-- Este SQL NO crea certificados, no se comunica con ARCA ni autoriza comprobantes.
