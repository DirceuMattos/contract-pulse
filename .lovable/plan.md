## Plano de implementação

Criar o arquivo `supabase/functions/report-sync-asana/index.ts` com exatamente o código fornecido, sem alterar nenhuma outra lógica ou arquivo existente do projeto.

### O que será criado
- `supabase/functions/report-sync-asana/index.ts` — edge function que sincroniza tarefas do Asana (SMC) para as seções de relatório mensal (`report_sections`), buscando tarefas concluídas, priorizadas, backlog e calculando métricas de evolução/inovação e eficiência/previsibilidade.

### O que NÃO será alterado
- Nenhum outro arquivo do projeto.
- Nenhuma migration, configuração de bucket, lógica de negócio ou UI.

### Pré-requisito para execução (fora do escopo deste plano)
- O secret `ASANA_TOKEN` precisará estar configurado no backend para que a função possa chamar a API do Asana.