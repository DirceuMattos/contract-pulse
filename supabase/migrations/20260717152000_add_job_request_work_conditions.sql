-- Add work conditions and benefits to job requests.

ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS modalidade_trabalho text,
  ADD COLUMN IF NOT EXISTS presenca_cliente_requerida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dias_presenca_cliente text,
  ADD COLUMN IF NOT EXISTS viagens_requeridas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beneficios text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_requests_modalidade_trabalho_check'
      AND conrelid = 'public.job_requests'::regclass
  ) THEN
    ALTER TABLE public.job_requests
      ADD CONSTRAINT job_requests_modalidade_trabalho_check
      CHECK (
        modalidade_trabalho IS NULL
        OR modalidade_trabalho IN ('remoto', 'presencial', 'hibrido')
      );
  END IF;
END $$;
