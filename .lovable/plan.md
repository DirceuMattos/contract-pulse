

## Problema

No `AuthContext.tsx` (linhas 121-123), as permissões de visualização de valores estão restritas apenas ao papel `c-level`:

```typescript
const canViewValues = userRole === 'c-level';
const canEdit = userRole === 'c-level' || userRole === 'intermediario';
const canViewHRCosts = userRole === 'c-level';
```

O papel `administrativo` precisa ver valores financeiros em contratos e custos de RH, mas está excluído dessas verificações.

## Plano

### Etapa única — Atualizar AuthContext.tsx

Alterar as 3 constantes de permissão (linhas 121-123) para incluir o papel `administrativo`:

- `canViewValues`: adicionar `|| userRole === 'administrativo'`
- `canEdit`: adicionar `|| userRole === 'administrativo'`
- `canViewHRCosts`: adicionar `|| userRole === 'administrativo'`

Isso dará ao usuário administrativo visibilidade de todos os valores financeiros em contratos (receita, custo, margem, recursos) e no módulo de RH (remuneração, benefícios).

**Arquivo afetado**: `src/contexts/AuthContext.tsx`

