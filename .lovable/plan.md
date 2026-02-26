

## Diagnóstico: Integração RH Mestre com Módulos Dependentes

### Problemas Encontrados

1. **Fallback silencioso no resolver**: Quando `hrPersonId` existe mas a pessoa não é encontrada, o sistema usa dados antigos sem avisar. Deveria sinalizar o link quebrado.

2. **Cálculos não passam pelo resolver**: Apenas `ContractResourcesPage` chama `resolveResourceForCalc` antes de calcular custos. Todos os demais módulos (Dashboard, Contratos, Detalhe de Contrato, Detalhe de Cliente, Squads) usam `resource.custoBase` direto — ignorando o valor atualizado do RH Mestre.

3. **Sem indicador visual de link quebrado**: Nenhum módulo mostra aviso quando um recurso vinculado ao RH aponta para uma pessoa inexistente.

### Implementação Realizada ✅

#### 1. Flag `isBrokenLink` no resolver ✅
- `ResolvedResource` agora inclui `isBrokenLink: boolean`
- Quando `hrPersonId` existe mas pessoa não é encontrada: retorna `isBrokenLink: true`
- `resolveResourceForCalc`: loga warning no console quando link quebrado

#### 2. Hook `useResolvedResources` centralizado ✅
- Criado `src/hooks/useResolvedResources.ts` — combina DataContext + HRContext
- Retorna `resolvedResources` (com custos do RH Mestre) e `brokenLinkCount`

#### 3. Todos os módulos usando recursos resolvidos ✅
- `DashboardPage` — usa `resolvedResources` nos cálculos de KPIs
- `ContractsPage` — usa `resolvedResources` no cálculo de saúde
- `ContractDetailPage` — usa `resolvedResources` no cálculo de saúde e custos
- `ClientDetailPage` — usa `resolvedResources` no cálculo de saúde
- `SquadsPage` — usa `resolvedResources` nos cálculos
- `useAlerts` — usa `resolvedResources` na geração de alertas

#### 4. Indicadores visuais de links quebrados ✅
- `ContractResourcesPage`: Badge "Link quebrado" com ícone de alerta e tooltip
- `SquadsPage`: Ícone de alerta amarelo ao lado do nome com tooltip

#### 5. Alerta de links órfãos ✅
- `useAlerts` gera alerta tipo `hr-links-quebrados` quando há vínculos quebrados
- Alerta aparece no Dashboard e na página de Alertas

### Resultado

- **(a)** Nova importação de RH → dados refletidos automaticamente em todos os módulos via resolver centralizado
- **(b)** Sincronização Feedz → atualiza `hr_people` → resolver usa dados frescos em todos os cálculos
- **(c)** Qualquer atualização no RH Mestre propaga para Dashboard, Contratos, Squads e todos os demais módulos sem intervenção manual
