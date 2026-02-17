
-- ============================================================
-- FASE 1: SCHEMA COMPLETO (REORDENADO)
-- ============================================================

-- ========== 1. ENUMS ==========

CREATE TYPE public.app_role AS ENUM ('c-level', 'intermediario', 'leitor');
CREATE TYPE public.contract_type AS ENUM ('sistema', 'infraestrutura', 'hibrido');
CREATE TYPE public.contract_segment AS ENUM ('govtech', 'privado');
CREATE TYPE public.contract_status AS ENUM ('implantacao', 'operacao', 'suspenso', 'encerrado');
CREATE TYPE public.gov_sphere AS ENUM ('municipal', 'estadual', 'federal');
CREATE TYPE public.renewal_status AS ENUM ('negociacao', 'renovado', 'sem-tratativa');
CREATE TYPE public.revenue_model AS ENUM ('mrr', 'media-mensal');
CREATE TYPE public.health_status AS ENUM ('saudavel', 'atencao', 'critico');
CREATE TYPE public.resource_type AS ENUM ('clt', 'pj', 'outro');
CREATE TYPE public.other_cost_category AS ENUM ('cloud', 'licenca', 'equipamento', 'terceiros', 'outros', 'consultoria');
CREATE TYPE public.seniority AS ENUM ('junior', 'pleno', 'senior', 'especialista');
CREATE TYPE public.overhead_mode AS ENUM ('percentual', 'fixo');
CREATE TYPE public.overhead_category AS ENUM ('infraestrutura', 'administrativo', 'governanca');
CREATE TYPE public.history_event_type AS ENUM (
  'assinatura', 'inicio-vigencia', 'aditivo', 'reajuste-aplicado',
  'notificacao-recebida', 'notificacao-enviada', 'multa-penalidade',
  'marco-operacional', 'reuniao-ata', 'ocorrencia', 'renegociacao',
  'renovacao', 'encerramento', 'outro'
);
CREATE TYPE public.history_impact_area AS ENUM ('financeiro', 'prazo', 'reajuste', 'juridico', 'operacional', 'governanca');
CREATE TYPE public.alert_severity AS ENUM ('atencao', 'critico', 'info');
CREATE TYPE public.simulation_contract_type AS ENUM ('gov', 'private');
CREATE TYPE public.simulation_complexity AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE public.simulation_pricing_model AS ENUM ('mensal', 'total');
CREATE TYPE public.simulation_status AS ENUM ('draft', 'archived');
CREATE TYPE public.module_key AS ENUM (
  'DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES',
  'HISTORY', 'DOCUMENTS', 'ALERTS', 'SQUADS', 'CALCULATOR',
  'USERS_ADMIN', 'ACCESS_LOGS', 'SETTINGS', 'IMPORT_EXPORT'
);

-- ========== 2. TABLES (before functions that reference them) ==========

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key public.module_key NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL DEFAULT '',
  inscricao_estadual text, site text, cep text, logradouro text, numero text,
  complemento text, bairro text, cidade text, uf text,
  contato_principal text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text,
  segmento public.contract_segment NOT NULL DEFAULT 'privado',
  tags text[] NOT NULL DEFAULT '{}',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  tipo public.contract_type NOT NULL DEFAULT 'sistema',
  segmento public.contract_segment NOT NULL DEFAULT 'privado',
  status public.contract_status NOT NULL DEFAULT 'implantacao',
  unidade text, centro_custo text,
  tags text[] NOT NULL DEFAULT '{}',
  gov_sphere public.gov_sphere,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date NOT NULL DEFAULT (CURRENT_DATE + interval '12 months'),
  renovacao_automatica boolean NOT NULL DEFAULT false,
  periodicidade_renovacao text,
  status_renovacao public.renewal_status NOT NULL DEFAULT 'sem-tratativa',
  renewal_term_months integer, renewal_base_date date,
  indice_reajuste text NOT NULL DEFAULT 'IPCA',
  data_base_reajuste date NOT NULL DEFAULT CURRENT_DATE,
  percentual_fixo numeric,
  alerta_reajuste_dias integer NOT NULL DEFAULT 60,
  modelo_receita public.revenue_model NOT NULL DEFAULT 'mrr',
  valor_mensal_referencia numeric, valor_total_contrato numeric,
  moeda text NOT NULL DEFAULT 'BRL',
  observacoes_financeiras text,
  objeto text NOT NULL DEFAULT '',
  escopo_operacional text, slas text, riscos_pendencias text,
  responsavel_interno text NOT NULL DEFAULT '',
  responsavel_cs text, responsavel_comercial text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ultima_atualizacao_recursos timestamptz
);

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tipo public.resource_type NOT NULL DEFAULT 'clt',
  nome text NOT NULL DEFAULT '', cargo text,
  senioridade public.seniority,
  custo_base numeric NOT NULL DEFAULT 0,
  percentual_dedicacao numeric NOT NULL DEFAULT 100,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE, data_fim date,
  observacoes text,
  encargos_override numeric, impostos_override numeric,
  categoria public.other_cost_category,
  recorrencia text, rateio_meses integer,
  tipo_valor text, duracao_meses integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.overhead_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  categoria public.overhead_category NOT NULL DEFAULT 'infraestrutura',
  nome text NOT NULL DEFAULT '',
  modo public.overhead_mode NOT NULL DEFAULT 'percentual',
  percentual numeric, valor_fixo_mensal numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  event_type public.history_event_type NOT NULL DEFAULT 'outro',
  title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  impact_area public.history_impact_area NOT NULL DEFAULT 'operacional',
  severity public.alert_severity NOT NULL DEFAULT 'info',
  related_value numeric, related_clause text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  file_type_mime text NOT NULL DEFAULT '',
  file_extension text NOT NULL DEFAULT '',
  description_type text NOT NULL DEFAULT 'outro',
  description_text text, notes text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_key text NOT NULL DEFAULT ''
);

