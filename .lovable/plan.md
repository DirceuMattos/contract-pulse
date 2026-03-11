

## Alterações no Módulo de Recursos Humanos

### 1. Auto-registro na Linha do Tempo ao editar pessoa

**Arquivo:** `src/pages/HRPersonDetailPage.tsx` — `handleSavePerson`

Antes de chamar `updatePerson`, comparar os valores antigos (`person`) com os novos (`data`) nos campos monitorados. Para cada campo alterado, gerar automaticamente um `addTimelineEvent` com ocorrência `'observacao'` (ou tipo específico quando aplicável) e descrição detalhada.

Campos monitorados e lógica:
| Campo | Comparação | Descrição gerada |
|---|---|---|
| `tipoVinculo` | `person.tipoVinculo !== data.tipoVinculo` | "Tipo de vínculo alterado de CLT para PJ" |
| `situacao` | `person.situacao !== data.situacao` | "Situação alterada de Ativo para Inativo" |
| `cargoId` | `person.cargoId !== data.cargoId` | "Cargo alterado de X para Y" (resolver labels via jobTitles) |
| `teamId` | `person.teamId !== data.teamId` | "Departamento alterado de X para Y" |
| `localAtuacao` | `person.localAtuacao !== data.localAtuacao` | "Local de atuação alterado de X para Y" |
| `nivel` | `person.nivel !== data.nivel` | "Nível alterado de X para Y" |
| `trilha` | `person.trilha !== data.trilha` | "Trilha alterada de X para Y" |
| `remuneracaoMensal` | `person.remuneracaoMensal !== data.remuneracaoMensal` | "Remuneração mensal alterada de R$ X para R$ Y" |
| `beneficios` | `person.beneficios !== data.beneficios` | "Benefícios alterado de R$ X para R$ Y" |

**Cargo especial:** quando `cargoId` muda, além do evento na timeline, o campo `cargoAntigo` é automaticamente preenchido com o label do cargo anterior (requisito 3).

Todas as alterações detectadas são consolidadas em um único evento de timeline (ou um por campo, a depender da preferência — recomendo um único evento com todas as mudanças listadas para não poluir a timeline).

### 2. Campo Benefício com nome e flag de soma

**Tipo (`src/types/index.ts` — `HRPerson`):**
- Adicionar `beneficioNome?: string` — nome/tipo do benefício (ex: "Auxílio Creche")
- Adicionar `beneficioSomaRemuneracao?: boolean` — flag para somar ao campo Remuneração Total

**Schema (`src/components/hr/HRPersonForm.tsx`):**
- Adicionar campos `beneficioNome` (select com opções livres) e `beneficioSomaRemuneracao` (switch/checkbox)
- Layout: Benefícios (R$) na linha abaixo de Remuneração Mensal, com os 3 campos lado a lado: valor | nome do benefício (select) | flag soma

**Opções do select de benefício:** Auxílio Creche, Auxílio Certificação, Auxílio Universidade, Bolsa de Estudos, Convênio Médico, Vale Alimentação, Vale Refeição, Vale Transporte, Plano Odontológico, Outro.

**DB mapper (`src/lib/dbMappers.ts`):** Mapear os novos campos `beneficio_nome` e `beneficio_soma_remuneracao` no banco.

**Migração SQL:** Adicionar colunas `beneficio_nome text`, `beneficio_soma_remuneracao boolean default false` à tabela `hr_people`.

### 3. Atualização automática de Cargo Anterior

Já coberto no item 1: quando `cargoId` muda, `cargoAntigo` recebe o label do cargo anterior automaticamente via `handleSavePerson`.

### 4. Renomear label do campo Remuneração II

**Arquivos:** `src/components/hr/HRPersonForm.tsx` e `src/pages/HRPersonDetailPage.tsx`
- De: "Remuneração II — VA / Ajuste (R$)"
- Para: "Remuneração Total (Remuneração Mensal + Benefícios)"

**Lógica de cálculo:** Quando `beneficioSomaRemuneracao === true`, o valor exibido/calculado neste campo será `remuneracaoMensal + beneficios` automaticamente. No formulário, se a flag estiver ativa, o campo se torna read-only e calculado.

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/types/index.ts` | Adicionar `beneficioNome`, `beneficioSomaRemuneracao` ao `HRPerson` |
| `src/components/hr/HRPersonForm.tsx` | Reestruturar seção financeira, adicionar campos, renomear label |
| `src/pages/HRPersonDetailPage.tsx` | Auto-timeline em `handleSavePerson`, renomear label financeiro, auto cargo anterior |
| `src/lib/dbMappers.ts` | Mapear novos campos |
| `src/contexts/HRContext.tsx` | Sem mudança estrutural (usa `updatePerson` existente) |
| **Migração SQL** | `ALTER TABLE hr_people ADD COLUMN beneficio_nome text, ADD COLUMN beneficio_soma_remuneracao boolean DEFAULT false` |

