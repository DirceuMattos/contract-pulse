

## Plano: Edição de dedicação e gestão de alocações no módulo Squads

### Situação atual
O `SubprojectContext` já possui o método `updateAllocation` implementado, mas a UI do `SubprojectManagementPanel` não expõe nenhum botão de edição para alterar o percentual de dedicação. Atualmente, o usuário só pode adicionar ou remover recursos — não pode editar a dedicação.

### Alterações

**1. `src/components/squads/SubprojectManagementPanel.tsx`**
- Adicionar um botão de edição (ícone Pencil) ao lado de cada alocação, visível quando `canEdit` for true.
- Ao clicar, abrir um dialog de edição inline ou reutilizar um novo dialog de edição passando a alocação existente.
- Adicionar estado para controlar qual alocação está sendo editada (`editingAlloc`).

**2. Criar `src/components/squads/EditAllocationDialog.tsx`**
- Dialog simples com:
  - Nome da pessoa (read-only, apenas exibição).
  - Campo numérico "Dedicação (%)" editável (1-100).
  - Botões Cancelar e Salvar.
- Ao salvar, chamar `updateAllocation(id, { dedicationPercent })` do contexto.

### Permissões
- Todas as ações (adicionar, editar dedicação, remover) já são controladas pelo `canEdit` do `AuthContext`, que retorna `true` para perfis C-Level e Intermediário.

### Resumo do fluxo
- **Adicionar recurso**: já funciona via `SubprojectAllocationDialog`.
- **Remover recurso**: já funciona via botão de delete com confirmação.
- **Editar dedicação**: será adicionado com botão de edição e dialog dedicado.

