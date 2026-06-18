## Causa

A edge function `feedz-sync` checa apenas a role `c-level` via `has_role` e retorna **403 Forbidden** para qualquer outro usuário — inclusive `superadmin`. Por isso a sincronização falha com "Edge Function returned a non-2xx status code". O mesmo padrão existe em `feedz-rollback`.

## Correção

Trocar a checagem única por uma checagem que aceite `c-level` **ou** `superadmin`, usando a RPC já existente `has_any_role`.

### 1. `supabase/functions/feedz-sync/index.ts` (linha ~256)

```ts
const { data: roleCheck } = await db.rpc('has_any_role', {
  _user_id: userId,
  _roles: ['c-level', 'superadmin'],
})
if (!roleCheck) {
  return new Response(
    JSON.stringify({ error: 'Forbidden: c-level or superadmin only' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
```

### 2. `supabase/functions/feedz-rollback/index.ts`

Aplicar a mesma substituição para manter consistência (superadmin também deve poder fazer rollback).

### 3. Redeploy

Fazer redeploy das duas edge functions após as edições.

Nenhuma alteração de frontend, schema ou RLS é necessária — a RPC `has_any_role` já existe no banco.
