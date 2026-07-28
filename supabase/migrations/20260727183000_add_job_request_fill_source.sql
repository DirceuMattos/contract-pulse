DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'job_request_fill_source'
  ) THEN
    CREATE TYPE public.job_request_fill_source AS ENUM ('hunting', 'bnp', 'indicacao');
  END IF;
END $$;

ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS origem_preenchimento public.job_request_fill_source;

CREATE INDEX IF NOT EXISTS idx_job_requests_origem_preenchimento
  ON public.job_requests(origem_preenchimento);
