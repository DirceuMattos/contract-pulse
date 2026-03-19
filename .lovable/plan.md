

## Atualização das Credenciais do Superlógica

### Análise

A API do Superlógica usa dois headers de autenticação: `app_token` e `access_token`. O "Secret" é gerado junto com o App Token mas **não é enviado nas requisições** — serve apenas como referência interna. O código atual já usa os headers corretos.

### Mapeamento das credenciais

| Credencial fornecida | Secret no projeto | Valor |
|---|---|---|
| App Token | `SUPERLOGICA_APP_TOKEN` | `9e33bb6d-eb4c-45bf-8df0-bcd2c5ebb7fe` |
| Access Token | `SUPERLOGICA_ACCESS_TOKEN` | `b5706280-6839-4965-9d3d-f3fe2bf2ae49` |
| Secret | *(não utilizado pela API)* | `135bc51b-504e-43c6-9fcf-5919607308b8` |

### Ações

1. **Atualizar** o valor de `SUPERLOGICA_APP_TOKEN` com o novo App Token
2. **Atualizar** o valor de `SUPERLOGICA_ACCESS_TOKEN` com o novo Access Token
3. **Nenhuma alteração de código** — as edge functions `superlogica-sync` e `superlogica-search-subscriptions` já utilizam os headers corretos (`app_token` e `access_token`)
4. **Verificar** a URL base (`SUPERLOGICA_API_BASE`) já configurada para confirmar que aponta para o endpoint correto (ex: `https://api.superlogica.net`)

