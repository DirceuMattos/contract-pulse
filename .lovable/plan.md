

# Squads -- Layout fixo em 2 colunas

## Resumo

Ajustar o grid de cards do modulo Squads para sempre exibir exatamente 2 colunas, tanto na visao "Por Projeto" quanto na visao "Por Recurso".

## Alteracao

### `src/pages/SquadsPage.tsx`

**Visao Por Projeto (linha ~280):**
- De: `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Para: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Manter 1 coluna apenas em telas pequenas (mobile), 2 colunas a partir de `md`.

**Visao Por Recurso (linha ~284):**
- De: `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4`
- Para: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Remover a terceira coluna (`xl:grid-cols-3`) para manter consistencia visual com 2 colunas.

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/SquadsPage.tsx` | Mod | Ajustar classes do grid para fixar 2 colunas em ambas as perspectivas |

