

## Plano: Adicionar ordenacao por funcao (cargo) na lista de Recursos Alocados

### Situacao atual

A lista de Recursos Alocados em `ContractResourcesPage.tsx` e ordenada exclusivamente por custo mensal (decrescente), sem opcao de mudar a ordenacao.

### Alteracao proposta

**Arquivo**: `src/pages/ContractResourcesPage.tsx`

1. Adicionar estado `sortBy` com opcoes: `custo` (padrao atual), `cargo`, `nome`, `tipo`
2. Adicionar um `Select` de ordenacao ao lado do campo de busca existente
3. Alterar o `.sort()` na linha 479 para usar a funcao de ordenacao selecionada:
   - **Custo mensal** (desc) -- comportamento atual
   - **Funcao/Cargo** (asc, alfabetico) -- usa `resolved.cargo`
   - **Nome** (asc, alfabetico) -- usa `resolved.nome`
   - **Tipo** (CLT primeiro, depois PJ, depois Outros)

O Select ficara compacto, ao lado do campo de busca, sem alterar o layout existente.

