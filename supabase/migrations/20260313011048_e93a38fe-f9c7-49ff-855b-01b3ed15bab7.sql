
-- 1. Create feedz_sync_change table
CREATE TABLE public.feedz_sync_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.feedz_sync_runs(id) ON DELETE CASCADE,
  matricula text,
  hr_people_id uuid,
  action text NOT NULL DEFAULT 'inconsistency',
  synced_at timestamptz NOT NULL DEFAULT now(),
  changed_fields jsonb DEFAULT '[]'::jsonb,
  before_snapshot jsonb,
  after_snapshot jsonb,
  payload_hash text,
  reverted_at timestamptz,
  reverted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_sync_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsc_select" ON public.feedz_sync_change FOR SELECT TO public USING (true);
CREATE POLICY "fsc_insert" ON public.feedz_sync_change FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fsc_update" ON public.feedz_sync_change FOR UPDATE TO public USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fsc_delete" ON public.feedz_sync_change FOR DELETE TO public USING (has_role(auth.uid(), 'c-level'::app_role));

-- 2. Create feedz_sync_inconsistency table
CREATE TABLE public.feedz_sync_inconsistency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.feedz_sync_runs(id) ON DELETE CASCADE,
  matricula text,
  reason_code text NOT NULL,
  reason_detail text NOT NULL DEFAULT '',
  feedz_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_sync_inconsistency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsi2_select" ON public.feedz_sync_inconsistency FOR SELECT TO public USING (true);
CREATE POLICY "fsi2_insert" ON public.feedz_sync_inconsistency FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fsi2_delete" ON public.feedz_sync_inconsistency FOR DELETE TO public USING (has_role(auth.uid(), 'c-level'::app_role));

-- 3. Add inconsistency_count to feedz_sync_runs
ALTER TABLE public.feedz_sync_runs ADD COLUMN IF NOT EXISTS inconsistency_count integer NOT NULL DEFAULT 0;

-- 4. Unique partial constraint on hr_people.matricula
CREATE UNIQUE INDEX IF NOT EXISTS hr_people_matricula_unique ON public.hr_people (matricula) WHERE matricula IS NOT NULL;
