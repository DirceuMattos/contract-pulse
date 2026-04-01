

## Adicionar valores monetarios nos 3 cards de graficos do Dashboard

### O que sera feito

Nos 3 cards de graficos ("Saude dos Contratos", "Por Segmento", "Por Tipo"), adicionar os valores monetarios (Receita, Custo, Resultado) agrupados por cada categoria, exibidos como legenda abaixo do grafico. Visivel apenas para quem tem `canViewValues` (C-Level).

### Implementacao

**Arquivo**: `src/pages/DashboardPage.tsx`

1. **Calcular health data por contrato** (ja existe via `calculateContractHealth`). Criar 3 agrupamentos no `useMemo`:
   - Por saude (saudavel/atencao/critico): somar receita liquida, custo e margem
   - Por segmento (govtech/privado): somar receita liquida, custo e margem
   - Por tipo (sistema/infraestrutura/hibrido): somar receita liquida, custo e margem

2. **Exibir valores abaixo de cada grafico** (quando `canViewValues`):
   - Formato compacto em lista vertical com 3 linhas por categoria:
   ```
   ● Saudavel — Receita: R$ X | Custo: R$ Y | Resultado: R$ Z
   ● Atencao  — Receita: R$ X | Custo: R$ Y | Resultado: R$ Z
   ```
   - Usar `text-xs` e cores correspondentes para os indicadores
   - Para usuarios sem permissao de valores, manter apenas a contagem atual

3. **Dados**: Iterar sobre `filteredContracts`, calcular `calculateContractHealth` para cada um (ja feito no `alertsTableData`), e agrupar as somas por saude/segmento/tipo.

### Detalhes tecnicos

- Criar um `useMemo` que retorna um `Map` com as somas financeiras por grupo (health, segment, type)
- Condicionar exibicao dos valores com `{canViewValues && (...)}`
- Reutilizar `formatCurrency` para formatar os valores
- Nao alterar os graficos em si, apenas adicionar informacao textual abaixo/na legenda

