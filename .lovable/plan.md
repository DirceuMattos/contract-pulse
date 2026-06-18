Apply the 4 requested edits verbatim:

1. **`src/components/reports/SectionEditor.tsx` — `TaskTableEditor`**: replace `linhas` declaration with the Asana-compatible mapping (`content.linhas ?? content.tarefas`), and update `update`, add-row, and delete-row handlers to always write back to `linhas` while clearing `tarefas`.

2. **`src/components/reports/SectionEditor.tsx` — `EvolucaoInovacaoEditor`**: replace the entire function with the new version that reads `contagem_por_tag` / `percentual_inovacao` / `total_entregas` while falling back to legacy `tags` / `percentualInovacao`, and writes both new and legacy keys for `percentual_inovacao`.

3. **`src/lib/reportSectionSchemas.ts` — `isSectionComplete`**: split the shared case so `entregas` and `priorizadas` accept either `content.linhas` or `content.tarefas`; the other three cases keep checking `content.linhas`.

4. **`src/lib/reportSectionSchemas.ts` — `defaultsForSection`**: split `entregas` / `priorizadas` to return `{ tarefas: [], linhas: [] }`, keeping the others at `{ linhas: [] }`.

No other files touched; purely format-compatibility changes.
