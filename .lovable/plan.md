Sim, é perfeitamente possível tornar a área de filtros retrátil.

Como funciona:

- Adicionamos um botão "Filtros" com ícone de chevron no topo do Card de filtros.
- Ao clicar, a área dos selects e toggles expande/colapsa com animação suave.
- O campo de busca (Linha 1) permanece sempre visível — ele é essencial e não ocupa espaço.
- O estado "aberto/fechado" pode ser persistido no sessionStorage para lembrar a preferência do usuário entre navegações.

O que muda no código:

1. Envolvo as Linhas 2 e 3 do Card de filtros (selects + toggles) em um componente/condicional com transição.
2. Adiciono um `useState` local para controlar `filtersExpanded`.
3. Adiciono um botão de toggle no header do Card, ao lado do "Limpar filtros".
4. Opcionalmente persistir no `sessionStorage`.

Mantemos o campo de busca sempre visível para não prejudicar a usabilidade principal.

Nada mais deve ser alterado.