

## Diagnóstico: Conciliação de Assinaturas Retornando Vazio

### Problema Identificado

A edge function `superlogica-search-subscriptions` está chamando o endpoint **errado** da API Superlógica. Ela busca em `/v2/financeiro/clientes?cpfCnpj=...`, mas:

1. O endpoint GET de clientes **não aceita** o parâmetro `cpfCnpj` como filtro — ele lista todos os clientes paginados e ignora esse parâmetro, retornando a primeira página (que não necessariamente contém o cliente buscado).
2. O que queremos buscar são **assinaturas**, não clientes. Clientes e assinaturas são recursos distintos na API.

A API retorna 200 com array vazio porque o filtro não funciona.

### Solução: Busca em Duas Etapas

Conforme a documentação oficial da API Superlógica Assinaturas, o fluxo correto é:

```text
Etapa 1: GET /v2/financeiro/clientes
         → Listar todos os clientes, filtrar localmente por st_cgc_sac == CNPJ
         → Obter o id_sacado_sac do cliente

Etapa 2: GET /v2/financeiro/assinaturas?idSacado={id_sacado_sac}
         → Listar as assinaturas daquele cliente
```

### Alterações

**Arquivo**: `supabase/functions/superlogica-search-subscriptions/index.ts`

1. **Etapa 1 — Buscar cliente por CNPJ**: Paginar GET `/v2/financeiro/clientes` e encontrar o cliente cujo `st_cgc_sac` (com dígitos) corresponde ao CNPJ informado.

2. **Etapa 2 — Buscar assinaturas do cliente**: Com o `id_sacado_sac` encontrado, chamar GET `/v2/financeiro/assinaturas?idSacado={id}` para obter as assinaturas ativas.

3. **Mapear os campos retornados** para o formato esperado pelo frontend:
   - `id_planocliente_plc` → `subscriptionId`
   - `st_nome_pla` ou label do plano → `label`
   - status derivado de `dt_desativacao_sac` / `dt_congelamento_sac`
   - valor mensal do plano → `amount`

4. **Adicionar logging de debug** para facilitar troubleshooting futuro.

### Consideração sobre `SUPERLOGICA_API_BASE`

Se o valor atual for `https://api.superlogica.net`, a URL final será `https://api.superlogica.net/v2/financeiro/clientes` — correto. Se for `https://api.superlogica.net/v2/financeiro`, haverá duplicação de path. A edge function será ajustada para normalizar o base URL.

### Nenhuma alteração no frontend

O `ReceivablesReconcilePage.tsx` já consome corretamente o formato `{ subscriptions: [...] }`.

