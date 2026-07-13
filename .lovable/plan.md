## Exportar o banco via Lovable Cloud

Não preciso mexer em código — o próprio Lovable Cloud gera o dump completo do banco (schema + dados + policies + functions) num formato pronto para restaurar em outro projeto Supabase.

### Passo a passo

1. Abra a aba **Cloud** no topo do editor (ao lado de Preview/Code).
2. Vá em **Advanced settings**.
3. Clique em **Export data**.
4. Aguarde a preparação — o Cloud notifica quando o arquivo estiver pronto para download.

### O que vem no export

- Schema completo do `public` (tabelas, colunas, constraints, sequences)
- Todos os dados das ~50 tabelas listadas
- RLS policies, functions (`has_role`, `handle_new_user`, etc.) e triggers
- Enums (`app_role`) e tipos customizados

### Restaurando no projeto Supabase de destino

- Use `psql` apontando para a connection string do projeto novo e rode o dump.
- Buckets de storage (`contract-documents`, `ai-exports`, `hr-avatars`, `client-logos`) precisam ser recriados manualmente no destino e os arquivos re-enviados — o dump do banco não inclui os binários do Storage.
- Secrets (Feedz, Superlogica, etc.) também precisam ser recadastrados no destino.
- Usuários do `auth.users` só migram se você tiver acesso ao dashboard Supabase do destino para importar — no Lovable Cloud isso não é exposto.

### Se o Export data falhar ou você precisar de algo específico

Me avisa que eu faço fallback exportando tabela por tabela em CSV para `/mnt/documents/`.
