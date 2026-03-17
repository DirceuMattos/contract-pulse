

## Diagnóstico

Analisei o `ContractResourcesPage.tsx` e identifiquei as duas causas raiz:

### Problema 1 — Card "Custo Mensal Total" incorreto
O `ContractDetailPage` aplica um ajuste delta para recalcular o custo total quando existem subprojetos (linhas 122-141), substituindo o custo base dos recursos "Outros" pelo custo real das alocações nos subprojetos. O `ContractResourcesPage` **não faz esse ajuste** — usa `calculateContractHealth` diretamente (linha 143), sem corrigir o custo com os dados das alocações de subprojeto.

### Problema 2 — Recurso "Infraestrutura de Nuvem" exibe R$0
Na lista de "Recursos Alocados" (linha 586), cada recurso exibe o custo via `calculateResourceCost(resource, settings)`, que para tipo `outro` retorna `custoBase * (percentualDedicacao / 100)`. Porém, quando o recurso tem alocação em subprojeto com `costValue` customizado (e o `custoBase` original do recurso pode ser diferente ou zero), esse valor não é utilizado. O `subprojectOutrosCostMap` já tem o custo correto, mas só é usado nos cards de resumo por tipo — nunca na listagem individual.

---

## Plano de Correção

**Arquivo: `src/pages/ContractResourcesPage.tsx`**

### Correção 1 — Aplicar delta de subprojeto ao `health`
Replicar a mesma lógica do `ContractDetailPage`: após calcular `health` com `calculateContractHealth`, recalcular `custoMensal` somando o delta entre o custo real dos "Outros" via alocações de subprojeto e o custo original.

```text
health = calculateContractHealth(...)
if (subprojectOutrosCostMap has entries):
   custoOutrosOriginal = sum of calculateResourceCost for all "outro" resources
   custoOutrosSubprojetos = sum using subprojectOutrosCostMap (or fallback)
   delta = custoOutrosSubprojetos - custoOutrosOriginal
   adjust health.custoMensal, margemMensal, margemPercentual, status
```

### Correção 2 — Usar custo de alocação na lista individual
Na renderização de cada recurso `outro` (linha 586), quando `subprojectOutrosCostMap` tem dados para aquele recurso, usar `allocData.totalCost` em vez de `calculateResourceCost(resource, settings)`.

Ambas as correções ficam no mesmo arquivo, ~20 linhas alteradas.

