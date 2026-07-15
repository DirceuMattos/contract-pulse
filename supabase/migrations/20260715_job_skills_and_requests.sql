-- ============================================================================
-- Módulos: Skills de Vagas (JOB_SKILLS) + Requisição de Vagas (JOB_REQUESTS)
-- Migração ADITIVA — cria apenas tabelas/enums novos, não toca dado existente.
-- Padrão de RLS: has_any_role(_roles, _user_id) / has_role, como nas tabelas atuais.
-- Data: 2026-07-15
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────────────────
-- tipo de skill
DO $$ BEGIN
  CREATE TYPE public.skill_type AS ENUM ('hard', 'soft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- origem do registro (rastreabilidade: veio de import, criado à mão, ou sugerido por IA)
DO $$ BEGIN
  CREATE TYPE public.skill_origin AS ENUM ('manual', 'ia', 'import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- status da requisição de vaga (fluxo definido pelo Dirceu)
DO $$ BEGIN
  CREATE TYPE public.job_request_status AS ENUM (
    'solicitado',
    'em_avaliacao',
    'aprovado_em_contratacao',
    'preenchida',
    'suspenso'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. CATÁLOGO DE SKILLS (tags reutilizáveis entre cargos)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  tipo        public.skill_type NOT NULL,
  origem      public.skill_origin NOT NULL DEFAULT 'manual',
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- evita skills duplicadas (mesmo nome + tipo)
  CONSTRAINT skills_nome_tipo_unique UNIQUE (nome, tipo)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. PERFIS DE SKILL POR CARGO + NÍVEL (1 cargo → N perfis, um por nível)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_skill_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title_id       uuid NOT NULL REFERENCES public.job_titles(id) ON DELETE CASCADE,
  nivel              text,                     -- texto livre p/ casar com hr_people.nivel
  descricao          text,
  atribuicoes        text,
  hard_skills_desc   text,                     -- descritor livre (além das tags)
  soft_skills_desc   text,                     -- descritor livre (além das tags)
  anos_experiencia   integer,
  idade_min          integer,                  -- quando aplicável (nullable)
  idade_max          integer,
  ia_pesquisa        jsonb,                    -- resultado bruto da busca de skills por IA
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- um perfil por (cargo, nível); nível nulo = perfil único do cargo
  CONSTRAINT job_skill_profiles_cargo_nivel_unique UNIQUE (job_title_id, nivel)
);

CREATE INDEX IF NOT EXISTS idx_job_skill_profiles_job_title ON public.job_skill_profiles(job_title_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. ASSOCIAÇÃO perfil ↔ skill (N:N)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_skill_profile_skills (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_skill_profile_id  uuid NOT NULL REFERENCES public.job_skill_profiles(id) ON DELETE CASCADE,
  skill_id              uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  obrigatoria           boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_skill_profile_skills_unique UNIQUE (job_skill_profile_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_jspskills_profile ON public.job_skill_profile_skills(job_skill_profile_id);
CREATE INDEX IF NOT EXISTS idx_jspskills_skill   ON public.job_skill_profile_skills(skill_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. REQUISIÇÕES DE VAGA
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_requests (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                 text NOT NULL,
  descricao              text,
  -- cargo/perfil opcionais: permite vaga sem cargo no banco (desde que preencha tudo)
  job_title_id           uuid REFERENCES public.job_titles(id) ON DELETE SET NULL,
  job_skill_profile_id   uuid REFERENCES public.job_skill_profiles(id) ON DELETE SET NULL,
  -- para vaga sem perfil: skills escolhidas avulsas
  skills_avulsas         jsonb,
  nivel                  text,
  anos_experiencia       integer,
  quantidade             integer NOT NULL DEFAULT 1,
  status                 public.job_request_status NOT NULL DEFAULT 'solicitado',
  -- ponte com o desligamento: reposição que originou a vaga (Feedz já cria pending_replacements)
  pending_replacement_id uuid REFERENCES public.pending_replacements(id) ON DELETE SET NULL,
  contract_id            uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  solicitante_id         uuid,   -- auth.uid() de quem solicitou
  observacoes            text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_requests_status       ON public.job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_job_title    ON public.job_requests(job_title_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_pending_repl ON public.job_requests(pending_replacement_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. HISTÓRICO DE STATUS DA VAGA (rastreabilidade — decisão do Dirceu)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_request_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id  uuid NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  status_anterior public.job_request_status,
  status_novo     public.job_request_status NOT NULL,
  changed_by      uuid,   -- auth.uid()
  motivo          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jrsh_request ON public.job_request_status_history(job_request_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: registra automaticamente cada mudança de status no histórico
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_job_request_status_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.job_request_status_history (job_request_id, status_anterior, status_novo, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.job_request_status_history (job_request_id, status_anterior, status_novo, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_job_request_status ON public.job_requests;
CREATE TRIGGER trg_job_request_status
  AFTER INSERT OR UPDATE OF status ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_job_request_status_change();

-- ─────────────────────────────────────────────────────────────────────────
-- 8. TRIGGERS de updated_at (reaproveita padrão do banco, se existir a função)
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'update_updated_at_column';
  IF FOUND THEN
    DROP TRIGGER IF EXISTS trg_skills_updated ON public.skills;
    CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON public.skills
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS trg_jsp_updated ON public.job_skill_profiles;
    CREATE TRIGGER trg_jsp_updated BEFORE UPDATE ON public.job_skill_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS trg_jr_updated ON public.job_requests;
    CREATE TRIGGER trg_jr_updated BEFORE UPDATE ON public.job_requests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. RLS
-- Perfis que podem SOLICITAR vaga: superadmin, c-level, projetos_produtos,
-- lider_tribo, rh, administrativo. Leitura das skills/perfis: mais ampla.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.skills                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skill_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skill_profile_skills   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_request_status_history ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado (ajustável depois por módulo)
DO $$ BEGIN
  CREATE POLICY skills_select ON public.skills FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jsp_select ON public.job_skill_profiles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jsps_select ON public.job_skill_profile_skills FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jr_select ON public.job_requests FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jrsh_select ON public.job_request_status_history FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Escrita nas tabelas de SKILLS (gestão do catálogo/perfis): mesmos perfis que gerenciam vagas
DO $$ BEGIN
  CREATE POLICY skills_write ON public.skills FOR ALL TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]))
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jsp_write ON public.job_skill_profiles FOR ALL TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]))
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY jsps_write ON public.job_skill_profile_skills FOR ALL TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]))
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Escrita nas VAGAS: apenas perfis autorizados a solicitar
DO $$ BEGIN
  CREATE POLICY jr_write ON public.job_requests FOR ALL TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]))
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin','c-level','projetos_produtos','lider_tribo','rh','administrativo']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Histórico: inserção via trigger (SECURITY DEFINER), sem escrita direta pelo usuário.

-- ============================================================================
-- FIM. Após aplicar: regenerar os tipos do Supabase (types.ts) para o front.
-- ============================================================================
