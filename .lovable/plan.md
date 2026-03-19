

## Problema identificado

Dois problemas distintos:

### 1. Dados corrompidos no cache dos contratos
A sincronização anterior gravou os **mesmos valores** (`receivables_overdue_amount = 259.672,94` e `receivables_open_amount = 195.645,41`) em **todos** os 33 contratos vinculados. Na realidade, apenas 1 contrato (7ff0f9f4) possui faturas no banco (46 registros). Os outros contratos deveriam ter `overdue = 0`.

**Causa provável**: uma versão anterior do sync distribuiu os totais globais para todos os contratos. A versão atual do sync já computa por contrato, mas os valores ruins ficaram gravados.

**Fix**: Executar um UPDATE para zerar os caches dos contratos que não têm faturas reais, e em seguida rodar o sync novamente para recalcular corretamente.

### 2. Colunas da tabela estão erradas

**Colunas solicitadas**:
| Cliente / Contrato | Status | Data Pgto Mês Anterior | Valor Pago (mês anterior) | Data Pgto Mês Atual | Valor Pago/à Pagar | Valores em Atraso | Ação |

## Plano

### Etapa 1 — Corrigir dados corrompidos
- UPDATE via migration: zerar `receivables_overdue_amount`, `receivables_open_amount`, `receivables_status` e `receivables_last_payment_at` em todos os contratos que **não** possuem faturas em `receivables_invoices`
- Para os que possuem faturas, recalcular os valores corretos

### Etapa 2 — Reestruturar query de invoices no dashboard
No `useEffect` que busca `receivables_invoices`, separar por mês:
- **Mês anterior**: fatura com `status = 'paid'` e `competence` ou `due_date` no mês anterior → `paid_amount` e `paid_at`
- **Mês atual**: fatura com `due_date` no mês corrente → se paga, mostrar `paid_amount` e `paid_at`; se aberta, mostrar `amount` como "à Pagar"
- **Em atraso**: somar `amount - paid_amount` de todas as faturas com `status = 'overdue'` por contrato

### Etapa 3 — Atualizar colunas da tabela
**Arquivo**: `src/pages/ReceivablesDashboardPage.tsx`

Novas colunas no `TableHeader`:
1. Cliente / Contrato (com código)
2. Status (badge, `whitespace-nowrap`)
3. Data Pgto Mês Anterior
4. Valor Pago (mês anterior)
5. Data Pgto Mês Atual
6. Valor Pago / à Pagar
7. Valores em Atraso
8. Ação (botão)

Atualizar `ContractReceivableRow` em `src/types/receivables.ts` com os novos campos:
- `prevMonthPaidAt`, `prevMonthPaidAmount`
- `currMonthPaidAt`, `currMonthAmount`, `currMonthPaid` (boolean)
- `totalOverdue` (soma real das faturas overdue, não do cache corrompido)

### Etapa 4 — Recalcular KPIs
Usar os dados das faturas reais para os KPIs em vez dos campos de cache do contrato, evitando repetir o problema de dados corrompidos.

