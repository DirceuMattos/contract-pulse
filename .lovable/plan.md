

## Correção: Buscar data de desligamento do endpoint Turnover corretamente

### Problema identificado

O endpoint de Turnover da API Feedz **não retorna o campo `registration` (matrícula)**. A estrutura real do retorno é:

```json
{
  "data": [
    {
      "id": 1,
      "reason": "Sem justa causa",
      "type": 2,
      "department": "teste",
      "last_day_working": "2023-05-04 00:00:00",
      "profile": {
        "id": 8,
        "name": "usuario teste",
        "email": "usuario.teste@feedz.com.br",
        "status": 0
      }
    }
  ]
}
```

O código atual tenta `rec.registration` que sempre será vazio, logo o `turnoverMap` nunca é preenchido, e o fallback (data atual) é sempre usado para desligados sem `dismissal_at`.

Além disso, o endpoint é **paginado** (20 por página) e o código só busca a primeira página.

### O que será feito

**Arquivo**: `supabase/functions/feedz-sync/index.ts`

1. **Corrigir `TurnoverRecord` interface** — Ajustar para refletir a estrutura real da API com `profile: { id, name, email }`.

2. **Indexar por `profile.id`** (que corresponde ao `employeeId` do endpoint de employees) em vez de `registration`. O matching no loop principal usará `feedzEmployeeId` para buscar no turnoverMap.

3. **Adicionar paginação** — Percorrer todas as páginas do endpoint de turnover (`?page=1`, `?page=2`, etc.) até `next_page_url` ser null.

4. **Ajustar o lookup no loop principal** — Onde hoje faz `turnoverMap.get(matricula)`, passará a fazer `turnoverMap.get(feedzEmployeeId)` (o `employeeId` do colaborador).

### Detalhes técnicos

```typescript
// Interface corrigida
interface TurnoverRecord {
  id: number
  reason?: string
  type?: number
  department?: string
  last_day_working?: string
  profile?: { id: number; name: string; email: string; status: number }
}

// Map indexado por profile.id (string) → employeeId
// Paginação: buscar enquanto next_page_url existir
```

O campo `last_day_working` do Turnover será usado como `data_desligamento` no sistema de contratos, conforme solicitado.

