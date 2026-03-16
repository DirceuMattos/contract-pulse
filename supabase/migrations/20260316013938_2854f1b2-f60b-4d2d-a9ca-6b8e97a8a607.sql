
-- Table: doc_text_extractions
CREATE TABLE public.doc_text_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.document_attachments(id) ON DELETE CASCADE,
  owner_type text NOT NULL DEFAULT 'CONTRACT',
  owner_id uuid,
  extracted_text text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  extracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dte_document_id ON public.doc_text_extractions(document_id);
CREATE INDEX idx_dte_status ON public.doc_text_extractions(status);

ALTER TABLE public.doc_text_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dte_select" ON public.doc_text_extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dte_insert" ON public.doc_text_extractions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "dte_update" ON public.doc_text_extractions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "dte_delete" ON public.doc_text_extractions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- Table: doc_chunks
CREATE TABLE public.doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.document_attachments(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  chunk_text text NOT NULL DEFAULT '',
  chunk_hash text,
  page_start int,
  page_end int,
  token_count_est int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dc_document_id ON public.doc_chunks(document_id, chunk_index);

-- Add tsvector column for full-text search
ALTER TABLE public.doc_chunks ADD COLUMN tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', chunk_text)) STORED;
CREATE INDEX idx_dc_tsv ON public.doc_chunks USING GIN(tsv);

ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dc_select" ON public.doc_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "dc_insert" ON public.doc_chunks FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "dc_update" ON public.doc_chunks FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "dc_delete" ON public.doc_chunks FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- Table: doc_chunk_embeddings (prepared for future pgvector)
CREATE TABLE public.doc_chunk_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES public.doc_chunks(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_chunk_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dce_select" ON public.doc_chunk_embeddings FOR SELECT TO authenticated USING (true);

-- Table: ai_runs
CREATE TABLE public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'draft_contract',
  user_id uuid NOT NULL,
  input_json jsonb NOT NULL DEFAULT '{}',
  redaction_level text NOT NULL DEFAULT 'full',
  internal_docs_used jsonb DEFAULT '[]',
  external_sources_used jsonb DEFAULT '[]',
  output_text text,
  output_structured jsonb,
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  model text,
  template_version text,
  prompt_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_air_user ON public.ai_runs(user_id);
CREATE INDEX idx_air_type ON public.ai_runs(run_type);

ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "air_select" ON public.ai_runs FOR SELECT TO authenticated USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'c-level'::app_role)
);
CREATE POLICY "air_insert" ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Table: ai_external_search_logs
CREATE TABLE public.ai_external_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  query text NOT NULL DEFAULT '',
  sources jsonb DEFAULT '[]',
  searched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_external_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aesl_select" ON public.ai_external_search_logs FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'c-level'::app_role)
);

-- Function: match_chunks_fts (full-text search)
CREATE OR REPLACE FUNCTION public.match_chunks_fts(
  query_text text,
  doc_ids uuid[],
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_index int,
  chunk_text text,
  page_start int,
  page_end int,
  rank real
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.document_id,
    c.chunk_index,
    c.chunk_text,
    c.page_start,
    c.page_end,
    ts_rank(c.tsv, plainto_tsquery('portuguese', query_text)) as rank
  FROM public.doc_chunks c
  WHERE c.document_id = ANY(doc_ids)
    AND c.tsv @@ plainto_tsquery('portuguese', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
$$;
