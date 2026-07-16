-- Registra quem foi contratado para preencher a vaga (elo ex-colab -> vaga -> novo colab)
-- Aditivo, baixo risco. 2026-07-15

ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS preenchida_por_hr_person_id uuid
    REFERENCES public.hr_people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preenchida_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_job_requests_preenchida_por
  ON public.job_requests(preenchida_por_hr_person_id);
