

## Plano: Corrigir Recursos e Resultados do Simulador

### Problemas identificados

1. **Quantidade decimal**: O campo `quantity` aceita decimais (`step={0.1}`, `parseFloat`), causando confusão nos custos.

2. **Cálculos de resultado circular**: A função `calculateSimulationResults` usa `suggestPricing` para derivar receita a partir dos custos. Ou seja, a receita é calculada como `custo / (1 - margem%)`. Em seguida, aplica impostos (~16.33%) sobre essa receita e subtrai os custos. O campo `proposedMonthlyValue` existe no tipo e no banco mas **nunca é usado nos cálculos** — o sistema sempre inventa a receita a partir dos custos. Se o usuário informou um valor de contrato, ele é ignorado.

3. **Cenários confusos**: A tabela de cenários mostra colunas técnicas (Overhead separado, Receita repetida) sem explicação do que cada cenário representa.

### O que será feito

**1. Aba Recursos — `Step4Resources.tsx`**
- Campo quantidade: trocar para `step={1}`, `min={1}`, `parseInt`, default = 1
- Garantir que ao adicionar novo recurso, `quantity = 1`

**2. Cálculos — `simulationEngine.ts`**
- `calculateSimulationResults`: se `proposedMonthlyValue > 0`, usar como receita bruta em vez do valor sugerido. Isso permite que o usuário defina o valor real do contrato e veja margem real.
- Se não houver valor proposto, continua usando `suggestPricing` como referência.

**3. Aba Resultado — `Step5Results.tsx`**
- Adicionar campo editável de "Valor mensal do contrato" no topo, vinculado a `proposedMonthlyValue`, para que o usuário possa informar o valor real e ver os cards recalcularem
- Se vazio, usar o valor sugerido como referência
- Cenários: adicionar descrição curta para cada (Conservador = "+10% custos", Base = "custos atuais", Otimista = "-10% custos"). Simplificar tabela removendo coluna Overhead separada.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/calculator/Step4Resources.tsx` | Quantidade inteira, default 1 |
| `src/lib/simulationEngine.ts` | Usar `proposedMonthlyValue` como receita quando disponível |
| `src/components/calculator/Step5Results.tsx` | Campo editável de receita, cenários mais claros |

