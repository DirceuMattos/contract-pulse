

## Problema

A função `superlogica-sync` não consegue buscar faturas porque usa o parâmetro errado na API. O campo `idSacado` da API Superlógica espera o **ID do cliente** (`id_sacado_sac`), mas o código passa o `superlogica_subscription_id` (que é o `id_planocliente_plc` — ID da assinatura). Resultado: a API não retorna faturas, a tabela `receivables_invoices` fica vazia, e o dashboard não tem dados de pagamento.

## Plano

### Etapa 1 — Corrigir `superlogica-sync` para buscar o customer ID pelo CNPJ

A função já tem acesso ao `superlogica_customer_cnpj` de cada contrato. O fix:

1. Reutilizar a lógica de `findClientByCnpj` (já existente em `superlogica-search-subscriptions`) dentro de `superlogica-sync`
2. Para cada CNPJ único entre os contratos vinculados, buscar o `id_sacado_sac` (customer ID) uma vez
3. Usar esse customer ID correto no endpoint: `/v2/financeiro/cobrancas?idSacado=${customerIdCorreto}`
4. Filtrar as faturas retornadas pelo `superlogica_subscription_id` de cada contrato, para associar corretamente

**Arquivo**: `supabase/functions/superlogica-sync/index.ts`

Mudanças:
- Adicionar função `findClientByCnpj` (copiar de `superlogica-search-subscriptions`)
- Agrupar contratos por CNPJ para minimizar chamadas à API
- Para cada grupo de CNPJ: buscar `id_sacado_sac`, depois buscar cobranças com `idSacado=${id_sacado_sac}`
- Distribuir as faturas para os contratos corretos baseado no `superlogica_subscription_id`

### Etapa 2 — Deploy e teste

- Deploy da edge function atualizada
- Testar invocando `superlogica-sync` e verificar logs para confirmar que faturas são retornadas e gravadas em `receivables_invoices`

### Resultado esperado

Após clicar "Sincronizar agora", as faturas serão buscadas corretamente da Superlógica, gravadas em `receivables_invoices`, e os campos de cache do contrato (`receivables_overdue_amount`, `receivables_last_payment_at`, etc.) serão atualizados — populando o dashboard com dados reais de histórico de pagamento.

