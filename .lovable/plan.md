

## Reestruturar colunas da tabela de Recebíveis

### O que muda

A tabela principal do dashboard de Recebíveis terá as colunas reorganizadas para mostrar informações mais relevantes:

**Colunas atuais**: Cliente/Contrato | Assinatura | Status | Valor do Mês | Em Atraso | Último Pagamento | Ação

**Novas colunas**: Cliente/Contrato | Status | Último Pgto (valor) | Data Último Pgto | Valor Mês Atual | Vencimento | Em Atraso | Ação

- Remover coluna "Assinatura"
- Adicionar o código do contrato (`c.codigo`) abaixo do nome do cliente
- Mostrar valor do último pagamento (`ultimoPagamentoValor`) e data separados
- Manter valor do mês atual (`valorMes`)
- Adicionar data prevista de pagamento (estimada a partir do dia de vencimento da última fatura ou `data_base_reajuste`)
- Status com `whitespace-nowrap` para não quebrar linha
- Em Atraso: soma total dos valores em atraso

### Detalhes técnicos

**Arquivo**: `src/pages/ReceivablesDashboardPage.tsx`

1. Na construção de `rows`, adicionar `contractCode: c.codigo` ao mapeamento
2. Buscar dados de `receivables_invoices` via Supabase para obter o último pagamento (valor pago) e a próxima fatura em aberto (data de vencimento do mês atual)
3. Usar `useEffect` com query ao `receivables_invoices` agrupando por `contract_id` para:
   - Último pagamento: fatura com `status = 'paid'` mais recente → `paid_amount` e `paid_at`
   - Vencimento atual: fatura com `status = 'open'` mais próxima → `due_date`
4. Remover coluna "Assinatura" da tabela
5. Adicionar `whitespace-nowrap` no `TableCell` do status
6. Atualizar `colSpan` do empty state de 7 para 8

**Arquivo**: `src/types/receivables.ts`

- Adicionar campos ao `ContractReceivableRow`: `contractCode`, `valorUltimoPagamento`, `vencimentoAtual`

