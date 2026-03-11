

## Plano: Alterar base de cálculo do overhead para receita mensal do contrato

### Mudança principal
O overhead percentual passará a ser calculado sobre a **receita mensal do contrato** (valor MRR ou média mensal) em vez da soma dos custos dos recursos.

### Alterações

**1. `src/lib/calculations.ts` — `calculateOverheadCost`**
- Adicionar parâmetro `contract: Contract` à função.
- Usar `getContractRevenue(contract)` como base para o cálculo percentual, substituindo a soma dos custos dos recursos.
- Remover os parâmetros `resources` e `settings` que deixam de ser necessários para o overhead (manter apenas `overheadItems` e `contract`).

**2. `src/lib/calculations.ts` — `calculateContractHealth`**
- Atualizar a chamada a `calculateOverheadCost` passando o `contract`.

**3. `src/pages/ContractResourcesPage.tsx`**
- Alterar o `baseCalculo` passado ao `OverheadForm`: de `health.custoMensal - overheadCost.total` para `health.receitaBruta` (receita mensal do contrato).

**4. `src/components/forms/OverheadForm.tsx`**
- Atualizar os textos de tooltip: de "RH + Outros diretos" / "base de execução" para "Receita mensal do contrato".

