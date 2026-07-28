-- Desvincula Vibrasom do Hub sem apagar tickets importados do Milvus.
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
)
UPDATE public.support_milvus_client_mappings scm
SET
  hub_client_id = NULL,
  status = 'ignored',
  match_method = 'manual',
  confidence = 0,
  notes = concat_ws(' | ', nullif(notes, ''), 'Desvinculado manualmente: Vibrasom não deve compor vínculo Hub neste módulo.'),
  updated_at = now()
WHERE scm.milvus_client_id IN (SELECT id FROM vibrasom_clients);

WITH vibrasom_projects AS (
  SELECT p.id
  FROM public.support_milvus_projects p
  LEFT JOIN public.support_milvus_clients c ON c.id = p.milvus_client_id
  WHERE regexp_replace(lower(coalesce(p.milvus_project_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
     OR regexp_replace(lower(coalesce(c.milvus_client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
)
UPDATE public.support_milvus_project_mappings spm
SET
  hub_contract_id = NULL,
  hub_subproject_id = NULL,
  status = 'ignored',
  match_method = 'manual',
  confidence = 0,
  notes = concat_ws(' | ', nullif(notes, ''), 'Desvinculado manualmente: Vibrasom não deve compor vínculo Hub neste módulo.'),
  updated_at = now()
WHERE spm.milvus_project_id IN (SELECT id FROM vibrasom_projects);

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
)
UPDATE public.support_cost_tickets sct
SET
  hub_client_id = NULL,
  hub_contract_id = NULL,
  hub_subproject_id = NULL,
  updated_at = now()
WHERE sct.milvus_client_id IN (SELECT id FROM vibrasom_clients)
   OR sct.milvus_project_id IN (SELECT id FROM vibrasom_projects)
   OR regexp_replace(lower(coalesce(sct.client_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%'
   OR regexp_replace(lower(coalesce(sct.project_name, '')), '[^a-z0-9]+', '', 'g') LIKE '%vibrasom%';

-- Remove duplicidades abertas antes de criar travas.
WITH ranked_resources AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY contract_id, hr_person_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.resources
  WHERE hr_person_id IS NOT NULL
    AND data_fim IS NULL
)
UPDATE public.resources r
SET
  data_fim = CURRENT_DATE,
  observacoes = concat_ws(E'\n', nullif(r.observacoes, ''), 'Alocação duplicada encerrada automaticamente por regra de unicidade.'),
  updated_at = now()
FROM ranked_resources ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS resources_one_open_allocation_per_person_contract
ON public.resources (contract_id, hr_person_id)
WHERE hr_person_id IS NOT NULL
  AND data_fim IS NULL;

WITH ranked_subproject_allocations AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY subproject_id, hr_person_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.subproject_allocations
  WHERE hr_person_id IS NOT NULL
)
DELETE FROM public.subproject_allocations spa
USING ranked_subproject_allocations ranked
WHERE spa.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS subproject_allocations_one_person_per_subproject
ON public.subproject_allocations (subproject_id, hr_person_id)
WHERE hr_person_id IS NOT NULL;

-- Limpa duplicidades antigas de eventos Feedz mantendo o primeiro registro.
WITH ranked_timeline AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY person_id, event_date, ocorrencia, source
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.hr_timeline
  WHERE source = 'feedz'
)
DELETE FROM public.hr_timeline ht
USING ranked_timeline ranked
WHERE ht.id = ranked.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS idx_hr_timeline_feedz_identity;

CREATE UNIQUE INDEX IF NOT EXISTS hr_timeline_one_feedz_event_per_person_date_type
ON public.hr_timeline (person_id, event_date, ocorrencia)
WHERE source = 'feedz';
