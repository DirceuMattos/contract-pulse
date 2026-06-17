## Alterações

### 1. `supabase/functions/report-sync-devid/index.ts`
Substituir o conteúdo completo pelo novo código fornecido, que:
- Adiciona função genérica `callMcp(url, token, tool, params)` para chamadas MCP (reutilizada por DEVID e Fireflies).
- Mantém `callDevid` como alias para compatibilidade.
- Adiciona bloco **4. Reuniões do Fireflies via MCP**:
  - Busca transcripts via `fireflies_get_transcripts` no endpoint MCP `https://api.fireflies.ai/mcp`.
  - Filtra por `clientEmailDomain` (domínio dos participantes) OU `firefliesKeywords` no título.
  - Faz upsert em `report_sections` com `section_key = "treinamentos_reunioes"` e `source = "fireflies"`.
  - Insere log em `report_sync_logs`.
- Usa secret `FIREFLIES_TOKEN` do vault.

### 2. `src/pages/ReportEditPage.tsx`
Corrigir duas chamadas à edge function `report-sync-fireflies`:

**Em `handleSyncAll` (linhas 139-147):**
- `clientEmailDomain: report.clientEmailDomain` → `clientEmailDomain: templateConfig?.clientEmailDomain`
- `firefliesKeywords: []` → `firefliesKeywords: templateConfig?.firefliesKeywords ?? []`

**Em `handleResyncSection` (linhas 169-171):**
- Mesmas duas substituições.

### Deploy
Após as edições, faço o deploy da edge function `report-sync-devid`.

### Observação
A função usa o secret `FIREFLIES_TOKEN` do vault. Se ainda não existir no vault, será necessário adicioná-lo para o bloco Fireflies funcionar (o restante do sync continua funcionando normalmente, apenas o bloco Fireflies registrará erro no `results.fireflies_error`).
