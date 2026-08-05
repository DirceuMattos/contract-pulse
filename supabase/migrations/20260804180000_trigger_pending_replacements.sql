-- Problema 1 (reposição de vagas): garante que TODA transição ativo->inativo
-- de um colaborador gere pending_replacements para seus resources vinculados,
-- independentemente da via (edição manual, sync Feedz, import, correção em massa).
-- Antes, cada tela criava as reposições por conta própria e algumas vias (import/
-- correção) não disparavam — deixando desligados sem reposição (ex.: João Eduardo).
-- 2026-08-04

-- Restaura o índice único parcial (uma pendência aberta por alocação) caso tenha
-- sido perdido/sobrescrito. Antes, remove duplicatas 'pending' existentes.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY hr_person_id, resource_id, contract_id
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.pending_replacements
  WHERE status = 'pending'
)
UPDATE public.pending_replacements pr
SET status = 'removed', resolved_at = now()
FROM ranked
WHERE pr.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pending_replacements_one_pending_per_allocation
ON public.pending_replacements (hr_person_id, resource_id, contract_id)
WHERE status = 'pending';

-- Trigger: usa NOT EXISTS (não depende de ON CONFLICT/índice) para ser idempotente
-- de forma robusta — cria a pendência só se ainda não houver uma aberta igual.
CREATE OR REPLACE FUNCTION public.create_pending_replacements_on_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.situacao, '') = 'ativo' AND NEW.situacao = 'inativo') THEN
    INSERT INTO public.pending_replacements (hr_person_id, resource_id, contract_id, status)
    SELECT NEW.id, r.id, r.contract_id, 'pending'
    FROM public.resources r
    WHERE r.hr_person_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM public.pending_replacements pr
        WHERE pr.hr_person_id = NEW.id
          AND pr.resource_id = r.id
          AND pr.contract_id = r.contract_id
          AND pr.status = 'pending'
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pending_replacements ON public.hr_people;
CREATE TRIGGER trg_create_pending_replacements
  AFTER UPDATE OF situacao ON public.hr_people
  FOR EACH ROW
  EXECUTE FUNCTION public.create_pending_replacements_on_termination();
