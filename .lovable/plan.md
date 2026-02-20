
## Novo Módulo: Recursos Humanos

Este é um módulo de grande escopo. O plano está organizado em blocos sequenciais e claros.

---

### Visão Geral do que Será Feito

```text
ANTES                          DEPOIS
─────────────────────────────  ────────────────────────────────────────
Sidebar: Configurações         Sidebar: Recursos Humanos (novo item)
  └─ Cargos (RH)              │   └─ Pessoas
  └─ Equipes                  │   └─ Cargos (RH)
                               │   └─ Equipes
Configurações: (simplificada)
  └─ Parâmetros do sistema     Configurações: só parâmetros do sistema
  └─ Cards: Cargos, Equipes    (cards de Cargos/Equipes removidos)
```

O módulo RH é acessível apenas a usuários com permissão. Leitor/Intermediário podem ver dados não-financeiros se tiverem acesso liberado. Remuneração, Benefícios e valores da Linha do Tempo são mascarados conforme permissão (`canViewHRCosts` já existente no `AuthContext`).

---

### Bloco 1 — Banco de Dados (migrações SQL)

**Nova tabela `hr_people`** — cadastro mestre de pessoas:

```sql
CREATE TABLE public.hr_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  tipo_vinculo text NOT NULL DEFAULT 'clt', -- 'clt' | 'pj'
  cargo_id uuid REFERENCES public.job_titles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  remuneracao_mensal numeric NOT NULL DEFAULT 0,
  beneficios numeric NOT NULL DEFAULT 0,
  local_atuacao text,
  data_admissao date NOT NULL DEFAULT CURRENT_DATE,
  situacao text NOT NULL DEFAULT 'ativo', -- 'ativo' | 'inativo'
  observacoes text,
  comite_gestor text, -- formato 'YYYY-MM'
  data_desligamento date,
  motivo_desligamento text,
  tipo_desligamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Nova tabela `hr_timeline`** — linha do tempo por pessoa:

```sql
CREATE TABLE public.hr_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.hr_people(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  ocorrencia text NOT NULL DEFAULT 'observacao',
  descricao text NOT NULL DEFAULT '',
  valor numeric,
  remuneracao_apos numeric,
  beneficios_apos numeric,
  atualizar_remuneracao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS para `hr_people`:**
- SELECT: `true` (mas app mascara financeiro via `canViewHRCosts`)
- INSERT/UPDATE: `has_any_role(auth.uid(), ARRAY['c-level', 'editor'])`
- DELETE: `has_role(auth.uid(), 'c-level')`

**RLS para `hr_timeline`:**
- Mesmas regras que `hr_people`

---

### Bloco 2 — Controle de Acesso (Módulo RH)

**`src/types/moduleAccess.ts`**

Adicionar `'HR'` ao `MODULE_KEYS`:

```typescript
export const MODULE_KEYS = [
  ...,
  'HR', // novo
] as const;
```

Adicionar ao `MODULE_CATALOG`:

```typescript
{
  key: 'HR',
  label: 'Recursos Humanos',
  description: 'Cadastro mestre de pessoas, cargos e equipes',
  routes: ['/rh', '/rh/cargos', '/rh/equipes'],
  roleRestrictions: [], // acesso por moduleAccess, não por role
}
```

Atualizar `getModuleKeyForRoute` para mapear `/rh` → `'HR'`.

Atualizar `SETTINGS` para remover `/configuracoes/cargos` e `/configuracoes/equipes` das rotas (essas páginas continuarão funcionando via redirect para as novas rotas).

---

### Bloco 3 — Tipos TypeScript

**`src/types/index.ts`** — novos tipos:

```typescript
export type HRTipoVinculo = 'clt' | 'pj';
export type HRSituacao = 'ativo' | 'inativo';
export type HRTipoDesligamento = 'dispensado' | 'solicitou-dispensa' | 'transferido-grupo' | 'outro';
export type HROcorrencia = 'reajuste' | 'bonificacao' | 'beneficio' | 'mudanca-cargo' | 'observacao' | 'outro';

export interface HRPerson {
  id: string;
  nome: string;
  tipoVinculo: HRTipoVinculo;
  cargoId?: string;
  teamId?: string;
  remuneracaoMensal: number;
  beneficios: number;
  localAtuacao?: string;
  dataAdmissao: string;
  situacao: HRSituacao;
  observacoes?: string;
  comiteGestor?: string;
  dataDesligamento?: string;
  motivoDesligamento?: string;
  tipoDesligamento?: HRTipoDesligamento;
  createdAt: string;
  updatedAt: string;
}

export interface HRTimelineEvent {
  id: string;
  personId: string;
  eventDate: string;
  ocorrencia: HROcorrencia;
  descricao: string;
  valor?: number;
  remuneracaoApos?: number;
  beneficiosApos?: number;
  atualizarRemuneracao: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### Bloco 4 — Mapeadores de Banco

**`src/lib/dbMappers.ts`** — adicionar:

```typescript
export function hrPersonFromDb(row): HRPerson { ... }
export function hrPersonToDb(p): Record<string, unknown> { ... }
export function hrTimelineFromDb(row): HRTimelineEvent { ... }
export function hrTimelineToDb(e): Record<string, unknown> { ... }
```

---

### Bloco 5 — Contexto de Dados (HRContext)

Criar **`src/contexts/HRContext.tsx`** — contexto dedicado ao módulo RH (separado do DataContext para não inflá-lo ainda mais):

**Interface:**

```typescript
interface HRContextType {
  hrPeople: HRPerson[];
  hrTimeline: HRTimelineEvent[];
  loading: boolean;

  addPerson: (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HRPerson>;
  updatePerson: (id: string, data: Partial<HRPerson>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  getPerson: (id: string) => HRPerson | undefined;
  getActivePersons: () => HRPerson[];

  addTimelineEvent: (data: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HRTimelineEvent>;
  updateTimelineEvent: (id: string, data: Partial<HRTimelineEvent>) => Promise<void>;
  deleteTimelineEvent: (id: string) => Promise<void>;
  getTimelineByPerson: (personId: string) => HRTimelineEvent[];
}
```

**Comportamento:**
- Carrega `hr_people` e `hr_timeline` do banco via Supabase
- Quando `atualizarRemuneracao = true` em um evento de timeline, atualiza `remuneracao_mensal` da pessoa automaticamente

Registrar o `HRProvider` em **`src/App.tsx`** envolvendo o layout.

---

### Bloco 6 — Rotas e Navegação

**`src/App.tsx`** — adicionar rotas:

```tsx
<Route path="/rh" element={<HRPeoplePage />} />
<Route path="/rh/pessoas/:id" element={<HRPersonDetailPage />} />
<Route path="/rh/cargos" element={<JobTitlesPage />} />  {/* reutilizar a existente */}
<Route path="/rh/equipes" element={<TeamsPage />} />     {/* reutilizar a existente */}
```

As rotas antigas `/configuracoes/cargos` e `/configuracoes/equipes` continuarão funcionando (preservação de links antigos) — as páginas existentes `JobTitlesPage` e `TeamsPage` serão atualizadas para ter breadcrumb dinâmico conforme a rota.

**`src/components/layout/Sidebar.tsx`** — adicionar item "Recursos Humanos" com ícone `UsersRound`:

```typescript
{ path: '/rh', label: 'Recursos Humanos', icon: UsersRound, moduleKey: 'HR' },
```

**`src/pages/SettingsPage.tsx`** — remover os cards de "Cargos (RH)" e "Equipes" da tela de Configurações.

---

### Bloco 7 — Telas do Módulo RH

#### 7.1 `src/pages/HRPeoplePage.tsx` — Lista principal

**Filtros:**
- Busca por nome + observações
- Situação (Ativo/Inativo/Todos)
- Departamento (Equipe)
- Cargo
- Vínculo (CLT/PJ)
- Comitê Gestor (mês/ano)

**Tabela:**
- Nome | Vínculo | Cargo | Departamento | Local | Data Admissão | Tempo de Casa | Situação
- Colunas restritas (apenas `canViewHRCosts`): Remuneração | Benefícios

**Ações:** Novo Recurso | Exportar | Ver detalhes / Editar / Inativar

**Função `calcularTempoDeCasa`:** Recebe `dataAdmissao` e retorna `"X anos e Y meses"` com badge de meses totais.

#### 7.2 `src/pages/HRPersonDetailPage.tsx` — Detalhe

**Abas:**
1. **Resumo** — todos os campos não-financeiros + Observações e Comitê Gestor destacados
2. **Financeiro** — remuneração e benefícios (renderizado apenas se `canViewHRCosts`)
3. **Linha do Tempo** — tabela decrescente com eventos; valores restritos se não `canViewHRCosts`
4. **Alocações** — lista de contratos onde está alocado (read-only, derivado dos `resources` do DataContext por `nome` ou futuramente por `hr_person_id`)

#### 7.3 Formulário de Pessoa (modal ou página inline)

**`src/components/hr/HRPersonForm.tsx`** — campos conforme especificação:
- Nome, Tipo de Vínculo, Cargo (Select com job_titles), Departamento (Select com teams)
- Remuneração, Benefícios, Local, Data Admissão, Situação
- Observações, Comitê Gestor
- Se Inativo: Data Desligamento, Tipo Desligamento, Motivo

#### 7.4 Formulário de Evento de Timeline

**`src/components/hr/HRTimelineEventForm.tsx`** — diálogo simples:
- Data, Ocorrência (select), Descrição, Valor (opcional/restrito), Remuneração Após, Benefícios Após
- Toggle "Atualizar remuneração atual com este evento"

---

### Bloco 8 — Integração com Contratos (Autopreenchimento via Módulo RH)

O campo "Nome/Pessoa" no `ResourceForm` já usa `distinctHRNames` derivado de recursos anteriores. Agora será expandido para também sugerir pessoas do módulo RH.

**`src/contexts/DataContext.tsx`** — atualizar `distinctHRNames`:

O memo passará a combinar as duas fontes:
1. Pessoas do `HRContext` (cadastro mestre)
2. Nomes únicos de recursos anteriores (fallback, para contratos existentes)

Ao selecionar uma pessoa do módulo RH, o form preenche: nome, cargo, vínculo, remuneração (se `canViewHRCosts`), benefícios (se `canViewHRCosts`).

**`src/components/forms/ResourceForm.tsx`** — mudanças:
- O combobox de "Nome/Pessoa" exibirá pessoas do módulo RH como primeira opção, agrupadas
- Ao selecionar pessoa do RH: preenche `cargo`, `tipo` (CLT/PJ), `custoBase` (se autorizado)
- A opção "Outro..." continua funcionando para inserção manual

---

### Bloco 9 — Cargos e Equipes dentro do Módulo RH

As páginas `JobTitlesPage` e `TeamsPage` já existem e funcionam. Serão **reutilizadas** com ajuste de breadcrumb:

- Quando acessadas via `/rh/cargos` e `/rh/equipes`: breadcrumb aponta para `Recursos Humanos`
- Quando acessadas via `/configuracoes/cargos` e `/configuracoes/equipes` (rotas legadas): breadcrumb aponta para `Configurações` (mantém compatibilidade)

O `useLocation` nas páginas determinará qual breadcrumb exibir.

**`src/pages/SettingsPage.tsx`:** remover os cards navegacionais de Cargos e Equipes.

---

### Bloco 10 — Exportação de RH

**`src/lib/importExport.ts`** — adicionar:

```typescript
export const hrColumns = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'tipoVinculo', label: 'Vínculo (CLT/PJ)', required: true },
  { key: 'cargo', label: 'Cargo/Função', required: false },
  { key: 'departamento', label: 'Departamento', required: false },
  { key: 'localAtuacao', label: 'Local de Atuação', required: false },
  { key: 'dataAdmissao', label: 'Data de Admissão', required: false },
  { key: 'tempoDeCasa', label: 'Tempo de Casa (meses)', required: false },
  { key: 'situacao', label: 'Situação', required: false },
  { key: 'dataDesligamento', label: 'Data de Desligamento', required: false },
  { key: 'tipoDesligamento', label: 'Tipo de Desligamento', required: false },
  { key: 'motivoDesligamento', label: 'Motivo de Desligamento', required: false },
  { key: 'observacoes', label: 'Observações', required: false },
  { key: 'comiteGestor', label: 'Comitê Gestor (mês/ano)', required: false },
  { key: 'remuneracaoMensal', label: 'Remuneração Mensal', required: false }, // restrito
  { key: 'beneficios', label: 'Benefícios', required: false }, // restrito
];

export function exportHRPeople(
  people: HRPerson[],
  teams: Team[],
  jobTitles: JobTitle[],
  canViewFinanceiro: boolean,
  format: FileFormat
): void { ... }
```

**`src/pages/ImportExportPage.tsx`** — adicionar opção `'hr_people'` ao seletor de exportação:

```typescript
const entityLabels = {
  clients: 'Clientes',
  contracts: 'Contratos',
  resources: 'Recursos (Contratos)',
  hr_people: 'Recursos Humanos (Cadastro Mestre)', // novo
};
```

Ao exportar `hr_people`: campos financeiros aparecem como `"CONFIDENCIAL"` se `!canViewHRCosts`.

---

### Bloco 11 — CommandPalette

**`src/components/layout/CommandPalette.tsx`** — adicionar atalho para `HR`:

```tsx
{canAccessModule('HR') && (
  <CommandItem onSelect={() => runCommand(() => navigate('/rh'))}>
    <UsersRound className="mr-2 h-4 w-4" />
    Recursos Humanos
  </CommandItem>
)}
```

---

### Resumo dos Arquivos a Criar/Modificar

**Criar:**
- `supabase/migrations/XXXXXX_hr_module.sql`
- `src/contexts/HRContext.tsx`
- `src/pages/HRPeoplePage.tsx`
- `src/pages/HRPersonDetailPage.tsx`
- `src/components/hr/HRPersonForm.tsx`
- `src/components/hr/HRTimelineEventForm.tsx`

**Modificar:**
- `src/types/index.ts` — novos tipos HRPerson, HRTimelineEvent
- `src/types/moduleAccess.ts` — adicionar módulo `HR`
- `src/lib/dbMappers.ts` — mappers hr_people e hr_timeline
- `src/lib/importExport.ts` — colunas e função exportHRPeople
- `src/contexts/DataContext.tsx` — atualizar `distinctHRNames` para incluir pessoas do HR
- `src/App.tsx` — adicionar HRProvider + rotas `/rh`, `/rh/pessoas/:id`, `/rh/cargos`, `/rh/equipes`
- `src/components/layout/Sidebar.tsx` — adicionar item "Recursos Humanos"
- `src/components/layout/CommandPalette.tsx` — atalho para RH
- `src/components/forms/ResourceForm.tsx` — integração com cadastro mestre RH
- `src/pages/SettingsPage.tsx` — remover cards de Cargos e Equipes
- `src/pages/JobTitlesPage.tsx` — breadcrumb dinâmico (RH ou Configurações)
- `src/pages/TeamsPage.tsx` — breadcrumb dinâmico (RH ou Configurações)
- `src/pages/ImportExportPage.tsx` — opção de exportar RH

---

### Critérios de Preservação

- Todos os dados existentes (contratos, recursos, clientes) continuam funcionando sem alteração
- A opção "Outro..." no `ResourceForm` para inserção manual continua disponível
- As rotas antigas `/configuracoes/cargos` e `/configuracoes/equipes` continuam funcionando
- A lógica `canViewHRCosts` existente no `AuthContext` é reutilizada para controlar visibilidade de valores financeiros em todo o módulo
- O módulo `HR` no `MODULE_CATALOG` não tem `roleRestrictions` vazias — o acesso é controlado individualmente via `moduleAccess` por usuário, igual aos demais módulos sensíveis
