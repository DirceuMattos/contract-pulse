## Reorganização da lista de recursos do contrato

Na página `src/pages/ContractResourcesPage.tsx`, a seção "Recursos Alocados" lista hoje todos os recursos em uma única lista ordenada pelo dropdown "Ordenar por" (custo padrão). O requisito é garantir que **recursos humanos (CLT/PJ) apareçam sempre primeiro e em ordem alfabética**, e só depois os **demais recursos (Outros)** com a ordenação selecionável atual.

### Mudança

Alterar a lógica de `.sort()` (linhas ~596–611) e da renderização da lista (lines ~587–766) para:

1. **Particionar** os recursos filtrados em dois grupos:
   - `hrResources`: `tipo === 'clt' || tipo === 'pj'`
   - `otherResources`: `tipo === 'outro'`
2. **Ordenar `hrResources`** sempre por nome (usando `resolveResource(...).nome.localeCompare(...)`, em pt-BR e case-insensitive), ignorando o valor do dropdown.
3. **Ordenar `otherResources`** mantendo a lógica atual do dropdown `sortBy` (`custo` | `cargo` | `nome` | `tipo`).
4. **Renderizar `[...hrResources, ...otherResources]`** dentro do mesmo `AnimatePresence`, preservando os cards atuais, animações e a regra existente que oculta RH individual quando o contrato usa subprojetos (esse cenário continua intacto — o card resumo "Recursos Humanos (via Subprojetos)" permanece no topo, conforme confirmado).

### Detalhes técnicos

- A função de comparação por nome deve usar `localeCompare(rb.nome, 'pt-BR', { sensitivity: 'base' })` para tratar acentos e maiúsculas/minúsculas corretamente.
- O dropdown "Ordenar por" continua existindo e visível, mas passa a afetar **apenas** os recursos "Outros". Não vamos adicionar um aviso na UI para não poluir — o comportamento fica implícito (RH sempre alfabético).
- Nenhuma mudança em cálculos, estilos, RBAC, banner de subprojetos ou no card de Overhead.

### Arquivo alterado

- `src/pages/ContractResourcesPage.tsx` — apenas a seção da lista de recursos (filtro/sort/map dentro do `AnimatePresence`).
