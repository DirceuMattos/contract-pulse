

## Plano: Botão de recálculo para simulações salvas

### Análise

A listagem de simulações (`CalculatorPage.tsx`) já chama `calculateSimulationResults()` em cada render — ou seja, os cards já mostram valores atualizados com a nova lógica. O problema real é que simulações antigas podem ter:
- Quantidades decimais (ex: `0.5`, `0.2`) que agora deveriam ser inteiras
- Dados que precisam ser normalizados e re-persistidos no banco

### O que será feito

**1. Botão "Recalcular todas" na página de listagem (`CalculatorPage.tsx`)**
- Adicionar botão ao lado de "Nova simulação"
- Ao clicar, percorre todas as simulações, normaliza quantidades (arredonda para cima, mínimo 1) e re-salva via `updateSimulation`
- Mostra toast com quantidade de simulações atualizadas

**2. Botão "Recalcular" individual no card de cada simulação**
- Ícone ao lado dos botões existentes (duplicar, arquivar, excluir)
- Normaliza quantidades daquela simulação e re-salva

**3. Normalização na função de recálculo**
- `quantity`: `Math.max(1, Math.ceil(value))` para cada HR item
- Re-persiste a simulação com `updateSimulation`

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/CalculatorPage.tsx` | Botão "Recalcular todas" no header + botão individual por card |

