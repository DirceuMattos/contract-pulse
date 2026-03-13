

## Plano: Melhorias de Design e Funcionalidades

Cinco itens a implementar, organizados por prioridade.

---

### a) Responsividade para tablets e smartphones (Dashboard, Simulador, Contratos, Clientes)

**Arquivos**: `DashboardPage.tsx`, `CalculatorPage.tsx`, `ContractsPage.tsx`, `ClientsPage.tsx`, `MainLayout.tsx`

- Adicionar classes responsivas Tailwind nos grids existentes (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- Na listagem de contratos, esconder colunas secundárias em mobile (badges de segmento/tipo já usam `hidden md:flex`, estender para outros elementos)
- Ajustar padding/gaps para telas menores (`p-2 sm:p-4`, `gap-2 sm:gap-4`)
- Tabelas do Dashboard: envolver em `overflow-x-auto` com scroll horizontal em telas pequenas
- Cards de KPI: `grid-cols-2` em mobile, `grid-cols-4` em desktop (já parcialmente feito)
- Não alterar layout desktop existente

---

### b) Squads: abrir em modo compacto por padrão

**Arquivo**: `src/pages/SquadsPage.tsx`

- Linha 123: alterar `useState<'compact' | 'detailed'>('detailed')` para `useState<'compact' | 'detailed'>('compact')`
- Alteração de 1 linha, sem impacto no resto

---

### c) Subprojetos (dentro de contratos): abrir em modo compacto

**Arquivo**: `src/components/squads/SubprojectManagementPanel.tsx`

- Nos cards de subprojeto, as Tabs (Pessoas/Recursos/Overheads) abrem expandidas por padrão
- Alterar para usar um layout mais compacto: mostrar apenas contadores por aba com expansão sob demanda (accordion/collapsible)
- Dentro de cada subprojeto card, iniciar com as tabs colapsadas — mostrar apenas o resumo (X pessoas, Y FTE, Z recursos, W overheads) e expandir ao clicar na tab

---

### d) Contratos (lista): filtro por alerta + ordenação por valor e percentual

**Arquivo**: `src/pages/ContractsPage.tsx`

- **Filtro por alerta**: no popover de filtros, adicionar seção "Alertas" com checkbox para cada tipo de alerta (vencimento próximo, reajuste, margem crítica) usando o hook `useAlerts`
- **Ordenação**: adicionar Select de ordenação ao lado do botão Filtros com opções:
  - Saúde (padrão atual)
  - Valor mensal (desc)
  - Margem % (asc/desc)
- Integrar a ordenação no `sortedContracts` via estado `sortBy`

---

### e) Contratos (lista): botão de exportação em planilha

**Arquivo**: `src/pages/ContractsPage.tsx`

- Adicionar botão "Exportar" no PageHeader (ao lado de "Novo Contrato")
- Dropdown com opções CSV e XLSX
- Colunas exportadas:
  - Nome do Contrato, Nome do Cliente
  - Data Início, Data Fim, Data Base Reajuste
  - Margem Mensal (calculada via `calculateContractHealth`)
  - Receita Bruta, Receita Líquida, Impostos (%)
  - Custo Total
  - Qtd CLT, Qtd PJ, Qtd Outros (contagem por `tipo` nos resources do contrato)
- Usar `buildXlsx` e `downloadCSV` já existentes em `src/lib/importExport.ts`
- Exportar apenas os contratos visíveis após filtros aplicados

---

### Resumo de arquivos impactados

| Arquivo | Alteração |
|---|---|
| `SquadsPage.tsx` | Default `compact` (1 linha) |
| `SubprojectManagementPanel.tsx` | Layout compacto com expansão |
| `ContractsPage.tsx` | Filtro alerta, ordenação, exportação, responsividade |
| `DashboardPage.tsx` | Ajustes responsivos grids/tabelas |
| `ClientsPage.tsx` | Ajustes responsivos |
| `CalculatorPage.tsx` / `CalculatorWizardPage.tsx` | Ajustes responsivos |

