-- Fluxo de status dos Relatórios Mensais (decisão do PO em 08/2026):
--   Rascunho -> Em Revisão -> Liberado
-- O status "Aprovado" (approved) deixa de existir e "published" passa a ser
-- apresentado como "Liberado". O valor gravado continua 'published' para não
-- invalidar o histórico nem exigir reescrita de dados antigos.

-- 1) Relatórios que estavam aprovados passam a contar como liberados.
UPDATE public.monthly_reports
SET status = 'published',
    published_at = COALESCE(published_at, now())
WHERE status = 'approved';

-- 2) Restringe os valores aceitos, se houver CHECK anterior.
--    (a tabela foi criada fora do versionamento; o DO abaixo é tolerante a isso)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.monthly_reports'::regclass
      AND conname = 'monthly_reports_status_check'
  ) THEN
    ALTER TABLE public.monthly_reports DROP CONSTRAINT monthly_reports_status_check;
  END IF;

  ALTER TABLE public.monthly_reports
    ADD CONSTRAINT monthly_reports_status_check
    CHECK (status IN ('draft', 'review', 'published'));
END $$;
