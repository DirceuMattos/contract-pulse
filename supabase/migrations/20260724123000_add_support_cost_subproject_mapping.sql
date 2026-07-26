ALTER TABLE public.support_milvus_project_mappings
ADD COLUMN IF NOT EXISTS hub_subproject_id uuid REFERENCES public.contract_subprojects(id) ON DELETE SET NULL;

ALTER TABLE public.support_cost_tickets
ADD COLUMN IF NOT EXISTS hub_subproject_id uuid REFERENCES public.contract_subprojects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_milvus_project_mappings_subproject
ON public.support_milvus_project_mappings (hub_subproject_id);

CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_subproject
ON public.support_cost_tickets (hub_subproject_id);
