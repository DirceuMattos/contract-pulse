

## Correção de Duplicidade na Sync Feedz -- Matching Robusto + Reconciliação

Este é um incremento grande, dividido em 5 fases sequenciais.

---

### Fase 1: Schema -- Novos campos e tabela de pendências

**Migração SQL:**

```sql
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
  match_type text NOT NULL DEFAULT 'pending', -- 'pending', 'conflict', 'resolved', 'ignored', 'created'
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

-- Adicionar coluna records_pending no feedz_sync_runs
ALTER TABLE feedz_sync_runs
  ADD COLUMN IF NOT EXISTS records_pending integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_conflicts integer DEFAULT 0;
```

---

### Fase 2: Edge Function `feedz-sync` -- Nova lógica de matching

Reescrever a lógica de matching no `supabase/functions/feedz-sync/index.ts`:

1. **Função `normalizeName()`**: remove acentos (NFD + replace diacritics), lowercase, remove pontuação, colapsa espaços, normaliza "junior"/"jr"
2. **Pré-carregar** `hr_people` com mapas: `idExternoMap`, `emailMap`, `nomeNormalizadoMap`
3. **Matching em cascata** para cada registro Feedz:
   - **Regra 1 (id_externo)**: match direto → UPDATE
   - **Regra 2 (email)**: match por email case-insensitive → se id_externo vazio no local, preencher e UPDATE; se id_externo diverge → CONFLICT
   - **Regra 3 (nome normalizado + score)**: calcular score (1.0 nome + 0.2 depto + 0.2 cargo + 0.2 admissão); se >= 1.2 → auto-match e UPDATE; se < 1.2 → PENDING_MATCH
   - **Regra 4 (criar novo)**: apenas se nenhum match encontrado e sem pendência
4. **Gravar pendências** em `feedz_pending_matches` com sugestões (top 3 por score)
5. **Atualizar campos**: `source = 'feedz'`, `sync_status = 'synced'`, `last_synced_at = now()`, `nome_normalizado`
6. **Contadores**: adicionar `pending` e `conflicts` ao run final

---

### Fase 3: Página de Reconciliação Feedz

Criar `src/pages/FeedzReconciliationPage.tsx` acessível em `/configuracoes/feedz-reconciliacao` (C-Level only):

**Três abas:**

1. **Pendências de Match** -- Lista de `feedz_pending_matches` com `match_type = 'pending'`
   - Para cada item: dados do Feedz (nome, email, cargo, depto, admissão)
   - Top 3 sugestões de match local com score
   - Ações: "Vincular" (selecionar pessoa local), "Criar Novo", "Ignorar"

2. **Conflitos** -- Lista com `match_type = 'conflict'`
   - Email bate mas id_externo diverge
   - Ação: "Resolver conflito" escolhendo registro correto

3. **Pré-vincular** -- Filtro de `hr_people` sem `id_externo`
   - Sugerir vínculo por email para registros que existem no Feedz
   - Botão "Vincular em lote" para matches 100% por email

**Ações de resolução** chamam diretamente o Supabase client para:
- Atualizar `hr_people.id_externo`, `source`, `sync_status`
- Atualizar `feedz_pending_matches.match_type = 'resolved'`

---

### Fase 4: Atualizar tipos, mappers e UI

- **`src/types/index.ts`**: adicionar campos `source`, `syncStatus`, `lastSyncedAt`, `nomeNormalizado` ao `HRPerson`
- **`src/lib/dbMappers.ts`**: mapear novos campos em `hrPersonFromDb` / `hrPersonToDb`
- **`src/App.tsx`**: adicionar rota `/configuracoes/feedz-reconciliacao`
- **`src/pages/SettingsPage.tsx`**: adicionar link para a página de reconciliação na seção Feedz; exibir contadores de pendentes/conflitos
- **`src/components/layout/Sidebar.tsx`**: (opcional) adicionar link na seção de configurações

---

### Fase 5: Atualizar relatório de sync

Na tabela de `FeedzSyncSection` em `SettingsPage.tsx`:
- Adicionar colunas "Pendentes" e "Conflitos"
- Link "Ver detalhes" que navega para a página de reconciliação filtrada por `sync_run_id`

---

### Resumo de arquivos afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Novos campos + tabela `feedz_pending_matches` |
| `supabase/functions/feedz-sync/index.ts` | Reescrever matching + normalizeName + pendências |
| `src/pages/FeedzReconciliationPage.tsx` | **Novo** -- Tela admin de reconciliação |
| `src/types/index.ts` | Novos campos em `HRPerson` |
| `src/lib/dbMappers.ts` | Mapear novos campos |
| `src/App.tsx` | Nova rota |
| `src/pages/SettingsPage.tsx` | Link + contadores |

