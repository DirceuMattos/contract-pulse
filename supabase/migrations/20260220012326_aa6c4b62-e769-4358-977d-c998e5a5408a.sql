
-- Create hr_people table (master HR registry)
CREATE TABLE public.hr_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  tipo_vinculo text NOT NULL DEFAULT 'clt',
  cargo_id uuid REFERENCES public.job_titles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  remuneracao_mensal numeric NOT NULL DEFAULT 0,
  beneficios numeric NOT NULL DEFAULT 0,
  local_atuacao text,
  data_admissao date NOT NULL DEFAULT CURRENT_DATE,
  situacao text NOT NULL DEFAULT 'ativo',
  observacoes text,
  comite_gestor text,
  data_desligamento date,
  motivo_desligamento text,
  tipo_desligamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on hr_people
ALTER TABLE public.hr_people ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_people
CREATE POLICY "hr_people_select" ON public.hr_people
  FOR SELECT USING (true);

CREATE POLICY "hr_people_insert" ON public.hr_people
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));

CREATE POLICY "hr_people_update" ON public.hr_people
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));

CREATE POLICY "hr_people_delete" ON public.hr_people
  FOR DELETE USING (has_role(auth.uid(), 'c-level'::app_role));

-- Create hr_timeline table (history of events per person)
CREATE TABLE public.hr_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.hr_people(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  ocorrencia text NOT NULL DEFAULT 'observacao',
  descricao text NOT NULL DEFAULT '',
  valor numeric,
  remuneracao_apos numeric,
  beneficios_apos numeric,
  atualizar_remuneracao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on hr_timeline
ALTER TABLE public.hr_timeline ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_timeline
CREATE POLICY "hr_timeline_select" ON public.hr_timeline
  FOR SELECT USING (true);

CREATE POLICY "hr_timeline_insert" ON public.hr_timeline
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));

CREATE POLICY "hr_timeline_update" ON public.hr_timeline
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role]));

CREATE POLICY "hr_timeline_delete" ON public.hr_timeline
  FOR DELETE USING (has_role(auth.uid(), 'c-level'::app_role));

-- Add update triggers
CREATE TRIGGER update_hr_people_updated_at
  BEFORE UPDATE ON public.hr_people
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hr_timeline_updated_at
  BEFORE UPDATE ON public.hr_timeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
