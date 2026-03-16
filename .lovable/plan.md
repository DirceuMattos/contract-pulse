

## Plano: IA-5 — Fontes e Logs: Auditoria, Replay, Pacote de Evidencias, Governanca

### 1. Migracao SQL

Adicionar colunas a `ai_runs`:
- `template_type text` (contrato_govtech, contrato_privado, tr_padrao, etc.)
- `tokens_in int`, `tokens_out int`
- `approved_status text DEFAULT 'pending'` (pending/approved/rejected)
- `approved_by uuid`, `approved_at timestamptz`
- `approved_reason text`
- `replay_of_run_id uuid`

Criar tabela `ai_run_exports`:
- `id uuid PK`, `run_id uuid FK ai_runs.id`, `storage_key text`, `file_type text`, `created_at timestamptz`
- RLS: SELECT/INSERT/DELETE somente c-level

Criar bucket privado `ai-exports`.

Adicionar UPDATE policy em `ai_runs` para c-level (para approved_status).

Atualizar `ai-draft-generate` edge function para preencher `template_type`.

### 2. Edge Function: `ai-export-run`

Nova edge function que:
- Recebe `run_id`
- Busca o ai_run completo (service_role)
- Gera JSON com input, output, evidencias, fontes externas, metadata
- Gera CSV de evidencias internas e fontes externas
- Salva no bucket `ai-exports`
- Retorna signed URL para download
- Registra em `ai_run_exports`

### 3. AILogsPage.tsx — Reescrita completa

**Filtros adicionais:**
- Aprovacao (pending/approved/rejected)
- Fontes externas (sim/nao)
- Usuario (admin only, select de profiles)

**Tabela de runs** (substituir cards colapsaveis por tabela):
- Colunas: Data, Tipo, Usuario, Status, Aprovado, Docs internos, Fontes externas, Acoes
- Acoes: Ver detalhes, Exportar, Replay, Aprovar/Rejeitar

**Detalhe do run** (dialog/sheet lateral):
- Secoes: Resumo, Input, Evidencias internas (tabela), Fontes externas, Output (texto + JSON colapsavel)
- Botoes: Copiar input, Copiar output, Exportar pacote, Replay, Aprovar/Rejeitar

**Replay:**
- Chama `ai-draft-generate` com input_json do run original
- Cria novo ai_run com `replay_of_run_id` preenchido
- Exibe vinculo na UI

**Aprovacao:**
- Botoes Aprovar/Rejeitar no detalhe
- Rejeitar pede justificativa (input simples)
- UPDATE via supabase client no `ai_runs`

### 4. Ajuste em `ai-draft-generate`

- Preencher `template_type` com base em type+variant
- Aceitar `replay_of_run_id` no body e salvar no ai_run

### 5. Registrar nova function em config.toml

```toml
[functions.ai-export-run]
verify_jwt = false
```

### 6. Arquivos

**Novos:**
- `supabase/functions/ai-export-run/index.ts`
- SQL migration (colunas + tabela + bucket + RLS)

**Editados:**
- `src/pages/AILogsPage.tsx` — reescrita completa com tabela, detalhe, replay, aprovacao, export
- `supabase/functions/ai-draft-generate/index.ts` — template_type + replay_of_run_id
- `supabase/config.toml` — nova function

