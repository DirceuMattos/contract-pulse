# Gestão de Perfis (Superadmin)

Cria uma tela nova para o superadmin gerenciar permissões dos perfis. Nenhuma página existente será modificada além do `App.tsx` (necessário para registrar a rota).

## Arquivos

### 1. Novo: `src/pages/ProfilesAdminPage.tsx`

**Guard de acesso**
- Usa `useAuth()`. Se `loading` → loader. Se `!isSuperAdmin` → `<Navigate to="/dashboard" replace />`.

**Header**
- `PageHeader` com título "Gestão de Perfis" e subtítulo "Configure módulos e permissões por perfil de usuário." Sem ação de criar.

**Lista de perfis (cards)**
- Perfis fixos na ordem: `c-level, superadmin, intermediario, administrativo, lider_tribo, rh, juridico, comercial, demo, leitor`.
- Para cada um: `Card` com nome + `Badge` usando o mapa `roleColors` (copiado do `UsersPage`, mantendo as MESMAS cores — sem editar `UsersPage`), contagem de módulos habilitados (vinda de `role_profiles.modules` ou, na ausência, de `ROLE_DEFAULT_MODULES`/todos) e botão "Configurar" que abre o `Sheet`.

**Sheet de edição** (`@/components/ui/sheet`, lado direito, largura ~`sm:max-w-2xl`)
- Título: `Configurar perfil: {label}`.
- Estado local de edição inicializado a partir do registro `role_profiles` do perfil clicado.
- Seção "Módulos com acesso": grupos exatamente como o Sidebar:
  - Geral → DASHBOARD, ALERTS
  - Clientes e Contratos → CLIENTS, CONTRACTS, CONTRACT_DETAIL, RESOURCES, HISTORY, DOCUMENTS, RECEIVABLES, CALCULATOR
  - Recursos e Pessoas → HR, SQUADS, OVERTIME, TRANSPORT, JOB_REQUESTS, JOB_SKILLS
  - Setup → SETTINGS, USERS_ADMIN, IMPORT_EXPORT, PROFILES_ADMIN, ACCESS_LOGS
  - IA → AI, AI_LOGS
- Cada checkbox usa `Checkbox` + label com `MODULE_CATALOG[i].label`.
- Se `isRoleAllowedForModule(role, key) === false` → checkbox `disabled`, valor forçado `false`, envolto em `Tooltip` "Restrito por definição do sistema".
- Seção "Permissões de ação": `Switch` para `can_edit`, `can_create`, `can_delete`, `can_export`, `can_view_values`, `can_view_hr_costs`, `can_allocate`.

**Botões do Sheet**
- "Salvar alterações" → `upsert` em `role_profiles` por `role`, depois chama `propagateProfileChanges(role, modulesArray)` e toast "Perfil atualizado e propagado para X usuários".
- "Cancelar" → fecha o sheet, descarta o estado local.
- "Resetar para padrão" → preenche estado local com `ROLE_DEFAULT_MODULES[role]` (ou catálogo inteiro se ausente) e flags padrão derivadas do mapping atual no `AuthContext` (apenas reset local — só persiste se o usuário clicar Salvar).

**`propagateProfileChanges(role, modules)`**
1. `select user_id from user_roles where role = ?`
2. Para cada `user_id`: `delete from user_module_permissions where user_id = ?`
3. Bulk `insert` em `user_module_permissions` com `(user_id, module_key, is_allowed=true)` para cada module selecionado.
4. Retorna `affected = userIds.length` para o toast.

**Carregamento**
- `useEffect` busca `select * from role_profiles` ao montar; mantém em estado `Record<UserRole, RoleProfileRow>`.
- Tipos do retorno usam `as any` no client para `role_profiles` se a tabela não estiver nos types gerados.

### 2. Editar: `src/App.tsx`
- Importar `ProfilesAdminPage`.
- Adicionar `<Route path="/usuarios/perfis" element={<ProfilesAdminPage />} />` dentro do bloco `<MainLayout />` (logo após `/usuarios/logs`).

## Fora do escopo
- Nenhum outro arquivo alterado. `UsersPage.tsx`, `Sidebar.tsx`, `moduleAccess.ts`, `AuthContext.tsx`, RLS de `role_profiles` e `user_module_permissions` não serão tocados.

## Riscos
- Se RLS de `role_profiles`/`user_module_permissions` bloquear o superadmin, as operações falharão em runtime — fora do escopo desta tarefa, será reportado se ocorrer.
