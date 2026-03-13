

## Plano: Reconstrução do Feedz Sync — 3 Fluxos + Inconsistências + Rollback por Registro

### Resumo

Reconstruir o processo de sincronização mantendo matrícula como chave única. Três tabelas novas substituem as atuais (`feedz_sync_items`, `feedz_pending_matches`, `feedz_sync_events`). A edge function é reescrita com 4 cenários estritos (CREATE/UPDATE/TERMINATE/INCONSISTENCY). UI atualizada com 4 abas.

---

### 1. Migração de Banco

**Criar tabela `feedz_sync_change`** (substitui `feedz_sync_items`):

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| run_id | uuid FK → feedz_sync_runs |
| matricula | text |
| hr_people_id | uuid nullable |
| action | text (created/updated/terminated/inconsistency) |
| synced_at | timestamptz |
| changed_fields | jsonb (array de {field, before, after}) |
| before_snapshot | jsonb nullable |
| after_snapshot | jsonb nullable |
| payload_hash | text nullable |
| reverted_at | timestamptz nullable |
| reverted_by | uuid nullable |
| created_at | timestamptz default now() |

RLS: c-level insert/update/delete, all select.

**Criar tabela `feedz_sync_inconsistency`** (substitui `feedz_pending_matches`):

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| run_id | uuid FK → feedz_sync_runs |
| matricula | text nullable |
| reason_code | text |
| reason_detail | text |
| feedz_payload | jsonb |
| created_at | timestamptz default now() |

Reason codes: `MISSING_MATRICULA`, `DUPLICATE_MATRICULA_FEEDZ`, `TERMINATION_DATE_WITH_ACTIVE_STATUS`, `NO_TERMINATION_DATE_WITH_INACTIVE_STATUS`, `INVALID_STATUS_COMBINATION`, `MULTIPLE_MATCHES_IN_SYSTEM`, `PARSE_ERROR`

RLS: c-level insert/delete, all select.

**Alterar `feedz_sync_runs`**:
- Adicionar `inconsistency_count` integer default 0 (já existe `records_pending` e `records_conflicts` que serão reutilizados, mas um campo explícito é mais claro)

**Garantir constraint**: `ALTER TABLE hr_people ADD CONSTRAINT hr_people_matricula_unique UNIQUE (matricula)` com filtro `WHERE matricula IS NOT NULL` (validar se já existe).

Tabelas antigas (`feedz_sync_items`, `feedz_pending_matches`, `feedz_sync_events`) permanecem para dados históricos mas não serão mais escritas.

---

### 2. Edge Function `feedz-sync` — Reescrita

Manter: fetch da API Feedz, auth, CORS, detecção de duplicatas intra-Feedz.

**Novo fluxo de classificação por registro Feedz:**

```text
Para cada registro:
  1. matricula vazia? → INCONSISTENCY (MISSING_MATRICULA)
  2. matrícula duplicada no Feedz? → INCONSISTENCY (DUPLICATE_MATRICULA_FEEDZ)
  3. Normalizar status → ativo / inativo|desligado
  4. Buscar hr_people por matricula
  
  Se NÃO encontrado:
    - status=ativo E sem termination_date → CREATE
    - Qualquer outro → INCONSISTENCY
  
  Se encontrado (1 match):
    - status=ativo E sem termination_date → UPDATE (com idempotência por hash)
    - status=inativo|desligado E COM termination_date → TERMINATE
    - status=ativo COM termination_date → INCONSISTENCY (TERMINATION_DATE_WITH_ACTIVE_STATUS)
    - status=inativo SEM termination_date → INCONSISTENCY (NO_TERMINATION_DATE_WITH_INACTIVE_STATUS)
  
  Se encontrado (>1 match) → INCONSISTENCY (MULTIPLE_MATCHES_IN_SYSTEM)
```

**CREATE**: inserir em hr_people, gravar `feedz_sync_change` com action=created e after_snapshot. Timeline "Admissão (Feedz)".

**UPDATE**: comparar campos, se hash igual → skip. Se diferente → atualizar hr_people, gravar before_snapshot + after_snapshot + changed_fields. Timeline para cargo/remuneração/vínculo.

**TERMINATE**: atualizar hr_people com situacao=inativo, data_desligamento=feedz.termination_date, tipo_desligamento/motivo. Gravar before/after snapshot. Timeline "Desligamento (Feedz)".

**INCONSISTENCY**: NÃO tocar hr_people. Gravar em `feedz_sync_inconsistency` + `feedz_sync_change` (action=inconsistency).

Todos os `hr_timeline` inserts incluem `source='feedz'` e `sync_run_id`.

---

### 3. Edge Function `feedz-rollback` — Adaptação

Adaptar para usar `feedz_sync_change` em vez de `feedz_sync_items`:

- **Per-item** (`{ itemId }`):
  - `created` → inativar (ou deletar se sem dependências)
  - `updated` → restaurar before_snapshot
  - `terminated` → restaurar before_snapshot (reativar)
  - Remover timeline events com `source='feedz'` + `sync_run_id`
  - Marcar `reverted_at`/`reverted_by`

- **Per-run** (`{ runId }`): iterar todos os changes não-revertidos do run

---

### 4. Frontend: `FeedzReconciliationPage.tsx` — Reescrita

**Abas**: Criados | Alterados | Desligados | Inconsistências (4 abas)

- Cada aba filtra `feedz_sync_change` por action
- Linha: synced_at, matrícula, nome, campos alterados, botão Reverter (created/updated/terminated), badge "Revertido"
- Aba Inconsistências: busca de `feedz_sync_inconsistency`, exibe reason_code, detail, payload
- Botão "Exportar CSV" na aba Inconsistências

**Rollback dialog**: mantém estrutura atual (checkbox confirmação + botão destrutivo), adaptado para terminated.

---

### 5. `SettingsPage.tsx` — Ajuste mínimo

- Botão "Abrir" por run já existe, adaptar para nova estrutura de dados
- Manter export XLSX existente

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar `feedz_sync_change`, `feedz_sync_inconsistency`, alterar `feedz_sync_runs`, constraint matricula |
| `supabase/functions/feedz-sync/index.ts` | Reescrita completa do fluxo de classificação |
| `supabase/functions/feedz-rollback/index.ts` | Adaptar para `feedz_sync_change` + suporte a terminated |
| `src/pages/FeedzReconciliationPage.tsx` | 4 abas + inconsistências + export CSV |
| `src/pages/SettingsPage.tsx` | Ajustes menores para nova estrutura |

### Ordem de Implementação

1. Migração de banco
2. Edge function `feedz-sync` reescrita
3. Edge function `feedz-rollback` adaptação
4. Frontend: Conciliação com 4 abas + CSV
5. SettingsPage ajustes

