

## Plano: Novos Perfis de Usuário

### Resumo

Criar 5 novos papeis no sistema: **Comercial**, **Lider Tribo**, **Juridico**, **RH** e **Administrativo**. Todos sem visao de valores financeiros. O acesso a modulos alem dos defaults sera controlado pelas flags existentes no modulo de usuarios.

### Mudancas

**1. Migracao SQL** -- Adicionar valores ao enum `app_role`

```sql
ALTER TYPE public.app_role ADD VALUE 'comercial';
ALTER TYPE public.app_role ADD VALUE 'lider_tribo';
ALTER TYPE public.app_role ADD VALUE 'juridico';
ALTER TYPE public.app_role ADD VALUE 'rh';
ALTER TYPE public.app_role ADD VALUE 'administrativo';
```

Nenhuma mudanca em RLS e necessaria: os papeis atuais usam `has_role(uid, 'c-level')` e `has_any_role(uid, ['c-level','intermediario'])`. Os novos perfis terao permissao de SELECT (ja concedida a `authenticated` com `USING(true)`) e nao terao permissao de INSERT/UPDATE/DELETE, o que e correto -- sao perfis de leitura.

**2. `src/types/index.ts`** -- Expandir `UserRole`

```typescript
export type UserRole = 'c-level' | 'intermediario' | 'leitor' | 'comercial' | 'lider_tribo' | 'juridico' | 'rh' | 'administrativo';
```

**3. `src/contexts/AuthContext.tsx`** -- Permissoes derivadas

- `canViewValues`: continua apenas `c-level`
- `canEdit`: `c-level` ou `intermediario` (novos perfis nao editam)
- `canViewHRCosts`: continua apenas `c-level`

Sem mudanca na logica, pois os novos perfis nao entram em nenhuma dessas condicoes.

**4. `src/types/moduleAccess.ts`** -- Defaults por perfil

Atualizar `getDefaultModuleAccess` para retornar defaults diferenciados por papel:

| Modulo | Comercial | Lider Tribo | Juridico | RH | Administrativo |
|---|---|---|---|---|---|
| DASHBOARD | sim | sim | sim | sim | flag |
| CONTRACTS | sim | flag | sim | flag | flag |
| CONTRACT_DETAIL | sim | flag | sim | flag | flag |
| SQUADS | sim | sim | sim | sim | flag |
| CLIENTS | flag | flag | flag | flag | flag |
| HR | flag | flag | flag | sim | flag |
| CALCULATOR | flag | flag | flag | flag | flag |
| ALERTS | flag | flag | flag | flag | flag |
| SETTINGS | nao | nao | nao | nao | nao |
| USERS_ADMIN | nao | nao | nao | nao | nao |
| ACCESS_LOGS | nao | nao | nao | nao | nao |

Implementacao: um mapa de defaults por role no `getDefaultModuleAccess`.

**5. `src/components/users/UserFormDialog.tsx`** -- Adicionar novos roles ao Select

Incluir opcoes: Comercial, Lider de Tribo, Juridico, RH, Administrativo no dropdown de perfil.

**6. `supabase/functions/manage-users/index.ts`** -- Sem mudanca logica

A funcao ja aceita qualquer string como `role` e faz UPDATE na tabela `user_roles`. Os novos valores do enum serao aceitos apos a migracao.

### Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | ADD VALUE ao enum `app_role` |
| `src/types/index.ts` | Expandir `UserRole` |
| `src/types/moduleAccess.ts` | Defaults por perfil no `getDefaultModuleAccess` |
| `src/components/users/UserFormDialog.tsx` | Novas opcoes no Select de perfil |
| `src/contexts/AuthContext.tsx` | Sem mudanca (logica ja correta) |

