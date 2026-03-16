

## Plano: Ocultar RHs individuais na lista quando contrato tem subprojetos

### Contexto

Quando um contrato possui subprojetos, os recursos humanos (CLT/PJ) ja estao distribuidos pelos subprojetos. Exibir cada um individualmente na lista "Recursos Alocados" e redundante. A proposta e:

1. Quando `contractHasSubprojects === true`, filtrar a lista para mostrar apenas recursos do tipo `outro`
2. Adicionar uma linha-resumo no topo da lista com o custo total de RH (CLT + PJ), sem listar cada pessoa

### Alteracoes

**Arquivo unico: `src/pages/ContractResourcesPage.tsx`**

1. Na secao "Recursos Alocados" (~linha 500), antes do `.filter()` de busca, adicionar filtro condicional:
   - Se `contractHasSubprojects`, mostrar apenas `resource.tipo === 'outro'`

2. Antes da lista de cards, inserir um card-resumo quando `contractHasSubprojects`:
   - Icone de Users + texto "Recursos Humanos (via Subprojetos)"
   - Quantidade: X CLT + Y PJ
   - Custo total: soma de custosPorTipo.clt + custosPorTipo.pj (respeitando `canViewHRCosts`)
   - Link "Ver nos Squads" apontando para `/squads?contract={id}`

3. Ajustar o contador no header da lista para refletir apenas os itens visiveis (outros) + a linha-resumo

