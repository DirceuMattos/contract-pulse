
# Fase 2: Autenticacao Real + Edge Function para Gestao de Usuarios

## Resumo

Substituir a autenticacao local (localStorage + SystemUsersContext) por autenticacao real usando o sistema de autenticacao do Lovable Cloud. Criar uma Edge Function para que o C-Level possa gerenciar usuarios (criar, editar, excluir, ativar/desativar). O front-end sera atualizado para usar sessoes reais e buscar roles/permissoes do banco de dados.

---

## O que sera feito

### 1. Edge Function: `manage-users`

Uma unica Edge Function que o C-Level usa para gerenciar usuarios do sistema. Acoes suportadas:

- **list**: Lista todos os profiles com seus roles e module permissions
- **create**: Cria usuario no Auth (com `supabaseAdmin`) + atribui role e module permissions
- **update**: Atualiza profile, role e module permissions. Opcionalmente reseta senha
- **delete**: Remove usuario do Auth (cascade deleta profile, roles, permissions)
- **toggle-status**: Bane/desbane usuario via API Admin do Auth
- **get-by-id**: Busca um usuario especifico com role e permissions

Seguranca: valida JWT via `getClaims()`, verifica se o chamador tem role `c-level` no banco.

### 2. AuthContext reescrito

Substituir o AuthContext atual para usar o sistema de autenticacao real:

- `login()`: chama `supabase.auth.signInWithPassword()`
- `logout()`: chama `supabase.auth.signOut()`
- Escuta `onAuthStateChange` para manter sessao sincronizada
- Busca role do usuario na tabela `user_roles` apos login
- Busca `user_module_permissions` do banco
- Mantem as propriedades derivadas: `canViewValues`, `canEdit`, `canViewHRCosts`
- Remove dependencia do `SystemUsersContext`

### 3. SystemUsersContext reescrito

Trocar de localStorage para chamadas a Edge Function `manage-users`:

- `users`: busca via Edge Function (action: list)
- `addUser()`: chama Edge Function (action: create)
- `updateUser()`: chama Edge Function (action: update)
- `deleteUser()`: chama Edge Function (action: delete)
- `toggleUserStatus()`: chama Edge Function (action: toggle-status)
- `validateCredentials()`: removido (nao mais necessario)
- `getUser()` e `getUserByEmail()`: operam sobre a lista carregada

### 4. useModuleAccess atualizado

- Em vez de buscar `moduleAccess` do SystemUsersContext via `getUser()`, buscar as permissoes que ja estao carregadas no AuthContext (vindas do banco)
- Mantem a mesma logica de intersecao: `rolePermission AND modulePermission`

### 5. LoginPage atualizado

- Remove a secao "Usuarios de demonstracao" (nao ha mais senhas hardcoded)
- Mantem o mesmo layout visual
- Usa o novo `login()` do AuthContext

### 6. UsersPage e UserFormDialog

- Continuam funcionando igual, mas agora chamam o SystemUsersContext que faz requests a Edge Function
- O campo "senha" continua existindo para criar usuario e para resetar senha (opcional na edicao)
- O botao ativar/desativar agora bane/desbane via Auth Admin

### 7. AccessLogContext

- Adaptar para gravar sessoes na tabela `access_log_sessions` do banco (via Supabase client direto, pois a RLS permite insert para c-level -- sera necessario ajuste de RLS para que qualquer autenticado possa inserir seus proprios logs)

### 8. App.tsx

- Reordenar providers: AuthProvider nao depende mais de SystemUsersProvider
- SystemUsersProvider pode ficar dentro de AuthProvider

---

## Detalhes tecnicos

### Edge Function `manage-users`

Arquivo: `supabase/functions/manage-users/index.ts`

- Usa `createClient` com `SUPABASE_SERVICE_ROLE_KEY` para operacoes admin (criar/deletar usuarios no Auth)
- Usa `getClaims()` para validar o JWT do chamador
- Verifica role c-level no banco via query na tabela `user_roles`
- Acoes mapeadas por campo `action` no body do POST

Configuracao em `supabase/config.toml`:
```text
[functions.manage-users]
verify_jwt = false
```

### Migracao SQL adicional

- Ajustar RLS de `access_log_sessions` para permitir INSERT por qualquer usuario autenticado (hoje so c-level pode inserir, mas todos os usuarios geram logs de acesso)
- Adicionar coluna `banned` ou usar a funcionalidade nativa do Auth Admin (`banUser`/`unbanUser`) -- o Auth ja suporta isso nativamente, sem necessidade de coluna extra

### Fluxo de autenticacao

1. Usuario digita email/senha no LoginPage
2. `supabase.auth.signInWithPassword()` valida credenciais
3. `onAuthStateChange` dispara com sessao
4. AuthContext busca role em `user_roles` e permissions em `user_module_permissions`
5. Usuario e redirecionado ao dashboard

### Seed do primeiro usuario admin

- Sera necessario criar manualmente o primeiro usuario C-Level no Auth (via Edge Function ou inserindo diretamente)
- A Edge Function tera uma acao especial `seed-admin` que cria o admin inicial se nao existir nenhum usuario c-level

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/manage-users/index.ts` | Criar |
| `supabase/config.toml` | Adicionar config da nova function |
| `src/contexts/AuthContext.tsx` | Reescrever (Auth real) |
| `src/contexts/SystemUsersContext.tsx` | Reescrever (Edge Function) |
| `src/hooks/useModuleAccess.ts` | Atualizar (buscar do AuthContext) |
| `src/pages/LoginPage.tsx` | Atualizar (remover demo users) |
| `src/contexts/AccessLogContext.tsx` | Atualizar (gravar no banco) |
| `src/App.tsx` | Reordenar providers |
| Migracao SQL | Ajustar RLS de access_log_sessions |

### Dependencias

Nenhuma nova dependencia necessaria. O `@supabase/supabase-js` ja esta instalado.

---

## Resultado esperado

- Login real com email/senha validados pelo backend
- Sessoes persistentes (refresh token automatico)
- Gestao de usuarios (CRUD) feita pelo C-Level via Edge Function segura
- Roles e permissoes por modulo armazenados e consultados no banco
- Logs de acesso registrados no banco
- Front-end mantendo a mesma experiencia visual
