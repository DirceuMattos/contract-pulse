

## Plano: Matrícula como Identificador Primário (RH + Feedz Sync)

### Resumo

Adicionar o campo `matricula` ao cadastro mestre de RH, torná-lo a chave primária de integração com o Feedz, e substituir a cascata de matching atual por uma lógica simples: matrícula presente → match direto; matrícula ausente → pendência.

---

### 1. Migração de Banco de Dados

Adicionar coluna e constraint em `hr_people`:

```sql
ALTER TABLE public.hr_people ADD COLUMN matricula text;
CREATE UNIQUE INDEX hr_people_matricula_unique ON public.hr_people (matricula) WHERE matricula IS NOT NULL;
```

---

### 2. Modelo TypeScript + Mappers

**`src/types/index.ts`** — Adicionar `matricula?: string` à interface `HRPerson`.

**`src/lib/dbMappers.ts`** — Adicionar mapeamento `matricula` em `hrPersonFromDb` e `hrPersonToDb`.

---

### 3. Formulário de RH (`HRPersonForm.tsx`)

- Adicionar campo `matricula` ao schema zod (string opcional, `trim()`)
- Adicionar input "Matrícula" na seção de dados de identificação (próximo ao nome)
- Validação client-side: verificar unicidade entre ativos antes de salvar (query ao banco)
- Se `matricula` vazio: exibir alerta amarelo "Sem matrícula — não será sincronizado automaticamente"
- Incluir no `onSubmit` payload

---

### 4. Lista de RH (`HRPeoplePage.tsx`)

- Adicionar coluna "Matrícula" na tabela (ocultável)
- Incluir matrícula no filtro de busca global (search)

---

### 5. Detalhe do RH (`HRPersonDetailPage.tsx`)

- Exibir matrícula abaixo do nome na aba Resumo

---

### 6. Edge Function `feedz-sync` — Reescrita do Matching

Substituir a cascata atual (id_externo → email → phone → name_score) por lógica baseada em matrícula:

**Nova regra:**
1. Mapear `employeeId` do Feedz como matrícula (ou um campo específico se disponível)
2. Para cada registro Feedz:
   - Se matrícula preenchida:
     - Buscar `hr_people` onde `matricula = feedz.matricula`
     - 1 match → UPDATE (confidence 100%)
     - 0 matches → INSERT novo `hr_people` com matrícula
     - \>1 matches → CONFLICT (não deveria ocorrer com unique index, mas safety net)
   - Se matrícula vazia:
     - NÃO atualizar → PENDING com reason_code `NO_MATRICULA`
3. Manter geração de timeline para mudanças de cargo e remuneração
4. Manter contadores e audit items (`feedz_sync_items`)
5. Remover a cascata email/phone/name_score (simplificação)
6. Manter o campo `id_externo` como referência secundária (Feedz employeeId), mas matching só por matrícula

**Nota:** O `employeeId` do Feedz será mapeado para `id_externo` como antes. A `matricula` é o campo do sistema interno que o Feedz pode ou não ter preenchido — o mapeamento exato (qual campo do Feedz contém a matrícula) será configurável ou assumirá um campo específico da API Feedz. Se a API Feedz usar `employeeId` como matrícula, será feito `matricula = String(employeeId)`.

---

### 7. Página de Reconciliação Feedz (`FeedzReconciliationPage.tsx`)

- Exibir coluna "Matrícula" nas pendências
- Novo motivo visível: "Sem matrícula" para registros sem match
- Interface `HRPersonSimple` ganha campo `matricula`

---

### 8. Arquivos Impactados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Nova coluna + unique index |
| `src/types/index.ts` | Campo `matricula` em `HRPerson` |
| `src/lib/dbMappers.ts` | Mappers from/to DB |
| `src/components/hr/HRPersonForm.tsx` | Campo + validação + alerta |
| `src/pages/HRPeoplePage.tsx` | Coluna + busca |
| `src/pages/HRPersonDetailPage.tsx` | Exibição no resumo |
| `supabase/functions/feedz-sync/index.ts` | Matching por matrícula |
| `src/pages/FeedzReconciliationPage.tsx` | Coluna matrícula nas pendências |

---

### 9. Ordem de Implementação

1. Migração de banco (coluna + index)
2. Types + Mappers
3. Formulário e listagem de RH (UI)
4. Edge function feedz-sync (reescrita do matching)
5. Página de reconciliação (ajustes visuais)

