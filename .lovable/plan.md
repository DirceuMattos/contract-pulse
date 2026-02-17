
# Controle de Acesso por Modulo -- Configuravel pelo Master

## Visao geral

Adicionar uma camada de permissoes por modulo (`moduleAccess`) ao sistema de usuarios, permitindo que o Admin (C-Level) controle granularmente quais modulos cada usuario pode acessar. Esta camada nunca amplia permissoes alem do que o role permite -- apenas restringe.

---

## 1. Catalogo de modulos e tipos

### Arquivo: `src/types/moduleAccess.ts` (novo)

Definir o catalogo central:

```typescript
export const MODULE_KEYS = [
  'DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL',
  'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS',
  'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS',
  'SETTINGS', 'IMPORT_EXPORT',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  routes: string[];           // rotas associadas
  isSubmodule?: boolean;      // abas internas (HISTORY, DOCUMENTS, RESOURCES)
  parentModule?: ModuleKey;   // ex: HISTORY -> CONTRACTS
  roleRestrictions: UserRole[]; // roles que PODEM acessar (vazio = todos)
}
```

Incluir constante `MODULE_CATALOG: ModuleDefinition[]` mapeando cada modulo com label, descricao, rotas e restricoes por role. Exemplos:
- `USERS_ADMIN`: roleRestrictions = `['c-level']`
- `ACCESS_LOGS`: roleRestrictions = `['c-level']`
- `SETTINGS`: roleRestrictions = `['c-level']`
- `DASHBOARD`, `CONTRACTS`, `CLIENTS`, etc.: roleRestrictions = `[]` (todos)

Incluir funcao `getDefaultModuleAccess(role: UserRole): Record<ModuleKey, boolean>` que retorna os defaults por role.

Incluir mapeamento `ROUTE_TO_MODULE: Record<string, ModuleKey>` para mapear padroes de rota ao modulo correspondente (ex: `/contratos` e `/contratos/:id` -> `CONTRACTS`, `/contratos/:id/recursos` -> `RESOURCES`).

---

## 2. Modelo de dados do usuario

### Arquivo: `src/types/systemUser.ts` (mod)

Adicionar campo opcional ao `SystemUser`:
```typescript
moduleAccess?: Record<ModuleKey, boolean>;
```

Adicionar ao `SystemUserFormData`:
```typescript
moduleAccess?: Record<ModuleKey, boolean>;
```

### Arquivo: `src/data/mockSystemUsers.ts` (mod)

Adicionar `moduleAccess` aos usuarios mock para testes:
- `usr-003` (Maria, Leitor): `CALCULATOR: false` (testar ocultacao de menu e bloqueio de rota)
- `usr-002` (Joao, Intermediario): `RESOURCES: true` (RH mascarado mantido)
- `usr-004` (Carlos, Intermediario inativo): `DOCUMENTS: false` (testar submódulo)

### Arquivo: `src/contexts/SystemUsersContext.tsx` (mod)

- No `addUser`, inicializar `moduleAccess` usando `getDefaultModuleAccess(role)` se nao fornecido
- No `updateUser`, permitir atualizar `moduleAccess`
- Ao mudar o role de um usuario, fazer merge: manter customizacoes mas desabilitar modulos que o novo role nao permite

---

## 3. Hook central de verificacao de acesso

### Arquivo: `src/hooks/useModuleAccess.ts` (novo)

```typescript
export function useModuleAccess() {
  const { user } = useAuth();
  const { getUser } = useSystemUsers();

  // Retorna se o usuario logado pode acessar determinado modulo
  function canAccessModule(moduleKey: ModuleKey): boolean {
    if (!user) return false;
    const systemUser = getUser(user.id);
    const moduleDef = MODULE_CATALOG.find(m => m.key === moduleKey);
    
    // 1. Verificar restricao por role
    if (moduleDef?.roleRestrictions.length && !moduleDef.roleRestrictions.includes(user.role))
      return false;
    
    // 2. Verificar moduleAccess do usuario
    const access = systemUser?.moduleAccess;
    if (access && access[moduleKey] === false) return false;
    
    return true;
  }

  // Mapear rota atual para ModuleKey
  function canAccessRoute(pathname: string): boolean { ... }

  return { canAccessModule, canAccessRoute };
}
```

---

## 4. Pagina de acesso negado

### Arquivo: `src/pages/AccessDeniedPage.tsx` (novo)

Pagina simples com icone Shield, titulo "Acesso Negado", mensagem explicativa e botao "Voltar ao Dashboard".

---

## 5. RouteGuard (protecao de rotas)

### Arquivo: `src/components/layout/RouteGuard.tsx` (novo)

Componente wrapper que recebe `moduleKey` (ou detecta automaticamente pela rota) e renderiza `<Outlet />` se permitido, ou redireciona para `AccessDeniedPage`.

### Arquivo: `src/App.tsx` (mod)

Envolver as rotas com `RouteGuard` ou adicionar verificacao no `MainLayout`. A abordagem mais limpa: criar um componente `<ProtectedRoute moduleKey="...">` e envolver cada rota.

