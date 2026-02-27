
-- Fix RESTRICTIVE policies on feedz_sync_items to be PERMISSIVE
DROP POLICY IF EXISTS fsi_select ON public.feedz_sync_items;
CREATE POLICY fsi_select ON public.feedz_sync_items FOR SELECT USING (true);

DROP POLICY IF EXISTS fsi_insert ON public.feedz_sync_items;
CREATE POLICY fsi_insert ON public.feedz_sync_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));

DROP POLICY IF EXISTS fsi_delete ON public.feedz_sync_items;
CREATE POLICY fsi_delete ON public.feedz_sync_items FOR DELETE USING (has_role(auth.uid(), 'c-level'::app_role));
