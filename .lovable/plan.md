## Objetivo
Descobrir todos os campos que a API Feedz retorna para o colaborador `id_externo=2051079` — especialmente campos relacionados a foto/avatar — usando o próprio `feedz-sync` (que já passa pelo Cloudflare com sucesso).

A função temporária `feedz-test-photo` foi bloqueada por Cloudflare nas tentativas anteriores. Em vez de seguir batendo nela, vamos instrumentar o `feedz-sync` real (que funciona) para logar o JSON cru do colaborador alvo.

## Passos

1. **Instrumentar `feedz-sync`** (`supabase/functions/feedz-sync/index.ts`)
   - Logo após o `fetchAllFeedzEmployees(...)` retornar a lista, adicionar um bloco que:
     - Procura o registro com `employeeId === 2051079` (ou `profile.id === 2051079`).
     - Faz `console.log('[feedz-sync][DEBUG-2051079] keys:', Object.keys(emp))`.
     - Faz `console.log('[feedz-sync][DEBUG-2051079] payload:', JSON.stringify(emp, null, 2))`.
   - Comportamento do sync permanece idêntico — é apenas logging adicional, não altera mapeamento nem escrita no banco.

2. **Deploy** automático pelo Lovable Cloud.

3. **Você dispara o `feedz-sync` pela UI** (página de RH / sincronização Feedz) como faz normalmente.

4. **Eu leio os logs** com `supabase--edge_function_logs` filtrando por `DEBUG-2051079` e devolvo aqui o JSON completo + lista dos campos disponíveis.

5. **Próximo passo (após análise, em outro plano)**: decidir o nome real do campo de foto (ex: `photo`, `avatar`, `foto_url`) e:
   - Adicionar coluna `foto_url` em `hr_people` via migration.
   - Mapear o campo no `feedz-sync`.
   - Remover o bloco de debug e a função temporária `feedz-test-photo` (+ entrada no `config.toml`).

## Detalhes técnicos
- Não removo a `feedz-test-photo` agora — fica para o cleanup final junto com o debug.
- O log do JSON pode aparecer truncado nos logs; se passar do limite, dividimos em chunks ao ler.
- Nenhuma alteração de schema, RLS, ou comportamento de negócio neste plano.

## Arquivos afetados
- `supabase/functions/feedz-sync/index.ts` (apenas adição de 2 `console.log` condicionais)