Alternativa mais simples: no `MainLayout`, antes de renderizar `<Outlet />`, verificar `canAccessRoute(location.pathname)`. Se negado, renderizar `AccessDeniedPage` inline em vez do `Outlet`.

Decisao: usar a abordagem no `MainLayout` para minimizar alteracoes no `App.tsx`. Adicionar verificacao apos autenticacao e antes do render do Outlet.

---

## 6. Sidebar -- filtrar itens por moduleAccess

### Arquivo: `src/components/layout/Sidebar.tsx` (mod)

Na lista `navItems`, adicionar campo `moduleKey: ModuleKey` a cada item. No `.filter()`, alem da verificacao `adminOnly`, chamar `canAccessModule(item.moduleKey)`.

Remover a propriedade `adminOnly` (substituida pela verificacao unificada via `moduleAccess`).

---

## 7. Command Palette -- filtrar comandos

### Arquivo: `src/components/layout/CommandPalette.tsx` (mod)

Adicionar `moduleKey` a cada `CommandItem` de navegacao. Filtrar items com `canAccessModule` antes de renderizar. O mesmo para acoes rapidas (novo contrato, novo cliente, etc.).

---

## 8. Submodulos (abas do contrato)

### Arquivo: `src/pages/ContractDetailPage.tsx` (mod)

Nas `TabsTrigger` de "Historico" e "Documentos", condicionar visibilidade com `canAccessModule('HISTORY')` e `canAccessModule('DOCUMENTS')`. Se a aba estiver bloqueada e o usuario tentar acessar via link direto, mostrar fallback "Acesso negado a esta secao" no `TabsContent`.

---

## 9. Tabela de permissoes no formulario de usuario

### Arquivo: `src/components/users/UserFormDialog.tsx` (mod)

Expandir o dialog para incluir, abaixo dos campos existentes, uma secao "Permissoes por Modulo" com:

- Tres botoes de acao rapida: "Ativar todos (permitidos)", "Desativar todos", "Restaurar padrao do papel"
- Input de busca para filtrar modulos por nome
- Tabela com colunas: Modulo | Descricao | Acesso (Switch) | Restricao
- Switches desabilitados quando o role nao permite (tooltip: "Bloqueado pelo papel do usuario")
- Para Admin editando o proprio usuario: switch de `USERS_ADMIN` travado em true (tooltip: "Nao pode ser desativado para evitar bloqueio do sistema")

O `moduleAccess` sera parte do form state e salvo junto com os demais dados do usuario.

O dialog sera expandido para `sm:max-w-[700px]` para acomodar a tabela.

---

## 10. Integracao com AuthContext

### Arquivo: `src/contexts/AuthContext.tsx` (mod)

Adicionar ao contexto de auth:
- `moduleAccess: Record<ModuleKey, boolean> | undefined` (copiado do SystemUser no login)
- Atualizar quando o usuario logado for editado

Alternativa: nao duplicar no AuthContext, usar sempre `useModuleAccess()` que consulta `SystemUsersContext`. Mais simples e evita dessincronizacao.

Decisao: usar `useModuleAccess()` hook, sem alterar AuthContext.

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/types/moduleAccess.ts` | Novo | Catalogo de modulos, tipos, defaults por role, mapeamento rota->modulo |
| `src/hooks/useModuleAccess.ts` | Novo | Hook central de verificacao de acesso |
| `src/pages/AccessDeniedPage.tsx` | Novo | Pagina "Acesso Negado" com CTA |
| `src/types/systemUser.ts` | Mod | Adicionar `moduleAccess` ao SystemUser |
| `src/data/mockSystemUsers.ts` | Mod | Adicionar moduleAccess aos mocks para testes |
| `src/contexts/SystemUsersContext.tsx` | Mod | Suportar moduleAccess no CRUD |
| `src/components/layout/Sidebar.tsx` | Mod | Filtrar itens por canAccessModule |
| `src/components/layout/CommandPalette.tsx` | Mod | Filtrar comandos por canAccessModule |
| `src/components/layout/MainLayout.tsx` | Mod | RouteGuard inline antes do Outlet |
| `src/components/users/UserFormDialog.tsx` | Mod | Tabela de permissoes por modulo |
| `src/pages/ContractDetailPage.tsx` | Mod | Ocultar abas HISTORY/DOCUMENTS por moduleAccess |
| `src/App.tsx` | Mod | Adicionar rota /acesso-negado |

## Ordem de implementacao

1. Tipos e catalogo (`moduleAccess.ts`)
2. Mock data e SystemUsersContext (suportar o campo)
3. Hook `useModuleAccess`
4. Pagina AccessDenied + RouteGuard no MainLayout
5. Sidebar e CommandPalette (filtrar por modulo)
6. Submodulos no ContractDetailPage
7. Tabela de permissoes no UserFormDialog

## Regras de preservacao

- Todas as regras de role existentes (canViewValues, canViewHRCosts, canEdit) permanecem inalteradas
- moduleAccess apenas restringe, nunca amplia
- Mascaramento de RH permanece para nao-C-Level independente de moduleAccess
- CRUD de recursos continua com as mesmas restricoes de role
- Logs, calculadora, badges, sidebar dark theme -- tudo preservado
