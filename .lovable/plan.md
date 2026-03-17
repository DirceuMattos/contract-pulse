

## Plano: Corrigir custo no card Status de Saúde para refletir custos de subprojetos

### Problema

Na `ContractDetailPage.tsx`, linha 133:
```typescript
const health = calculateContractHealth(contract, contractResources, settings, [], overheadAlloc.value);
```

`calculateContractHealth` chama `calculateContractCost` que usa `calculateResourceCost` para cada recurso — usando sempre o `custoBase` original. Quando há subprojetos, os recursos "outro" podem ter `costValue` e `dedicationPercent` diferentes nas alocações, mas isso não é refletido no cálculo de saúde.

O card "Distribuição de Custos" está correto porque usa `subprojectOutrosCost`. Mas o card "Status de Saúde" usa `health.custoMensal` que vem do cálculo padrão.

### Solução

**Arquivo: `src/pages/ContractDetailPage.tsx`**

Após calcular `health` (linha 133), quando `contractHasSubs` e `subprojectOutrosCost` existirem, ajustar os valores de `health`:

1. Calcular a diferença entre o custo de "outros" via subprojetos e o custo padrão
2. Criar um `adjustedHealth` que substitui `custoMensal`, `margemMensal`, `margemPercentual` e `status` com os valores corrigidos

```
custoOutrosOriginal = soma de calculateResourceCost para recursos tipo 'outro'
custoOutrosSubprojetos = soma de subprojectOutrosCost values
delta = custoOutrosSubprojetos - custoOutrosOriginal
adjustedHealth.custoMensal = health.custoMensal + delta
adjustedHealth.margemMensal = health.receitaLiquida - adjustedHealth.custoMensal
adjustedHealth.margemPercentual = recalcular
adjustedHealth.status = getHealthStatus(adjustedHealth.margemPercentual, settings)
```

Usar `adjustedHealth` (ou `health` quando não há subprojetos) em todo o restante da página.

