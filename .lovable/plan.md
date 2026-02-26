

## Rollback da Última Sincronização Feedz

### Escopo
Adicionar um botão de rollback na linha da última sincronização na tabela de histórico, que reverte **apenas os registros criados** naquela execução (conforme limitação técnica já documentada — atualizações e desligamentos não são versionados).

### Como funciona
1. Ao clicar em "Rollback" na linha da última sync, o sistema consulta `feedz_sync_events` filtrando por `sync_run_id` e `event_type = 'create'`
2. Para cada `external_id` encontrado, exclui o registro correspondente de `hr_people` (e timeline associada)
3. Atualiza o status do `feedz_sync_runs` para `'rolled_back'`
4. Exibe confirmação com contagem de registros removidos

### Implementação

**1. Criar edge function `feedz-rollback`**
- Recebe `{ runId }` no body
- Valida que o caller é c-level
- Busca eventos do run com `event_type = 'create'`
- Deleta os `hr_people` por `id_externo` (e timeline por `person_id`)
- Marca o run como `'rolled_back'`
- Retorna contagem de removidos

**2. Atualizar `SettingsPage.tsx` — componente `FeedzSyncSection`**
- Adicionar coluna "Ações" na tabela de histórico
- Na linha da **última** sync com status `'success'`, exibir botão "Rollback" com ícone `Undo2`
- Dialog de confirmação antes de executar
- Após sucesso, recarregar a lista de runs

### Detalhes Técnicos

- A edge function usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS nas deleções
- Apenas runs com status `'success'` podem ser revertidos
- Apenas a **última** linha (mais recente) exibe o botão — não é possível reverter runs antigos
- Rollback de updates/terminations não é suportado (será informado no dialog de confirmação quando houver registros atualizados/desligados no run)

