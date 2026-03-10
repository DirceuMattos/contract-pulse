

## Subprojetos / Squads Múltiplas por Contrato

### Escopo
Adicionar suporte front-end para que contratos possam ter subprojetos, cada um com sua squad. Dados armazenados em estado local (React context) com modelo compatível com Supabase para migração futura.

### 1. Modelo de dados (types/index.ts)

**Contract** — adicionar campo:
- `hasSubprojects: boolean` (default `false`)

**Nova entidade `ContractSubproject`:**
```ts
{
  id: string;
  contractId: string;
  name: string;
  description?: string;
  status: 'ativo' | 'suspenso' | 'encerrado';
  createdAt: string;
  updatedAt: string;
}
```

**Nova entidade `SubprojectAllocation`:**
```ts
{
  id: string;
  subprojectId: string;
  hrPersonId: string;
  dedicationPercent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Estado (DataContext)

Adicionar arrays `subprojects` e `subprojectAllocations` ao contexto com CRUD completo:
- `addSubproject`, `updateSubproject`, `deleteSubproject`, `getSubprojectsByContract`
- `addSubprojectAllocation`, `updateSubprojectAllocation`, `deleteSubprojectAllocation`, `getAllocationsBySubproject`

Persistência inicial em `localStorage` (mesmo padrão do fallback local existente). Migração para Supabase em etapa futura.

### 3. Cadastro do contrato (ContractForm)

- Adicionar `hasSubprojects` ao `contractFormSchema` (boolean, default false)
- Switch no formulário: "Possui subprojetos / squads múltiplas?"
- Tooltip explicativo
- Propagar campo em `ContractFormPage.handleSubmit` e nos mappers

### 4. Detalhe do contrato (ContractDetailPage)

Quando `hasSubprojects === true`:
- Card na aba Resumo: "Subprojetos: N" com CTA "Gerenciar subprojetos e squads" → navega para `/squads?contract={id}`

### 5. Tela de Recursos (ContractResourcesPage)

Quando `hasSubprojects === true`:
- Banner informativo no topo: "Este contrato usa alocação por subprojeto. Gerencie as pessoas no módulo SQUADS."
- Botões de adicionar recurso desabilitados
- Exibir total FTE consolidado (read-only) derivado das alocações dos subprojetos
- Recursos diretos existentes continuam visíveis (read-only)

### 6. Módulo SQUADS (SquadsPage) — alterações principais

**Filtros:**
- Adicionar toggle "Visualizar por: Contrato | Subprojeto" (quando contrato selecionado tem subprojetos, default "Subprojeto")

**Cards:**
- Contratos sem subprojetos: comportamento atual (1 card)
- Contratos com subprojetos: 1 card por subprojeto, header mostra "Cliente / Contrato → Subprojeto: nome"

**Gestão de subprojetos** (novo painel dentro do SQUADS):
- Ao selecionar contrato com `hasSubprojects`, exibir seção de gerenciamento:
  - Lista de subprojetos (nome, status, FTE total)
  - Botões: Adicionar / Editar / Encerrar subprojeto (modal)
- Dentro de cada card de subprojeto:
  - Lista nominal de RH (nome, cargo, dedicação %)
  - Botão "Adicionar pessoa" (combobox RH mestre + dedicação)

**Novo componente:** `SubprojectManagementPanel` — CRUD de subprojetos e alocações

### 7. Wizard de migração

Quando o usuário ativa `hasSubprojects` em contrato que já tem recursos alocados:
- Dialog de confirmação: "Deseja criar o subprojeto 'Geral' e mover as alocações atuais?"
- Se sim: cria subprojeto "Geral", cria `SubprojectAllocation` para cada recurso HR existente com a mesma dedicação
- Se não: apenas marca `hasSubprojects = true` sem migrar

### 8. Permissões

- Respeitar `canEdit` para criação/edição de subprojetos e alocações
- Respeitar `canAccessModule('SQUADS')` para acesso ao gerenciamento

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/types/index.ts` | Adicionar `hasSubprojects`, `ContractSubproject`, `SubprojectAllocation` |
| `src/lib/validators.ts` | Adicionar `hasSubprojects` ao schema |
| `src/contexts/DataContext.tsx` | CRUD subprojetos e alocações |
| `src/components/forms/ContractForm.tsx` | Switch hasSubprojects |
| `src/pages/ContractFormPage.tsx` | Propagar campo + wizard migração |
| `src/pages/ContractDetailPage.tsx` | Card subprojetos |
| `src/pages/ContractResourcesPage.tsx` | Banner + desabilitar adição |
| `src/pages/SquadsPage.tsx` | Toggle visualização, cards por subprojeto, gestão |
| `src/components/squads/SubprojectManagementPanel.tsx` | Novo — CRUD subprojetos |
| `src/components/squads/SubprojectAllocationDialog.tsx` | Novo — alocar pessoa |
| `src/components/squads/SubprojectFormDialog.tsx` | Novo — criar/editar subprojeto |
| `src/components/squads/MigrateToSubprojectsDialog.tsx` | Novo — wizard migração |

### Sem alterações de banco nesta etapa
Modelo preparado para migração futura com tabelas `contract_subprojects` e `subproject_allocations`.

