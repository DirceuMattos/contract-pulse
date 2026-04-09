

## Adicionar flag "Em Avaliação" no módulo de Recursos Humanos

### Resumo
Nova flag `isEmAvaliacao` ao lado de Talento e Guardião, com ícone `AlertTriangle` amarelo, seguindo o mesmo padrão visual e funcional.

### Alterações

**1. Migration** — Adicionar coluna `is_em_avaliacao boolean NOT NULL DEFAULT false` na tabela `hr_people`.

**2. `src/types/index.ts`** — Adicionar `isEmAvaliacao?: boolean` na interface `HRPerson`.

**3. `src/lib/dbMappers.ts`** — Mapear `is_em_avaliacao` ↔ `isEmAvaliacao` em ambas as funções.

**4. `src/pages/HRPeoplePage.tsx`**:
- Filtro `filterEmAvaliacao` (mesmo padrão dos filtros Talento/Guardião)
- Ícone `AlertTriangle` amarelo na coluna de flags, ao lado de ⭐ e 🛡️
- Borda esquerda: `border-l-yellow-500` com prioridade sobre as demais (sinal de alerta)

**5. `src/pages/HRPersonDetailPage.tsx`**:
- Badge amarelo "⚠ Em Avaliação" ao lado dos badges Talento e Guardião
- Switch com `AlertTriangle` amarelo na seção de flags, posicionado junto aos switches existentes

### Prioridade de borda esquerda
1. Em Avaliação → `border-l-yellow-500`
2. Talento + Guardião → `border-l-purple-500`
3. Talento → `border-l-amber-500`
4. Guardião → `border-l-sky-600`

