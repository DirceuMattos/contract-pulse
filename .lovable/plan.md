
# Correcao: Recursos com calculo reativo e encargos das configuracoes

## Problema 1: Tela estatica -- custo total nao atualiza ao editar campos

A causa raiz e uma condicao de corrida (race condition) na funcao `updateHR`. Quando o recurso esta usando a sugestao (`usingSuggested: true`), a funcao chama `applyCustom()` que dispara um `onChange`, e logo depois chama outro `onChange` com a lista editada. Porem, a segunda chamada monta a lista a partir de `data.customHR`, que ainda nao recebeu os valores do primeiro `onChange`. O resultado e que as edicoes se perdem.

### Correcao em `src/components/calculator/Step4Resources.tsx`

- Eliminar a funcao `applyCustom()` como chamada separada
- Em cada funcao de edicao (`updateHR`, `updateOC`, `updateOverhead`), montar a lista a partir de `data.suggestedHR` ou `data.customHR` conforme `data.usingSuggested`, e despachar um unico `onChange` com todos os campos necessarios (`customHR`, `usingSuggested: false`) em uma so chamada
- Garantir que a copia profunda (JSON.parse/stringify) aconteca antes da edicao, e que o resultado final va em uma unica chamada `onChange`

---

## Problema 2: Percentuais de encargos devem vir das Configuracoes

Atualmente os valores 68% (CLT) e 10% (PJ) estao fixos no codigo. Eles devem ser lidos do contexto de configuracoes globais (`DataContext`), campos `percentualEncargosCLT` e `percentualImpostosPJ`.

### Correcao em `src/components/calculator/Step4Resources.tsx`

- Importar `useData` de `@/contexts/DataContext`
- Ler `settings.percentualEncargosCLT` e `settings.percentualImpostosPJ`
- Na funcao `updateHR`, quando `field === 'hiringType'`, usar os valores das configuracoes em vez de 68/10
- Na funcao `addHR`, o `chargesPercent` do novo item deve ser `settings.percentualEncargosCLT` (padrao CLT)

### Correcao em `src/lib/simulationEngine.ts`

- Na funcao `generateSuggestedResources`, os valores de encargos tambem estao fixos. Aceitar um parametro opcional `chargesCLT` e `chargesPJ` para que o wizard passe os valores das configuracoes. Caso nao sejam passados, usar os defaults atuais (68/10) para manter compatibilidade.

### Correcao em `src/pages/CalculatorWizardPage.tsx`

- Importar `useData` e ler `settings`
- Passar os percentuais das configuracoes ao chamar `generateSuggestedResources`

---

## Resumo das alteracoes

| Arquivo | O que muda |
|---------|------------|
| `src/components/calculator/Step4Resources.tsx` | Eliminar race condition unificando `onChange`; ler encargos de `useData().settings` |
| `src/lib/simulationEngine.ts` | `generateSuggestedResources` aceita percentuais opcionais |
| `src/pages/CalculatorWizardPage.tsx` | Passar percentuais das configuracoes ao gerar sugestoes |
