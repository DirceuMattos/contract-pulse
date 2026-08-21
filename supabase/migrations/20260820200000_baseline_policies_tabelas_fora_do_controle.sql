-- BASELINE, parte 2 — RLS e policies das 9 tabelas que não vinham de migration.
--
-- Complementa 20260618214000_baseline_tabelas_fora_do_controle.sql.
--
-- POR QUE EM ARQUIVO SEPARADO, COM DATA DE HOJE
-- 1. As policies referenciam colunas de OUTRAS tabelas — contracts.is_demo, por
--    exemplo. Datar retroativamente criaria dependência de ordem difícil de
--    garantir. Aqui elas rodam por último, quando o schema está completo.
-- 2. Este arquivo roda em banco de produção vivo. Recriar policy em banco vivo
--    é mexer em controle de acesso. Por isso cada uma é criada SOMENTE se não
--    existir: nada é derrubado, nada é redefinido.
--
-- Consequência do desenho: se uma policy divergir entre o que está no banco e o
-- que está aqui, este arquivo NÃO corrige — ele preserva o que está lá. É a
-- escolha deliberada. Corrigir divergência de permissão é ato consciente, não
-- efeito colateral de uma migration de baseline.

ALTER TABLE public.monthly_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_collaborators     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sync_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_template_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_replacements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots_backup_20260615 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rides          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  _existe boolean;
BEGIN

  -- ── monthly_reports ────────────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monthly_reports' AND policyname='monthly_reports_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY monthly_reports_select ON public.monthly_reports FOR SELECT USING (
      CASE
        WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (EXISTS (
          SELECT 1 FROM public.contracts c
           WHERE c.id = monthly_reports.contract_id AND c.is_demo = true))
        ELSE public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','lider_tribo','superadmin','coordenacao_suporte','projetos_produtos','rh']::public.app_role[])
      END);
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monthly_reports' AND policyname='monthly_reports_insert') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY monthly_reports_insert ON public.monthly_reports FOR INSERT TO authenticated
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monthly_reports' AND policyname='monthly_reports_update') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY monthly_reports_update ON public.monthly_reports FOR UPDATE TO authenticated
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monthly_reports' AND policyname='monthly_reports_delete') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY monthly_reports_delete ON public.monthly_reports FOR DELETE
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  -- ── report_sections ───────────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_sections' AND policyname='report_sections_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY report_sections_select ON public.report_sections FOR SELECT USING (
      CASE
        WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (EXISTS (
          SELECT 1 FROM public.monthly_reports mr
            JOIN public.contracts c ON c.id = mr.contract_id
           WHERE mr.id = report_sections.report_id AND c.is_demo = true))
        ELSE public.has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','lider_tribo','superadmin','coordenacao_suporte','projetos_produtos','rh']::public.app_role[])
      END);
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_sections' AND policyname='report_sections_insert') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY report_sections_insert ON public.report_sections FOR INSERT TO authenticated
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_sections' AND policyname='report_sections_update') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY report_sections_update ON public.report_sections FOR UPDATE TO authenticated
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','rh']::public.app_role[]));
  END IF;

  -- ── report_collaborators ──────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_collaborators' AND policyname='rc_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rc_select ON public.report_collaborators FOR SELECT
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_collaborators' AND policyname='rc_insert') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rc_insert ON public.report_collaborators FOR INSERT
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_collaborators' AND policyname='rc_delete') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rc_delete ON public.report_collaborators FOR DELETE
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario']::public.app_role[]));
  END IF;

  -- ── report_sync_logs ──────────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_sync_logs' AND policyname='report_sync_logs_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY report_sync_logs_select ON public.report_sync_logs FOR SELECT
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_sync_logs' AND policyname='report_sync_logs_insert') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY report_sync_logs_insert ON public.report_sync_logs FOR INSERT TO authenticated
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  -- ── report_template_configs ───────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_template_configs' AND policyname='rtc_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rtc_select ON public.report_template_configs FOR SELECT
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','lider_tribo','administrativo']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_template_configs' AND policyname='rtc_insert') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rtc_insert ON public.report_template_configs FOR INSERT
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_template_configs' AND policyname='rtc_update') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rtc_update ON public.report_template_configs FOR UPDATE
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_template_configs' AND policyname='rtc_delete') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY rtc_delete ON public.report_template_configs FOR DELETE
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  -- ── pending_replacements ──────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pending_replacements' AND policyname='pending_replacements_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY pending_replacements_select ON public.pending_replacements FOR SELECT TO authenticated
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','rh','intermediario','superadmin','administrativo','lider_tribo']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pending_replacements' AND policyname='pending_replacements_modify') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY pending_replacements_modify ON public.pending_replacements TO authenticated
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','rh','superadmin']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','rh','superadmin']::public.app_role[]));
  END IF;

  -- ── role_profiles ─────────────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_profiles' AND policyname='role_profiles_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY role_profiles_select ON public.role_profiles FOR SELECT TO authenticated
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_profiles' AND policyname='role_profiles_modify') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY role_profiles_modify ON public.role_profiles TO authenticated
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  -- ── snapshots_backup_20260615 ─────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='snapshots_backup_20260615' AND policyname='snapshots_backup_select') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY snapshots_backup_select ON public.snapshots_backup_20260615 FOR SELECT TO authenticated
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','superadmin']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='snapshots_backup_20260615' AND policyname='snapshots_backup_modify') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY snapshots_backup_modify ON public.snapshots_backup_20260615 TO authenticated
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin']::public.app_role[]));
  END IF;

  -- ── transport_rides ───────────────────────────────────────────────────
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transport_rides' AND policyname='transport_rides_select_authorized') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY transport_rides_select_authorized ON public.transport_rides FOR SELECT TO authenticated
      USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::public.app_role[]));
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transport_rides' AND policyname='transport_rides_modify_authorized') INTO _existe;
  IF NOT _existe THEN
    CREATE POLICY transport_rides_modify_authorized ON public.transport_rides
      USING      (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::public.app_role[]))
      WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::public.app_role[]));
  END IF;

END $$;
