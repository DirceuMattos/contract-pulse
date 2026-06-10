Aplicar classes condicionais de cor avermelhada clara apenas quando `contractHasPending === true` em `src/pages/SquadsPage.tsx`, mantendo cards sem pendência inalterados.

## Mudanças em src/pages/SquadsPage.tsx

### 1. renderTeamBar (já parcialmente aplicado)
- Aceitar `hasPending` como terceiro parâmetro
- Nome do time: `text-red-200` quando pendente, senão `text-foreground`
- Contagem "X rec." e %: `text-red-100` quando pendente, senão `text-muted-foreground`

### 2. renderDetailedTeams
- Aceitar `hasPending` como segundo parâmetro
- AccordionTrigger "X recurso(s)": `text-red-300` quando pendente
- Nome do colaborador: adicionar `text-red-200` quando pendente (sem sobrescrever `text-destructive` em vacant)
- Cargo + separador "—": `text-red-300` quando pendente
- % de dedicação: `text-red-100` quando pendente

### 3. Card do contrato (renderContractCard)
- `· {contractCodigo}` (text-muted-foreground): `text-red-300` quando pendente
- Nome do cliente (text-muted-foreground): `text-red-300` quando pendente
- Wrapper "FTE Summary" (text-muted-foreground) e "FTE Total" (text-foreground): `text-red-200` quando pendente

### 4. Atualizar invocações
- `renderTeamBar(td, cardData, contractHasPending)`
- `renderDetailedTeams(cardData, contractHasPending)`

## Fora do escopo
- Não alterar `renderResourceCard` (cards da visão "Por Recurso") — usuário pediu cards de contrato
- Não alterar cores de cards sem pendência
- Não alterar ordenação, lógica de pendências, badges existentes, ou banner superior
