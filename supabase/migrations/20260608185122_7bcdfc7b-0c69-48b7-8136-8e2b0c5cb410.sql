
DROP POLICY IF EXISTS ri_select ON public.receivables_invoices;
CREATE POLICY ri_select ON public.receivables_invoices
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo']::app_role[]));

DROP POLICY IF EXISTS rs_select ON public.receivables_subscriptions;
CREATE POLICY rs_select ON public.receivables_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo']::app_role[]));

DROP POLICY IF EXISTS feedz_runs_select ON public.feedz_sync_runs;
CREATE POLICY feedz_runs_select ON public.feedz_sync_runs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','rh']::app_role[]));

DROP POLICY IF EXISTS hcr_select ON public.hr_correction_runs;
CREATE POLICY hcr_select ON public.hr_correction_runs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','rh']::app_role[]));
