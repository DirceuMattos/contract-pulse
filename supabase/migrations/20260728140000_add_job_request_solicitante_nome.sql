-- F5: guarda o nome do solicitante direto na vaga (capturado do login na criação).
-- Evita depender da RLS de profiles (que só permite ler o próprio profile).
-- Aditivo, baixo risco. 2026-07-28

ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS solicitante_nome text;

-- Backfill opcional das vagas já existentes (executado por quem enxerga profiles):
-- preenche o nome a partir de profiles quando o solicitante_id existe e o nome ainda está vazio.
UPDATE public.job_requests jr
   SET solicitante_nome = p.name
  FROM public.profiles p
 WHERE jr.solicitante_id = p.id
   AND jr.solicitante_nome IS NULL;
