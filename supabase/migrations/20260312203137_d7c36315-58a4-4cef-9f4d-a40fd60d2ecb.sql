
-- Add payload_hash, reverted_at, reverted_by to feedz_sync_items
ALTER TABLE public.feedz_sync_items ADD COLUMN IF NOT EXISTS payload_hash text;
ALTER TABLE public.feedz_sync_items ADD COLUMN IF NOT EXISTS reverted_at timestamptz;
ALTER TABLE public.feedz_sync_items ADD COLUMN IF NOT EXISTS reverted_by uuid;

-- Add source and sync_run_id to hr_timeline for Feedz traceability
ALTER TABLE public.hr_timeline ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.hr_timeline ADD COLUMN IF NOT EXISTS sync_run_id uuid;

-- Add UPDATE policy for feedz_sync_items (needed for marking reverted_at)
CREATE POLICY "fsi_update" ON public.feedz_sync_items FOR UPDATE USING (has_role(auth.uid(), 'c-level'::app_role));
