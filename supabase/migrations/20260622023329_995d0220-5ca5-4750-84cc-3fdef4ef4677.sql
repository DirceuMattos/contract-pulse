
-- contracts: add role check (preserve demo behavior)
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts FOR SELECT TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (((is_demo = false) OR (is_demo IS NULL))
      AND public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[]))
  END
);

-- contract_subprojects
DROP POLICY IF EXISTS csp_select ON public.contract_subprojects;
CREATE POLICY csp_select ON public.contract_subprojects FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin','demo']::app_role[]));

-- overhead_items (financial)
DROP POLICY IF EXISTS overhead_select ON public.overhead_items;
CREATE POLICY overhead_select ON public.overhead_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[]));

-- history_events
DROP POLICY IF EXISTS history_select ON public.history_events;
CREATE POLICY history_select ON public.history_events FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[]));

-- alerts
DROP POLICY IF EXISTS alerts_select ON public.alerts;
CREATE POLICY alerts_select ON public.alerts FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[]));

-- document_attachments
DROP POLICY IF EXISTS docs_select ON public.document_attachments;
CREATE POLICY docs_select ON public.document_attachments FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','juridico','superadmin']::app_role[]));

-- attachment_description_configs
DROP POLICY IF EXISTS adc_select ON public.attachment_description_configs;
CREATE POLICY adc_select ON public.attachment_description_configs FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','juridico','superadmin']::app_role[]));

-- doc_templates
DROP POLICY IF EXISTS dt_select ON public.doc_templates;
CREATE POLICY dt_select ON public.doc_templates FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','juridico','superadmin']::app_role[]));

-- job_titles
DROP POLICY IF EXISTS jobtitles_select ON public.job_titles;
CREATE POLICY jobtitles_select ON public.job_titles FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','comercial','juridico','superadmin']::app_role[]));

-- subproject_allocations
DROP POLICY IF EXISTS spa_select ON public.subproject_allocations;
CREATE POLICY spa_select ON public.subproject_allocations FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[]));

-- simulation_other_costs (match parent simulations)
DROP POLICY IF EXISTS simoc_select ON public.simulation_other_costs;
CREATE POLICY simoc_select ON public.simulation_other_costs FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','superadmin']::app_role[]));
