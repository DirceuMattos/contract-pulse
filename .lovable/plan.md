

## Plano: Atualizar datas de desligamento via Turnover API (sem nova sincronização)

Sim, e possivel. A ideia e criar uma edge function dedicada que faz apenas isso: consulta o endpoint de Turnover do Feedz, cruza com os registros inativos/desligados no banco, e atualiza somente o campo `data_desligamento` onde estiver faltando ou incorreto.

### O que sera feito

**Novo arquivo**: `supabase/functions/feedz-update-termination-dates/index.ts`

Uma edge function leve que:
1. Chama `fetchTurnoverMap()` (mesma logica paginada ja implementada no feedz-sync)
2. Busca todos os `hr_people` com `situacao = 'inativo'` que tenham `id_externo` preenchido (o employeeId do Feedz)
3. Para cada pessoa inativa, verifica se existe entrada no turnoverMap pelo `id_externo`
4. Se a data do turnover for diferente da `data_desligamento` atual (ou se estiver nula), atualiza o registro
5. Retorna um relatorio JSON com: total processados, total atualizados, detalhes (nome, matricula, data antiga, data nova)

**Ajuste em**: `src/pages/SettingsPage.tsx`
- Adicionar um botao "Atualizar Datas de Desligamento" na seção Feedz que invoca essa function

### Logica de matching

```text
hr_people.id_externo  ←→  turnoverMap key (profile.id / employeeId)
```

Apenas atualiza `data_desligamento` — nenhum outro campo e tocado.

### Seguranca

- Requer autenticacao (JWT do usuario logado)
- Usa service role key internamente para o UPDATE
- Nao altera nenhum outro campo alem de `data_desligamento`

