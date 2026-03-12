

## Plano: FEEDZ SYNC V5 — Reconciliação por Matrícula

### Estado Atual

A edge function `feedz-sync` **já opera por matrícula** como estratégia única de match. O índice parcial `hr_people_matricula_unique` já existe. O que falta implementar são os controles adicionais do PRD:

### Mudanças na Edge Function (`supabase/functions/feedz-sync/index.ts`)

**1. Detecção de duplicatas no Feedz (bloqueio preventivo)**
- Após buscar dados da API Feedz, agrupar por `employeeId` (= matrícula)
- Se houver duplicatas → abortar run com status `error` e mensagem detalhada listando as matrículas duplicadas
- Registrar no `feedz_sync_runs.error_message`

**2. Timeline "Admissão (Feedz)" na criação**
- Ao inserir novo `hr_people`, criar evento na `hr_timeline` com:
  - `ocorrencia: 'admissao'`
  - `event_date: data_admissao`
  - `descricao: 'Admissão sincronizada via Feedz (matrícula XXXX)'`

**3. Timeline para mudanças sensíveis (já parcialmente implementado)**
- Cargo e remuneração já geram timeline. Adicionar também:
  - **Vínculo** (`tipo_vinculo`): se alterar, gerar evento `mudanca-vinculo`
  - **Situação**: reativação (inativo→ativo) gerar evento timeline

**4. Remover estratégias de fallback residuais**
- O código atual já usa apenas matrícula, mas o counter `matchedByEmail/Phone/NameScore` ainda existe. Manter os contadores zerados (compatibilidade com schema existente) mas garantir que nenhum fallback alternativo é usado.

### Resumo de Mudanças

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/feedz-sync/index.ts` | Detecção de duplicatas pré-run, timeline de admissão na criação, timeline para mudança de vínculo |

Nenhuma migração de banco necessária — o unique index parcial já existe.

