-- ===========================================================================
-- Remover alocação de colaborador desligado deixa de ser bloqueado pela FK
-- ===========================================================================
-- SINTOMA
-- Ao remover de um projeto a alocação de alguém desligado, o banco recusava:
--
--   update or delete on table "resources" violates foreign key constraint
--   "pending_replacements_resource_id_fkey" on table "pending_replacements"
--
-- CAUSA
-- O gatilho create_pending_replacements_on_termination cria uma pendência de
-- reposição apontando para a alocação. A FK dessa coluna nasceu SEM cláusula
-- ON DELETE, então a pendência tranca justamente a alocação que ela quer
-- repor. A coluna irmã, subproject_allocation_id, sempre teve ON DELETE SET
-- NULL — as duas cumprem o mesmo papel, e a diferença era esquecimento, não
-- decisão de projeto. É por isso que o caminho por subprojeto funcionava e o
-- por alocação direta travava.
--
-- POR QUE ATINGIA UNS PERFIS E NÃO OUTROS
-- O front-end contornava apagando a pendência antes. Essa escrita é permitida
-- só a c-level, rh e superadmin; para os demais perfis a RLS filtrava as
-- linhas, "0 linhas afetadas" contava como sucesso, e o erro estourava no
-- passo seguinte. Diagnóstico de 24/08 confirmou no banco vivo.
--
-- ESCALA REAL (diagnóstico de 24/08)
-- 27 pendências, TODAS com resource_id: 8 'pending', 13 'removed', 6
-- 'replaced'. As 19 já resolvidas também bloqueavam, porque a FK não olha o
-- status. Linhas que impediriam o CHECK novo: 0.
--
-- POR QUE FECHAR A PENDÊNCIA EM VEZ DE APAGAR
-- O resto do sistema trata essa linha como histórico reversível: SquadsPage e
-- JobRequestsPage marcam status='removed', e reverterNaoRepor volta para
-- 'pending'. Além disso job_requests.pending_replacement_id aponta para ela —
-- apagar faria uma vaga aberta perder a origem. O gatilho abaixo preserva a
-- linha e registra quem removeu e quando.
--
-- IDEMPOTENTE: pode ser reaplicada sem efeito adicional.
-- Verificada em PostgreSQL real: erro reproduzido, script aplicado 2x, DELETE
-- passou, status das 3 pendências de teste conforme esperado, nenhuma apagada.
-- ===========================================================================

-- 1. O CHECK de origem passa a valer apenas enquanto a pendência está 'pending'.
ALTER TABLE public.pending_replacements
  DROP CONSTRAINT IF EXISTS pending_replacements_origem_check;
ALTER TABLE public.pending_replacements
  ADD  CONSTRAINT pending_replacements_origem_check CHECK (
    status <> 'pending'
    OR resource_id IS NOT NULL
    OR subproject_allocation_id IS NOT NULL
  );

-- 2. A FK espelha a irmã: solta o ponteiro em vez de bloquear o DELETE.
ALTER TABLE public.pending_replacements
  DROP CONSTRAINT IF EXISTS pending_replacements_resource_id_fkey;
ALTER TABLE public.pending_replacements
  ADD  CONSTRAINT pending_replacements_resource_id_fkey
       FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE SET NULL;

-- 3. Antes de o ponteiro ser solto, fecha a pendência com rastro de autoria.
CREATE OR REPLACE FUNCTION public.close_pending_replacements_on_resource_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.pending_replacements
     SET status      = 'removed',
         resolved_at = now(),
         resolved_by = auth.uid(),
         updated_at  = now()
   WHERE resource_id = OLD.id
     AND status = 'pending';
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_close_pending_on_resource_delete ON public.resources;
CREATE TRIGGER trg_close_pending_on_resource_delete
  BEFORE DELETE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.close_pending_replacements_on_resource_delete();

-- Detector de sobrescrita, como no gatilho da Fase 4 do I10: se o Lovable ou a
-- IA paralela recriar o objeto, o comentário desaparece e a gente percebe.
COMMENT ON TRIGGER trg_close_pending_on_resource_delete ON public.resources IS
  'I-FK-PENDING v1 — fecha a pendencia de reposicao antes de a FK soltar o ponteiro. Nao remover.';
