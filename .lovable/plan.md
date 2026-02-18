

## Correcao do tamanho da logomarca na sidebar

### Problema
Mesmo apos o ajuste anterior (de `w-8` para `w-10`), a logomarca continua quase invisivel no topo do menu lateral. O tamanho de 40px nao e suficiente para dar destaque a identidade visual.

### Solucao
Aumentar significativamente o tamanho da logo na sidebar, mantendo todos os outros elementos inalterados.

| Local | Tamanho atual | Novo tamanho |
|-------|--------------|-------------|
| Sidebar expandida (desktop) | `w-10` (40px) | `w-16` (64px) |
| Sidebar colapsada (desktop) | `w-8` (32px) | `w-10` (40px) |
| Sidebar mobile (drawer) | `w-10` (40px) | `w-16` (64px) |

### Detalhes tecnicos

**Arquivo: `src/components/layout/Sidebar.tsx`**
- Linha 82: Mobile drawer logo `w-10` -> `w-16`
- Linha 175: Desktop expandida logo `w-10` -> `w-16`
- Linha 184: Desktop colapsada logo `w-8` -> `w-10`

Nenhuma outra propriedade sera alterada. O `h-auto` e `object-contain` garantem que a proporcao sera preservada.

