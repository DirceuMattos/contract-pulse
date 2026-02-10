
# Plano: Recursos V2 -- Overhead + Consultoria + Hints

## Resumo
Adicionar custos indiretos (overhead) por contrato e categoria "Consultoria" em Outros Recursos, atualizando calculos de break even e incluindo tooltips explicativos na interface.

---

## 1. Novos Tipos e Interfaces

### Arquivo: `src/types/index.ts`

- Adicionar `'consultoria'` ao tipo `OtherCostCategory`
- Adicionar campos opcionais ao `Resource`:
  - `tipoValor?: 'mensal' | 'totalPeriodo'` (para consultoria)
  - `duracaoMeses?: number` (para consultoria com valor total)
- Criar nova interface `OverheadItem`:

```typescript
export type OverheadMode = 'percentual' | 'fixo';
export type OverheadCategory = 'infraestrutura' | 'administrativo' | 'governanca';

export interface OverheadItem {
  id: string;
  contractId: string;
  categoria: OverheadCategory;
  nome: string;
  modo: OverheadMode;
  percentual?: number;     // usado se modo = 'percentual'
  valorFixoMensal?: number; // usado se modo = 'fixo'
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. DataContext -- Overhead CRUD

### Arquivo: `src/contexts/DataContext.tsx`

- Adicionar estado `overheadItems: OverheadItem[]` com persistencia localStorage (chave `bnp_overhead`)
- Expor funcoes: `addOverheadItem`, `updateOverheadItem`, `deleteOverheadItem`, `getOverheadByContract`
- Carregar dados mock no `resetToDemo`

---

## 3. Calculos Atualizados

### Arquivo: `src/lib/calculations.ts`

- Nova funcao `calculateResourceCostForConsultoria`: se `tipoValor === 'totalPeriodo'`, o custo mensal = `custoBase / duracaoMeses`
- Atualizar `calculateResourceCost` para tratar consultoria (quando `categoria === 'consultoria'` e `tipoValor === 'totalPeriodo'`)
- Nova funcao `calculateOverheadCost(contractId, resources, overheadItems, settings)`:
  - `baseOverhead = custoRH + custoOutrosDiretos` (custos existentes de recursos)
  - Para cada item: se percentual, `item.percentual / 100 * baseOverhead`; se fixo, `item.valorFixoMensal`
  - Retorna total e breakdown por item
- Atualizar `calculateContractHealth` para aceitar `overheadItems` e somar overhead ao custo total
- Atualizar `calculateContractCost` para incluir overhead
- Atualizar `calculateDashboardKPIs` para passar overhead

---

## 4. Formulario de Overhead

### Novo arquivo: `src/components/forms/OverheadForm.tsx`

- Formulario com campos:
  - Categoria (select: Infraestrutura do Escritorio / Administrativo / Governanca-Contabil-Financeiro)
  - Modo (radio toggle: Percentual / Valor Fixo)
  - Campo de percentual (habilitado se modo = percentual) com tooltip explicativo
  - Campo de valor fixo mensal (habilitado se modo = fixo) com tooltip explicativo
- Tooltip mostrando base de calculo atual (valor dinamico)

---

## 5. Consultoria no ResourceForm

### Arquivo: `src/components/forms/ResourceForm.tsx`

- Adicionar `'consultoria'` nas opcoes de categoria (quando tipo = 'outro')
- Quando categoria = 'consultoria', exibir:
  - Toggle `tipoValor`: "Valor Mensal" vs "Valor Total do Periodo"
  - Se "Total do Periodo": campo `duracaoMeses` (obrigatorio) + campo `dataInicio`
  - Preview de custo mensal calculado: `custoBase / duracaoMeses`
  - Hint explicando a diferenca entre mensal e total do periodo
- Atualizar schema zod para validar: se `tipoValor === 'totalPeriodo'`, `duracaoMeses` obrigatorio

---

## 6. Secao de Overhead na Pagina de Recursos

### Arquivo: `src/pages/ContractResourcesPage.tsx`

- Adicionar secao "Custos Indiretos (Overhead)" abaixo dos recursos alocados
- Listar overhead items do contrato com opcoes de editar/remover
- Botao "Adicionar Overhead" abre dialog com OverheadForm
- Card resumo "Overhead Mensal Total" nos summary cards
- Tooltips nos valores explicando a base de calculo

---

## 7. Breakdown no Detalhe do Contrato

### Arquivo: `src/pages/ContractDetailPage.tsx`

- Na aba "Resumo", adicionar card "Overhead Mensal" ao lado do breakdown existente
- Criar breakdown expandivel (Collapsible):
  - RH (CLT + PJ)
  - Outros Diretos (cloud, licencas, consultoria)
  - Overhead (com subitens)
  - Total
- Tooltip explicando como overhead e calculado

---

## 8. Tooltips/Hints (UX)

Usar componente `Tooltip` ja existente + icone `Info` do Lucide em:

- Campo de percentual overhead: "Percentual aplicado sobre o custo base de execucao (RH + outros custos diretos)."
- Campo de valor fixo: "Valor mensal fixo atribuido ao contrato para cobrir custos indiretos."
- Base de calculo: mostrar valor atual, ex.: "Base atual: R$ X (RH + Outros diretos)."
- Consultoria mensal vs total: "Valor mensal: custo recorrente por mes. Valor total do periodo: o sistema divide pelo numero de meses para calcular o custo mensal."

---

## 9. Dados Mock

### Arquivo: `src/data/mockData.ts`

- Adicionar array `mockOverheadItems` com:
  - 6 contratos com overhead percentual (8-12%)
  - Variar entre categorias (infraestrutura, administrativo, governanca)
- Adicionar 3 recursos de consultoria (tipo 'outro', categoria 'consultoria') em contratos existentes
- Ajustar valores para que pelo menos 2 contratos que eram "saudavel" passem a "atencao" ou "critico" com o overhead (ex: ctr-003 Portal do Cidadao e ctr-008 LogExpress que ja tem margens apertadas)

---

## 10. Propagacao -- Dashboard e Tabelas

- `DashboardPage.tsx`: passar `overheadItems` para funcoes de calculo (via DataContext)
- `ContractsPage.tsx`: health badges ja usam `calculateContractHealth` -- basta que a funcao receba overhead
- Garantir que todas as chamadas a `calculateContractHealth` e `calculateContractCost` incluam overhead

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Novos tipos OverheadItem, OverheadMode, OverheadCategory; campo consultoria |
| `src/contexts/DataContext.tsx` | CRUD overhead + estado + persistencia |
| `src/lib/calculations.ts` | Funcoes de overhead + atualizacao de health/KPIs |
| `src/components/forms/OverheadForm.tsx` | Novo formulario |
| `src/components/forms/ResourceForm.tsx` | Campos consultoria + tooltips |
| `src/pages/ContractResourcesPage.tsx` | Secao overhead + tooltips |
| `src/pages/ContractDetailPage.tsx` | Breakdown expandivel + card overhead |
| `src/pages/DashboardPage.tsx` | Passar overhead para calculos |
| `src/pages/ContractsPage.tsx` | Passar overhead para calculos |
| `src/data/mockData.ts` | Mock overhead + consultoria |

---

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. Mock data (`mockData.ts`)
3. DataContext (overhead CRUD)
4. Calculos (`calculations.ts`)
5. OverheadForm (novo componente)
6. ResourceForm (campos consultoria)
7. ContractResourcesPage (secao overhead)
8. ContractDetailPage (breakdown)
9. Dashboard + Contracts pages (propagacao)
10. Tooltips finais e revisao
