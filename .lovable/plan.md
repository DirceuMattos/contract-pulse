## Fallback de busca por nome em `superlogica-sync/index.ts`

### 1. Atualizar `findClientByCnpj` (linha 55)
Adicionar segundo parâmetro opcional:

```ts
async function findClientByCnpj(
  cnpjDigits: string,
  razaoSocial?: string
): Promise<string | null>
```

Manter o loop de páginas atual. Enquanto carrega as páginas, acumular todos os clientes em um array local `allClients` (id + nome) para reutilizar no fallback. Ao final do loop sem match por CNPJ, antes do `return null`:

- Se `razaoSocial` foi informado:
  - Normalizar: `toLowerCase`, `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`, remover pontuação, colapsar espaços.
  - Tokenizar e filtrar tokens com tamanho ≥ 4 que não estejam na stoplist: `LTDA, ME, EIRELI, SA, COMERCIO, INDUSTRIA` (também versão normalizada).
  - Para cada cliente acumulado, normalizar `st_nome_sac` e considerar match se contiver TODOS os tokens significativos.
  - Se exatamente 1 match → log `Fallback by name matched id=...` e retornar id.
  - Se >1 → log `Ambiguous name match for "<razao>": N candidates` e retornar null.
  - Se 0 → seguir para `return null` original.

### 2. Passar razão social na chamada do passo 2 (linha 490)
Alterar o SELECT (linhas 452–457) para incluir o join:

```ts
.select(
  "id, codigo, superlogica_subscription_id, superlogica_subscription_label, superlogica_customer_cnpj, superlogica_customer_id, valor_mensal_referencia, clients(razao_social)"
)
```

Ao montar `groupsMap` (linha 468–480), capturar `razaoSocial` do primeiro contrato do grupo (`c.clients?.razao_social`) e armazenar no grupo. Ajustar o tipo do `groupsMap` para incluir `razaoSocial?: string`.

Na chamada (linha 490), passar:
```ts
customerId = await findClientByCnpj(cnpj, group.razaoSocial);
```

### Restrições
- Não alterar a chamada em `autoLinkUnlinkedContracts` (linha 277) — o usuário pediu somente "no loop de grupos" do passo 2.
- Não modificar nenhuma outra lógica, função, comentário ou processamento.
- Arquivo: `supabase/functions/superlogica-sync/index.ts` (deploy automático).
