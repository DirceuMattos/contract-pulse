

## Plano: Incluir custos de "Outros Recursos" dos subprojetos no contrato principal

### Problema

Quando um contrato tem subprojetos, os "outros recursos" (tipo `outro`) sao alocados via `subproject_allocations` com `resource_id` e `cost_value`. Porem:

1. O card "Outros Recursos" na pagina de detalhes do contrato (`ContractDetailPage.tsx`) so exibe recursos da tabela `resources` — ignora os alocados nos subprojetos
2. O calculo de custo total (`calculateContractHealth`) so considera recursos diretos da tabela `resources` — nao soma custos de alocacoes de subprojetos
3. O card "Distribuicao de Custos" nao reflete esses custos extras

### Solucao

Quando `hasSubprojects(contractId)` for `true`, agregar os custos de "outros recursos" das alocacoes de subprojetos e exibi-los no card "Outros Recursos" e no calculo total.

### Alteracoes

**1. `src/pages/ContractDetailPage.tsx`**

- Importar `getAllocationsByContract` do `useSubprojects`
- Na secao "Outros Recursos" (~linha 644):
  - Quando `hasSubprojects(id)`, alem dos recursos diretos do tipo `outro`, listar tambem as alocacoes de subprojetos que tem `resourceId` (buscando o recurso no `resourcesMap` para nome/categoria)
  - Exibir o custo usando `alloc.costValue` ou fallback para `resource.custoBase * dedicacao`
- No calculo de `costsByType` (~linha 127):
  - Quando `hasSubprojects(id)`, somar ao custo de "Outros" os custos das alocacoes de subprojetos com `resourceId`
  - Ajustar a contagem de recursos

**2. `src/lib/calculations.ts`** (opcional, se necessario para health)

- `calculateContractHealth` ja recebe `resources` do contrato (que inclui os recursos tipo `outro` cadastrados). Se os "outros recursos" dos subprojetos ja existem na tabela `resources` com `contract_id` do contrato, eles ja sao contados. 
- Verificar: se os recursos alocados nos subprojetos sao os mesmos da tabela `resources` (mesmo `id`), entao o custo base ja esta no calculo. O que muda e que no subprojeto o `cost_value` e `dedication_percent` podem diferir.
- Quando ha subprojetos, substituir o custo dos recursos tipo `outro` pelo somatario das alocacoes dos subprojetos (cost_value * dedication) para evitar dupla contagem ou valores divergentes.

**Abordagem simplificada:** Como os recursos tipo `outro` ja existem na tabela `resources` e ja sao contabilizados no custo do contrato via `calculateContractCost`, o que precisamos garantir e:

1. **Exibicao no card "Outros"**: mostrar os recursos com seus custos reais (vindos das alocacoes nos subprojetos quando aplicavel)
2. **Custo total coerente**: se o `cost_value` da alocacao difere do `custoBase` do recurso, o card deve refletir o valor da alocacao

**Arquivo unico editado: `src/pages/ContractDetailPage.tsx`**

- Na secao "Outros Recursos", quando `hasSubprojects(id)`:
  - Buscar alocacoes do contrato via `getAllocationsByContract(id)`
  - Filtrar alocacoes com `resourceId`
  - Para cada alocacao, exibir o recurso com o custo = `alloc.costValue ?? resource.custoBase` * `alloc.dedicationPercent / 100`
  - Agrupar por recurso (um recurso pode estar em varios subprojetos — somar dedicacoes)
- No card "Distribuicao de Custos", ajustar o custo de "Outros" para refletir a soma das alocacoes quando ha subprojetos
- Contratos sem subprojetos nao sao afetados — mantem comportamento atual

