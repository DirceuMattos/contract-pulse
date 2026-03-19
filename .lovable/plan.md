

## Problema

O dashboard de Recebíveis (`ReceivablesDashboardPage.tsx`) usa dados mock hardcoded (`mockInvoices`, `mockSubscriptionLinks`) com IDs fictícios como `ctr-001`. Os contratos reais têm UUIDs, então o filtro `mockSubscriptionLinks[c.id]` nunca encontra nenhum contrato real — resultado: tudo zerado.

Os contratos reais já têm os campos necessários preenchidos no banco:
- `superlogica_subscription_id` (33 contratos vinculados)
- `superlogica_subscription_label`
- `valor_mensal_referencia` (valor previsto mensal)
- `receivables_status`, `receivables_overdue_amount`, `receivables_open_amount`, `receivables_last_payment_at`

Porém a tabela `receivables_invoices` está vazia (0 registros) — o sync ainda não rodou com sucesso. Mesmo assim, o dashboard pode funcionar usando os campos de cache do contrato + `valor_mensal_referencia`.

## Plano

### Etapa 1 — Reescrever o dashboard para usar dados reais

**Arquivo**: `src/pages/ReceivablesDashboardPage.tsx`

- Remover imports de `mockInvoices` e `mockSubscriptionLinks`
- Construir `rows` a partir de `contracts` filtrados por `superlogicaSubscriptionId` (não nulo)
- Mapear campos reais do contrato:
  - `valorMes` → `c.valorMensalReferencia ?? 0`
  - `subscriptionLabel` → `c.superlogicaSubscriptionLabel ?? ''`
  - `status` → baseado em `c.receivablesStatus` ou `c.receivablesOverdueAmount > 0`
  - `valorEmAtraso` → `c.receivablesOverdueAmount ?? 0`
  - `ultimoPagamentoData` → `c.receivablesLastPaymentAt`
- Para `diasEmAtraso`, calcular a partir dos dados disponíveis ou exibir "—" quando não houver dado de invoice
- Contar `unlinkedCount` usando `!c.superlogicaSubscriptionId` (já está correto)

### Etapa 2 — Após sincronização, recarregar contratos

- Após `handleSync` com sucesso, disparar reload dos dados do DataContext para refletir os campos de cache atualizados pelo `superlogica-sync`

### Resultado esperado

O dashboard mostrará imediatamente os 33 contratos vinculados com seus valores mensais de referência, status, e labels de assinatura. Após rodar "Sincronizar agora", os campos de inadimplência e último pagamento serão populados pela edge function `superlogica-sync`.

