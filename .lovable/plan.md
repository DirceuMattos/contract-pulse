## Objetivo

Executar uma chamada única ao endpoint **individual** da Feedz `GET https://app.feedz.com.br/v2/integracao/employees/2051079` usando o `FEEDZ_API_TOKEN` já configurado, e devolver o JSON cru de resposta — sem omitir nenhum campo — para inspecionar especialmente qualquer atributo de foto/avatar/picture/photo/imagem.

Nenhum código de aplicação será alterado. A função existente `feedz-test-photo` bate em `/employees` (lista) e está sendo bloqueada por um challenge do Cloudflare; precisamos de uma função nova focada no endpoint individual.

## O que será feito

1. Criar uma edge function nova, descartável: `supabase/functions/feedz-get-employee/index.ts`.
2. A função:
   - Lê `FEEDZ_API_TOKEN` de `Deno.env`.
   - Aceita `?id=` na query (default `2051079`).
   - Faz `GET https://app.feedz.com.br/v2/integracao/employees/{id}` com headers:
     - `Authorization: Bearer <token>`
     - `Accept: application/json`
     - `Content-Type: application/json`
     - `User-Agent: BNP-Contratos/1.0`
   - Devolve **o corpo cru** (texto se não for JSON, JSON pretty se for) + `status`, `headers` relevantes da resposta da Feedz, e uma lista `photoLikeFields` com qualquer chave do payload cujo nome contenha `foto|photo|picture|avatar|image|imagem|url` (busca recursiva), para facilitar a leitura.
   - CORS habilitado.
3. Chamar a função via `supabase--curl_edge_functions` com `?id=2051079`.
4. Reportar o JSON completo no chat.
5. Não modifico nenhum outro arquivo. A função fica no projeto como utilitário de diagnóstico (posso removê-la depois se você pedir).

## Observação

Se a Feedz devolver 403 também no endpoint individual (challenge do Cloudflare), reportarei o status/headers exatos para diagnosticar — possivelmente o token precisa ser renovado ou a rota foi alterada.
