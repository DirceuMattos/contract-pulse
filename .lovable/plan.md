

## Diagnóstico: Integração RH Mestre com Módulos Dependentes

### Problemas Encontrados

1. **Fallback silencioso no resolver**: Quando `hrPersonId` existe mas a pessoa não é encontrada, o sistema usa dados antigos sem avisar. Deveria sinalizar o link quebrado.

2. **Cálculos não passam pelo resolver**: Apenas `ContractResourcesPage` chama `resolveResourceForCalc` antes de calcular custos. Todos os demais módulos (Dashboard, Contratos, Detalhe de Contrato, Detalhe de Cliente, Squads) usam `resource.custoBase` direto — ignorando o valor atualizado do RH Mestre.

3. **Sem indicador visual de link quebrado**: Nenhum módulo mostra aviso quando um recurso vinculado ao RH aponta para uma pessoa inexistente.

### Plano de Implementação

#### 1. Adicionar flag `isBrokenLink` ao resolver
**Arquivo**: `src/lib/resourceResolver.ts`
- Adicionar `isBrokenLink: boolean` ao tipo `ResolvedResource`
- Quando `hrPersonId` existe mas pessoa não é encontrada: retornar `isBrokenLink: true`
- `resolveResourceForCalc`: logar warning no console quando link quebrado

#### 2. Centralizar resolução de recursos no DataContext
**Arquivo**: `src/contexts/DataContext.tsx`
- Criar função `getResolvedResources()` que aplica `resolveResourceForCalc` em todos os recursos usando `hrPeople` do HRContext
- Expor `resolvedResources` no contexto para que todos os módulos usem dados atualizados automaticamente

#### 3. Atualizar todos os módulos para usar recursos resolvidos
**Arquivos**:
- `src/pages/DashboardPage.tsx` — usar `resolvedResources` nos cálculos de KPIs
- `src/pages/ContractsPage.tsx` — usar `resolvedResources` no cálculo de saúde
- `src/pages/ContractDetailPage.tsx` — usar `resolvedResources` no cálculo de saúde e custos
- `src/pages/ClientDetailPage.tsx` — usar `resolvedResources` no cálculo de saúde
- `src/pages/SquadsPage.tsx` — usar `resolvedResources` nos cálculos (já usa resolver para display)
- `src/pages/ContractResourcesPage.tsx` — simplificar, pois já não precisará resolver localmente

#### 4. Adicionar indicadores visuais de links quebrados
**Arquivos**: `ContractResourcesPage.tsx`, `SquadsPage.tsx`
- Ícone de alerta (triângulo amarelo) ao lado do nome do recurso quando `isBrokenLink === true`
- Tooltip: "Pessoa não encontrada no RH Mestre — dados podem estar desatualizados"

#### 5. Alerta no Dashboard para links órfãos
**Arquivo**: `src/pages/DashboardPage.tsx` ou `src/lib/alertGenerator.ts`
- Contar recursos com `hrPersonId` definido mas pessoa ausente
- Exibir banner/alerta informando quantidade de vínculos quebrados

### Resultado Esperado

Após estas mudanças:
- **(a)** Nova importação de RH → dados refletidos automaticamente em todos os módulos via resolver centralizado
- **(b)** Sincronização Feedz → atualiza `hr_people` → resolver usa dados frescos em todos os cálculos
- **(c)** Qualquer atualização no RH Mestre propaga para Dashboard, Contratos, Squads e todos os demais módulos sem intervenção manual

