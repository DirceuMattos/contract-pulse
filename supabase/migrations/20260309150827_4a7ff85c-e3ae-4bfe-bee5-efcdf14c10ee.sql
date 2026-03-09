
-- Table to track correction runs
CREATE TABLE public.hr_correction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  total_processed integer NOT NULL DEFAULT 0,
  total_changed integer NOT NULL DEFAULT 0,
  total_not_found integer NOT NULL DEFAULT 0,
  total_no_diff integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  initiated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_correction_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hcr_select" ON public.hr_correction_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "hcr_insert" ON public.hr_correction_runs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "hcr_update" ON public.hr_correction_runs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "hcr_delete" ON public.hr_correction_runs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- Table to track individual correction items with snapshots
CREATE TABLE public.hr_correction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.hr_correction_runs(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  person_name text NOT NULL DEFAULT '',
  snapshot_before jsonb NOT NULL DEFAULT '{}',
  fields_changed jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_correction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hci_select" ON public.hr_correction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "hci_insert" ON public.hr_correction_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY "hci_delete" ON public.hr_correction_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
