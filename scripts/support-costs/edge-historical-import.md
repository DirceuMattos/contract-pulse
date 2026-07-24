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

## 3. Gravacao confirmada

Grava no banco somente quando `mode` for `write` e `confirmWrite` for `true`.

```json
{
  "mode": "write",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-30",
  "clientName": "AUDIO CONTROL",
  "confirmWrite": true
}
```

## Protecoes

- `write` sem `confirmWrite: true` falha.
- `audit` nao exige periodo.
- `dry-run` nao altera tabelas.
- A funcao reutiliza os segredos ja existentes no ambiente da Edge: `SUPABASE_SERVICE_ROLE_KEY`, `DEVID_TOKEN` e `MILVUS_TOKEN`.
