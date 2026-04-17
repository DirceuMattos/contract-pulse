
O usuário aprovou o item 2 (melhorias de código) e relatou que ao testar a conciliação manual de um contrato, recebeu "Nenhuma assinatura ativa com valor encontrada para este CNPJ" — ou seja, a busca por CNPJ no Superlógica não está encontrando o cliente.

Olhando os logs da edge `superlogica-search-subscriptions`, vejo a busca para CNPJ `67693440000142` (OMEL) percorrendo 3 páginas e retornando "No client found". A função pagina apenas até 20 páginas, mas o problema real é que ela usa `apenasColunasPrincipais=1` e itera lentamente. Para uma base grande de clientes, o cliente pode simplesmente não estar nas primeiras páginas, OU pode existir com CNPJ formatado diferente.

Preciso investigar:
1. Como o Superlógica retorna CNPJs (com/sem máscara, em qual campo) — já comparamos via `onlyDigits`, ok.
2. Se a API do Superlógica suporta filtro direto por CNPJ (`pesquisa=` ou `cgcSacado=`) — isso eliminaria a paginação.
3. Quantas páginas de clientes existem ao todo.

A solução é trocar a paginação cega por uma busca filtrada no endpoint de clientes (parâmetro `pesquisa` aceita CNPJ na API do Superlógica), com fallback para a paginação atual.

## Plano

### Parte A — Corrigir busca de assinaturas por CNPJ (item urgente)
Arquivo: `supabase/functions/superlogica-search-subscriptions/index.ts`

- Substituir a busca paginada por uma chamada direta usando o parâmetro `pesquisa={cnpj}` (suportado pela API `/v2/financeiro/clientes`), que filtra no servidor.
- Tentar também variações: somente dígitos, e CNPJ formatado `XX.XXX.XXX/XXXX-XX`.
- Manter fallback com paginação aumentada (até 50 páginas) caso a busca direta não retorne.
- Adicionar logs claros mostrando qual estratégia encontrou (ou não) o cliente.

### Parte B — Banner de contratos sem vínculo no Dashboard principal
Arquivo: `src/pages/DashboardPage.tsx`
- Card/banner amarelo no topo (após filtros) contando contratos ativos sem `superlogicaSubscriptionId`, com botão "Conciliar agora" → `/receivables/reconcile`.
- Visível apenas para perfis que veem Recebíveis.

### Parte C — Coluna "Vínculo Superlógica" na listagem de Contratos
Arquivo: `src/pages/ContractsPage.tsx`
- Pequeno badge na linha (ou ícone discreto na coluna do nome) indicando ✓ vinculado / ⚠ sem vínculo, com tooltip e link de atalho para conciliar.

### Parte D — Fallback por valor no sync (resolve ambiguidade de múltiplos contratos por CNPJ)
Arquivo: `supabase/functions/superlogica-sync/index.ts`
- Quando uma cobrança chega sem `id_planocliente_plc`/`id_contrato_mens` e há vários contratos para o mesmo CNPJ, tentar casar `vl_total_recb` com `valor_mensal_referencia` (tolerância de ~1%) antes de descartar.
- Log claro do match (ou da decisão de descarte).

### Não altero
RBAC, restrições financeiras, fluxo de subprojetos, filtro de saúde do Dashboard, fluxo de senhas — tudo permanece como está.

### Arquivos tocados
- `supabase/functions/superlogica-search-subscriptions/index.ts`
- `supabase/functions/superlogica-sync/index.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/ContractsPage.tsx`
