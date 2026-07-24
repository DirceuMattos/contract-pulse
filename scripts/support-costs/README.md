# Importacao manual de custos do suporte TSI

Este fluxo foi criado para meses fechados do Milvus. A tela do sistema deve ficar para consulta da base local e para sincronizacao operacional do mes atual/futuro.

## Variaveis necessarias

Configure no ambiente, em `.env.local`, ou antes de executar:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MILVUS_TOKEN=...
```

Tambem funciona com `VITE_SUPABASE_URL` no lugar de `SUPABASE_URL`.

## 1. Verificar clientes Milvus x Hub

Antes de importar qualquer periodo, rode a auditoria:

```bash
node scripts/support-costs/manual-milvus-import.mjs --mode audit
```

Ela gera arquivos em:

```text
scripts/support-costs/output/
```

O relatorio mostra:

- clientes encontrados no Milvus;
- clientes encontrados no Hub;
- clientes com match automatico;
- clientes pendentes;
- clientes ambiguos.

Use os pendentes/ambiguos para corrigir cadastro ou mappings antes da carga historica.

## 2. Simular uma importacao

O modo importacao roda em `dry-run` por padrao. Ele busca os dados no Milvus, calcula tickets/horas e gera relatorios, mas nao grava no banco.

Exemplo com um cliente:

```bash
node scripts/support-costs/manual-milvus-import.mjs --mode import --from 2026-06-01 --to 2026-06-30 --client "AUDIO CONTROL"
```

Exemplo para todos os clientes Milvus:

```bash
node scripts/support-costs/manual-milvus-import.mjs --mode import --from 2026-06-01 --to 2026-06-30
```

Para um teste menor:

```bash
node scripts/support-costs/manual-milvus-import.mjs --mode import --from 2026-06-01 --to 2026-06-30 --limit-clients 5
```

## 3. Gravar no banco

Depois de revisar os arquivos gerados e confirmar os totais, rode com `--write`:

```bash
node scripts/support-costs/manual-milvus-import.mjs --mode import --from 2026-06-01 --to 2026-06-30 --write
```

Ao gravar, o script atualiza:

- `support_milvus_clients`;
- `support_milvus_client_mappings`;
- `support_milvus_projects`;
- `support_milvus_project_mappings`;
- `support_cost_tickets`;
- `support_cost_inconsistencies`;
- `support_cost_monthly_loads`;
- `support_cost_sync_runs`.

## Rollback

Antes de rodar com `--write`, anote o periodo. Para voltar a carga de um mes fechado, remova os tickets do periodo e marque o mes como pendente novamente.

Exemplo:

```sql
delete from public.support_cost_tickets
where ticket_date >= date '2026-06-01'
  and ticket_date <= date '2026-06-30';

update public.support_cost_monthly_loads
set status = 'pending',
    tickets_count = 0,
    total_hours = 0,
    inconsistency_count = 0,
    last_synced_at = null,
    error_message = null,
    updated_at = now()
where month_key = '2026-06';
```

Se quiser preservar historico de auditoria, nao apague `support_cost_sync_runs`; ele registra a tentativa/carga.
