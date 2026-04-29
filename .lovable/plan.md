## Exportação RH com aba de Linha do Tempo

### 1. `src/lib/importExport.ts` — `exportHRPeople`
- Importar `HRTimelineEvent` de `@/types` (adicionar ao import já existente).
- Adicionar parâmetro opcional `timeline?: HRTimelineEvent[]` na assinatura.
- Manter geração atual de `headers` e `rows` (aba "Pessoas").
- Quando `format === 'xlsx'` E `timeline` fornecido (mesmo vazio? — só quando definido):
  - Construir aba "Linha do Tempo" com colunas: `Nome`, `Data`, `Tipo de Evento`, `Descrição`, `Remuneração Após`.
  - Para cada evento: nome buscado em `people` por `personId`; data convertida para `dd/mm/yyyy` a partir de `eventDate` (string ISO `yyyy-mm-dd`); tipo = `ocorrencia` capitalizada; descrição = `descricao`; remuneração após = `remuneracaoApos` numérico ou `''`.
  - Usar `buildMultiSheetXlsx([{ name: 'Pessoas', headers, rows }, { name: 'Linha do Tempo', headers: tlHeaders, rows: tlRows }])` e baixar via `downloadBlob` com o mesmo padrão de nome `rh_pessoas_${timestamp}.xlsx`.
- Caso contrário (xlsx sem timeline ou csv): manter comportamento atual.

Conversão de data segura: `eventDate` é `yyyy-mm-dd` → `split('-')` e remontar `dd/mm/yyyy`, evitando timezone shift.

### 2. `src/pages/HRPeoplePage.tsx`
- Trocar `const { hrPeople, addPerson, updatePerson, addTimelineEvent } = useHR();` por `const { hrPeople, hrTimeline, addPerson, updatePerson, addTimelineEvent } = useHR();`.
- Atualizar `handleExport` para `exportHRPeople(filtered, teams, jobTitles, canViewHRCosts, 'xlsx', hrTimeline)`.

Nenhuma outra função, import ou parte do sistema é alterada.