Plano de ajustes no Sidebar.tsx

1. Corrigir corte dos labels dos itens de navegação
   - Localizar o `<span>` que renderiza `item.label` dentro de `renderItemBody`.
   - Adicionar a prop `title={item.label}` para exibir tooltip nativo no hover.
   - Incluir a classe Tailwind `min-w-0` junto às classes existentes (`flex-1 truncate`), garantindo que o texto seja truncado com reticências sem quebrar o layout flex.

2. Ativar o item "Adm Transportes"
   - Alterar o `path` do item de `'#'` para `'/adm-transportes'`.
   - Remover a propriedade `comingSoon: true`.
   - Manter o ícone `Truck` (equivalente a "Bus" no Lucide).

Nenhum outro item, estilo ou lógica do Sidebar será modificado.