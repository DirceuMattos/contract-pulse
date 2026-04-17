ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS superlogica_customer_id text;

CREATE INDEX IF NOT EXISTS idx_contracts_superlogica_customer_id
ON public.contracts (superlogica_customer_id)
WHERE superlogica_customer_id IS NOT NULL;