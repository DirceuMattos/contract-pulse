ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS responsavel_cliente text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_email text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_telefone text;