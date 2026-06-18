Replace the full contents of `supabase/functions/report-generate-pptx/index.ts` with the uploaded `report-generate-pptx-index.ts` file, then deploy the edge function.

Changes brought in by the new file:
- Expands from 9 to 17 slides
- Fixes `treinamentos_reunioes` to read `content.linhas` (Fireflies format)
- Fixes `entregas` to support both `content.tarefas` and `content.linhas`
- Adds slides: Histórico TR, Evolução e Inovação, Tarefas Priorizadas, Demonstrativo de Horas, Eficiência e Previsibilidade, Desempenho, Engajamento, Maturidade
- Makes new slides conditional on having content
- Adds breakdown por tipo in Eficiência Operacional
- Updates the sumário to include all sections

Steps:
1. Overwrite `supabase/functions/report-generate-pptx/index.ts` with the uploaded file contents.
2. Deploy `report-generate-pptx` via `supabase--deploy_edge_functions`.