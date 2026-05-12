-- profiles: only own profile or c-level
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'c-level'::app_role));

-- feedz_sync_inconsistency: c-level/rh only
DROP POLICY IF EXISTS fsi2_select ON public.feedz_sync_inconsistency;
DROP POLICY IF EXISTS fsi2_insert ON public.feedz_sync_inconsistency;
DROP POLICY IF EXISTS fsi2_delete ON public.feedz_sync_inconsistency;
CREATE POLICY fsi2_select ON public.feedz_sync_inconsistency
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));
CREATE POLICY fsi2_insert ON public.feedz_sync_inconsistency
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY fsi2_delete ON public.feedz_sync_inconsistency
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::app_role));

-- feedz_sync_items: c-level/rh only
DROP POLICY IF EXISTS fsi_select ON public.feedz_sync_items;
DROP POLICY IF EXISTS fsi_insert ON public.feedz_sync_items;
DROP POLICY IF EXISTS fsi_update ON public.feedz_sync_items;
DROP POLICY IF EXISTS fsi_delete ON public.feedz_sync_items;
CREATE POLICY fsi_select ON public.feedz_sync_items
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));
CREATE POLICY fsi_insert ON public.feedz_sync_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY fsi_update ON public.feedz_sync_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::app_role));
CREATE POLICY fsi_delete ON public.feedz_sync_items
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::app_role));

-- feedz_pending_matches: c-level/rh only
DROP POLICY IF EXISTS fpm_select ON public.feedz_pending_matches;
CREATE POLICY fpm_select ON public.feedz_pending_matches
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));