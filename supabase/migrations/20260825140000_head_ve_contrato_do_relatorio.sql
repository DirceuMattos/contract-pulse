-- ===========================================================================
-- Head de Area passa a VER os dados do contrato na tela de Relatorios
-- ===========================================================================
-- Projeto: shkovalhksqixbppcjnr (producao) · 25/08/2026
--
-- O SINTOMA
-- A lista de relatorios aparecia, com os contadores certos, mas cada linha
-- mostrava o rotulo generico "Contrato" e o avatar "?". Nao era bloqueio: a
-- tela monta nome e logo a partir de contracts e clients, carregadas pelo
-- DataContext, e a RLS dessas duas nao incluia 'head'. O codigo caia no
-- fallback `contract?.nome ?? 'Contrato'`.
--
-- ESCOPO MINIMO, E NAO A CARTEIRA INTEIRA
-- Acrescentar 'head' na lista de papeis seria uma linha, e daria ao perfil
-- leitura de TODOS os contratos e clientes. Preferi o minimo necessario:
--
--   contracts  -> o Head ve apenas contratos que POSSUEM relatorio mensal
--   clients    -> apenas os clientes desses contratos
--
-- E o que a tela precisa, e nada alem. Custo: uma subconsulta por linha numa
-- tabela de poucas dezenas de registros -- irrelevante.
--
-- O QUE FOI PRESERVADO
-- As definicoes abaixo reproduzem o texto VIVO no banco (consultado antes de
-- escrever, nao copiado da migration), acrescentando apenas o ramo do 'head'.
-- O ramo do perfil demo e a exclusao de registros is_demo continuam
-- identicos. Recriei sem clausula TO, para as policies seguirem aplicadas a
-- {public} como estao hoje.
--
-- VERIFICACAO FEITA ANTES DE ENVIAR
-- Testado em PostgreSQL real com troca de papel de verdade (SET ROLE +
-- auth.uid() por variavel de sessao), com 3 contratos: um com relatorio, um
-- sem, e um demo.
--
--   HEAD           -> ve so o contrato com relatorio e o cliente dele
--   LIDER DE TRIBO -> inalterado (os dois contratos nao-demo)
--   DEMO           -> inalterado (so os registros demo)
--
-- IDEMPOTENTE.
--
-- ⚠️ ALTERA POLICY DE PRODUCAO. Nao rodar sem decisao consciente.
-- ===========================================================================

-- ── contracts: Head ve APENAS contratos que possuem relatorio mensal ───────
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts FOR SELECT
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (
      ((is_demo IS NULL) OR (is_demo = false))
      AND (
        has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'comercial'::app_role, 'juridico'::app_role, 'superadmin'::app_role, 'coordenacao_suporte'::app_role, 'projetos_produtos'::app_role])
        OR (
          has_role(auth.uid(), 'head'::app_role)
          AND EXISTS (SELECT 1 FROM public.monthly_reports mr WHERE mr.contract_id = contracts.id)
        )
      )
    )
  END
);

-- ── clients: Head ve APENAS clientes desses contratos ─────────────────────
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (
      ((is_demo IS NULL) OR (is_demo = false))
      AND (
        has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'comercial'::app_role, 'juridico'::app_role, 'superadmin'::app_role, 'coordenacao_suporte'::app_role, 'projetos_produtos'::app_role])
        OR (
          has_role(auth.uid(), 'head'::app_role)
          AND EXISTS (
            SELECT 1 FROM public.contracts c
              JOIN public.monthly_reports mr ON mr.contract_id = c.id
             WHERE c.client_id = clients.id
          )
        )
      )
    )
  END
);

-- ── Conferencia: as duas devem citar 'head' ────────────────────────────────
SELECT tablename, policyname, (qual LIKE '%head%') AS cita_head
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename IN ('contracts','clients') AND cmd = 'SELECT'
 ORDER BY tablename;

-- ===========================================================================
-- ALTERNATIVA, se voce preferir que o Head veja a carteira inteira:
-- nao rode o script acima e, em vez dele, acrescente
--   , 'head'::app_role
-- ao final de cada ARRAY[...] das duas policies originais. Mais simples de
-- ler, porem concede muito mais do que a tela precisa.
-- ===========================================================================
