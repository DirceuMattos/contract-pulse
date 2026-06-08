Plano: criar página `Adm Transportes`

## Arquivos a criar

1. **`src/hooks/useTransportData.ts`** — hook que recebe `{ year, month }` e busca em `transport_rides`:
   - Lista do período selecionado.
   - Lista do período anterior (mesmo intervalo deslocado) p/ variação %.
   - Últimos 3 meses (para análise "vale ter veículo").
   - Últimos 3 anos agregados por mês (para gráfico ano a ano).
   - Lista de anos distintos disponíveis (para popular o filtro).
   - Retorna `{ rides, previousRides, last3Months, yearlyComparison, availableYears, isLoading }`.

2. **`src/components/transport/TransportImportDialog.tsx`** — dialog de upload (.csv / .xlsx) reutilizando o parser nativo já existente em `src/lib/importExport.ts`. Mapeia colunas para `transport_rides` e faz `insert` em lote via Supabase. Mostra preview/contagem antes de confirmar.

3. **`src/pages/TransportPage.tsx`** — página com 7 seções conforme solicitado:
   - **Header**: título, subtítulo, botão "Importar planilha".
   - **Filtros**: select Ano (default = ano atual, opções de `availableYears`), select Mês (default "Todos os meses"), botão "Limpar filtros".
   - **Cards 2x3**: Total Gasto (+badge variação vs período anterior), Total KM, Custo Médio/KM, Nº de Corridas, Colaboradores Ativos, Média por Colaborador. Valores formatados em BRL.
   - **Análise "Vale ter veículo?"**: card com borda colorida, input numérico do custo fixo (default R$3.000, persistido em `localStorage`), compara com média dos últimos 3 meses; badge verde/vermelho conforme regra.
   - **Gráficos** (grid 2 col): `BarChart` (gastos mensais do ano) e `LineChart` (3 anos), ambos `recharts`.
   - **Rankings** (grid 2 col): tabela por colaborador (ordenável por coluna via estado local de sort) e Top 10 destinos.
   - **Totais por supervisor**: tabela agregada por `supervisor_name`.
   - Respeita restrições financeiras: valores em R$ ocultos se `!canViewValues` (hook `useAuth`/módulo existente).

4. **`src/App.tsx`** — adicionar somente:
   - `import TransportPage from '@/pages/TransportPage'`
   - `<Route path="/adm-transportes" element={<TransportPage />} />` dentro do bloco autenticado já existente.

## Observação técnica
A tabela `transport_rides` está atualmente sem RLS habilitado. Não está no escopo deste plano alterar a tabela, mas vou avisar para tratar em migração separada.

## Detalhes de implementação
- Filtros aplicam `year` e (opcional) `month` na query Supabase.
- "Período anterior" = mesmo `month` do ano anterior quando `month` selecionado; caso "Todos os meses", compara com ano anterior completo.
- Cálculos feitos client-side a partir do array filtrado (volume esperado pequeno).
- Estilo: usa tokens semânticos (`bg-card`, `text-muted-foreground`, etc.) e componentes shadcn (`Card`, `Select`, `Button`, `Table`, `Badge`, `Dialog`, `Input`).

Nenhum outro arquivo será modificado.