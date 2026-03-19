

## Problemas Identificados

### 1. Erro "contrato não encontrado" ao vincular
O mapper `contractToDb` envia o campo `superlogica_customer_name` para o banco, mas essa coluna **não existe** na tabela `contracts`. Isso faz o UPDATE falhar silenciosamente com erro do Postgres.

### 2. 47 assinaturas retornadas (muitas com R$0)
A API `/v2/financeiro/assinaturas?idSacado={id}` retorna todos os planos/serviços do cliente. Muitos são itens individuais dentro de assinaturas ou planos inativos/zerados. Precisamos filtrar e agrupar de forma inteligente.

### 3. Vincular manualmente uma a uma é improdutivo
O usuário quer vincular automaticamente quando há match claro entre contrato e assinatura.

---

## Plano de Correção

### Etapa 1 — Corrigir o erro de update (coluna inexistente)

**Arquivo**: `src/lib/dbMappers.ts`

- Remover `superlogica_customer_name` do `contractToDb` (a coluna não existe no schema)
- Remover `superlogicaCustomerName` do `contractFromDb` (para consistência)

### Etapa 2 — Filtrar assinaturas no backend

**Arquivo**: `supabase/functions/superlogica-search-subscriptions/index.ts`

- Filtrar assinaturas com `amount > 0` e status `ativa` (excluir canceladas/zeradas)
- Ordenar por valor decrescente para facilitar a identificação
- Adicionar campo `cnpj` do cliente na resposta para facilitar matching

### Etapa 3 — Auto-vinculação em massa

**Arquivo**: `src/pages/ReceivablesReconcilePage.tsx`

- Adicionar botão "Auto-vincular todos" que:
  1. Para cada contrato sem vínculo, busca assinaturas pelo CNPJ do cliente
  2. Se houver exatamente 1 assinatura ativa com valor > 0, vincula automaticamente
  3. Se houver múltiplas, marca como "revisão manual necessária"
  4. Exibe resumo final (X vinculados, Y pendentes de revisão)

- No dialog de busca, filtrar as assinaturas com valor zerado para exibição mais limpa

### Etapa 4 — Migração DB (opcional, se necessário)

Se desejarmos manter o campo `superlogica_customer_name`, criar a coluna na tabela `contracts`. Mas como o mapper já tenta enviar e falha, a solução mais simples é remover do mapper.

---

## Resumo Técnico

| Item | Arquivo | Mudança |
|------|---------|---------|
| Bug do update | `dbMappers.ts` | Remover campo inexistente `superlogica_customer_name` |
| Filtro de assinaturas | Edge function | Filtrar `amount > 0` e status ativa |
| Auto-vinculação | `ReceivablesReconcilePage.tsx` | Botão bulk + lógica de match automático |

