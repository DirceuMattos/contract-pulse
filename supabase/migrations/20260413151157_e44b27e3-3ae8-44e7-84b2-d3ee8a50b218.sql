ALTER TABLE public.simulations
  ADD COLUMN IF NOT EXISTS ai_notes text,
  ADD COLUMN IF NOT EXISTS ai_confidence jsonb,
  ADD COLUMN IF NOT EXISTS ai_coverage jsonb,
  ADD COLUMN IF NOT EXISTS ai_complexity_justification text;