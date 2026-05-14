## Adicionar bloco de auto-vinculação em `superlogica-sync/index.ts`

### Localização
Inserir o bloco exatamente entre os comentários existentes:
- Após `// 1) Create sync run` (e seu bloco)
- Antes de `// 2) Load linked contracts`

### Conteúdo a inserir
Bloco `// 0) Auto-link: tentar vincular contratos sem superlogica_subscription_id` exatamente como descrito pelo usuário, contendo:

1. `KNOWN_SUBSCRIPTION_IDS` — lista com os 9 UUIDs fornecidos.
2. `SELECT id, codigo, valor_mensal_referencia FROM contracts WHERE superlogica_subscription_id IS NULL` via `sb`.
3. Para cada `subId`:
   - `superlogicaGet('/v2/financeiro/cobranca?idContrato=<subId>&itensPorPagina=5')`
   - Extrai `invoiceAmount` de `vl_total_recb` ou `vl_emitido_recb` do primeiro item
   - Extrai `label` de `st_descricao_cont`
   - Extrai `customerId` de `id_sacado_sac`
   - Filtra `unlinked` removendo já marcados com `_linked`
   - Chama `matchContractByAmount(invoiceAmount, stillUnlinked, 0.05)`
   - Se houver match: `UPDATE contracts SET superlogica_subscription_id, superlogica_subscription_label, superlogica_customer_id WHERE id = matched.id`, marca `_linked = true` e loga
   - Erros logados em `console.log` sem interromper o loop

### Restrições
- Nenhuma outra alteração em qualquer parte do arquivo.
- Não remover nem ajustar a auto-vinculação anterior (`autoLinkUnlinkedContracts()`) já existente — apenas inserir este novo bloco no local indicado. Se essa chamada anterior estiver justamente no ponto entre `// 1) Create sync run` e `// 2) Load linked contracts`, ela permanece e o novo bloco é adicionado logo abaixo dela (ainda antes do comentário `// 2)`).

### Arquivo
- `supabase/functions/superlogica-sync/index.ts` (deploy automático após edição).
