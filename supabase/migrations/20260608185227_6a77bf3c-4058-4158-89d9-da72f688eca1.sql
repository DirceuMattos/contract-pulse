
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='snapshots' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.snapshots', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='superlogica_sync_run' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.superlogica_sync_run', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY snapshots_select ON public.snapshots
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo']::app_role[]));

CREATE POLICY superlogica_sync_run_select ON public.superlogica_sync_run
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo']::app_role[]));
