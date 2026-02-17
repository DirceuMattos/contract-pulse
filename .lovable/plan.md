

# Mover Tabela de Cargos para subtela dedicada

## Resumo

Extrair a secao "Tabela de Cargos" (linhas 434-541 do `SettingsPage.tsx`) para uma pagina propria em `/configuracoes/cargos`, substituindo-a por um card resumo com CTA "Gerenciar cargos". Nenhuma regra de negocio muda.

---

## Alteracoes

### 1. Nova pagina: `src/pages/JobTitlesPage.tsx`

Contera todo o CRUD de cargos atualmente embutido no SettingsPage:
- PageHeader com titulo "Cargos (RH)", descricao e breadcrumb (Configuracoes > Cargos)
- Botao "Voltar" no header (navega para `/configuracoes`)
- Lista de cargos com switches ativo/inativo, botoes editar/excluir
- Dialog de criar/editar cargo
- ConfirmDeleteDialog de exclusao
- Empty state quando nao houver cargos
- Dados via `useData()` (jobTitles, addJobTitle, updateJobTitle, deleteJobTitle)
- Protecao `canEdit` mantida

### 2. Modificar `src/pages/SettingsPage.tsx`

- Remover todo o estado e JSX relacionado a cargos (linhas 40-44 do state, linhas 434-541 do JSX, dialogs)
- Remover imports nao mais usados (Plus, Pencil, Trash2, Switch, Dialog, Label, Badge)
- Adicionar no lugar um card resumo:

```
Cargos (RH)
Gerencie cargos, faixas e parametros usados em calculos.
[X cargos cadastrados]
[Gerenciar cargos ->]
```

O card usa `useNavigate` para ir a `/configuracoes/cargos`.

### 3. Modificar `src/App.tsx`

Adicionar rota:
```
<Route path="/configuracoes/cargos" element={<JobTitlesPage />} />
```

### 4. Modificar `src/types/moduleAccess.ts`

Adicionar `/configuracoes/cargos` ao array `routes` do modulo `SETTINGS` e ao mapeamento em `getModuleKeyForRoute` para que a subtela herde a mesma protecao de acesso.

### 5. Command Palette (opcional)

Adicionar comando "Configuracoes > Cargos" em `CommandPalette.tsx` vinculado ao moduleKey `SETTINGS`.

---

## Arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/JobTitlesPage.tsx` | Novo | Pagina dedicada de CRUD de cargos |
| `src/pages/SettingsPage.tsx` | Mod | Remover CRUD inline, adicionar card resumo |
| `src/App.tsx` | Mod | Adicionar rota `/configuracoes/cargos` |
| `src/types/moduleAccess.ts` | Mod | Incluir rota da subtela no modulo SETTINGS |

## Preservacao

- Toda logica de CRUD permanece identica (apenas relocada)
- Persistencia localStorage inalterada
- ResourceForm continua consumindo jobTitles do DataContext
- Permissoes de role e moduleAccess preservadas

