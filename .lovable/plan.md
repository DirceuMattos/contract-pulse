

## Exibir campo "Indice" editavel na tela de Equipes

### Resumo

O campo `sortOrder` ja existe na entidade `Team` e no banco de dados. A alteracao consiste em expor esse campo na listagem e no dialog de criacao/edicao para que o usuario possa visualizar e alterar o indice de ordenacao.

### Alteracoes

**Arquivo: `src/pages/TeamsPage.tsx`**

1. **Listagem** -- Exibir o valor do `sortOrder` ao lado do nome da equipe como um badge ou label (ex: "#1", "#2"), para que o usuario veja a ordem atual de cada equipe.

2. **Estado do dialog** -- Adicionar estado `teamSortOrder` (tipo `number`) junto aos estados existentes (`teamName`, `teamDescription`, `teamActive`).

3. **Dialog de criacao** -- Adicionar campo "Indice" (Input numerico) no dialog. Ao criar, o valor padrao sera o proximo indice disponivel (max + 1), mas o usuario podera alterar.

4. **Dialog de edicao** -- Preencher o campo "Indice" com o `sortOrder` atual da equipe. O usuario podera alterar livremente.

5. **handleSave** -- Incluir `sortOrder: teamSortOrder` no payload enviado para `addTeam` ou `updateTeam`.

6. **Funcao addTeam no DataContext** -- Atualmente `addTeam` aceita apenas `(name, description)`. Sera necessario expandir a assinatura para aceitar `sortOrder` como parametro opcional, mantendo o comportamento atual como fallback (max + 1).

### Detalhes tecnicos

**`src/contexts/DataContext.tsx`**
- Alterar a assinatura de `addTeam` de `(name: string, description?: string)` para `(name: string, description?: string, sortOrder?: number)`
- Se `sortOrder` for fornecido, usar esse valor; caso contrario, manter o calculo automatico (max + 1)
- Atualizar a interface `DataContextType` com a nova assinatura

**`src/pages/TeamsPage.tsx`**
- Novo estado: `const [teamSortOrder, setTeamSortOrder] = useState(0)`
- Em `openCreateDialog`: inicializar com `Math.max(...teams.map(t => t.sortOrder), 0) + 1`
- Em `openEditDialog`: inicializar com `team.sortOrder`  (sera necessario incluir `sortOrder` no tipo do `editingTeam`)
- Na listagem: exibir badge com o indice antes do nome da equipe
- No dialog: campo Input type="number" com label "Indice" antes do campo Nome
- Em `handleSave`: passar `teamSortOrder` para `addTeam` e `updateTeam`

