## Reestruturar Sidebar com grupos visuais

Refatoro `src/components/layout/Sidebar.tsx` para organizar a navegação em grupos rotulados, mantendo `canAccessModule`, comportamento de colapso, mobile drawer e tooltips.

### Estrutura de grupos (nesta ordem)

1. (sem rótulo) — Dashboard, Alertas
2. **Adm Clientes e Contratos** — Clientes, Contratos, Recebíveis, Simulador de Contratos
3. **Adm Recursos e Pessoas** — Recursos Humanos, Squads, Adm Horas Extras (Em breve), Adm Transportes (Em breve), Requisição de Vagas (link externo, restrito), Skills de Vagas (Em breve)
4. **Setup** — Configurações, Usuários, Importar/Exportar
5. (sem rótulo) — Ajuda

"Análises com IA" (`/ai`) é removido do menu; rotas continuam acessíveis por URL/CommandPalette.

### Modelo de dados

Substituo o array plano `navItems` por uma lista de grupos:

```ts
type NavItem = {
  path: string; label: string; icon: any;
  moduleKey?: ModuleKey;
  comingSoon?: boolean;        // desabilitado + badge "Em breve"
  external?: boolean;          // <a target="_blank">
  allowedRoles?: UserRole[];   // restrição extra por papel
};
type NavGroup = { label?: string; items: NavItem[] };
```

Restrição "Requisição de Vagas": `allowedRoles: ['c-level', 'intermediario', 'lider_tribo']` (confirmado em `src/types/index.ts`). `path: '#'`, `external: true`.

### Renderização

- Função `renderGroups({ showLabels, useTooltip, onNavigate })` reutilizada em mobile e desktop.
- Rótulo da seção: `text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/50` no topo do grupo.
- Entre grupos, quando colapsado (sem labels), mostra um separador fino (`border-t border-sidebar-border/60`) no lugar do rótulo, preservando agrupamento visual.
- Itens "Em breve": `<div>` não-clicável (sem `<Link>`), com badge à direita (`Em breve`) e cor esmaecida (`text-sidebar-foreground/40 cursor-not-allowed`). No estado colapsado, tooltip mostra "Label (Em breve)".
- Itens externos: `<a href target="_blank" rel="noopener noreferrer">`.
- Itens normais: `<Link>` mantendo a lógica `isActive` atual.

### Visibilidade

Filtro por grupo:

- `moduleKey` → `canAccessModule(moduleKey)` (mantido).
- `allowedRoles` → checa `userRole` do `useAuth`.
- Grupos cujos itens visíveis = 0 são omitidos (incluindo seu rótulo).

### Compatibilidade

- Comportamento de colapso (`collapsed`/`onToggle`), mobile drawer, footer (user/logout/toggle) preservados.
- Tooltips no estado colapsado preservadas para todos os itens (inclusive desabilitados).
- Nenhuma mudança em rotas, `moduleAccess`, ou outras telas.

### Ícones novos do `lucide-react`

`Clock` (Horas Extras), `Truck` (Transportes), `ClipboardList` (Requisição de Vagas), `Sparkles` (Skills de Vagas — reaproveitado). Remoção do uso de `Sparkles` para "Análises com IA" no menu.

### Arquivos

- `src/components/layout/Sidebar.tsx` — única edição.

Não altere mais nada no sistema