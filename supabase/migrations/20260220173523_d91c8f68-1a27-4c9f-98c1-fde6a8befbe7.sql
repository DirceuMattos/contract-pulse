
ALTER TABLE public.hr_people
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS trilha text,
  ADD COLUMN IF NOT EXISTS projeto text,
  ADD COLUMN IF NOT EXISTS cargo_antigo text,
  ADD COLUMN IF NOT EXISTS remuneracao_ii numeric,
  ADD COLUMN IF NOT EXISTS observacoes_desligamento text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS id_externo text,
  ADD COLUMN IF NOT EXISTS centro_custo text;
