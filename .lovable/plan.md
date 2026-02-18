

## Aumentar ainda mais a logomarca na sidebar

### Alteracao

| Local | Tamanho atual | Novo tamanho |
|-------|--------------|-------------|
| Sidebar expandida (desktop) | `w-16` (64px) | `w-20` (80px) |
| Sidebar colapsada (desktop) | `w-10` (40px) | `w-12` (48px) |
| Sidebar mobile (drawer) | `w-16` (64px) | `w-20` (80px) |

### Detalhes tecnicos

**Arquivo: `src/components/layout/Sidebar.tsx`**
- Linha 82: Mobile drawer logo `w-16` -> `w-20`
- Linha 175: Desktop expandida logo `w-16` -> `w-20`
- Linha 184: Desktop colapsada logo `w-10` -> `w-12`

Todas as demais propriedades permanecem inalteradas.

