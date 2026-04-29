## Permissões granulares: canCreate / canDelete (lider_tribo edita, mas não cria/exclui)

### 1. `src/contexts/AuthContext.tsx`
- Interface `AuthContextType` (linha 14): adicionar `canCreate: boolean;` e `canDelete: boolean;` após `canEdit`.
- Linha 122: incluir `'lider_tribo'` em `canEdit` para liberar edição.
- Após linha 122, criar:
  ```ts
  const canCreate = userRole !== 'lider_tribo' && (userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh');
  const canDelete = userRole !== 'lider_tribo' && (userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh');
  ```
- Expor `canCreate` e `canDelete` no `value` do Provider.

### 2. `src/pages/HRPeoplePage.tsx`
- Importar `canCreate` do `useAuth()`.
- Botão "Nova Pessoa" (linha 233 — bloco que envolve Histórico/Correções/Importar/Endereços/Nova Pessoa): manter `canEdit` para os botões administrativos existentes; trocar apenas o botão "Nova Pessoa" e o EmptyState (`actionLabel`/`onAction`, linhas 426–427) para `canCreate`.
- Botões de inativar/reativar (linhas 501, 525): permanecem `canEdit`.

### 3. `src/pages/ContractsPage.tsx`
- Importar `canCreate, canDelete`.
- Linha 319 (ação "Novo Contrato" no header) e linha 725 (CTA do empty state): trocar `canEdit` por `canCreate`.
- Linha 683 (`{canEdit && (` que envolve Editar/Recursos/Excluir do dropdown): manter `canEdit` no wrapper para liberar Editar/Recursos a lider_tribo, e envolver apenas o `DropdownMenuItem` "Excluir" + o `DropdownMenuSeparator` adjacente em `{canDelete && (...)}`.

### 4. `src/pages/ClientsPage.tsx`
- Importar `canCreate, canDelete`.
- Linha 119 (`actions={canEdit ? ...}`) e linha 275 (CTA empty state): trocar por `canCreate`.
- Linha 201 (`{canEdit && (`): se envolver apenas a ação Excluir, trocar por `canDelete`; se envolver Editar+Excluir, manter `canEdit` no wrapper e isolar o item Excluir com `canDelete`. Vou inspecionar antes para escolher.

### 5. `src/pages/SquadsPage.tsx`
- Importar `canCreate`.
- Linhas 644 e 679 (botões de adicionar recurso/subprojeto): trocar `canEdit` por `canCreate`.

Nenhuma rota, contexto de dados ou lógica de filtro/ordenação é alterada.