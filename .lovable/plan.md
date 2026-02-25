

# Plano: Correção do Controle de Acesso por Módulo e Permissões de Intermediários

## Diagnóstico

### Causa Raiz Principal
As tabelas `user_roles` e `user_module_permissions` possuem políticas de RLS que **restringem SELECT apenas a usuários c-level**:

```sql
-- user_roles
Policy: user_roles_select → has_role(auth.uid(), 'c-level')

-- user_module_permissions  
Policy: ump_select → has_role(auth.uid(), 'c-level')
```

**Consequência**: Quando um usuário `intermediario` faz login, o `AuthContext.fetchRoleAndPermissions()` tenta ler `user_roles` e `user_module_permissions`, mas o RLS bloqueia ambas as queries. O resultado:
- `role` retorna `null` e assume fallback `'leitor'`
- `modulePermissions` retorna `null` e usa defaults de `leitor`
- `canEdit` = `false` (pois leitor não é c-level nem intermediário)
- O usuário intermediário é tratado como leitor em todo o sistema

Isso causa os dois problemas reportados:
1. Intermediários não conseguem editar contratos/clientes (são tratados como leitores)
2. Permissões por módulo configuradas pelo admin são ignoradas (o usuário não consegue ler suas próprias permissões)

### Problema Secundário
A função `has_role()` é chamada dentro do RLS de `user_roles`, que por sua vez consulta `user_roles` — mas como é `SECURITY DEFINER`, não há recursão. O problema é que a policy simplesmente não permite que o próprio usuário leia seu papel.

## Solução

### 1. Corrigir RLS de `user_roles` (Migration)
Permitir que cada usuário leia **seu próprio** papel, além de c-level ler todos:

```sql
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;

-- Allow users to read their own role + c-level can read all
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'c-level'::app_role)
  );
```

**Nota sobre recursão**: A chamada `has_role(auth.uid(), 'c-level')` consulta `user_roles` dentro de uma policy de `user_roles`, mas como `has_role` é `SECURITY DEFINER`, ela ignora RLS e não causa recursão. A cláusula `auth.uid() = user_id` é avaliada primeiro para o próprio usuário, sem precisar da função.

### 2. Corrigir RLS de `user_module_permissions` (Migration)
Permitir que cada usuário leia **suas próprias** permissões:

```sql
DROP POLICY IF EXISTS "ump_select" ON public.user_module_permissions;

CREATE POLICY "ump_select" ON public.user_module_permissions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'c-level'::app_role)
  );
```

### 3. Nenhuma alteração de código necessária
O `AuthContext.fetchRoleAndPermissions()` já está correto — ele consulta ambas as tabelas. O problema é exclusivamente de RLS. Uma vez corrigido:
- Intermediários lerão seu próprio papel → `role = 'intermediario'`
- `canEdit` será `true` para intermediários
- Permissões de módulo personalizadas serão lidas corretamente
- O admin poderá desabilitar HR (ou qualquer módulo) para um intermediário específico e a restrição será respeitada

## Impacto
- **Intermediários**: Passarão a ver e editar contratos/clientes normalmente
- **Leitores**: Continuarão apenas com visualização
- **Permissões por módulo**: Funcionarão conforme configurado pelo admin no formulário de usuários
- **Segurança**: Cada usuário só lê seus próprios dados; c-level continua lendo tudo
- **Nenhum arquivo de código precisa ser alterado**

## Sequência
1. Executar migration para corrigir RLS de `user_roles`
2. Executar migration para corrigir RLS de `user_module_permissions`
3. Testar: login como intermediário → verificar acesso a contratos e clientes

