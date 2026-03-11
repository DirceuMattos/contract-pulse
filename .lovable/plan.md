

## Plano: Percentual de Impostos sobre Faturamento por Contrato

### Contexto
Atualmente existe um campo global `percentualImpostosFaturamento` na tabela `settings` (padrão 16.33%). O pedido é criar um campo **por contrato** para que cada contrato possa ter seu próprio percentual de impostos sobre faturamento (geralmente ~20%, mas variável). Esse valor deve impactar o cálculo de receita líquida e ser exibido no Dashboard e na tela de detalhe do contrato.

### Alterações necessárias

**1. Migração de banco de dados**
- Adicionar coluna `percentual_impostos_faturamento` (numeric, nullable, default null) na tabela `contracts`.
- Quando null, o sistema usará o valor global de `settings`.

**2. Tipo TypeScript (`src/types/index.ts`)**
- Adicionar `percentualImpostosFaturamento?: number` na interface `Contract`.

**3. Validação e Formulário**
- `src/lib/validators.ts`: Adicionar `percentualImpostosFaturamento` (number, 0-100, optional) ao schema `contractFormSchema`.
- `src/components/forms/ContractForm.tsx`: Adicionar campo de input numérico na seção "Receita" com label "Impostos sobre Faturamento (%)" e placeholder indicando o valor global como fallback.
- `src/pages/ContractFormPage.tsx`: Incluir o novo campo no `contractData` enviado ao backend.

**4. Mapeamento DB (`src/lib/dbMappers.ts`)**
- `contractFromDb`: Mapear `percentual_impostos_faturamento`.
- `contractToDb`: Mapear de volta.

**5. Cálculos (`src/lib/calculations.ts`)**
- Adicionar ao `ContractHealth` um campo `receitaLiquida` (receita bruta menos impostos).
- Em `calculateContractHealth`, calcular receita líquida: `receitaBruta * (1 - percentual/100)`, usando o percentual do contrato ou fallback para `settings.percentualImpostosFaturamento`.
- A **margem** passará a ser calculada sobre a receita líquida (receita líquida - custos).
- Atualizar `calculateDashboardKPIs` para somar receita líquida nos totais.

**6. Tela de Detalhe do Contrato (`src/pages/ContractDetailPage.tsx`)**
- No card de saúde financeira, exibir: Receita Bruta, Impostos (%), Receita Líquida, Custo, Margem.

**7. Dashboard (`src/pages/DashboardPage.tsx`)**
- Nos KPIs de "Receita Mensal" e "Margem Total", os valores já serão atualizados automaticamente pois usam `calculateDashboardKPIs`.
- Na tabela de alertas, a coluna "Resultado" já refletirá a margem recalculada.

### Fluxo resumido

```text
Receita Bruta (MRR ou média)
  - Impostos s/ Faturamento (% do contrato ou global)
  = Receita Líquida
  - Custos (recursos + overhead)
  = Margem
```

