## Objetivo
Inspecionar o payload completo da API Feedz para o colaborador `id_externo=2051079`, identificando quais campos estão disponíveis (especialmente relacionados a foto/avatar).

## Passos

1. **Criar Edge Function temporária `feedz-test-photo`**
   - Arquivo: `supabase/functions/feedz-test-photo/index.ts`
   - Faz GET em `https://app.feedz.com.br/v2/integracao/employees/2051079` usando o secret `FEEDZ_API_TOKEN` (já configurado).
   - Inclui CORS headers e validação de JWT (proteção mínima — só usuários autenticados podem chamar).
   - Retorna o JSON cru da Feedz.

2. **Configurar `supabase/config.toml`**
   - Adicionar bloco `[functions.feedz-test-photo]` com `verify_jwt = false` (alinhado às outras funções `feedz-*` do projeto).

3. **Deploy automático** da função (feito pelo Lovable Cloud ao salvar).

4. **Executar a função** via `supabase--curl_edge_functions` usando a sessão autenticada do preview, e retornar o JSON completo no chat para análise dos campos.

5. **Próximo passo (após análise)**: com base nos campos encontrados (provavelmente `photo`, `avatar_url`, `picture` ou similar), decidir se vamos:
   - Adicionar coluna `foto_url` em `hr_people`, ou
   - Mapear no `feedz-sync` existente, ou
   - Remover a função temporária após o uso.

## Detalhes técnicos
- Endpoint Feedz: `GET /v2/integracao/employees/{id}` (singular, diferente do `/employees` paginado usado no sync atual).
- Token: secret `FEEDZ_API_TOKEN` (já existe).
- Função é temporária — será removida após identificarmos o campo correto.
