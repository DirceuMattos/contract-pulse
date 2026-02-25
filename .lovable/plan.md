

# Plano: Integração Total do Cadastro Mestre de RH com Contratos, Recursos e Squads

## Resumo Executivo

Atualmente, os recursos alocados em contratos armazenam dados duplicados (nome, cargo, custo) diretamente na tabela `resources`. Este plano transforma o modelo para que a **tabela `hr_people` seja a fonte única de verdade**, mantendo compatibilidade total com registros legados.

---

## 1. Modelo de Dados — Nova coluna `hr_person_id` na tabela `resources`

**Abordagem**: Em vez de criar uma nova tabela `contract_human_allocations`, vamos **estender a tabela `resources` existente** com um campo `hr_person_id` (FK para `hr_people`). Isso minimiza a refatoração e preserva todos os cálculos, overhead e lógica de break-even já implementados.

**Migration SQL**:
```sql
ALTER TABLE public.resources
  ADD COLUMN hr_person_id uuid REFERENCES public.hr_people(id) ON DELETE SET NULL;
```

**Regras de leitura (prioridade)**:
- Se `hr_person_id` IS NOT NULL → dados (nome, cargo, vínculo, custo) vêm do RH Mestre (`hr_people`)
- Se `hr_person_id` IS NULL → dados vêm dos campos locais (legado)

**Campos legados preservados**: `nome`, `cargo`, `senioridade`, `custo_base` continuam na tabela `resources` como fallback e snapshot de auditoria.

---

## 2. Atualização de Tipos e Mappers

**`src/types/index.ts`** — Adicionar ao tipo `Resource`:
```typescript
hrPersonId?: string;  // FK para RH Mestre
```

**`src/lib/dbMappers.ts`** — `resourceFromDb` e `resourceToDb`:
- Mapear `hr_person_id` ↔ `hrPersonId`

---

## 3. Função de Resolução: `resolveResource()`

Criar em `src/lib/resourceResolver.ts` uma função utilitária:

```typescript
function resolveResource(resource: Resource, hrPeople: HRPerson[], jobTitles: JobTitle[], teams: Team[]) {
  if (resource.hrPersonId) {
    const person = hrPeople.find(p => p.id === resource.hrPersonId);
    if (person) {
      const job = jobTitles.find(j => j.id === person.cargoId);
      const team = teams.find(t => t.id === person.teamId);
      return {
        nome: person.nome,
        cargo: job?.label ?? resource.cargo,
        teamName: team?.name,
        teamId: person.teamId,
        tipoVinculo: person.tipoVinculo,
        custoBase: person.remuneracaoMensal,
        isLinked: true,
      };
    }
  }
  // Fallback legado
  return {
    nome: resource.nome,
    cargo: resource.cargo,
    teamName: undefined,
    teamId: undefined,
    tipoVinculo: resource.tipo === 'clt' ? 'clt' : 'pj',
    custoBase: resource.custoBase,
    isLinked: false,
  };
}
```

Esta função será usada em **Contratos**, **Squads** e **Cálculos**.

---

## 4. Contratos > Recursos (UI)

### 4.1 Seleção de RH (ResourceForm)

Refatorar o campo "Nome / Pessoa" no `ResourceForm.tsx`:
- Substituir o combobox atual (que mistura nomes de HR e legados) por um **combobox que busca diretamente do `hr_people`** via `useHR()`.
- Ao selecionar uma pessoa:
  - Preencher `hrPersonId` no recurso
  - Exibir cargo (read-only, vindo do RH Mestre)
  - Exibir equipe/departamento (read-only)
  - Preencher `tipo` (CLT/PJ) automaticamente baseado em `tipoVinculo`
  - Preencher `custoBase` com `remuneracaoMensal` (apenas se `canViewHRCosts`)
  - Campo de `dedicação%` continua editável
- Manter opção "Outro..." para entrada manual (registros sem vínculo)

### 4.2 Exibição de Recursos Alocados (ContractResourcesPage)

Na lista de recursos do contrato:
- Usar `resolveResource()` para exibir nome, cargo e equipe
- Se `isLinked === true`: mostrar dados do RH Mestre
- Se `isLinked === false`: mostrar dados locais + Badge "Legado" + botão "Vincular"
- Coluna "Equipe/Depto" adicionada (quando vinculado ao RH Mestre)
- Custos de RH: respeitar `canViewHRCosts` (já implementado)

### 4.3 Atualização Imediata

- Ao editar pessoa no RH Mestre, os dados são refletidos automaticamente nos contratos e squads, pois a resolução é feita em runtime via `resolveResource()` usando os dados mais recentes do `HRContext`.
- Não é necessário realtime: o `HRProvider` carrega na inicialização e o `DataContext` re-fetcha ao navegar.

---

## 5. Squads (Integração Total)

