
-- Novos campos em hr_people
ALTER TABLE hr_people
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_normalizado text DEFAULT NULL;

-- Unique constraint em id_externo (parcial, ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_people_id_externo_unique
  ON hr_people (id_externo) WHERE id_externo IS NOT NULL;

-- Unique constraint em email (parcial, ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_people_email_unique
  ON hr_people (email) WHERE email IS NOT NULL;

-- Tabela de pendências de matching
CREATE TABLE IF NOT EXISTS feedz_pending_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL,
  external_id text NOT NULL,
  feedz_name text NOT NULL,
  feedz_email text,
  feedz_department text,
  feedz_job_title text,
  feedz_admission_date text,
  feedz_status text,
  feedz_remuneration numeric DEFAULT 0,
  match_type text NOT NULL DEFAULT 'pending',
  suggested_person_ids uuid[] DEFAULT '{}',
  suggested_scores numeric[] DEFAULT '{}',
  resolved_person_id uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedz_pending_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpm_select" ON feedz_pending_matches FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "fpm_insert" ON feedz_pending_matches FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'c-level'));
CREATE POLICY "fpm_update" ON feedz_pending_matches FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'c-level'));
CREATE POLICY "fpm_delete" ON feedz_pending_matches FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'c-level'));

-- Adicionar colunas records_pending e records_conflicts no feedz_sync_runs
ALTER TABLE feedz_sync_runs
  ADD COLUMN IF NOT EXISTS records_pending integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_conflicts integer DEFAULT 0;
