
-- Add governance columns to ai_runs
ALTER TABLE public.ai_runs
  ADD COLUMN IF NOT EXISTS template_type text,
  ADD COLUMN IF NOT EXISTS tokens_in integer,
  ADD COLUMN IF NOT EXISTS tokens_out integer,
  ADD COLUMN IF NOT EXISTS approved_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_reason text,
  ADD COLUMN IF NOT EXISTS replay_of_run_id uuid REFERENCES public.ai_runs(id);

-- UPDATE policy for ai_runs (c-level can update approved_status)
CREATE POLICY "air_update_clevel" ON public.ai_runs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

-- DELETE policy for ai_runs (c-level only)
CREATE POLICY "air_delete_clevel" ON public.ai_runs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

-- Create ai_run_exports table
CREATE TABLE public.ai_run_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_type text NOT NULL DEFAULT 'json',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_run_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "are_select" ON public.ai_run_exports
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "are_insert" ON public.ai_run_exports
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "are_delete" ON public.ai_run_exports
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

-- Create private bucket for AI exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-exports', 'ai-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for ai-exports bucket
CREATE POLICY "ai_exports_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ai-exports' AND has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ai_exports_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-exports' AND has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ai_exports_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ai-exports' AND has_role(auth.uid(), 'c-level'::app_role));
