

# Restaurar dados de Equipes e Cargos

## Problema
A ferramenta de query do banco e somente leitura (SELECT). Para inserir dados, precisamos usar uma funcao backend.

## Solucao
Adicionar uma acao `seed-teams-jobtitles` na Edge Function `manage-users` existente. Essa acao insere as 8 equipes e os 15 cargos padrao no banco, com o mapeamento correto de `team_id`.

## Etapas

1. **Modificar `supabase/functions/manage-users/index.ts`**
   - Adicionar o case `seed-teams-jobtitles`
   - Inserir as 8 equipes na tabela `teams` e recuperar os IDs gerados
   - Mapear os `team_id` dos cargos para os IDs reais das equipes inseridas
   - Inserir os 15 cargos na tabela `job_titles`

2. **Deploy e execucao**
   - Deploy automatico da Edge Function
   - Chamar a acao via `curl` para popular o banco

## Dados a inserir

**Equipes (8)**:
Lideranca Equipes, Projetos, Desenvolvimento, Testes, IA, Dados, Estrutura, Suporte

**Cargos (15)**:
Desenvolvedor Frontend, Backend, Full Stack, Analista de Sistemas, Analista de Dados, DBA, Tech Lead, Scrum Master, Product Owner, Gerente de Projetos, Arquiteto de Software, DevOps Engineer, QA/Tester, UX Designer, Analista de Suporte

## Detalhes tecnicos

A Edge Function usara o `supabaseAdmin` (service role) para inserir os dados, contornando as politicas RLS. O fluxo sera:
1. Inserir equipes com `INSERT ... RETURNING id, name`
2. Construir mapa `nome -> uuid`
3. Inserir cargos com o `team_id` real de cada equipe

Nenhum outro arquivo precisa ser modificado.

