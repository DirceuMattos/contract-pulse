# Edge Function: importacao historica de custos TSI

A Edge `support-costs-sync` agora aceita modos historicos controlados no corpo da chamada.

## 1. Auditoria de clientes

Nao grava nada no banco.

```json
{
  "mode": "audit"
}
```

Retorna:

- clientes Milvus encontrados;
- clientes Hub encontrados por match automatico;
- `matched`;
- `pending`;
- `ambiguous`.

## 2. Simulacao de periodo

Nao grava nada no banco.

```json
{
  "mode": "dry-run",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "clientName": "AUDIO CONTROL"
}
```

Para testar poucos clientes no modo geral:

```json
{
  "mode": "dry-run",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "clientLimit": 5
}
```

## 3. Gravacao confirmada por lote

Grava no banco somente quando `mode` for `write` e `confirmWrite` for `true`.
Por seguranca, gravacoes filtradas por cliente/projeto nao fecham o mes em
`support_cost_monthly_loads`; isso evita marcar um mes como completo apos
carregar apenas um lote.

```json
{
  "mode": "write",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "clientName": "AUDIO CONTROL",
  "confirmWrite": true
}
```

Quando todos os lotes do mes forem carregados, finalize o mes usando a base
local deduplicada:

```json
{
  "mode": "finalize-month",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "confirmWrite": true
}
```

Se for uma carga completa em uma unica chamada e voce realmente quiser fechar
o mes no mesmo request, use `finalizeMonthlyLoad: true`.

## Protecoes

- `write` sem `confirmWrite: true` falha.
- `finalize-month` sem `confirmWrite: true` falha.
- `audit` nao exige periodo.
- `dry-run` nao altera tabelas.
- `write` usa `upsert` por `milvus_ticket_code`; lotes sobrepostos atualizam o
  mesmo ticket em vez de duplicar registros.
- A funcao reutiliza os segredos ja existentes no ambiente da Edge: `SUPABASE_SERVICE_ROLE_KEY`, `DEVID_TOKEN` e `MILVUS_TOKEN`.
