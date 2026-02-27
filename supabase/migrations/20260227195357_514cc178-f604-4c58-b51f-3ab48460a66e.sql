
-- 1. New table: feedz_sync_items (per-record audit for sync V2)
CREATE TABLE public.feedz_sync_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_run_id uuid NOT NULL REFERENCES public.feedz_sync_runs(id) ON DELETE CASCADE,
  feedz_id text,
  feedz_email text,
  feedz_name text,
  match_strategy text NOT NULL DEFAULT 'NONE',
  matched_hr_person_id uuid,
  action text NOT NULL DEFAULT 'SKIP',
  reason_code text,
  fields_changed_json jsonb DEFAULT '[]'::jsonb,
  snapshot_before jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_sync_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsi_insert" ON public.feedz_sync_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fsi_select" ON public.feedz_sync_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "fsi_delete" ON public.feedz_sync_items AS RESTRICTIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

-- 2. New table: feedz_alias_mappings
CREATE TABLE public.feedz_alias_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alias_type text NOT NULL DEFAULT 'cargo',
  feedz_value text NOT NULL,
  internal_id uuid,
  internal_label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedz_alias_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fam_select" ON public.feedz_alias_mappings AS RESTRICTIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "fam_insert" ON public.feedz_alias_mappings AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fam_update" ON public.feedz_alias_mappings AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "fam_delete" ON public.feedz_alias_mappings AS RESTRICTIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'c-level'::app_role));

-- 3. Alter feedz_sync_runs: add tracking columns
ALTER TABLE public.feedz_sync_runs
  ADD COLUMN IF NOT EXISTS matched_by_feedz_id integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_by_email integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_by_phone integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_by_name_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initiated_by uuid,
  ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'strict';

-- 4. Add phone_norm to hr_people
ALTER TABLE public.hr_people
  ADD COLUMN IF NOT EXISTS phone_norm text;

-- 5. Partial unique constraint on hr_people.id_externo
CREATE UNIQUE INDEX IF NOT EXISTS hr_people_id_externo_unique ON public.hr_people (id_externo) WHERE id_externo IS NOT NULL;

-- 6. Index on feedz_sync_items for fast lookups
CREATE INDEX IF NOT EXISTS idx_fsi_sync_run_id ON public.feedz_sync_items (sync_run_id);
CREATE INDEX IF NOT EXISTS idx_fsi_action ON public.feedz_sync_items (action);
