

# Ajustes no Modulo de Usuarios

## 1. Troca de senha compulsoria no primeiro acesso

**Abordagem:** Usar `user_metadata.must_change_password = true` definido na criacao do usuario. No login, o sistema detecta a flag e redireciona para uma tela de troca de senha.

### Alteracoes:

**`supabase/functions/manage-users/index.ts`** -- Na funcao `handleCreate`, adicionar `must_change_password: true` no `user_metadata`:
```
user_metadata: { name, must_change_password: true }
```

**`src/contexts/AuthContext.tsx`** -- Expor `mustChangePassword` no contexto, lendo de `session.user.user_metadata.must_change_password`.

**`src/pages/ChangePasswordPage.tsx`** (novo) -- Pagina com formulario de nova senha + confirmacao. Ao submeter:
- Chama `supabase.auth.updateUser({ password, data: { must_change_password: false } })`
- Redireciona para `/dashboard`

**`src/App.tsx`** -- Adicionar rota `/trocar-senha` fora do `MainLayout` (ao lado de `/login`).

**`src/pages/LoginPage.tsx`** -- Apos login, verificar `mustChangePassword` e redirecionar para `/trocar-senha` em vez de `/dashboard`.

**`src/components/layout/MainLayout.tsx`** -- Verificar `mustChangePassword` e redirecionar para `/trocar-senha` se ativo (impede acesso direto via URL).

---

## 2. Correcao da mensagem de erro falsa na insercao de usuario

**Causa raiz:** No `SystemUsersContext.tsx`, a funcao `addUser` faz:
1. Chama `invokeManageUsers('create', ...)` -- sucesso
2. Chama `refreshUsers()` -- atualiza o estado React
3. Busca `users.find(...)` -- mas usa o array **antigo** (o estado React ainda nao atualizou)
4. Retorna `null` -- o que dispara o toast de erro no `UserFormDialog`

**Correcao:** Em vez de buscar no array local, retornar diretamente os dados da resposta da Edge Function (que ja retorna `{ userId, message }`), ou simplesmente retornar `true/false` indicando sucesso.

**Arquivo:** `src/contexts/SystemUsersContext.tsx` -- Alterar `addUser` para retornar um objeto construido a partir da resposta da API em vez de buscar no array `users`.

**Arquivo:** `src/components/users/UserFormDialog.tsx` -- Ajustar a verificacao de sucesso se o tipo de retorno mudar.

---

## 3. Envio de e-mail ao cadastrar usuario

Sim, e possivel. A abordagem mais simples e usar o **Supabase Auth com `email_confirm: false`**, o que faz o Supabase enviar automaticamente um e-mail de confirmacao ao usuario. Porem, isso mudaria o fluxo atual (hoje `email_confirm: true` pula a confirmacao).

**Abordagem recomendada:** Manter `email_confirm: true` (usuario ja fica ativo) e enviar um e-mail de boas-vindas personalizado usando a Edge Function com o servico de e-mail nativo do Supabase (`admin.auth.admin.inviteUserByEmail`) ou um template customizado.

**Alternativa mais simples:** Alterar para `email_confirm: false` na criacao. O Supabase enviara automaticamente um e-mail de confirmacao com link. O usuario so conseguira logar apos confirmar. Isso mudaria o fluxo -- o admin cria o usuario mas ele so funciona apos o usuario clicar no link do e-mail.

**Sugestao pragmatica:** Usar `admin.auth.admin.generateLink({ type: 'magiclink', email })` apos criar o usuario para gerar um link de acesso que sera enviado por e-mail via Supabase. Isso combina bem com o item 1 (troca de senha no primeiro acesso) -- o usuario recebe o link, acessa o sistema, e e obrigado a trocar a senha.

> **Nota importante:** O envio de e-mail depende da configuracao SMTP do backend. O Supabase tem um limite de 4 e-mails/hora no servidor padrao. Para producao, sera necessario configurar um servidor SMTP customizado (como SendGrid, Resend, etc). Posso configurar isso se voce tiver um provedor de e-mail preferido.

---

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/manage-users/index.ts` | Adicionar flag `must_change_password` na criacao |
| `src/contexts/AuthContext.tsx` | Expor `mustChangePassword` no contexto |
| `src/pages/ChangePasswordPage.tsx` | **Novo** -- formulario de troca de senha |
| `src/pages/LoginPage.tsx` | Redirecionar se flag ativa |
| `src/App.tsx` | Adicionar rota `/trocar-senha` |
| `src/components/layout/MainLayout.tsx` | Bloquear acesso se flag ativa |
| `src/contexts/SystemUsersContext.tsx` | Corrigir retorno de `addUser` |
| `src/components/users/UserFormDialog.tsx` | Ajustar verificacao de sucesso (se necessario) |

