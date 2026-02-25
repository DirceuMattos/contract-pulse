

# Diagnóstico: Dashboard sem valores

## Causa Raiz

O `DataProvider` carrega todos os dados uma única vez no `useEffect([], [])` — no momento da montagem do componente, **antes do usuário fazer login**. Nesse momento, as requisições ao banco usam a chave anônima (sem JWT autenticado), e como as tabelas possuem RLS que exige autenticação (`has_role(auth.uid(), ...)`), todas as queries retornam arrays vazios.

Após o login, o `DataProvider` **nunca re-fetcha** os dados. O Dashboard fica permanentemente sem dados.

Evidência nos logs de rede: as queries para `settings`, `contracts`, `clients`, `resources` etc. foram todas executadas às 01:15:16 com o token anon, retornando `[]`. O login ocorreu depois, às 01:25:18.

## Solução

Fazer o `DataProvider` depender do estado de autenticação e recarregar todos os dados quando o usuário logar (e limpar quando fizer logout).

### Alterações em `src/contexts/DataContext.tsx`:

1. Importar `useAuth` do `AuthContext`
2. Obter `isAuthenticated` e `user` do contexto de auth
3. Adicionar `isAuthenticated` como dependência do `useEffect` que chama `loadAll`
4. Quando `isAuthenticated` mudar para `false` (logout), limpar todos os estados
5. Quando `isAuthenticated` mudar para `true` (login), re-executar `loadAll` com o JWT do usuário autenticado

### Alteração em `src/App.tsx`:

Nenhuma — `AuthProvider` já envolve `DataProvider`, então `useAuth()` está disponível dentro de `DataProvider`.

### Alteração em `src/pages/DashboardPage.tsx`:

Corrigir referências a `contract.dataFim` que podem ser `null` após a alteração anterior que tornou o campo nullable:
- Linha 236-237: `getDaysUntil(a.contract.dataFim)` — proteger com fallback
- Linha 357: `formatDate(contract.dataFim)` — proteger com fallback "Indeterminado"

### Impacto

- Todas as telas que dependem de `useData()` passarão a carregar corretamente após login
- O módulo de RH (`HRContext`) provavelmente tem o mesmo problema e deve ser verificado/corrigido da mesma forma

---

## Detalhes Técnicos

```text
ANTES (bug):
App monta → DataProvider.useEffect([]) → loadAll() com anon key → RLS bloqueia → dados vazios
→ Usuário faz login → dados continuam vazios (nunca re-fetcha)

DEPOIS (fix):
App monta → DataProvider.useEffect([isAuthenticated]) → isAuthenticated=false → skip/clear
→ Usuário faz login → isAuthenticated=true → loadAll() com JWT → dados carregam
→ Usuário faz logout → isAuthenticated=false → limpa estados
```

