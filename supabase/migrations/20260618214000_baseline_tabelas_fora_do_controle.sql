-- BASELINE — as 9 tabelas que existiam em produção sem nenhuma migration que as criasse.
--
-- POR QUE ESTE ARQUIVO EXISTE
-- Durante a migração do Lovable Cloud para Supabase próprio, em 20/08/2026,
-- comparamos o catálogo do banco com o que as 133 migrations do repositório
-- criavam. Nove tabelas existiam no banco e em nenhuma migration:
--
--   monthly_reports · report_sections · report_collaborators
--   report_template_configs · report_sync_logs · pending_replacements
--   role_profiles · snapshots_backup_20260615 · transport_rides
--
-- Dezenove migrations as referenciam, a mais antiga sendo
-- 20260618214133. Sem este arquivo, `supabase db push` num banco vazio
-- quebra ali — e foi o que nos fez abandonar a reconstrução por migrations
-- e restaurar o banco a partir do dump.
--
-- POR QUE A DATA É RETROATIVA
-- 20260618214000 é 93 segundos antes de 20260618214133, a primeira migration
-- que referencia estas tabelas. Datar como hoje faria o arquivo documentar sem
-- consertar: as 19 rodariam antes dele.
--
-- POR QUE É SEGURO RODAR EM BANCO QUE JÁ TEM TUDO
-- Tudo é CREATE TABLE IF NOT EXISTS e CREATE INDEX IF NOT EXISTS. Em banco
-- povoado é no-op integral. As policies e o ENABLE ROW LEVEL SECURITY ficam em
-- arquivo separado, de data corrente, para não recriar controle de acesso em
-- banco vivo.
--
-- As tabelas nascem aqui na FORMA FINAL. Isso é seguro porque as alterações
-- posteriores são todas idempotentes ou autocorretivas:
--   20260811120000  ADD COLUMN IF NOT EXISTS  e ADD CONSTRAINT sob guarda
--   20260812120200  ADD COLUMN IF NOT EXISTS
--   20260810120000  DROP e ADD de constraint sob guarda
--   20260623173020  DROP e ADD de constraint — exige que ela exista aqui

-- ---------------------------------------------------------------------------
-- 1. Relatórios Mensais — núcleo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id                  uuid DEFAULT gen_random_uuid() NOT NULL,
  contract_id         uuid NOT NULL,
  month               integer NOT NULL,
  year                integer NOT NULL,
  status              text DEFAULT 'draft'::text NOT NULL,
  asana_project_id    text,
  client_email_domain text,
  created_by          uuid,
  reviewed_by         uuid,
  published_at        timestamp with time zone,
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now(),
  CONSTRAINT monthly_reports_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_reports_contract_id_month_year_key UNIQUE (contract_id, month, year),
  CONSTRAINT monthly_reports_month_check CHECK (((month >= 1) AND (month <= 12))),
  CONSTRAINT monthly_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text]))),
  CONSTRAINT monthly_reports_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id),
  CONSTRAINT monthly_reports_created_by_fkey  FOREIGN KEY (created_by)  REFERENCES auth.users(id),
  CONSTRAINT monthly_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_contract ON public.monthly_reports USING btree (contract_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period   ON public.monthly_reports USING btree (year, month);

-- ---------------------------------------------------------------------------
-- 2. Seções do relatório
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_sections (
  id          uuid DEFAULT gen_random_uuid() NOT NULL,
  report_id   uuid NOT NULL,
  section_key text NOT NULL,
  content     jsonb DEFAULT '{}'::jsonb NOT NULL,
  source      text DEFAULT 'manual'::text NOT NULL,
  synced_at   timestamp with time zone,
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT report_sections_pkey PRIMARY KEY (id),
  CONSTRAINT report_sections_report_id_section_key_key UNIQUE (report_id, section_key),
  -- Necessária aqui: 20260623173020 faz DROP dela sem guarda.
  CONSTRAINT report_sections_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'asana'::text, 'fireflies'::text, 'bnphub'::text, 'devid'::text, 'milvus'::text, 'azuredevops'::text, 'auto'::text]))),
  CONSTRAINT report_sections_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.monthly_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_sections_report ON public.report_sections USING btree (report_id);

