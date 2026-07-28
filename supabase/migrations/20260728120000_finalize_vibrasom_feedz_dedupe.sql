-- Reforca a desvinculacao da Vibrasom no modulo de Custos do Suporte.
WITH vibrasom_clients AS (
  SELECT id
  FROM public.support_milvus_clients
  WHERE regexp_replace(lower(coalesce(milvus_client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
),
vibrasom_projects AS (
  SELECT p.id
  FROM public.support_milvus_projects p
  LEFT JOIN public.support_milvus_clients c ON c.id = p.milvus_client_id
  WHERE regexp_replace(lower(coalesce(p.milvus_project_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
     OR regexp_replace(lower(coalesce(c.milvus_client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
),
vibrasom_tickets AS (
  SELECT id
  FROM public.support_cost_tickets
  WHERE milvus_client_id IN (SELECT id FROM vibrasom_clients)
     OR milvus_project_id IN (SELECT id FROM vibrasom_projects)
     OR regexp_replace(lower(coalesce(client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
     OR regexp_replace(lower(coalesce(project_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
)
UPDATE public.support_cost_tickets ticket
SET
  hub_client_id = NULL,
  hub_contract_id = NULL,
  hub_subproject_id = NULL,
  updated_at = now()
WHERE ticket.id IN (SELECT id FROM vibrasom_tickets);

WITH vibrasom_clients AS (
  SELECT id
  FROM public.support_milvus_clients
  WHERE regexp_replace(lower(coalesce(milvus_client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
)
UPDATE public.support_milvus_client_mappings mapping
SET
  hub_client_id = NULL,
  status = 'ignored',
  match_method = 'manual',
  confidence = 0,
  notes = concat_ws(' | ', nullif(notes, ''), 'Desvinculado manualmente: Vibrasom.'),
  updated_at = now()
WHERE mapping.milvus_client_id IN (SELECT id FROM vibrasom_clients);

WITH vibrasom_projects AS (
  SELECT p.id
  FROM public.support_milvus_projects p
  LEFT JOIN public.support_milvus_clients c ON c.id = p.milvus_client_id
  WHERE regexp_replace(lower(coalesce(p.milvus_project_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
     OR regexp_replace(lower(coalesce(c.milvus_client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
)
UPDATE public.support_milvus_project_mappings mapping
SET
  hub_contract_id = NULL,
  hub_subproject_id = NULL,
  status = 'ignored',
  match_method = 'manual',
  confidence = 0,
  notes = concat_ws(' | ', nullif(notes, ''), 'Desvinculado manualmente: Vibrasom.'),
  updated_at = now()
WHERE mapping.milvus_project_id IN (SELECT id FROM vibrasom_projects);

-- Limpa duplicidades antigas de eventos Feedz e preserva o primeiro registro.
WITH ranked_feedz_events AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY person_id, event_date, ocorrencia
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM public.hr_timeline
  WHERE source = 'feedz'
)
DELETE FROM public.hr_timeline timeline
USING ranked_feedz_events ranked
WHERE timeline.id = ranked.id
  AND ranked.row_number > 1;

DROP INDEX IF EXISTS idx_hr_timeline_feedz_identity;
DROP INDEX IF EXISTS hr_timeline_one_feedz_event_per_person_date_type;

CREATE UNIQUE INDEX IF NOT EXISTS hr_timeline_one_feedz_event_per_person_date_type
ON public.hr_timeline (person_id, event_date, ocorrencia)
WHERE source = 'feedz';
