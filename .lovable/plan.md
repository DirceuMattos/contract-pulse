## Auto-vinculação de contratos no `superlogica-sync`

Adicionar uma etapa nova **antes** do processamento principal de cobranças, sem alterar a lógica existente.

### Fluxo da nova etapa

```text
[início do handler]
   ↓
[autenticação c-level já existente]
   ↓
[criar sync_run]
   ↓
*** NOVO: autoLinkUnlinkedContracts() ***
   ↓
[processamento atual de cobranças — inalterado]
```

### Etapas detalhadas

1. **Carregar contratos sem vínculo**
   - `SELECT id, codigo, valor_mensal_referencia, superlogica_customer_cnpj, superlogica_customer_id FROM contracts WHERE superlogica_subscription_id IS NULL`.

2. **Tentativa A — busca via CNPJ do cliente** (para contratos que já têm CNPJ preenchido)
   - Para cada contrato sem vínculo que tenha `superlogica_customer_cnpj`:
     - Resolver `customer_id` (usar o já gravado, ou buscar via `findClientByCnpj` existente).
     - Buscar assinaturas ativas do cliente em `/v2/financeiro/assinaturas?idSacado=...&itensPorPagina=100` (mesma agregação por `id_planocliente_plc` usada em `superlogica-search-subscriptions`: somar `total/mrr/vl_aproxrenovacao_plc`, ignorar canceladas via `dt_cancelamento_plc`).
     - Comparar valor agregado de cada assinatura com `valor_mensal_referencia` do contrato (tolerância 2%, igual à `matchContractByAmount` existente — adaptada na direção inversa: dada uma assinatura, escolher o contrato candidato mais próximo).
     - Se houver match único dentro da tolerância → gravar vínculo.

3. **Tentativa B — fallback por IDs conhecidos**
   ```ts
   const KNOWN_SUBSCRIPTION_IDS = [
     '00cd4eb5-0b4a-4550-8e58-97accaa102b7',
     'ac940ed7-ed2b-4f16-9135-475991c58183',
     '9945029c-f0fc-4c72-9a8d-32203e2b0845',
     'b9188b9a-8c1c-444c-b819-28310ce3168f',
     '357a735f-0ead-46d9-a0cc-28f2361f292e',
     '4b59ab9c-22a4-42ea-ac46-82eec2efa5bb',
     'b5706280-6839-4965-9d3d-f3fe2bf2ae49',
     '9e33bb6d-eb4c-45bf-8df0-bcd2c5ebb7fe',
     '135bc51b-504e-43c6-9fcf-5919607308b8',
   ];
   ```
   - Para cada ID, chamar `GET /v2/financeiro/assinaturas?id=<ID>` (ou equivalente — fará `superlogicaGet` e logará erro se não encontrar).
   - Da resposta, extrair: valor total, `id_sacado_sac` (para descobrir CNPJ do cliente via `/v2/financeiro/clientes?id=...`) e label (`st_nome_pla` / `st_identificador_plc`).
   - Rodar `findBestContractByAmount(valor, contratos_ainda_sem_vinculo)` (nova função, tolerância 2%) para escolher o contrato mais próximo entre os contratos que continuam sem vínculo.
   - Se houver match → gravar vínculo.

4. **Persistência do vínculo**
   - `UPDATE contracts SET superlogica_subscription_id, superlogica_subscription_label, superlogica_customer_id, superlogica_customer_cnpj WHERE id = ...`
   - Só sobrescrever campos que estavam nulos (CNPJ não é alterado se já preenchido; label sempre atualizada).

5. **Logs e métricas**
   - `console.log('[superlogica-sync][autolink] vinculados=N total_tentados=M')`.
   - Cada match individual: `console.log('[autolink] contract=<codigo> ← subId=<id> (assinatura R$X vs ref R$Y, diff Z%)')`.
   - Erros por contrato/ID conhecido: empilhar em `errors[]` (sem incrementar `errorsCount` do run principal — apenas log), para não poluir o status do sync de cobranças.

6. **Importante**
   - A nova etapa **NÃO altera** o passo "2) Load linked contracts" nem qualquer trecho seguinte. O `select` original roda depois e naturalmente já incluirá os contratos recém-vinculados nesta execução.

### Detalhes técnicos

- **Nova função utilitária** em `superlogica-sync/index.ts`:
  ```ts
  function findBestContractByAmount(
    subscriptionAmount: number,
    candidates: ContractRow[],
    tolerance = 0.02
  ): ContractRow | null
  ```
  Implementação espelhada em `matchContractByAmount`, comparando contra `valor_mensal_referencia` de cada candidato, retornando o de menor `diff` dentro da tolerância.

- **Reuso**: `findClientByCnpj`, `superlogicaGet`, `onlyDigits`, `normalizeBase` já existem — sem duplicação.

- **Single-call adicional**: helper `fetchClientCnpjById(customerId)` para `/v2/financeiro/clientes?id=<id>` (usado apenas no fallback B para descobrir CNPJ a partir do `id_sacado_sac` da assinatura).

- **Concorrência**: chamadas Superlógica feitas sequencialmente (igual ao resto do arquivo) para não estourar rate limit.

### Arquivo afetado

- `supabase/functions/superlogica-sync/index.ts` (apenas adição — nenhuma remoção/alteração no fluxo existente).
- Deploy automático da edge function após a edição.