## Infraestrutura para foto de colaboradores

3 alterações isoladas, sem tocar em nenhuma outra lógica.

### 1. `src/types/index.ts`
Adicionar campo opcional na interface `HRPerson`:
```ts
fotoUrl?: string;
```

### 2. `src/lib/dbMappers.ts`
- Em `hrPersonFromDb`: `fotoUrl: (row.foto_url as string | null) ?? undefined`
- Em `hrPersonToDb`: `foto_url: p.fotoUrl ?? null`

### 3. Migration Supabase
```sql
ALTER TABLE public.hr_people ADD COLUMN IF NOT EXISTS foto_url TEXT;
```
Coluna nullable, sem alteração de RLS/GRANTs (já existentes na tabela).

### Fora de escopo
- UI de upload/exibição de foto
- Preenchimento via `feedz-sync` (a API Feedz não retorna campo de foto)
- Remoção do bloco DEBUG e da função `feedz-test-photo` (fica para um plano de cleanup separado)