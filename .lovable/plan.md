# Ajustes em TransportPage.tsx

Três alterações pontuais, apenas em `src/pages/TransportPage.tsx`.

## 1. Card "Total Gasto no Período" → tabela evolutiva por ano

Substituir o `SummaryCard` simples por um card customizado contendo:

- **Topo (destaque)**: valor `fmtBRL(totals.totalValue)` do período filtrado (mantém o badge de variação vs período anterior).
- **Tabela** logo abaixo com todos os anos presentes em `availableYears` (ou agregados a partir de `yearlyComparison`):

| Ano | Total Gasto | Variação R$ | Variação % |

Regras:
- Calcular total por ano somando `yearlyComparison` (já carrega histórico completo).
- Para cada ano: `delta = total[y] - total[y-1]`; primeiro ano da lista exibe "—".
- Linha do ano mais recente em **bold**.
- Variação **positiva** (gasto aumentou) → texto vermelho (`text-destructive`).
- Variação **negativa** (gasto reduziu) → texto verde (`text-emerald-600`).
- Valores formatados com `fmtBRL` e `%` com 1 casa.

O card ocupa a primeira posição do grid de resumo, mas em largura maior (ex.: `col-span-2 md:col-span-3`) para acomodar a tabela. Os outros cards do grid permanecem inalterados.

## 2. Card "Colaboradores Ativos"

Alterar apenas o `label` de `"Colaboradores Ativos"` para `"Colaboradores Usuários"`. Nenhuma mudança em lógica, ícone ou valor.

## 3. Gráfico de rosca "Distribuição por ano"

Verificação: o donut chart já havia sido removido em iteração anterior; confirmar que não há mais nenhum `PieChart`/`Pie` em `TransportPage.tsx`. Caso reste algum vestígio (import, memo, JSX), remover.

## Fora do escopo
Nada mais é alterado: filtros, demais cards, gráficos de barras/linha, rankings, tabela de supervisores e o hook `useTransportData` permanecem como estão.
