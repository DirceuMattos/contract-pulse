

# Plano: Reestruturar Calculadora -- Remover Precificacao + Sugestao de Valor + Insights IA

## Resumo
Reestruturar o wizard da Calculadora de 5 para 4 passos, removendo o Passo 2 (Precificacao). O sistema passa a **sugerir** o valor mensal, total e prazo ideal no Passo 4 (Resultados), baseado nos custos apurados e margem-alvo. Alem disso, adicionar um bloco de **insights de IA** com analise e recomendacoes sobre o negocio, usando o Lovable AI Gateway via edge function.

---

## Mudanca Estrutural do Wizard

```text
ANTES (5 passos):                    DEPOIS (4 passos):
1. Identificacao                     1. Identificacao
2. Precificacao  <-- REMOVIDO        2. Complexidade e Questionario
3. Complexidade e Questionario       3. Estrutura de Recursos
4. Estrutura de Recursos             4. Resultado, Sugestao e Insights
5. Resultado e Cenarios
```

---

## 1. Remover Step2Pricing e ajustar stepper

### Arquivo: `src/components/calculator/SimulationStepper.tsx`
Reduzir de 5 para 4 passos:
- Identificacao, Complexidade, Recursos, Resultado

### Arquivo: `src/pages/CalculatorWizardPage.tsx`
- Remover import e render do `Step2Pricing`
- Reindexar: step 0 = Identificacao, step 1 = Questionario, step 2 = Recursos, step 3 = Resultado
- Ajustar `next`/`prev` para max step 3
- Remover campos `pricingModel`, `proposedMonthlyValue`, `proposedTotalValue` do `createBlank`

### Arquivo: `src/components/calculator/Step2Pricing.tsx`
- Manter o arquivo mas deixar sem uso (ou deletar). Recomendacao: deletar.

---

## 2. Motor de sugestao de precificacao

### Arquivo: `src/lib/simulationEngine.ts`

Nova funcao `suggestPricing(simulation)`:

```typescript
export function suggestPricing(simulation: ContractSimulation): {
  suggestedMonthlyValue: number;
  suggestedTotalValue: number;
  suggestedTermMonths: number;
  targetMarginPercent: number;
  breakEvenMonthly: number;
} {
  // Calcula custo mensal total (RH + outros + overhead)
  // breakEvenMonthly = custo mensal total (margem 0%)
  // suggestedMonthly = custo / (1 - margemAlvo)
  // margemAlvo baseada em complexidade:
  //   baixa: 25%, media: 20%, alta: 15%
  // suggestedTerm baseado em demandType:
  //   sustentacao: 12, evolucao: 18, novo-sistema: 24, implantacao: 36
  //   + ajuste se GOV: +12 meses
  // suggestedTotal = suggestedMonthly * suggestedTerm
}
```

Atualizar `calculateSimulationResults` para usar `suggestPricing` como receita quando `proposedMonthlyValue` nao estiver definido (ou sempre, ja que agora o sistema sugere).

---

## 3. Atualizar Step5Results (agora Passo 4)

### Arquivo: `src/components/calculator/Step5Results.tsx`

Adicionar novas secoes:

**Secao 1 -- Sugestao de Precificacao** (novo, no topo):
- Card destacado com:
  - "Valor mensal sugerido: R$ XX.XXX"
  - "Valor total sugerido: R$ XX.XXX (YY meses)"
  - "Prazo sugerido: YY meses"
  - "Margem-alvo: ZZ%"
  - "Break-even mensal: R$ XX.XXX"
- Tooltip explicando a logica (custo + margem alvo)

**Secao 2 -- KPIs e Cenarios** (existente, ajustado):
- Usar valores sugeridos como receita nos calculos
- Manter cards, tabela comparativa e grafico

**Secao 3 -- Insights de IA** (novo, substituindo o placeholder):
- Card com titulo "Analise do Consultor" e icone Sparkles
- Botao "Gerar analise" que chama a edge function
- Estado de loading com skeleton
- Exibicao do texto gerado pela IA em markdown simples
- Tratamento de erros (429, 402, falha generica)

---

## 4. Edge Function para Insights de IA

### Novo arquivo: `supabase/functions/simulation-insights/index.ts`

- Recebe os dados da simulacao (nome, cliente, tipo, complexidade, questionario, custos, receita sugerida, margem, cenarios)
- Monta prompt em portugues pedindo:
  - Analise do perfil do contrato
  - Pontos de atencao e riscos
  - Oportunidades de otimizacao
  - Recomendacao sobre prazo e precificacao
  - Tom: consultor de negocios experiente, direto e pratico
- Chama Lovable AI Gateway (google/gemini-3-flash-preview)
- Retorna resposta sem streaming (invoke simples)

### Arquivo: `supabase/config.toml`
- Registrar a funcao com `verify_jwt = false` (app sem auth real)

---

## 5. Ajustar tipos e modelo de dados

### Arquivo: `src/types/index.ts`
- Tornar `pricingModel` opcional no `ContractSimulation` (ou remover)
- `proposedMonthlyValue` e `proposedTotalValue` passam a ser calculados, nao inputados
- Manter campos por compatibilidade, mas nao mais obrigatorios

---

## 6. Ajustar mock data

### Arquivo: `src/data/mockSimulations.ts`
- Remover `pricingModel`, `proposedMonthlyValue`, `proposedTotalValue` dos mocks (valores serao calculados pelo motor)

---

## 7. Ajustar CalculatorPage (lista)

### Arquivo: `src/pages/CalculatorPage.tsx`
- Na listagem de simulacoes, a margem e valor exibidos devem vir do `suggestPricing` em vez de valores inputados

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/components/calculator/SimulationStepper.tsx` | Reduzir para 4 passos |
| `src/pages/CalculatorWizardPage.tsx` | Remover Step2, reindexar passos |
| `src/components/calculator/Step2Pricing.tsx` | Deletar |
| `src/lib/simulationEngine.ts` | Adicionar `suggestPricing`, ajustar `calculateSimulationResults` |
| `src/components/calculator/Step5Results.tsx` | Adicionar sugestao de precificacao + insights IA |
| `src/types/index.ts` | Tornar campos de pricing opcionais |
| `src/data/mockSimulations.ts` | Remover valores de pricing dos mocks |
| `src/pages/CalculatorPage.tsx` | Usar `suggestPricing` na listagem |
| `supabase/functions/simulation-insights/index.ts` | Nova edge function para IA |
| `supabase/config.toml` | Registrar funcao |

## Ordem de Implementacao

1. Habilitar Lovable Cloud (necessario para edge functions)
2. Tipos (`types/index.ts`) -- tornar pricing opcional
3. Motor (`simulationEngine.ts`) -- adicionar `suggestPricing`, ajustar `calculateSimulationResults`
4. Mock data (`mockSimulations.ts`) -- remover pricing
5. Stepper + Wizard (`SimulationStepper.tsx` + `CalculatorWizardPage.tsx`) -- 4 passos
6. Deletar `Step2Pricing.tsx`
7. Step5Results -- sugestao de precificacao + bloco insights
8. Edge function (`simulation-insights`)
9. CalculatorPage -- ajustar listagem

