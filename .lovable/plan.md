

## Plano: Módulo Recebíveis + Integração Superlógica

Este é um módulo grande. Proponho dividir em **2 etapas** conforme descrito na especificação.

---

### ETAPA 1 — UI com dados mock (sem backend)

#### 1. Registrar módulo no sistema de acesso

**`src/types/moduleAccess.ts`**
- Adicionar `'RECEIVABLES'` ao array `MODULE_KEYS`
- Adicionar entrada no `MODULE_CATALOG` com rotas `/receivables`, `/receivables/reconcile`
- Adicionar ao `ROLE_DEFAULT_MODULES` para roles relevantes (intermediario, c-level)
- Atualizar `getModuleKeyForRoute` para `/receivables`

#### 2. Estender tipo Contract

**`src/types/index.ts`** — adicionar campos ao interface `Contract`:
```typescript
superlogicaCustomerCnpj?: string;
superlogicaCustomerName?: string;
superlogicaSubscriptionId?: string;
superlogicaSubscriptionLabel?: string;
superlogicaMatchHint?: string;
// Campos cache (populados na etapa 2)
receivablesStatus?: 'em_dia' | 'atrasado' | 'sem_vinculo';
receivablesOverdueAmount?: number;
receivablesOpenAmount?: number;
receivablesLastPaymentDate?: string;
```

#### 3. Criar tipos de Recebíveis

**`src/types/receivables.ts`** (novo) — interfaces para Invoice, SubscriptionCandidate, SyncRun, filtros do dashboard.

#### 4. Criar dados mock

**`src/data/mockReceivables.ts`** (novo) — gerar ~15 invoices mock vinculadas a contratos existentes, 3-4 contratos inadimplentes, 5+ contratos sem vínculo.

#### 5. Criar página Dashboard Recebíveis

**`src/pages/ReceivablesDashboardPage.tsx`** (novo)
- Cards topo: Total previsto, Recebido, Em aberto, Em atraso, % inadimplência
- Filtros: período, cliente, contrato, status
- Tabela principal com colunas especificadas
- Seção "Inadimplentes" (top 10)
- Banner "X contratos sem vínculo" com CTA

#### 6. Criar página Conciliação

**`src/pages/ReceivablesReconcilePage.tsx`** (novo)
- Lista de contratos sem `superlogicaSubscriptionId`
- Botão "Buscar assinaturas" → modal com lista mock de candidatas por CNPJ
- Seleção de assinatura e salvamento do vínculo (mock local)

#### 7. Card Recebíveis no detalhe do contrato

**`src/pages/ContractDetailPage.tsx`** — adicionar card "Recebíveis" com status, valor em aberto, em atraso, último pagamento, CTA vincular se sem vínculo.

#### 8. Sidebar + Rotas

**`src/components/layout/Sidebar.tsx`** — adicionar item "Recebíveis" (ícone `Receipt` ou `Banknote`)
**`src/App.tsx`** — adicionar rotas `/receivables` e `/receivables/reconcile`

#### 9. Mapper DB (preparação)

**`src/lib/dbMappers.ts`** — adicionar mapeamento dos novos campos snake_case ↔ camelCase do contrato.

---

### ETAPA 2 — Backend (Supabase) + Integração Superlógica

#### 10. Migração DB — Novos campos no contrato

```sql
ALTER TABLE contracts ADD COLUMN superlogica_customer_cnpj text;
ALTER TABLE contracts ADD COLUMN superlogica_customer_name text;
ALTER TABLE contracts ADD COLUMN superlogica_subscription_id text;
ALTER TABLE contracts ADD COLUMN superlogica_subscription_label text;
ALTER TABLE contracts ADD COLUMN superlogica_match_hint text;
ALTER TABLE contracts ADD COLUMN receivables_status text DEFAULT 'sem_vinculo';
ALTER TABLE contracts ADD COLUMN receivables_overdue_amount numeric DEFAULT 0;
ALTER TABLE contracts ADD COLUMN receivables_open_amount numeric DEFAULT 0;
ALTER TABLE contracts ADD COLUMN receivables_last_payment_date date;
```

#### 11. Migração DB — Tabela `receivables_invoices`

```sql
CREATE TABLE receivables_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  subscription_id text NOT NULL,
  competence text NOT NULL,       -- YYYY-MM
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_at timestamptz,
  days_overdue integer NOT NULL DEFAULT 0,
  external_invoice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subscription_id, competence, due_date)
);
-- RLS + trigger updated_at
```

#### 12. Migração DB — Tabela `superlogica_sync_runs`

```sql
CREATE TABLE superlogica_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  fetched_subscriptions integer DEFAULT 0,
  updated_contracts integer DEFAULT 0,
  invoices_upserted integer DEFAULT 0,
  error_summary text,
  initiated_by uuid,
  created_at timestamptz DEFAULT now()
);
-- RLS policies
```

#### 13. Secret — Token Superlógica

Solicitar ao usuário o token da API Superlógica via `add_secret` (`SUPERLOGICA_API_TOKEN` e `SUPERLOGICA_APP_TOKEN`).

#### 14. Edge Function `superlogica-sync`

**`supabase/functions/superlogica-sync/index.ts`** (novo)
- Busca contratos com `superlogica_subscription_id` preenchido
- Chama API Superlógica para obter cobranças de cada assinatura
- Upsert em `receivables_invoices`
- Atualiza campos cache no contrato
- Registra `superlogica_sync_runs`

#### 15. Edge Function `superlogica-search-subscriptions`

**`supabase/functions/superlogica-search-subscriptions/index.ts`** (novo)
- Recebe CNPJ como input
- Busca assinaturas candidatas na API Superlógica
- Retorna lista para o frontend (tela de conciliação)

#### 16. Substituir mock por dados reais

- Dashboard e card do contrato passam a ler de `receivables_invoices`
- Conciliação chama edge function em vez de retornar mock
- Botão "Sincronizar agora" chama `superlogica-sync`

---

### Resumo de arquivos

| Ação | Arquivo |
|------|---------|
| Novo | `src/types/receivables.ts` |
| Novo | `src/data/mockReceivables.ts` |
| Novo | `src/pages/ReceivablesDashboardPage.tsx` |
| Novo | `src/pages/ReceivablesReconcilePage.tsx` |
| Novo | `supabase/functions/superlogica-sync/index.ts` |
| Novo | `supabase/functions/superlogica-search-subscriptions/index.ts` |
| Editar | `src/types/index.ts` (Contract interface) |
| Editar | `src/types/moduleAccess.ts` (RECEIVABLES module) |
| Editar | `src/App.tsx` (rotas) |
| Editar | `src/components/layout/Sidebar.tsx` (menu) |
| Editar | `src/pages/ContractDetailPage.tsx` (card recebíveis) |
| Editar | `src/lib/dbMappers.ts` (novos campos) |
| DB Migration | Campos no `contracts` + tabelas `receivables_invoices`, `superlogica_sync_runs` |

Sugiro implementar a **Etapa 1 completa** primeiro (UI + mock), validar com você, e depois avançar para a Etapa 2 (backend + API).

