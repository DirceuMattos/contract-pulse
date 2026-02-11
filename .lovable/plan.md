

# Ajustes na Calculadora de Contratos

## 1. Encargos automaticos ao mudar tipo de contratacao (CLT/PJ)

Quando o usuario altera o tipo de contratacao de um recurso humano de CLT para PJ (ou vice-versa), o percentual de encargos deve ser atualizado automaticamente:
- **CLT**: 68%
- **PJ**: 10%

### Arquivo: `src/components/calculator/Step4Resources.tsx`
- Na funcao `updateHR`, ao detectar que o campo alterado e `hiringType`, atualizar tambem o campo `chargesPercent` com o valor correspondente (68 para CLT, 10 para PJ).

---

## 2. Quantidade zero = custo total zero

O calculo atual (`quantity * grossMonthly * (1 + chargesPercent/100)`) ja deveria retornar zero quando `quantity = 0`. O possivel bug esta em inputs que ficam vazios gerando `NaN` em vez de `0`, propagando valores incorretos.

### Arquivo: `src/components/calculator/Step4Resources.tsx`
- Garantir que o `parseFloat` dos campos numericos (quantity, grossMonthly, chargesPercent) nunca gere `NaN` -- usar fallback para 0.
- Proteger a exibicao do custo total na coluna: se `quantity === 0`, exibir `R$ 0,00` explicitamente.

### Arquivo: `src/lib/simulationEngine.ts`
- Na funcao `computeCosts`, adicionar guard: se `item.quantity <= 0`, contribuicao = 0. (Seguranca extra.)

---

## 3. Campo de custo de consultoria no Passo 1

A area comercial pode trazer um custo de consultoria ja conhecido antes mesmo da contratacao. Esse valor deve ser capturado no Passo 1 (Identificacao) e aparecer automaticamente em Outros Custos no Passo 3 (Recursos).

### Arquivo: `src/types/index.ts`
- Adicionar campo opcional `consultancyCost?: number` ao tipo `ContractSimulation`.

### Arquivo: `src/components/calculator/Step1Identification.tsx`
- Adicionar campo numerico "Custo de consultoria previsto (mensal)" com placeholder e tooltip explicando que este valor sera incluido automaticamente na composicao de custos.

### Arquivo: `src/components/calculator/Step4Resources.tsx`
- Na secao "Outros Custos", exibir uma linha read-only no topo da tabela com categoria "Consultoria Comercial" e o valor de `data.consultancyCost`, caso seja maior que zero.
- Essa linha nao pode ser editada nem removida pelo usuario nesta tela (vem do Passo 1).

### Arquivo: `src/lib/simulationEngine.ts`
- Na funcao `computeCosts`, somar `simulation.consultancyCost || 0` ao `custoOutros`.

---

## Resumo dos arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/index.ts` | Adicionar `consultancyCost?: number` em `ContractSimulation` |
| `src/components/calculator/Step1Identification.tsx` | Novo campo "Custo de consultoria" |
| `src/components/calculator/Step4Resources.tsx` | Auto-update encargos ao mudar tipo; protecao qty=0; linha consultoria read-only |
| `src/lib/simulationEngine.ts` | Guard qty<=0 em `computeCosts`; somar `consultancyCost` |

