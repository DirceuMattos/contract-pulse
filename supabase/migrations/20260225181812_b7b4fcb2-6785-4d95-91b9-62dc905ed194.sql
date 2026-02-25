
-- Add origin column to job_titles and teams
ALTER TABLE public.job_titles ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS origin text;

-- Create feedz_sync_runs table
CREATE TABLE public.feedz_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  records_processed integer NOT NULL DEFAULT 0,
  records_created integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  records_terminated integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedz_runs_select" ON public.feedz_sync_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedz_runs_insert" ON public.feedz_sync_runs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "feedz_runs_update" ON public.feedz_sync_runs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "feedz_runs_delete" ON public.feedz_sync_runs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- Create feedz_sync_events table
CREATE TABLE public.feedz_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES public.feedz_sync_runs(id) ON DELETE CASCADE,
  external_id text,
  event_type text NOT NULL,
  fields_changed text[] NOT NULL DEFAULT '{}',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedz_events_select" ON public.feedz_sync_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedz_events_insert" ON public.feedz_sync_events FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "feedz_events_delete" ON public.feedz_sync_events FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
