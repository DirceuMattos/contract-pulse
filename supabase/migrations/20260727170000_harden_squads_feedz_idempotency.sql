-- Prevent repeated pending replacements from Feedz syncs.
-- Existing duplicate pending rows are closed before the partial unique index is added.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY hr_person_id, resource_id, contract_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.pending_replacements
  WHERE status = 'pending'
)
UPDATE public.pending_replacements pr
SET status = 'removed', resolved_at = now()
FROM ranked
WHERE pr.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pending_replacements_one_pending_per_allocation
ON public.pending_replacements (hr_person_id, resource_id, contract_id)
WHERE status = 'pending';

-- Prevent duplicate Feedz timeline events for the same person/date/type.
-- Existing duplicates are kept for audit, but future syncs will use this lookup efficiently.
CREATE INDEX IF NOT EXISTS idx_hr_timeline_feedz_identity
ON public.hr_timeline (person_id, event_date, ocorrencia)
WHERE source = 'feedz';
