
-- transport_rides: enable RLS, restrict to c-level, administrativo, rh, superadmin
ALTER TABLE public.transport_rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_rides_select_authorized" ON public.transport_rides
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::app_role[]));
CREATE POLICY "transport_rides_modify_authorized" ON public.transport_rides
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','superadmin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','superadmin']::app_role[]));

-- pending_replacements
ALTER TABLE public.pending_replacements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_replacements_select" ON public.pending_replacements
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','rh','intermediario','superadmin']::app_role[]));
CREATE POLICY "pending_replacements_modify" ON public.pending_replacements
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','rh','superadmin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','rh','superadmin']::app_role[]));

-- role_profiles
ALTER TABLE public.role_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_profiles_select" ON public.role_profiles
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "role_profiles_modify" ON public.role_profiles
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::app_role[]));

-- snapshots_backup_20260615: mirror snapshots (c-level + administrativo)
ALTER TABLE public.snapshots_backup_20260615 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_backup_select" ON public.snapshots_backup_20260615
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','superadmin']::app_role[]));
CREATE POLICY "snapshots_backup_modify" ON public.snapshots_backup_20260615
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::app_role[]));