CREATE TABLE public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  receita_mensal numeric NOT NULL DEFAULT 0,
  custo_mensal numeric NOT NULL DEFAULT 0,
  margem_mensal numeric NOT NULL DEFAULT 0,
  margem_percentual numeric NOT NULL DEFAULT 0,
  health_status public.health_status NOT NULL DEFAULT 'saudavel',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percentual_encargos_clt numeric NOT NULL DEFAULT 68,
  percentual_impostos_pj numeric NOT NULL DEFAULT 15,
  percentual_impostos_faturamento numeric NOT NULL DEFAULT 16.33,
  valor_dolar numeric NOT NULL DEFAULT 5.15,
  limiar_saudavel numeric NOT NULL DEFAULT 15,
  limiar_atencao numeric NOT NULL DEFAULT 5,
  dias_alerta_reajuste integer NOT NULL DEFAULT 60,
  dias_alerta_vigencia integer NOT NULL DEFAULT 90,
  dias_alerta_desatualizacao integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '', description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',
  severity public.alert_severity NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  recommendation text NOT NULL DEFAULT '',
  alert_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attachment_description_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.access_log_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name_snapshot text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  modules_accessed text[] NOT NULL DEFAULT '{}',
  routes_accessed text[] NOT NULL DEFAULT '{}',
  last_activity_at timestamptz
);

CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '', client_name text NOT NULL DEFAULT '',
  contract_type public.simulation_contract_type NOT NULL DEFAULT 'private',
  gov_sphere public.gov_sphere,
  expected_start_date date,
  term_months integer NOT NULL DEFAULT 12,
  pricing_model public.simulation_pricing_model,
  proposed_monthly_value numeric, proposed_total_value numeric,
  description text NOT NULL DEFAULT '',
  consultancy_cost numeric,
  complexity_level public.simulation_complexity NOT NULL DEFAULT 'media',
  questionnaire jsonb NOT NULL DEFAULT '{}',
  suggested_overhead jsonb NOT NULL DEFAULT '{"infraPercent":0,"adminPercent":0,"governancePercent":0}',
  custom_overhead jsonb NOT NULL DEFAULT '{"infraPercent":0,"adminPercent":0,"governancePercent":0}',
  using_suggested boolean NOT NULL DEFAULT true,
  status public.simulation_status NOT NULL DEFAULT 'draft',
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.simulation_hr_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  is_suggested boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT '',
  hiring_type text NOT NULL DEFAULT 'clt',
  quantity integer NOT NULL DEFAULT 1,
  gross_monthly numeric NOT NULL DEFAULT 0,
  charges_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.simulation_other_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  is_suggested boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  value_monthly numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== 3. HELPER FUNCTIONS (now tables exist) ==========

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== 4. RLS ==========

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_description_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_hr_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_other_costs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'c-level'));

