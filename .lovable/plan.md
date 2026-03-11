

## Plano: Gestão de alocações na visão "Por Recurso" do módulo Squads

### Contexto
A implementação anterior adicionou botões de edição no `SubprojectManagementPanel`, que já possuía essa funcionalidade embutida. O que foi solicitado é diferente: permitir que, na **visão "Por Recurso"** da página Squads, o usuário autorizado possa:

1. **Editar o percentual de dedicação** de um recurso em cada projeto/subprojeto
2. **Mover um recurso** de um projeto para outro (transferir alocação)
3. **Ver o recálculo automático** do percentual total de dedicação

### O que será revertido
- Remover as alterações feitas no `SubprojectManagementPanel.tsx` (botão de edição de alocação e estado `editingAlloc`)
- O `EditAllocationDialog.tsx` criado será **reaproveitado** (não descartado), pois ele é útil para a nova funcionalidade

### Alterações

**1. Reverter `SubprojectManagementPanel.tsx`**
- Remover o estado `editingAlloc`, o botão Pencil nas alocações e a renderização do `EditAllocationDialog` — pois esse painel já tinha botões de edição antes da última alteração (verificando o código atual, ele já possui esses botões desde antes). Na verdade, o diff mostra que o painel já tinha esses botões. Portanto, **nada precisa ser revertido** — os botões no painel de gestão são corretos e complementares.

**2. Adicionar edição inline na visão "Por Recurso" (`SquadsPage.tsx`)**
- No `renderResourceCard`, para cada alocação, adicionar um botão de edição (Pencil) visível quando `canEdit` for true.
- Ao clicar, abrir um dialog que permite:
  - Alterar o percentual de dedicação (campo numérico 1-100)
  - Opcionalmente mover o recurso para outro contrato/subprojeto (select com contratos ativos)
- Após salvar, o card recalcula automaticamente o total de dedicação.

**3. Criar `EditResourceAllocationDialog.tsx`**
- Dialog com:
  - Nome do recurso (read-only)
  - Contrato/subprojeto atual (read-only)
  - Campo "Dedicação (%)" editável
  - Select "Mover para contrato" (lista contratos ativos, opcional)
  - Se o contrato de destino tiver subprojetos, exibir select de subprojeto
- Lógica de salvamento:
  - Se só alterar dedicação: `updateResource(id, { percentualDedicacao })` para recursos normais, ou `updateAllocation(id, { dedicationPercent })` para alocações de subprojeto
  - Se mover para outro contrato: `updateResource(id, { contractId: novoContrato })` para recursos normais, ou delete alocação antiga + create nova para subprojetos

**4. Permissões**
- Todas as ações controladas por `canEdit` do `AuthContext` (C-Level e Intermediário)

### Fluxo do usuário
1. Acessa Squads → seleciona visão "Por Recurso"
2. Vê cards com cada pessoa e suas alocações por projeto
3. Clica no ícone de edição ao lado de uma alocação
4. Altera dedicação e/ou seleciona outro projeto de destino
5. Salva → card atualiza com novo total de dedicação

