
-- Add has_subprojects column
ALTER TABLE public.contracts ADD COLUMN has_subprojects boolean NOT NULL DEFAULT false;

-- Backfill: set true for contracts that already have subproject records
UPDATE public.contracts SET has_subprojects = true
WHERE id IN (SELECT DISTINCT contract_id FROM public.contract_subprojects);
