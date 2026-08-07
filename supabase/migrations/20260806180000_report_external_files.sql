-- Problema 4: importar relatório de fonte externa (PPT/PDF/etc.) num card de mês.
-- Quando um relatório tem ao menos 1 arquivo aqui, o card é "importado de fonte
-- externa": as telas/seções ficam ocultas e a sincronização é desabilitada NAQUELE
-- mês. Remover todos os arquivos volta o card ao funcionamento normal.
-- Mantém histórico de versões (cada upload = nova versão). 2026-08-06

CREATE TABLE IF NOT EXISTS public.report_external_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_mime text,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_external_files_report ON public.report_external_files (report_id);

ALTER TABLE public.report_external_files ENABLE ROW LEVEL SECURITY;

-- Perfis que editam relatórios (módulo REPORTS) podem ver e importar.
DROP POLICY IF EXISTS ref_select ON public.report_external_files;
CREATE POLICY ref_select ON public.report_external_files
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos'
  ]::public.app_role[]));

DROP POLICY IF EXISTS ref_insert ON public.report_external_files;
CREATE POLICY ref_insert ON public.report_external_files
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos'
  ]::public.app_role[]));

-- Remoção (reverter importação) só perfis altos.
DROP POLICY IF EXISTS ref_delete ON public.report_external_files;
CREATE POLICY ref_delete ON public.report_external_files
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo'
  ]::public.app_role[]));

-- Bucket de storage (privado) para os arquivos externos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-external', 'report-external', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "re_select" ON storage.objects;
CREATE POLICY "re_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos'
  ]::public.app_role[]));

DROP POLICY IF EXISTS "re_insert" ON storage.objects;
CREATE POLICY "re_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos'
  ]::public.app_role[]));

DROP POLICY IF EXISTS "re_delete" ON storage.objects;
CREATE POLICY "re_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo'
  ]::public.app_role[]));
