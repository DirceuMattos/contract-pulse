
# Configuracoes V2: Entidade "Equipe" + Campo Equipe na Tabela de Cargos

## Resumo

Criar uma entidade Team (Equipe) com CRUD completo em subtela dedicada (`/configuracoes/equipes`), adicionar campo `teamId` opcional ao `JobTitle`, e integrar com o formulario de cargos e a exibicao em recursos/calculadora.

---

## 1. Tipo Team e extensao de JobTitle

### `src/types/index.ts` (mod)

Adicionar interface `Team`:
```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}
```

Estender `JobTitle` com campo opcional:
```typescript
export interface JobTitle {
  id: string;
  label: string;
  isActive: boolean;
  teamId?: string;  // novo
}
```

---

## 2. Mock data

### `src/data/mockData.ts` (mod)

Adicionar `defaultTeams: Team[]` com 7 equipes seed:
- Engenharia (id: `team-001`)
- Produto (`team-002`)
- QA (`team-003`)
- Suporte (`team-004`)
- Infra/DevOps (`team-005`)
- Administrativo (`team-006`)
- Comercial (`team-007`)

Atualizar `defaultJobTitles` adicionando `teamId` a ~70% dos cargos:
- Desenvolvedores Frontend/Backend/Full Stack, Arquiteto, DevOps -> Engenharia
- Product Owner -> Produto
- QA / Tester -> QA
- Analista de Suporte -> Suporte
- Scrum Master, Gerente de Projetos -> Administrativo
- Tech Lead -> Engenharia
- Analista de Dados, DBA -> Engenharia
- UX Designer -> Produto
- Analista de Sistemas -> sem equipe (testar "---")

---

## 3. DataContext -- CRUD de equipes

### `src/contexts/DataContext.tsx` (mod)

Adicionar:
- Estado `teams` com localStorage key `bnp_teams`
- Funcoes: `addTeam`, `updateTeam`, `deleteTeam`, `getActiveTeams`
- `deleteTeam` verifica se ha cargos vinculados (`jobTitles.some(jt => jt.teamId === id)`); se sim, lanca erro/retorna false
- Incluir `teams` e acoes no contexto e no `resetToDemo`
- Atualizar `addJobTitle` para aceitar `teamId` opcional: `addJobTitle(label: string, teamId?: string)`

---

## 4. Pagina de Equipes

### `src/pages/TeamsPage.tsx` (novo)

Subtela dedicada, seguindo o mesmo padrao de `JobTitlesPage.tsx`:
- PageHeader: "Equipes", breadcrumbs Configuracoes > Equipes, botao Voltar
- Lista com colunas: Nome | Descricao | Status (badge) | Acoes (switch ativo/inativo, editar, excluir)
- Dialog de criar/editar: campos Nome (obrigatorio, unico), Descricao (opcional), Status (switch)
- Exclusao: `ConfirmDeleteDialog` -- se equipe tem cargos vinculados, bloquear com toast de erro e sugerir desativar
- EmptyState quando vazio
- Protecao `canEdit`

---

## 5. Rotas e navegacao

### `src/App.tsx` (mod)
Adicionar rota:
```
<Route path="/configuracoes/equipes" element={<TeamsPage />} />
```

### `src/types/moduleAccess.ts` (mod)
Adicionar `/configuracoes/equipes` ao array `routes` do modulo `SETTINGS`.

### `src/pages/SettingsPage.tsx` (mod)
Adicionar card resumo de Equipes (mesmo padrao do card de Cargos):
- Icone Users, titulo "Equipes", descricao, badge com contagem, CTA "Gerenciar equipes"

### `src/components/layout/CommandPalette.tsx` (mod)
Adicionar comando "Configuracoes > Equipes" vinculado ao moduleKey SETTINGS.

---

## 6. Campo Equipe no formulario de Cargos

### `src/pages/JobTitlesPage.tsx` (mod)

- No dialog de criar/editar cargo, adicionar campo Select "Equipe":
  - Opcoes: equipes ativas do `useData().getActiveTeams()`
  - Opcao vazia "Sem equipe"
  - Se nao ha equipes, mostrar helper "Nenhuma equipe cadastrada" com link para `/configuracoes/equipes`
- Na lista de cargos, adicionar exibicao da equipe ao lado do label:
  - Chip/badge com nome da equipe
  - Se equipe inativa, badge "Inativa" em tom secundario
  - Se sem equipe, mostrar "---"
- Atualizar `addJobTitle` e `updateJobTitle` para incluir `teamId`

---

## 7. Integracao com ResourceForm (read-only)

### `src/components/forms/ResourceForm.tsx` (mod)

Apos o select de cargo (quando um cargo e selecionado e tem `teamId`):
- Exibir chip read-only com o nome da equipe do cargo selecionado
- Nao afeta o modelo de dados de Resource -- apenas informativo

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/types/index.ts` | Mod | Adicionar `Team`, estender `JobTitle` com `teamId` |
| `src/data/mockData.ts` | Mod | Adicionar `defaultTeams`, atualizar `defaultJobTitles` |
| `src/contexts/DataContext.tsx` | Mod | CRUD de equipes, atualizar `addJobTitle` |
| `src/pages/TeamsPage.tsx` | Novo | Subtela CRUD de equipes |
| `src/App.tsx` | Mod | Rota `/configuracoes/equipes` |
| `src/types/moduleAccess.ts` | Mod | Incluir rota no modulo SETTINGS |
| `src/pages/SettingsPage.tsx` | Mod | Card resumo de equipes |
| `src/components/layout/CommandPalette.tsx` | Mod | Comando "Configuracoes > Equipes" |
| `src/pages/JobTitlesPage.tsx` | Mod | Select de equipe no form + coluna na lista |
| `src/components/forms/ResourceForm.tsx` | Mod | Chip read-only de equipe do cargo |

## Ordem de implementacao

1. Tipos (`Team` + `teamId` em `JobTitle`)
2. Mock data (equipes + atualizar cargos)
3. DataContext (CRUD equipes + atualizar addJobTitle)
4. TeamsPage + rota + moduleAccess + CommandPalette
5. SettingsPage (card resumo)
6. JobTitlesPage (select equipe + coluna)
7. ResourceForm (chip read-only)

## Preservacao

- Cargos existentes sem `teamId` continuam funcionando (campo opcional)
- Nenhuma alteracao em regras de role, moduleAccess ou mascaramento de RH
- Calculadora continua consumindo cargos normalmente; equipe e apenas informativa
- localStorage de cargos e compativel (campo novo e opcional)