-- user_roles (c-level only)
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- user_module_permissions (c-level only)
CREATE POLICY "ump_select" ON public.user_module_permissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "ump_insert" ON public.user_module_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "ump_update" ON public.user_module_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "ump_delete" ON public.user_module_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- settings (c-level only)
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- access_log_sessions (c-level only)
CREATE POLICY "als_select" ON public.access_log_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'c-level'));
CREATE POLICY "als_insert" ON public.access_log_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'c-level'));

-- OPERATIONAL TABLES macro
-- clients
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- contracts
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- resources
CREATE POLICY "resources_select" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources_insert" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "resources_update" ON public.resources FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "resources_delete" ON public.resources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- overhead_items
CREATE POLICY "overhead_select" ON public.overhead_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "overhead_insert" ON public.overhead_items FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "overhead_update" ON public.overhead_items FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "overhead_delete" ON public.overhead_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- history_events
CREATE POLICY "history_select" ON public.history_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON public.history_events FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "history_update" ON public.history_events FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "history_delete" ON public.history_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- document_attachments
CREATE POLICY "docs_select" ON public.document_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert" ON public.document_attachments FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "docs_update" ON public.document_attachments FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "docs_delete" ON public.document_attachments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- snapshots
CREATE POLICY "snapshots_select" ON public.snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "snapshots_insert" ON public.snapshots FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "snapshots_delete" ON public.snapshots FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- teams
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- job_titles
CREATE POLICY "jobtitles_select" ON public.job_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobtitles_insert" ON public.job_titles FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "jobtitles_update" ON public.job_titles FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "jobtitles_delete" ON public.job_titles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- alerts
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "alerts_delete" ON public.alerts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- attachment_description_configs
CREATE POLICY "adc_select" ON public.attachment_description_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "adc_insert" ON public.attachment_description_configs FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "adc_update" ON public.attachment_description_configs FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "adc_delete" ON public.attachment_description_configs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- simulations
CREATE POLICY "sim_select" ON public.simulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "sim_insert" ON public.simulations FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "sim_update" ON public.simulations FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "sim_delete" ON public.simulations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- simulation_hr_items
CREATE POLICY "simhr_select" ON public.simulation_hr_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "simhr_insert" ON public.simulation_hr_items FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "simhr_update" ON public.simulation_hr_items FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "simhr_delete" ON public.simulation_hr_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- simulation_other_costs
CREATE POLICY "simoc_select" ON public.simulation_other_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "simoc_insert" ON public.simulation_other_costs FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "simoc_update" ON public.simulation_other_costs FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "simoc_delete" ON public.simulation_other_costs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'c-level'));

-- ========== 5. TRIGGERS ==========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'leitor');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ump_updated_at BEFORE UPDATE ON public.user_module_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_overhead_updated_at BEFORE UPDATE ON public.overhead_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_history_updated_at BEFORE UPDATE ON public.history_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobtitles_updated_at BEFORE UPDATE ON public.job_titles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_adc_updated_at BEFORE UPDATE ON public.attachment_description_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON public.simulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_simhr_updated_at BEFORE UPDATE ON public.simulation_hr_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_simoc_updated_at BEFORE UPDATE ON public.simulation_other_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== 6. STORAGE ==========

INSERT INTO storage.buckets (id, name, public) VALUES ('contract-documents', 'contract-documents', false);

CREATE POLICY "cd_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contract-documents');
CREATE POLICY "cd_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contract-documents' AND public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));
CREATE POLICY "cd_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contract-documents' AND public.has_any_role(auth.uid(), ARRAY['c-level','intermediario']::public.app_role[]));

-- ========== 7. SEED ==========

INSERT INTO public.settings (percentual_encargos_clt, percentual_impostos_pj, percentual_impostos_faturamento, valor_dolar, limiar_saudavel, limiar_atencao, dias_alerta_reajuste, dias_alerta_vigencia, dias_alerta_desatualizacao)
VALUES (68, 15, 16.33, 5.15, 15, 5, 60, 90, 30);

INSERT INTO public.attachment_description_configs (label, sort_order) VALUES
  ('Contrato', 1), ('Aditivo', 2), ('Reajuste', 3), ('Notificação', 4),
  ('Multa/Penalidade', 5), ('Ata de Reunião', 6), ('Proposta Comercial', 7), ('Outro', 8);
