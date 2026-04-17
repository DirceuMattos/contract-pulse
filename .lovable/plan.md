

## Diagnóstico

A pista do usuário ("esses contratos pertencem a outra assinatura vinculada a outra API") + os logs ("125 clientes em 3 páginas") confirmam que a Superlógica está configurada como **multi-instância**: o grupo tem **mais de uma conta Superlógica** (outra "franquia"/empresa), cada uma com seu próprio par `APP_TOKEN`+`ACCESS_TOKEN` (e possivelmente outro `API_BASE`/subdomínio). Hoje temos credenciais de apenas uma instância configuradas, então qualquer CNPJ que esteja cadastrado na outra conta retorna "não encontrado", independentemente do quanto melhoremos a busca local.

A correção estrutural é tornar a integração **multi-conta**: cadastrar N pares de credenciais e, na busca/sync, varrer todas as contas até localizar o cliente. Quando achar, persistir em qual conta esse contrato vive (`superlogica_account`), para que o sync futuro vá direto à conta certa.

## Plano

### 1. Suporte a múltiplas contas Superlógica (secrets)
Introduzir um conjunto de secrets numerado (mantendo retrocompatibilidade):
- Conta principal: `SUPERLOGICA_API_BASE`, `SUPERLOGICA_APP_TOKEN`, `SUPERLOGICA_ACCESS_TOKEN` (já existentes — vira "conta default").
- Conta secundária: `SUPERLOGICA_API_BASE_2`, `SUPERLOGICA_APP_TOKEN_2`, `SUPERLOGICA_ACCESS_TOKEN_2` (a serem solicitados via `add_secret` ao usuário).
- Estrutura preparada para adicionar uma 3ª no futuro só configurando os secrets `_3`.

Vou pedir os secrets da segunda conta antes de qualquer edição de código.

### 2. Banco — registrar a conta de origem por contrato
Migração para adicionar:
- `contracts.superlogica_account` (text, null) — slug curto da conta usada para esse contrato (ex.: `default`, `account2`).

Sem alterar nenhuma outra coluna ou política.

### 3. Edge `superlogica-search-subscriptions`
- Iterar pelas contas configuradas (na ordem default → 2 → 3…).
- Para cada conta: carregar clientes e tentar match por CNPJ.
- Quando achar, retornar também o `account` usado.
- Manter sugestões por nome como fallback, agora considerando todas as contas.
- Se um `superlogicaClientId` (override manual) for passado, exigir o `account` correspondente.

### 4. Tela `ReceivablesReconcilePage.tsx`
- Persistir o novo campo `superlogicaAccount` no `updateContract` (junto com `superlogicaCustomerId`, `superlogicaSubscriptionId`).
- Exibir badge discreto da conta vinculada nas linhas já vinculadas.
- Mensagens deixam claro a conta encontrada ("vinculado à conta X").

### 5. Edge `superlogica-sync`
- Ao agrupar contratos, agrupar também por `superlogica_account`.
- Para cada grupo, chamar a API usando as credenciais daquela conta.
- Se um contrato antigo não tem `superlogica_account` mas tem `superlogica_customer_id`, usar a conta default (retrocompatibilidade) e tentar; se falhar, varrer outras contas e fazer backfill do `superlogica_account` automaticamente.

### 6. Mappers e tipos
- `src/types/index.ts`: adicionar `superlogicaAccount?: string` em `Contract`.
- `src/lib/dbMappers.ts`: mapear `superlogica_account` ↔ `superlogicaAccount` em `contractFromDb`/`contractToDb`.

### Arquivos tocados
- `supabase/migrations/...sql` (nova coluna)
- `supabase/functions/superlogica-search-subscriptions/index.ts`
- `supabase/functions/superlogica-sync/index.ts`
- `src/pages/ReceivablesReconcilePage.tsx`
- `src/lib/dbMappers.ts`
- `src/types/index.ts`

### Não alterar
RBAC, subprojetos, filtro de saúde do Dashboard, fluxo de senhas, regras financeiras, layout/colunas existentes.

### Pré-requisito (você precisa fornecer antes da implementação)
Os 3 secrets da **segunda conta Superlógica**:
- `SUPERLOGICA_API_BASE_2` (ex.: `https://api.superlogica.net` — geralmente o mesmo, mas confirme)
- `SUPERLOGICA_APP_TOKEN_2`
- `SUPERLOGICA_ACCESS_TOKEN_2`

Onde achar: no painel da outra empresa Superlógica → Configurações → API → Tokens.

### Detalhes técnicos
```text
Fluxo multi-conta:
Buscar cliente:
  para cada conta em [default, 2, 3…]:
    carregar clientes
    se CNPJ bater → retorna {clientId, account}
  se nenhum bater → sugestões por nome em todas as contas

Vincular:
  salva subscription_id + customer_id + account no contrato

Sync:
  agrupa contratos por account
  para cada grupo, usa as credenciais daquela conta
  busca cobranças → distribui (resolve ambiguidade por valor como antes)
```

### Risco / mitigação
- Se o usuário informar credenciais erradas da 2ª conta, o sync apenas pulará aquele grupo com erro claro no `error_summary` da run; nada do que já funciona quebra.
- Contratos antigos sem `superlogica_account` continuam funcionando via conta default + backfill automático.

