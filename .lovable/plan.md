

## Ajuste do tamanho da logomarca BNP

### Problema
A logomarca da BNP aparece pequena em varios locais da aplicacao, prejudicando a identidade visual. Os tamanhos atuais sao:

| Local | Tamanho atual | Tamanho proposto |
|-------|--------------|-----------------|
| Sidebar expandida (desktop) | `w-8` (32px) | `w-10` (40px) |
| Sidebar colapsada (desktop) | `w-6` (24px) | `w-8` (32px) |
| Sidebar mobile (drawer) | `w-8` (32px) | `w-10` (40px) |
| Login mobile | `w-10` (40px) | `w-12` (48px) |
| Troca de senha | `w-10` (40px) | `w-12` (48px) |
| Login desktop (painel esquerdo) | `w-[300px]` | Sem alteracao |

### O que sera feito
Aumentar proporcionalmente o tamanho da logo em cada local, sem alterar layout, espaçamentos ou posicionamento dos elementos.

### Detalhes tecnicos

**Arquivo: `src/components/layout/Sidebar.tsx`**
- Linha 82: Mobile drawer logo `w-8` -> `w-10`
- Linha 175: Desktop expandida logo `w-8` -> `w-10`
- Linha 184: Desktop colapsada logo `w-6` -> `w-8`

**Arquivo: `src/pages/LoginPage.tsx`**
- Linha 129: Mobile logo `w-10` -> `w-12`

**Arquivo: `src/pages/ChangePasswordPage.tsx`**
- Linha 102: Logo `w-10` -> `w-12`

Nenhuma outra propriedade CSS, dimensao de container ou disposicao de elementos sera alterada.

