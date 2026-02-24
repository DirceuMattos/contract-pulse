
-- Add consultant_analysis column to simulations
ALTER TABLE public.simulations ADD COLUMN consultant_analysis text DEFAULT NULL;

-- Make data_fim nullable in contracts
ALTER TABLE public.contracts ALTER COLUMN data_fim DROP NOT NULL;
