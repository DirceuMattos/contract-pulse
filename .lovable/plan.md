

## Plano: FEEDZ SYNC V6 — Anti-Duplicidade, Conciliação Criados/Alterados, Rollback por Registro

### Análise do Estado Atual

A edge function `feedz-sync` **já usa matrícula como estratégia única**. Detecção de duplicatas Feedz, `feedz_sync_items` com snapshots, e rollback por run já existem. O que falta:

1. **Idempotência por payload_hash** (evitar "alterados" falsos)
2. **UI de Conciliação por run** com abas Criados/Alterados e rollback por registro
3. **Rollback por registro** (hoje só por run inteiro)
4. **Inativação lógica** em vez de exclusão física para registros criados
5. **Rastreabilidade de timeline** (source + run_id nos eventos para rollback preciso)

---

### 1. Migração de Banco

- Adicionar coluna `payload_hash` (text, nullable) em `feedz_sync_items`
- Adicionar coluna `reverted_at` (timestamptz, nullable) em `feedz_sync_items` — marca registros revertidos individualmente
- Adicionar coluna `reverted_by` (uuid, nullable) em `feedz_sync_items`
- Adicionar colunas `source` (text, default null) e `sync_run_id` (uuid, nullable) em `hr_timeline` — para rastrear eventos criados pelo Feedz e poder revertê-los
- Garantir unique constraint estrito em `hr_people.matricula` (WHERE matricula IS NOT NULL) — já existe parcialmente, validar

---

### 2. Edge Function `feedz-sync` — Idempotência

- Calcular hash simples (JSON.stringify dos campos relevantes ordenados) por matrícula
- Antes de marcar como UPDATE: buscar último `feedz_sync_items` para aquela matrícula e comparar hash
- Se hash igual → SKIP (não gerar "alterado" fantasma)
- Armazenar `payload_hash` no `feedz_sync_items`
- Em cada `hr_timeline.insert` gerado pelo sync, incluir `source: 'feedz'` e `sync_run_id: runId`
- Usar set em memória `processedMatriculas` para ignorar duplicatas intra-run

---

### 3. Edge Function `feedz-rollback` — Rollback por Registro

Criar novo endpoint ou adaptar o existente para aceitar:
- `{ runId }` → rollback do run inteiro (comportamento atual)
- `{ itemId }` → rollback de um único `feedz_sync_item`

Para rollback de um item:
- **INSERT**: inativar (`situacao='inativo'`, nota "Revertido do sync run X") em vez de deletar fisicamente. Apenas deletar se não houver alocações em `subproject_allocations` ou `resources`.
- **UPDATE**: restaurar `snapshot_before` (campos alterados)
- **Timeline**: remover/marcar como revertidos os eventos `hr_timeline` com `source='feedz'` e `sync_run_id` correspondente
- Marcar `feedz_sync_items.reverted_at` e `reverted_by`

---

### 4. Frontend: Nova Tela de Conciliação por Run

Refatorar `FeedzReconciliationPage.tsx` para incluir **duas visões**:

**Vista 1 — Lista de Runs** (tabela igual à de Settings, mas com botão "Abrir")

**Vista 2 — Detalhe do Run** (ao clicar "Abrir"):
- Abas: **Criados** | **Alterados** | **Bloqueados**
- Cada aba mostra tabela com:
  - `synced_at` (data/hora)
  - Matrícula
  - Nome
  - Resumo de campos (chips/badges)
  - Botão "Ver detalhes" (expande before/after)
  - Botão "Reverter" (com modal de confirmação)
  - Badge "Revertido" se já revertido
- Busca por nome/matrícula
- Filtro por campo alterado

**Modal de rollback individual**:
- Resumo do que será revertido
- Checkbox de confirmação
- Botão destrutivo "Reverter"
- Toast de sucesso + badge "Revertido" na linha

---

### 5. Atualizar SettingsPage

- Na tabela de runs, adicionar botão "Abrir" que navega para `/configuracoes/feedz-reconciliacao?runId=X`
- Manter botões existentes (export XLSX, rollback do run inteiro)

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | `payload_hash`, `reverted_at`, `reverted_by` em `feedz_sync_items`; `source`, `sync_run_id` em `hr_timeline` |
| `supabase/functions/feedz-sync/index.ts` | Payload hash, idempotência intra-run, `source`/`sync_run_id` em timeline |
| `supabase/functions/feedz-rollback/index.ts` | Suporte a rollback por `itemId`, inativação lógica, rollback de timeline |
| `src/pages/FeedzReconciliationPage.tsx` | Reescrita: lista de runs + detalhe com abas Criados/Alterados/Bloqueados + rollback por registro |
| `src/pages/SettingsPage.tsx` | Botão "Abrir" por run |

### Ordem de Implementação

1. Migração de banco
2. Edge function `feedz-sync` (hash + timeline source)
3. Edge function `feedz-rollback` (per-item + inativação lógica)
4. Frontend: Conciliação por run com rollback individual
5. SettingsPage: botão "Abrir"

