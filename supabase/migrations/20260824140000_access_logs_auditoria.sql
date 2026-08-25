-- ===========================================================================
-- Auditoria de acessos: restringe a Superadmin, cria indices, expurgo e a
-- funcao de registro de navegacao
-- ===========================================================================
-- CONTEXTO
-- A tabela access_log_sessions existe desde 20260217164804 e ja era gravada
-- pelo front. O modulo, porem, nunca entrou em operacao. Levantamento de
-- 24/08 encontrou tres defeitos e tres faltas:
--   - a pagina bloqueava por comparacao literal a 'c-level', deixando o
--     Superadmin de fora do proprio modulo de auditoria;
--   - o botao "Limpar logs" nao apagava nada (so limpava a memoria do
--     navegador), enquanto a UI e a ajuda afirmavam remocao permanente;
--   - o IP era gravado como '0.0.0.0' fixo;
--   - nenhum indice, nem em started_at, que e a coluna do ORDER BY;
--   - nenhuma politica de DELETE, portanto nenhum caminho de eliminacao;
--   - nenhuma rotina de retencao: a tabela crescia para sempre.
--
-- DECISAO DE ACESSO (Dirceu, 24/08): o modulo passa a ser exclusivo do
-- Superadmin. Auditoria de jornada e navegacao de colaborador nao deve ficar
-- disponivel a mais gente do que o estritamente necessario -- e principio de
-- minimizacao da LGPD, nao preferencia de layout.
--
-- LGPD
-- Esta tabela registra nome, agente de usuario, horarios e rotas navegadas de
-- colaborador: e monitoramento de jornada e comportamento. Esta migration
-- entrega o que faltava para tratar isso de forma defensavel -- leitura
-- restrita, caminho real de eliminacao e funcao de expurgo por prazo. O que
-- ela NAO resolve, e depende de decisao sua: definir o prazo de retencao,
-- registrar a base legal e dar transparencia previa aos colaboradores.
--
-- IDEMPOTENTE.
-- ===========================================================================

-- ── 1. Indices ─────────────────────────────────────────────────────────────
-- started_at DESC e a ordenacao padrao da tela.
CREATE INDEX IF NOT EXISTS idx_als_started_at
  ON public.access_log_sessions (started_at DESC);

-- filtro por usuario, sempre combinado com periodo.
CREATE INDEX IF NOT EXISTS idx_als_user_started
  ON public.access_log_sessions (user_id, started_at DESC);

-- filtro por modulo acessado usa operador de array (&&); GIN e o indice certo.
CREATE INDEX IF NOT EXISTS idx_als_modules
  ON public.access_log_sessions USING gin (modules_accessed);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────
-- Leitura: apenas Superadmin. Antes era "a propria sessao OU c-level".
-- Ninguem alem do auditor precisa ler esta tabela; o app so escreve.
DROP POLICY IF EXISTS "als_select" ON public.access_log_sessions;
CREATE POLICY "als_select" ON public.access_log_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Escrita: cada usuario registra a PROPRIA sessao. Sem isso nao ha log.
DROP POLICY IF EXISTS "als_insert" ON public.access_log_sessions;
CREATE POLICY "als_insert" ON public.access_log_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "als_update_own" ON public.access_log_sessions;
CREATE POLICY "als_update_own" ON public.access_log_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exclusao: apenas Superadmin. E o que torna possivel atender um pedido de
-- eliminacao -- ate agora nao havia nenhum caminho.
DROP POLICY IF EXISTS "als_delete" ON public.access_log_sessions;
CREATE POLICY "als_delete" ON public.access_log_sessions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- ── 3. Registro de navegacao em uma unica ida ao banco ─────────────────────
-- Antes eram duas: um SELECT dos arrays e um UPDATE por cima, com corrida
-- entre abas. Aqui o append e feito no proprio banco, sem sobrescrever o que
-- outra aba tenha acrescentado no meio do caminho.
-- SECURITY INVOKER de proposito: a RLS de update-own continua valendo, entao
-- ninguem consegue escrever na sessao de outra pessoa.
CREATE OR REPLACE FUNCTION public.record_access_navigation(
  p_session_id uuid,
  p_module     text,
  p_route      text
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $fn$
  UPDATE public.access_log_sessions
     SET modules_accessed = CASE
           WHEN p_module = ANY(modules_accessed) THEN modules_accessed
           ELSE array_append(modules_accessed, p_module)
         END,
         routes_accessed = CASE
           WHEN p_route = ANY(routes_accessed) THEN routes_accessed
           -- teto de 50 rotas por sessao: mantem o rastro util sem deixar a
           -- linha crescer sem limite.
           ELSE (array_append(routes_accessed, p_route))[
                  GREATEST(1, array_length(array_append(routes_accessed, p_route), 1) - 49)
                  : array_length(array_append(routes_accessed, p_route), 1)]
         END,
         last_activity_at = now()
   WHERE id = p_session_id
     AND user_id = auth.uid();
$fn$;

GRANT EXECUTE ON FUNCTION public.record_access_navigation(uuid, text, text) TO authenticated;

-- ── 4. Expurgo por prazo de retencao ───────────────────────────────────────
-- Substitui o botao "Limpar tudo", que nunca apagou nada. Expurgo por idade e
-- o comportamento correto para log de auditoria: apagar tudo destruiria a
-- trilha, e nao apagar nunca e retencao perpetua.
CREATE OR REPLACE FUNCTION public.purge_access_log_sessions(p_dias integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _removidas integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Apenas Superadmin pode expurgar logs de acesso.';
  END IF;

  IF p_dias IS NULL OR p_dias < 1 THEN
    RAISE EXCEPTION 'Informe um numero de dias maior ou igual a 1.';
  END IF;

  DELETE FROM public.access_log_sessions
   WHERE started_at < now() - make_interval(days => p_dias);

  GET DIAGNOSTICS _removidas = ROW_COUNT;
  RETURN _removidas;
END;
$fn$;

REVOKE ALL ON FUNCTION public.purge_access_log_sessions(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purge_access_log_sessions(integer) TO authenticated;

-- ── 4b. Lista de modulos ja registrados, para alimentar o filtro da tela ───
-- Sem isto o filtro por modulo so conheceria o que estivesse na pagina atual.
-- SECURITY INVOKER: a RLS de leitura (superadmin) continua valendo.
CREATE OR REPLACE FUNCTION public.list_access_log_modules()
RETURNS TABLE (modulo text)
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT DISTINCT m
    FROM public.access_log_sessions s,
         LATERAL unnest(s.modules_accessed) AS m
   WHERE m <> ''
   ORDER BY 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.list_access_log_modules() TO authenticated;

-- ── 5. Documentacao no proprio banco ───────────────────────────────────────
COMMENT ON TABLE public.access_log_sessions IS
  'Auditoria de sessoes de acesso. DADO PESSOAL: nome, agente de usuario, horarios e rotas navegadas de colaborador. Leitura restrita a Superadmin. Expurgo por public.purge_access_log_sessions(dias). Prazo de retencao a definir formalmente.';

COMMENT ON COLUMN public.access_log_sessions.ip_address IS
  'NAO CAPTURADO hoje: gravado como string vazia. O navegador nao conhece o proprio IP publico; capturar exige edge function lendo o header da requisicao. Ate la, nao usar esta coluna como evidencia.';

COMMENT ON FUNCTION public.purge_access_log_sessions(integer) IS
  'I-LOG-AUDIT v1 — expurgo de sessoes anteriores a N dias. Superadmin apenas. Nao remover.';
