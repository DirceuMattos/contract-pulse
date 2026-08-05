-- Problema 1 (reposição de vagas): garante que TODA transição ativo->inativo
-- de um colaborador gere pending_replacements para seus resources vinculados,
-- independentemente da via (edição manual, sync Feedz, import, correção em massa).
-- Antes, cada tela criava as reposições por conta própria e algumas vias (import/
-- correção) não disparavam — deixando desligados sem reposição (ex.: João Eduardo).
-- 2026-08-04

CREATE OR REPLACE FUNCTION public.create_pending_replacements_on_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só age na transição ativo -> inativo.
  IF (COALESCE(OLD.situacao, '') = 'ativo' AND NEW.situacao = 'inativo') THEN
    INSERT INTO public.pending_replacements (hr_person_id, resource_id, contract_id, status)
    SELECT NEW.id, r.id, r.contract_id, 'pending'
    FROM public.resources r
    WHERE r.hr_person_id = NEW.id
    -- idempotente: respeita o índice único parcial (uma pendência por alocação)
    ON CONFLICT (hr_person_id, resource_id, contract_id) WHERE status = 'pending'
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pending_replacements ON public.hr_people;
CREATE TRIGGER trg_create_pending_replacements
  AFTER UPDATE OF situacao ON public.hr_people
  FOR EACH ROW
  EXECUTE FUNCTION public.create_pending_replacements_on_termination();
