

## Problema identificado

Existem **duas camadas de bloqueio** conflitantes:

### 1. Políticas RLS no banco de dados (causa raiz dos erros de gravação)
Todas as tabelas de dados (hr_people, hr_timeline, clients, contracts, resources, history_events, etc.) possuem políticas de INSERT/UPDATE que permitem **apenas `c-level` e `intermediario`**:

```sql
-- Exemplo atual em TODAS as tabelas:
WITH CHECK: has_any_role(auth.uid(), ARRAY['c-level', 'intermediario'])
```

Os papéis `rh` e `administrativo` **não estão nas políticas**, então qualquer tentativa de gravar dados resulta em erro RLS silencioso — mesmo que o frontend mostre os botões de edição.

### 2. Flag `canEdit` no frontend (parcialmente corrigida)
Atualmente:
```typescript
const canEdit = userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo';
```
O papel `rh` não está incluído, então o frontend esconde botões de edição para RH — mesmo quando o módulo está habilitado.

### Resultado combinado
- **Administrativo**: Vê botões de edição (frontend permite), mas o banco rejeita a gravação (RLS bloqueia) → erro silencioso
- **RH**: Não vê botões de edição (frontend bloqueia) → "acesso negado" visual

## Plano

### Etapa 1 — Atualizar políticas RLS para incluir `rh` e `administrativo`

**Via migration SQL**, alterar as políticas de INSERT e UPDATE em **todas as tabelas de dados** para incluir os 4 papéis que podem editar:

Tabelas afetadas (13 tabelas):
- `clients`, `contracts`, `resources`, `history_events`
- `hr_people`, `hr_timeline`
- `overhead_items`, `document_attachments`, `attachment_description_configs`
- `job_titles`, `teams`
- `snapshots` (INSERT)
- `settings` (verificar se tem UPDATE policy)

Para cada tabela, trocar:
```sql
has_any_role(auth.uid(), ARRAY['c-level', 'intermediario'])
```
Por:
```sql
has_any_role(auth.uid(), ARRAY['c-level', 'intermediario', 'administrativo', 'rh'])
```

### Etapa 2 — Atualizar `canEdit` no frontend para incluir `rh`

**Arquivo**: `src/contexts/AuthContext.tsx` (linha 122)

Alterar:
```typescript
const canEdit = userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo';
```
Para:
```typescript
const canEdit = userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh';
```

Isso garante que o frontend exibe os botões de edição para todos os papéis que têm permissão de gravação no banco.

### O que NÃO muda
- O controle de **acesso ao módulo** (moduleAccess) continua restringindo quais páginas cada usuário pode ver
- Políticas de **DELETE** continuam restritas a `c-level`
- O papel `leitor`, `comercial`, `lider_tribo` e `juridico` continuam sem permissão de edição

### Resultado esperado
- Usuários RH com módulo HR habilitado poderão editar pessoas, timeline e dados nos módulos que possuem acesso
- Usuários Administrativos com módulos habilitados poderão gravar alterações sem erros silenciosos
- A regra confirmada "se o módulo está habilitado, o usuário pode editar" estará implementada de ponta a ponta

