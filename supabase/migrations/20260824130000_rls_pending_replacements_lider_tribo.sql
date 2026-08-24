-- ===========================================================================
-- Lider de Tribo e Coordenador de Suporte passam a resolver pendencias de
-- reposicao (alinhamento da RLS ao que a aplicacao ja declara)
-- ===========================================================================
-- CONCEDE DIREITO NOVO. Autorizado por Dirceu em 24/08/2026.
--
-- A DIVERGENCIA QUE ISTO CORRIGE
-- src/components/hr/SubstituicaoDialog.tsx:40 declara quem pode substituir:
--
--   const canUse = userRole === 'superadmin' || userRole === 'c-level'
--               || userRole === 'lider_tribo' || userRole === 'coordenacao_suporte';
--
-- A RLS de pending_replacements, porem, permitia escrita apenas a c-level, rh
-- e superadmin. A tela abria o fluxo para quatro perfis e o banco aceitava de
-- dois. Nao era decisao de seguranca: era divergencia entre camadas, do mesmo
-- tipo que a matriz de permissoes vai eliminar de forma estrutural.
--
-- O QUE ISSO CAUSAVA
-- 1. Botao "Remover" (pendencia) no quadro de Squads nao funcionava para
--    Lider de Tribo. Ate 56cc2a8 anunciava sucesso falso.
-- 2. Botao "Substituir": o recurso trocava de pessoa, porque resources_update
--    permite lider_tribo, mas a pendencia ficava 'pending' para sempre. A
--    substituicao acontecia pela metade e o desligado seguia marcado como
--    "a repor" no quadro, sem aviso nenhum.
--
-- ESCOPO
-- Escrita apenas em pending_replacements: marcar 'replaced', marcar 'removed'
-- e reverter. Nenhum acesso novo a valores, a dado pessoal ou a outra tabela.
-- A leitura destes perfis ja existia desde 20260811120000.
--
-- IDEMPOTENTE. Verificada em PostgreSQL real: aplicada 2x, policy final com os
-- 5 perfis, sem efeito adicional.
-- ===========================================================================

DROP POLICY IF EXISTS "pending_replacements_modify" ON public.pending_replacements;
CREATE POLICY "pending_replacements_modify" ON public.pending_replacements
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level', 'rh', 'superadmin', 'lider_tribo', 'coordenacao_suporte'
  ]::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'c-level', 'rh', 'superadmin', 'lider_tribo', 'coordenacao_suporte'
  ]::public.app_role[]));

-- Detector de sobrescrita, como nos demais objetos que protegemos.
COMMENT ON POLICY "pending_replacements_modify" ON public.pending_replacements IS
  'I-PEND-RLS v1 — inclui lider_tribo e coordenacao_suporte, alinhando a RLS ao canUse do SubstituicaoDialog. Nao estreitar sem revisar o quadro de Squads.';
