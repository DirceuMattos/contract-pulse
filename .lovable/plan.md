## Resumo
Adicionar dois filtros na grade de filtros de HRPeoplePage.tsx, seguindo exatamente o padrão dos filtros existentes.

## Alterações em `src/pages/HRPeoplePage.tsx`

### 1. Estado e persistência
- Adicionar `filterLocalAtuacao` e `filterProjeto` aos `useState` iniciais (lendo de `storedFilters`).
- Incluir ambos no `useEffect` de persistência para `sessionStorage`.
- Incluir ambos em `hasActiveFilters`.
- Incluir ambos em `handleClearFilters`.

### 2. Opções dos filtros
- `localAtuacaoOptions`: `useMemo` que extrai valores únicos de `p.localAtuacao` do array `hrPeople`.
- `projetoOptions`: `useMemo` que usa `resources` e `contracts` do `DataContext` para listar contratos que possuem pelo menos um recurso com `hrPersonId` vinculado.

### 3. Condições de matching
- `matchLocalAtuacao`: verifica se `filterLocalAtuacao` está vazio ou se `p.localAtuacao` é igual ao filtro.
- `matchProjeto`: verifica se `filterProjeto` está vazio ou se existe algum `resource` com `hrPersonId === p.id` e `contractId === filterProjeto`.
- Incluir ambas as condições no `return` final do `filtered`.

### 4. UI na grade `grid-cols-4`
- Adicionar `<div className="flex flex-col gap-1">` com `<Select>` para "Local de Atuação".
- Adicionar `<div className="flex flex-col gap-1">` com `<Select>` para "Projeto".
- Ambos com `value="all"` como fallback e opção "Todos".

Nenhuma outra lógica, layout ou estilo da página será alterado.