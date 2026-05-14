## Alteração no filtro de departamento da tela de RH

### Objetivo
Fazer com que colaboradores sem departamento (`team_id` nulo ou indefinido) sempre apareçam na listagem, mesmo quando um filtro de departamento está selecionado.

### Mudança
No arquivo `src/pages/HRPeoplePage.tsx`, no `useMemo` da variável `filtered` (linha 115), alterar a condição `matchTeam`:

**De:**
```
const matchTeam = !filterTeam || p.teamId === filterTeam;
```

**Para:**
```
const matchTeam = !filterTeam || !p.teamId || p.teamId === filterTeam;
```

A nova condição adiciona `!p.teamId` como um critério de inclusão: se o colaborador não tiver departamento cadastrado, ele sempre passa no filtro de departamento.

### Escopo
- Apenas a linha de `matchTeam` no arquivo `HRPeoplePage.tsx` será alterada.
- Nenhuma outra lógica de filtro será modificada.