

# Diagnóstico: Edge Function `feedz-sync` com bug de autenticação

## Problema identificado

A Edge Function `feedz-sync` possui um bug que impede seu funcionamento. Na linha 48, ela usa `userClient.auth.getClaims(token)` -- **esse metodo nao existe** na biblioteca Supabase JS v2. O metodo correto e `getUser()`.

Isso significa que toda chamada a funcao falha silenciosamente na verificacao de autenticacao, retornando "Unauthorized" antes mesmo de tentar conectar ao Feedz.

**Importante esclarecer:** a verificacao "c-level" **nao tem relacao com o Feedz**. E uma regra do **nosso sistema** (RBAC interno). O usuario que clicar "Sincronizar agora" precisa ter o papel `c-level` atribuido na tabela `user_roles` do nosso banco. Isso nao depende de nenhum campo do Feedz.

## Correcoes necessarias

### 1. Corrigir autenticacao na Edge Function

Substituir o trecho com `getClaims` (linhas 42-52) por `getUser()`:

```typescript
// Antes (bugado):
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
const userId = claimsData.claims.sub

// Depois (correto):
const { data: { user }, error: userError } = await userClient.auth.getUser()
if (userError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
}
const userId = user.id
```

### 2. Melhorar feedback de erro no frontend

Atualizar `SettingsPage.tsx` para exibir a mensagem de erro real retornada pela Edge Function, facilitando o diagnostico caso o Feedz retorne erro de token ou endpoint.

### 3. Nenhuma outra mudanca

A logica de mapeamento de campos, criacao de cargos/equipes, timeline e desligamento permanece inalterada.

## Resumo das alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/feedz-sync/index.ts` | Corrigir `getClaims` para `getUser()` |
| `src/pages/SettingsPage.tsx` | Melhorar exibicao de erros do sync |

Apos essa correcao, o botao "Sincronizar agora" em **Configuracoes** (visivel apenas para usuarios c-level do nosso sistema) devera funcionar corretamente, conectando ao Feedz com o token configurado.

