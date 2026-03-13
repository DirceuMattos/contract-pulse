
Diagnóstico do problema (com evidência no ambiente atual)

1) A rotina está usando o campo errado como matrícula.
- No `supabase/functions/feedz-sync/index.ts`, hoje a matrícula é definida como `String(person.employeeId)`.
- Isso faz o match procurar `hr_people.matricula = employeeId`, quando na prática os dados existentes mostram:
  - `hr_people.matricula` (ex.: `1001`)
  - `hr_people.id_externo` (ex.: `2051077`)
- Resultado: o sistema “não encontra” por matrícula, tenta criar novo registro, e falha com `duplicate key` em `id_externo` (vimos `PARSE_ERROR` com `idx_hr_people_id_externo_unique`).

2) A planilha não aparece porque a exportação está lendo tabela legada.
- `SettingsPage` exporta de `feedz_sync_items` (legado),
- mas o fluxo novo grava em `feedz_sync_change` e `feedz_sync_inconsistency`.

3) Rollback por registro “indisponível” hoje por estado dos dados.
- No banco, não há itens `created/updated/terminated` com `reverted_at IS NULL` (runs recentes já estão `rolled_back`), então a UI não exibe ação reversível nesses itens.

Plano de correção (implementação)

1) Corrigir a chave de match (somente matrícula) no backend de sync
- Arquivo: `supabase/functions/feedz-sync/index.ts`
- Ajustes:
  - Criar `extractMatricula()` para ler a matrícula real do payload Feedz (não usar `employeeId` como matrícula).
  - Normalizar matrícula dos dois lados (`trim`, string canônica) antes de montar mapa e comparar.
  - Match estrito: apenas por `hr_people.matricula`.
  - `employeeId` permanece apenas como referência técnica (não como chave de match).
  - Em caso de ausência/invalidade da matrícula no payload, classificar como inconsistência (sem gravar no RH).

2) Blindagem para não criar duplicado indevido
- Ainda em `feedz-sync`:
  - Antes de CREATE, validar conflito por integridade (ex.: `id_externo` já existente) e registrar como inconsistência detalhada, nunca “forçar” insert.
  - Manter idempotência com `payload_hash`, mas garantir que o skip só aconteça quando efetivamente não houver mudança no conjunto sincronizado.

3) Entregar planilha/listagem do run com os 4 cenários
- Arquivos:
  - `src/lib/importExport.ts`
  - `src/pages/SettingsPage.tsx`
  - `src/pages/FeedzReconciliationPage.tsx`
- Ajustes:
  - Criar exportador V2 usando `feedz_sync_change` + `feedz_sync_inconsistency`.
  - Planilha XLSX com abas:
    - Criados
    - Alterados
    - Desligados
    - Inconsistências
  - Colunas mínimas exigidas em todas as abas de ação:
    - Matrícula Feedz
    - Nome RH
    - Ação aplicada
  - Complementos úteis: data/hora (`synced_at`), campos alterados (quando houver), motivo de inconsistência.
  - Fallback para runs legados (`feedz_sync_items`) para não quebrar histórico antigo.

4) Restabelecer experiência de rollback por registro
- Arquivos:
  - `src/pages/FeedzReconciliationPage.tsx`
  - `supabase/functions/feedz-rollback/index.ts` (ajustes pontuais de robustez/mensagens)
- Ajustes:
  - Exibir claramente estado “já revertido” vs “reversível”.
  - Manter botão por item para `created/updated/terminated` não revertidos.
  - Mensagem explicativa quando um run não tiver itens reversíveis (evitar impressão de “funcionalidade sumiu”).
  - Garantir remoção apenas dos eventos de timeline gerados pelo sync (`source='feedz'` + `sync_run_id`), como já previsto.

5) Validação final (aceite)
- Executar sync de validação e checar:
  - Não criar novo registro quando a matrícula já existe no RH.
  - Relatório XLSX disponível para download com 4 abas e colunas solicitadas.
  - Rollback por item disponível em run com itens não revertidos.
  - Rodar sync 2x sem mudança sem gerar `updated` falso.