-- ---------------------------------------------------------------------------
-- 3. Colaboradores do relatório
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_collaborators (
  id        uuid DEFAULT gen_random_uuid() NOT NULL,
  report_id uuid NOT NULL,
  user_id   uuid NOT NULL,
  role      text DEFAULT 'editor'::text NOT NULL,
  added_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT report_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT report_collaborators_report_id_user_id_key UNIQUE (report_id, user_id),
  CONSTRAINT report_collaborators_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'editor'::text, 'reviewer'::text]))),
  CONSTRAINT report_collaborators_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  CONSTRAINT report_collaborators_user_id_fkey   FOREIGN KEY (user_id)   REFERENCES auth.users(id)
);

-- ---------------------------------------------------------------------------
-- 4. Log de sincronização das integrações do relatório
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_sync_logs (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  report_id       uuid NOT NULL,
  source          text NOT NULL,
  status          text NOT NULL,
  records_fetched integer DEFAULT 0,
  error_message   text,
  synced_at       timestamp with time zone DEFAULT now(),
  CONSTRAINT report_sync_logs_pkey PRIMARY KEY (id),
  CONSTRAINT report_sync_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text]))),
  CONSTRAINT report_sync_logs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.monthly_reports(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 5. Configuração de template por contrato
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_template_configs (
  id                              uuid DEFAULT gen_random_uuid() NOT NULL,
  contract_id                     uuid NOT NULL,
  show_historico_tr               boolean DEFAULT true,
  show_evolucao_inovacao          boolean DEFAULT true,
  show_entregas                   boolean DEFAULT true,
  show_priorizadas                boolean DEFAULT true,
  show_demonstrativo_horas        boolean DEFAULT true,
  show_eficiencia_operacional     boolean DEFAULT true,
  show_eficiencia_previsibilidade boolean DEFAULT true,
  show_desempenho_aplicacao       boolean DEFAULT true,
  show_engajamento_usuario        boolean DEFAULT true,
  show_maturidade_plataforma      boolean DEFAULT true,
  show_treinamentos_reunioes      boolean DEFAULT true,
  show_oportunidades_atencao      boolean DEFAULT true,
  asana_project_id                text,
  client_email_domain             text,
  fireflies_keywords              text[],
  created_at                      timestamp with time zone DEFAULT now(),
  updated_at                      timestamp with time zone DEFAULT now(),
  milvus_client_names             text[] DEFAULT '{}'::text[],
  azure_project                   text,
  azure_tags                      text[] DEFAULT '{}'::text[],
  asana_project_ids               text[] DEFAULT '{}'::text[],
  show_glossario                  boolean DEFAULT true,
  show_indicadores                boolean DEFAULT true,
  show_ambientes                  boolean DEFAULT true,
  show_ambientes_detalhe          boolean DEFAULT true,
  show_historico_tr_aderencia     boolean DEFAULT true,
  CONSTRAINT report_template_configs_pkey PRIMARY KEY (id),
  CONSTRAINT report_template_configs_contract_id_key UNIQUE (contract_id),
  CONSTRAINT report_template_configs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 6. Reposição de vagas
-- ---------------------------------------------------------------------------
-- Nasce já com subproject_allocation_id e com a constraint de origem, porque
-- 20260811120000 usa ADD COLUMN IF NOT EXISTS e ADD CONSTRAINT sob guarda.

CREATE TABLE IF NOT EXISTS public.pending_replacements (
  id                       uuid DEFAULT gen_random_uuid() NOT NULL,
  hr_person_id             uuid NOT NULL,
  resource_id              uuid,
  contract_id              uuid NOT NULL,
  status                   text DEFAULT 'pending'::text NOT NULL,
  resolved_by              uuid,
  resolved_at              timestamp with time zone,
  created_at               timestamp with time zone DEFAULT now(),
  updated_at               timestamp with time zone DEFAULT now(),
  subproject_allocation_id uuid,
  CONSTRAINT pending_replacements_pkey PRIMARY KEY (id),
  CONSTRAINT pending_replacements_origem_check CHECK (((resource_id IS NOT NULL) OR (subproject_allocation_id IS NOT NULL))),
  CONSTRAINT pending_replacements_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'replaced'::text, 'removed'::text]))),
  CONSTRAINT pending_replacements_hr_person_id_fkey FOREIGN KEY (hr_person_id) REFERENCES public.hr_people(id),
  CONSTRAINT pending_replacements_resource_id_fkey  FOREIGN KEY (resource_id)  REFERENCES public.resources(id),
  CONSTRAINT pending_replacements_resolved_by_fkey  FOREIGN KEY (resolved_by)  REFERENCES auth.users(id),
  CONSTRAINT pending_replacements_subproject_allocation_id_fkey FOREIGN KEY (subproject_allocation_id) REFERENCES public.subproject_allocations(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.pending_replacements.subproject_allocation_id IS
  'Preenchido quando a pendencia vem de uma alocacao de subprojeto em vez de um resource direto.';

CREATE INDEX IF NOT EXISTS idx_pending_replacements_person ON public.pending_replacements USING btree (hr_person_id);
CREATE INDEX IF NOT EXISTS idx_pending_replacements_status ON public.pending_replacements USING btree (status);

CREATE UNIQUE INDEX IF NOT EXISTS pending_replacements_one_pending_per_allocation
  ON public.pending_replacements USING btree (hr_person_id, resource_id, contract_id)
  WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX IF NOT EXISTS pending_replacements_one_pending_per_suballoc
  ON public.pending_replacements USING btree (hr_person_id, subproject_allocation_id)
  WHERE ((status = 'pending'::text) AND (subproject_allocation_id IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 7. Perfis de acesso
-- ---------------------------------------------------------------------------
-- Nasce com active, is_system e description porque 20260812120200 usa
-- ADD COLUMN IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.role_profiles (
  id                uuid DEFAULT gen_random_uuid() NOT NULL,
  role              text NOT NULL,
  label             text NOT NULL,
  modules           jsonb DEFAULT '[]'::jsonb NOT NULL,
  can_edit          boolean DEFAULT false,
  can_create        boolean DEFAULT false,
  can_delete        boolean DEFAULT false,
  can_export        boolean DEFAULT false,
  can_view_values   boolean DEFAULT false,
  can_view_hr_costs boolean DEFAULT false,
  can_allocate      boolean DEFAULT false,
  updated_at        timestamp with time zone DEFAULT now(),
  updated_by        uuid,
  active            boolean DEFAULT true NOT NULL,
  is_system         boolean DEFAULT false NOT NULL,
  description       text,
  CONSTRAINT role_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT role_profiles_role_key UNIQUE (role),
  CONSTRAINT role_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

COMMENT ON COLUMN public.role_profiles.active IS
  'Perfil inativo some do seletor de usuários e perde acesso aos módulos. Não apaga nada.';
COMMENT ON COLUMN public.role_profiles.is_system IS
  'Perfil estrutural: não pode ser inativado nem excluído.';

-- ---------------------------------------------------------------------------
-- 8. Backup manual de snapshots, feito à mão em 15/06/2026
-- ---------------------------------------------------------------------------
-- Sem chave primária e sem constraint, exatamente como foi criada. Preservada
-- por fidelidade: existe em produção e alguém pode depender dela.

CREATE TABLE IF NOT EXISTS public.snapshots_backup_20260615 (
  id                 uuid,
  contract_id        uuid,
  receita_mensal     numeric,
  custo_mensal       numeric,
  margem_mensal      numeric,
  margem_percentual  numeric,
  health_status      public.health_status,
  user_id            uuid,
  created_at         timestamp with time zone
);

-- ---------------------------------------------------------------------------
-- 9. Deslocamentos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transport_rides (
  id                       uuid DEFAULT gen_random_uuid() NOT NULL,
  ride_id                  text NOT NULL,
  collaborator_name        text NOT NULL,
  collaborator_email       text,
  collaborator_id_external text,
  supervisor_name          text,
  supervisor_email         text,
  value                    numeric(10,2) DEFAULT 0 NOT NULL,
  distance_km              numeric(10,2),
  origin_address           text,
  destination_address      text,
  origin_city              text,
  category                 text,
  ride_start_at            timestamp with time zone,
  ride_end_at              timestamp with time zone,
  month                    integer,
  year                     integer,
  created_at               timestamp with time zone DEFAULT now(),
  updated_at               timestamp with time zone DEFAULT now(),
  CONSTRAINT transport_rides_pkey PRIMARY KEY (id),
  CONSTRAINT transport_rides_ride_id_key UNIQUE (ride_id)
);

CREATE INDEX IF NOT EXISTS idx_transport_rides_collaborator ON public.transport_rides USING btree (collaborator_name);
CREATE INDEX IF NOT EXISTS idx_transport_rides_month_year   ON public.transport_rides USING btree (year, month);
CREATE INDEX IF NOT EXISTS idx_transport_rides_ride_id      ON public.transport_rides USING btree (ride_id);
