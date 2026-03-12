

## Plano: Atualização em Massa de Matrículas via Edge Function

### Dados Analisados

- **Planilha**: 135 nomes, 134 com matrícula (Karine Tedesco Faleiro sem matrícula)
- **Banco**: 135 registros, todos com `matricula = NULL`
- **Conflito detectado**: DB tem "Alexandre Hideki  Siroma" (espaço duplo) vs planilha "Alexandre Hideki Siroma"
- **Registro extra no DB**: "Fernando Bertolaccini" (sem match na planilha) + "Fernando Narciso Bertolaccini de Souza" (com match, matrícula 1047)

### Implementação

**Criar edge function `hr-update-matriculas`** (`supabase/functions/hr-update-matriculas/index.ts`)

1. Recebe array de `{nome, matricula}` via POST
2. Carrega todos os `hr_people` do banco
3. Para cada par da planilha:
   - Normaliza nomes (lowercase, trim, colapsar espaços múltiplos, remover acentos)
   - Busca match normalizado em `hr_people`
   - Se 1 match → `UPDATE hr_people SET matricula = X WHERE id = Y`
   - Se 0 ou >1 → adiciona à lista `not_found`
4. Retorna JSON `{updated: [...], not_found: [...], skipped: [...]}`

**Registrar em `supabase/config.toml`**: `[functions.hr-update-matriculas]` com `verify_jwt = false`

**Após deploy**: invocar a function com os 134 registros da planilha, analisar o resultado e reportar matches/não-matches.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/hr-update-matriculas/index.ts` | Nova edge function |
| `supabase/config.toml` | Registrar function |

