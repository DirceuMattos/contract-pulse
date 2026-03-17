

## Plano: Etapa 2 — Backend Recebíveis + Edge Functions Superlógica

### Diagnóstico do SQL fornecido vs. schema real

O SQL do bloco técnico precisa de adaptações para funcionar com o schema existente:

1. **View `v_receivables_contract_summary`** referencia `client_name` e `contract_code` — no schema real são `nome` e `codigo`. View será removida (o front já faz join via DataContext).
2. **Função `is_admin()`** referencia `profiles.role` e `profiles.user_id` — não existem. O projeto usa `has_role()` / `is_clevel()`. As RLS policies usarão o padrão existente.
3. **Duas UNIQUE constraints** em `receivables_invoices` com colunas nullable — PostgreSQL permite múltiplos NULLs em unique. Manterei apenas `UNIQUE(superlogica_subscription_id, external_invoice_id)` como principal e um índice parcial para o fallback.
4. **Campo `receivables_last_payment_date`** no Contract type é `string` (date), mas o SQL usa `timestamptz`. Ajustarei o mapper para `receivables_last_payment_at` (timestamptz) alinhando com o SQL.

---

### 1. Migração DB

Uma única