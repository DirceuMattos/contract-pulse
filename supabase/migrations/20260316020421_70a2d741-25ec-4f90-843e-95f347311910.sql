
-- 1.1 Helper function is_clevel
CREATE OR REPLACE FUNCTION public.is_clevel()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'c-level'::app_role); $$;

-- 1.2 Security definer function for extraction status (no extracted_text exposed)
CREATE OR REPLACE FUNCTION public.get_doc_extractions_status()
RETURNS TABLE(id uuid, document_id uuid, owner_type text, owner_id uuid, status text, extracted_at timestamptz, error_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, document_id, owner_type, owner_id, status, extracted_at, error_message FROM public.doc_text_extractions; $$;

REVOKE ALL ON FUNCTION public.get_doc_extractions_status() FROM public;
GRANT EXECUTE ON FUNCTION public.get_doc_extractions_status() TO authenticated;

-- 1.3 Lock down doc_chunks: remove open SELECT
DROP POLICY IF EXISTS "dc_select" ON public.doc_chunks;

-- 1.4 Lock down doc_chunk_embeddings: remove open SELECT
DROP POLICY IF EXISTS "dce_select" ON public.doc_chunk_embeddings;

-- 1.5 Lock down doc_text_extractions: replace open SELECT with c-level only
DROP POLICY IF EXISTS "dte_select" ON public.doc_text_extractions;
CREATE POLICY "dte_select_clevel" ON public.doc_text_extractions FOR SELECT TO authenticated USING (public.is_clevel());

-- 1.6 doc_templates table
CREATE TABLE IF NOT EXISTS public.doc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  title text NOT NULL,
  body_markdown text NOT NULL,
  schema_json jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key, version)
);

ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_select" ON public.doc_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "dt_insert" ON public.doc_templates FOR INSERT TO authenticated WITH CHECK (public.is_clevel());
CREATE POLICY "dt_update" ON public.doc_templates FOR UPDATE TO authenticated USING (public.is_clevel());
CREATE POLICY "dt_delete" ON public.doc_templates FOR DELETE TO authenticated USING (public.is_clevel());
