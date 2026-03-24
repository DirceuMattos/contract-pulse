
-- Update INSERT/UPDATE RLS policies to include 'administrativo' and 'rh' roles
-- This affects all data tables that currently only allow c-level + intermediario

-- clients
DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- contracts
DROP POLICY IF EXISTS contracts_insert ON public.contracts;
CREATE POLICY contracts_insert ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS contracts_update ON public.contracts;
CREATE POLICY contracts_update ON public.contracts FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- resources
DROP POLICY IF EXISTS resources_insert ON public.resources;
CREATE POLICY resources_insert ON public.resources FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS resources_update ON public.resources;
CREATE POLICY resources_update ON public.resources FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- history_events
DROP POLICY IF EXISTS history_insert ON public.history_events;
CREATE POLICY history_insert ON public.history_events FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS history_update ON public.history_events;
CREATE POLICY history_update ON public.history_events FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- hr_people
DROP POLICY IF EXISTS hr_people_insert ON public.hr_people;
CREATE POLICY hr_people_insert ON public.hr_people FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS hr_people_update ON public.hr_people;
CREATE POLICY hr_people_update ON public.hr_people FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- hr_timeline
DROP POLICY IF EXISTS hr_timeline_insert ON public.hr_timeline;
CREATE POLICY hr_timeline_insert ON public.hr_timeline FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS hr_timeline_update ON public.hr_timeline;
CREATE POLICY hr_timeline_update ON public.hr_timeline FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- overhead_items
DROP POLICY IF EXISTS overhead_insert ON public.overhead_items;
CREATE POLICY overhead_insert ON public.overhead_items FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS overhead_update ON public.overhead_items;
CREATE POLICY overhead_update ON public.overhead_items FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- document_attachments
DROP POLICY IF EXISTS docs_insert ON public.document_attachments;
CREATE POLICY docs_insert ON public.document_attachments FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS docs_update ON public.document_attachments;
CREATE POLICY docs_update ON public.document_attachments FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- attachment_description_configs
DROP POLICY IF EXISTS adc_insert ON public.attachment_description_configs;
CREATE POLICY adc_insert ON public.attachment_description_configs FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS adc_update ON public.attachment_description_configs;
CREATE POLICY adc_update ON public.attachment_description_configs FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- job_titles
DROP POLICY IF EXISTS jobtitles_insert ON public.job_titles;
CREATE POLICY jobtitles_insert ON public.job_titles FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS jobtitles_update ON public.job_titles;
CREATE POLICY jobtitles_update ON public.job_titles FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- teams
DROP POLICY IF EXISTS teams_insert ON public.teams;
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- contract_subprojects
DROP POLICY IF EXISTS csp_insert ON public.contract_subprojects;
CREATE POLICY csp_insert ON public.contract_subprojects FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS csp_update ON public.contract_subprojects;
CREATE POLICY csp_update ON public.contract_subprojects FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- snapshots (INSERT only)
DROP POLICY IF EXISTS snapshots_insert ON public.snapshots;
CREATE POLICY snapshots_insert ON public.snapshots FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- simulations
DROP POLICY IF EXISTS sim_insert ON public.simulations;
CREATE POLICY sim_insert ON public.simulations FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS sim_update ON public.simulations;
CREATE POLICY sim_update ON public.simulations FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- simulation_other_costs
DROP POLICY IF EXISTS simoc_insert ON public.simulation_other_costs;
CREATE POLICY simoc_insert ON public.simulation_other_costs FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS simoc_update ON public.simulation_other_costs;
CREATE POLICY simoc_update ON public.simulation_other_costs FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- simulation_hr_items
DROP POLICY IF EXISTS simhr_insert ON public.simulation_hr_items;
CREATE POLICY simhr_insert ON public.simulation_hr_items FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
DROP POLICY IF EXISTS simhr_update ON public.simulation_hr_items;
CREATE POLICY simhr_update ON public.simulation_hr_items FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));

-- alerts (INSERT only, no UPDATE exists)
DROP POLICY IF EXISTS alerts_insert ON public.alerts;
CREATE POLICY alerts_insert ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh']::app_role[]));
