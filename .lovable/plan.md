## Plan: Feedz Sync Reconstruído — Matrícula Única + 3 Fluxos + Inconsistências + Rollback

**STATUS: ✅ IMPLEMENTADO**

### O que foi feito

1. **Migração de banco** — Criadas tabelas `feedz_sync_change` e `feedz_sync_inconsistency`, adicionado `inconsistency_count` em `feedz_sync_runs`, e constraint UNIQUE parcial em `hr_people.matricula`.

2. **Edge function `feedz-sync`** — Reescrita completa com 4 cenários estritos:
   - **CREATE**: matrícula não encontrada + ativo + sem data desligamento
   - **UPDATE**: matrícula encontrada + ativo + sem data desligamento (com idempotência por hash)
   - **TERMINATE**: matrícula encontrada + inativo/desligado + com data desligamento
   - **INCONSISTENCY**: qualquer outro caso (matrícula vazia, duplicada, status conflitante)

3. **Edge function `feedz-rollback`** — Adaptada para `feedz_sync_change` com suporte a rollback de terminated (reativação).

4. **Frontend `FeedzReconciliationPage`** — 4 abas: Criados, Alterados, Desligados, Inconsistências. Export CSV para inconsistências. Rollback por registro.

5. **SettingsPage** — Atualizada para exibir `inconsistency_count` em vez de pendências/conflitos.

### Tabelas antigas preservadas
`feedz_sync_items`, `feedz_pending_matches`, `feedz_sync_events` permanecem para dados históricos.
