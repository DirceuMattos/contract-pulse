Apply the 7 specified changes:

**`src/components/reports/SectionEditor.tsx`**
1. Extend `EditorProps` with optional `meta` (contractName, clientName, contractNumber, month, year).
2. Replace `CapaEditor` to auto-fill Projeto/Cliente/Número do contrato from `meta` with "Auto" badge when field empty.
3. Replace `SumarioEditor` with highlighted info box including Mês/Ano from `meta` and optional notas.
4. In `HistoricoTrEditor`, after `percentual` declaration, add two early-return blocks for empty `linhas` (readOnly warning vs editable warning + add button).
5. Replace `PainelExecutivoEditor` to include an optional "Observações" textarea.
6. In `TreinamentosReunioesEditor`, add `horario` field: update type, table header (new "Horário" column w-28), each row gets `<Input type="time">` between Data and Descrição, and default new row object includes `horario: ''`.

**`src/lib/reportSectionSchemas.ts`**
7. Rename `priorizadas` label from `'Priorizadas'` to `'Tarefas Priorizadas'`.

**`src/pages/ReportEditPage.tsx`**
8. Pass `meta={{ contractName, clientName, contractNumber, month, year }}` to `<SectionEditor>`.

No business logic changes; purely UI/props plumbing and label tweaks.
