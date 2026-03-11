
-- Create subproject status enum
CREATE TYPE public.subproject_status AS ENUM ('ativo', 'suspenso', 'encerrado');

-- Create contract_subprojects table
CREATE TABLE public.contract_subprojects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text,
  status subproject_status NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create subproject_allocations table (supports HR, resources, and overhead)
CREATE TABLE public.subproject_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subproject_id uuid NOT NULL REFERENCES public.contract_subprojects(id) ON DELETE CASCADE,
  hr_person_id uuid REFERENCES public.hr_people(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE,
  overhead_item_id uuid REFERENCES public.overhead_items(id) ON DELETE CASCADE,
  dedication_percent numeric NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_subprojects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subproject_allocations ENABLE ROW LEVEL SECURITY;

-- RLS for contract_subprojects
CREATE POLICY "csp_select" ON public.contract_subprojects FOR SELECT TO authenticated USING (true);
CREATE POLICY "csp_insert" ON public.contract_subprojects FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));
CREATE POLICY "csp_update" ON public.contract_subprojects FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));
CREATE POLICY "csp_delete" ON public.contract_subprojects FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- RLS for subproject_allocations
CREATE POLICY "spa_select" ON public.subproject_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "spa_insert" ON public.subproject_allocations FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));
CREATE POLICY "spa_update" ON public.subproject_allocations FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));
CREATE POLICY "spa_delete" ON public.subproject_allocations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_contract_subprojects_updated_at BEFORE UPDATE ON public.contract_subprojects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subproject_allocations_updated_at BEFORE UPDATE ON public.subproject_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
