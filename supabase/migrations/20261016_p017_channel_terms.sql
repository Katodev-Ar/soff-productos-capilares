-- SOFF P017 / v1.0.17 — Condiciones comerciales por canal.
-- REQUIERE P015. EJECUTAR MANUALMENTE EN STAGING ANTES DEL DESPLIEGUE.
-- Los importes de ejemplo minoristas preservan el comportamiento de P016.
BEGIN;
CREATE TABLE IF NOT EXISTS public.soff_channel_terms (
 channel text PRIMARY KEY CHECK (channel IN ('minorista','mayorista','revendedor','peluquero')),
 minimum_order numeric(14,2) NOT NULL DEFAULT 0 CHECK(minimum_order>=0 AND minimum_order<=1000000000),
 first_threshold numeric(14,2) CHECK (first_threshold IS NULL OR (first_threshold>0 AND first_threshold<=1000000000)),
 first_discount numeric(5,2) NOT NULL DEFAULT 0 CHECK(first_discount>=0 AND first_discount<=80),
 second_threshold numeric(14,2) CHECK (second_threshold IS NULL OR (second_threshold>0 AND second_threshold<=1000000000)),
 second_discount numeric(5,2) NOT NULL DEFAULT 0 CHECK(second_discount>=0 AND second_discount<=80),
 allow_coupons boolean NOT NULL DEFAULT false,
 free_shipping_mode text NOT NULL DEFAULT 'inherit' CHECK(free_shipping_mode IN ('inherit','disabled','threshold','always')),
 free_shipping_threshold numeric(14,2) CHECK (free_shipping_threshold IS NULL OR (free_shipping_threshold>0 AND free_shipping_threshold<=1000000000)),
 change_reason text NOT NULL DEFAULT '' CHECK(char_length(change_reason)<=300),
 updated_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT soff_valid_discounts CHECK (
   (first_threshold IS NULL AND first_discount=0 AND second_threshold IS NULL AND second_discount=0)
   OR (first_threshold IS NOT NULL AND (second_threshold IS NULL AND second_discount=0
       OR second_threshold>first_threshold AND second_discount>=first_discount))
 ),
 CONSTRAINT soff_valid_shipping CHECK (
    (free_shipping_mode='threshold' AND free_shipping_threshold IS NOT NULL)
    OR (free_shipping_mode<>'threshold' AND free_shipping_threshold IS NULL)
 )
);
-- No reescribir una política que el propietario ya configuró en un reintento.
INSERT INTO public.soff_channel_terms
 (channel,minimum_order,first_threshold,first_discount,second_threshold,second_discount,allow_coupons,free_shipping_mode)
 VALUES ('minorista',0,45000,5,70000,10,true,'inherit'),
        ('mayorista',0,NULL,0,NULL,0,false,'inherit'),
        ('revendedor',0,NULL,0,NULL,0,false,'inherit'),
        ('peluquero',0,NULL,0,NULL,0,false,'inherit')
ON CONFLICT (channel) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.soff_channel_terms_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 channel text NOT NULL,
 actor uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 before_data jsonb NOT NULL,
 after_data jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.soff_audit_channel_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
 -- updated_by lo aporta el endpoint admin, con la sesión validada en el servidor.
 INSERT INTO public.soff_channel_terms_audit(channel,actor,before_data,after_data)
 VALUES(NEW.channel,NEW.updated_by,to_jsonb(OLD),to_jsonb(NEW));
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS soff_channel_terms_audit_update ON public.soff_channel_terms;
CREATE TRIGGER soff_channel_terms_audit_update AFTER UPDATE ON public.soff_channel_terms
 FOR EACH ROW EXECUTE FUNCTION public.soff_audit_channel_terms();
ALTER TABLE public.soff_channel_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soff_channel_terms_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.soff_channel_terms,public.soff_channel_terms_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.soff_channel_terms TO service_role;
GRANT SELECT,INSERT ON public.soff_channel_terms_audit TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.soff_channel_terms_audit_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.soff_audit_channel_terms() FROM PUBLIC,anon,authenticated;
COMMIT;
