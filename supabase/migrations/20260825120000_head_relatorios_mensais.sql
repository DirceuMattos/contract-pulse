-- ===========================================================================
-- Head de Area passa a LER os relatorios mensais
-- ===========================================================================
-- Pedido de 25/08. Concede LEITURA, nao escrita: o perfil acompanha o
-- relatorio, nao o produz. As policies de INSERT/UPDATE/DELETE ficam intactas.
--
-- POR QUE A LIBERACAO NO FRONT NAO BASTA
-- As policies de leitura das tabelas de relatorio listam papeis explicitamente
-- e nao incluiam 'head'. Sem esta migration, o modulo abriria e a tela viria
-- vazia -- o mesmo sintoma que Projetos-Produtos tinha no modulo de RH: a
-- porta abre pelo codigo e o conteudo e barrado pelo banco.
--
-- SAO CINCO PONTOS, e cada um sozinho deixaria um pedaco da tela quebrado:
--   1. monthly_reports          -- a lista de relatorios
--   2. report_sections          -- o conteudo de cada relatorio
--   3. report_external_files    -- os anexos
--   4. storage.objects          -- o arquivo em si, no bucket report-external
--   5. role_module_permissions  -- coerencia da matriz na tela de perfis
--
-- As policies abaixo reproduzem LITERALMENTE a definicao vigente
-- (20260819121000), acrescentando 'head' apenas na lista de papeis. O ramo do
-- perfil demo, que restringe por contrato is_demo, fica igual.
--
-- report_template_configs: nao ha policy versionada para essa tabela em
-- nenhuma migration -- e uma das nove tabelas que estavam fora do controle.
-- Nao vou recriar as cegas o que nao consigo ler. A consulta no fim do script
-- mostra o estado dela; se o 'head' precisar entrar ali tambem, tratamos
-- depois, com a definicao real em maos.
--
-- IDEMPOTENTE.
-- ===========================================================================

-- ── 1. Coerencia da matriz de perfis ───────────────────────────────────────
INSERT INTO public.role_module_permissions (
  role, module_key, can_access, can_edit, can_create, can_delete,
  can_export, can_view_values, can_view_hr_costs, can_allocate
) VALUES (
  'head', 'REPORTS', true, false, false, false, false, false, false, false
)
ON CONFLICT (role, module_key) DO UPDATE SET can_access = true;

-- ── 2. Lista de relatorios ─────────────────────────────────────────────────
DROP POLICY IF EXISTS monthly_reports_select ON public.monthly_reports;
CREATE POLICY monthly_reports_select ON public.monthly_reports FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (
      EXISTS (
        SELECT 1 FROM public.contracts c
         WHERE c.id = public.monthly_reports.contract_id
           AND c.is_demo = true
      )
    )
    ELSE public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role,
      'coordenacao_suporte'::public.app_role,
      'projetos_produtos'::public.app_role,
      'rh'::public.app_role,
      'head'::public.app_role
    ])
  END
);

-- ── 3. Conteudo de cada relatorio ──────────────────────────────────────────
DROP POLICY IF EXISTS report_sections_select ON public.report_sections;
CREATE POLICY report_sections_select ON public.report_sections FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (
      EXISTS (
        SELECT 1
          FROM public.monthly_reports mr
          JOIN public.contracts c ON c.id = mr.contract_id
         WHERE mr.id = public.report_sections.report_id
           AND c.is_demo = true
      )
    )
    ELSE public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role,
      'coordenacao_suporte'::public.app_role,
      'projetos_produtos'::public.app_role,
      'rh'::public.app_role,
      'head'::public.app_role
    ])
  END
);

-- ── 4. Anexos: o registro ──────────────────────────────────────────────────
DROP POLICY IF EXISTS ref_select ON public.report_external_files;
CREATE POLICY ref_select ON public.report_external_files
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh','head'
  ]::public.app_role[]));

-- ── 5. Anexos: o arquivo no storage ────────────────────────────────────────
-- Sem isto o anexo aparece na lista e nao baixa.
DROP POLICY IF EXISTS "re_select" ON storage.objects;
CREATE POLICY "re_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh','head'
  ]::public.app_role[]));

-- ── Conferencia ────────────────────────────────────────────────────────────
-- As quatro primeiras linhas devem citar 'head'. A ultima mostra o estado de
-- report_template_configs, que nao foi tocada.
SELECT tablename, policyname, cmd,
       (qual LIKE '%head%') AS cita_head
  FROM pg_policies
 WHERE cmd = 'SELECT'
   AND (
        (schemaname = 'public'  AND tablename IN ('monthly_reports','report_sections','report_external_files','report_template_configs'))
     OR (schemaname = 'storage' AND policyname = 're_select')
   )
 ORDER BY tablename, policyname;
