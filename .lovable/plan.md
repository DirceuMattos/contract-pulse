## Plano: Sidebar - Exibir módulos bloqueados com indicador visual

### Contexto
Atualmente a sidebar oculta completamente os módulos que o usuário não tem acesso. O objetivo é **mostrar todos os módulos**, mas marcar os inacessíveis como bloqueados (com ícone de cadeado) e exibir um toast ao clicar.

### Alterações no arquivo `src/components/layout/Sidebar.tsx`

#### 1. Importar `Lock` do lucide-react
Adicionar `Lock` à lista de imports existentes.

#### 2. Substituir `isItemVisible` por `isItemAllowed` e mudar lógica de filtro
- Renomear `isItemVisible` para `isItemAllowed` (a lógica de permissão permanece a mesma).
- Em vez de filtrar (`filter`) os itens invisíveis, **mapear** (`map`) todos os itens adicionando a propriedade `locked: !isItemAllowed(item)`.
- Assim, `visibleGroups` passa a conter todos os grupos e todos os itens, mas com flag de bloqueio.

#### 3. Adicionar handler `handleLockedClick`
Após `handleComingSoonClick`, adicionar função que:
- Chama `e.preventDefault()`
- Exibe toast com título "🔒 Acesso restrito" e descrição informando que o perfil não permite acesso ao módulo

#### 4. Atualizar `renderItemBody`
- Alterar assinatura para aceitar `item: NavItem & { locked?: boolean }`.
- Adicionar classes CSS para itens bloqueados: `text-sidebar-foreground/35 cursor-not-allowed opacity-60`.
- No ícone (`<Icon ...>`), adicionar `opacity-50` quando `locked`.
- Adicionar badge com ícone `<Lock className="w-3 h-3 ..." />` ao lado do label quando `locked` (similar ao "Em breve").
- Se `locked`, renderizar `<button type="button" onClick={handleLockedClick} ...>` em vez de `<Link>`.
- O restante do código existente (`comingSoon`, `external`, `<Link>`) permanece inalterado.

#### 5. `initialOpen`
Nenhuma alteração necessária — como `visibleGroups` agora contém todos os grupos, o cálculo existente continua funcional.

### Resultado esperado
- Todos os módulos aparecem na sidebar, inclusive os sem permissão.
- Itens bloqueados ficam esmaecidos, com ícone de cadeado, e não são clicáveis como link.
- Clique em item bloqueado exibe toast informativo.
- Itens "Em breve" continuam funcionando como antes.