**Refatorar `SquadsPage.tsx`**:

Atualmente, Squads determina a equipe de um recurso fazendo match textual (`cargo → jobTitle → teamId`). Com a integração:

- Se `resource.hrPersonId` existe → obter `teamId` diretamente do `hr_people.teamId`
- Se não → manter lógica legada (match por cargo)

Dados exibidos:
- **Nome**: do RH Mestre (quando vinculado)
- **Cargo**: do RH Mestre (quando vinculado)
- **Equipe**: do RH Mestre (quando vinculado)
- **Dedicação%**: do recurso/contrato (sem mudança)

**Visão "Por Recurso"**: Atualmente agrupa por `nome+cargo` como chave. Com a integração:
- Se vinculado: agrupar por `hrPersonId` (identificador único real)
- Se legado: manter agrupamento por nome+cargo

---

## 6. Cálculos (Break-even e Custo de RH)

**`calculateResourceCost()`** em `src/lib/calculations.ts`:

Para recursos vinculados ao RH Mestre, o custo base deve vir de `hr_people.remuneracaoMensal`. Duas abordagens:

**Abordagem escolhida**: A função `calculateResourceCost()` continua recebendo `resource.custoBase`. O valor de `custoBase` será atualizado em tempo de leitura:
- Criar um hook `useResolvedResources(contractId)` que retorna resources com `custoBase` substituído pelo valor do RH Mestre quando `hrPersonId` existe.
- Isso preserva toda a lógica de cálculos existente sem alteração.

**Compatibilidade**: Recursos legados (sem `hrPersonId`) continuam usando `custoBase` da tabela `resources`.

---

## 7. Migração/Compatibilidade

### 7.1 Utilitário "Vincular Alocações Legadas"

Criar uma seção em **Configurações** (acessível apenas C-Level):
- Lista todos os recursos CLT/PJ sem `hrPersonId`
- Para cada um, mostra nome e cargo atuais + combobox para selecionar pessoa do RH Mestre
- Botão "Vincular" que faz `UPDATE resources SET hr_person_id = ? WHERE id = ?`
- Relatório: X vinculados, Y pendentes

### 7.2 Badge "Legado" inline

Na lista de recursos do contrato e no Squads:
- Recursos sem `hrPersonId`: Badge "Legado" (amarelo)
- Botão rápido "Vincular" que abre mini-dialog para selecionar pessoa

---

## 8. Performance e Cache

- `HRContext` já carrega `hrPeople` na inicialização
- `DataContext` já carrega `resources` na inicialização
- `resolveResource()` é puro (sem side-effects) — resolve em O(1) por recurso com lookup Map
- Ao salvar no RH Mestre (`updatePerson`), invalidar/re-render via state change no `HRContext` → componentes que usam `useHR()` re-renderizam automaticamente
- Sem necessidade de realtime neste momento

---

## 9. Sequência de Implementação

1. **Migration de banco**: Adicionar `hr_person_id` na tabela `resources`
2. **Tipos e mappers**: Atualizar `Resource` type e `resourceFromDb`/`resourceToDb`
3. **Resolver**: Criar `src/lib/resourceResolver.ts` com `resolveResource()`
4. **ResourceForm**: Refatorar seleção de pessoa para vincular ao RH Mestre
5. **ContractResourcesPage**: Usar resolver, exibir equipe, badge legado
6. **SquadsPage**: Refatorar para usar `hrPersonId` na determinação de equipe
7. **Cálculos**: Hook `useResolvedResources` para custo base do RH Mestre
8. **Utilitário de migração**: Tela de vinculação em lote nas Configurações
9. **Testes manuais**: Validar cenários de aceite

---

## Detalhes Técnicos

### Arquivos a criar:
- `src/lib/resourceResolver.ts`

### Arquivos a modificar:
- `src/types/index.ts` (adicionar `hrPersonId` ao `Resource`)
- `src/lib/dbMappers.ts` (mapear `hr_person_id`)
- `src/components/forms/ResourceForm.tsx` (refatorar seleção de pessoa)
- `src/pages/ContractResourcesPage.tsx` (usar resolver, badge legado)
- `src/pages/SquadsPage.tsx` (usar `hrPersonId` para equipe)
- `src/lib/calculations.ts` (ou hook wrapper para custo do RH Mestre)
- `src/pages/SettingsPage.tsx` (utilitário de vinculação em lote)
- `src/contexts/DataContext.tsx` (expor dados resolvidos)

### Migration SQL:
```sql
ALTER TABLE public.resources
  ADD COLUMN hr_person_id uuid REFERENCES public.hr_people(id) ON DELETE SET NULL;
```

### Impacto em RLS:
Nenhum — a coluna `hr_person_id` é apenas referência; as policies existentes na tabela `resources` continuam válidas.

