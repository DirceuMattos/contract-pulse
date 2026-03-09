

## Ajustes de Front-end — Plano de Implementação

### a) Persistir filtros ao navegar para detalhe de RH e voltar

**Problema**: Ao clicar em uma pessoa e voltar, os filtros são resetados porque o estado está em `useState` local.

**Solução**: Usar `sessionStorage` para persistir os filtros do `HRPeoplePage`. Ao montar a página, restaurar do `sessionStorage`. Ao alterar filtros, salvar no `sessionStorage`. O botão "Limpar" e a primeira entrada (sem dados no sessionStorage) começam com os defaults. O `HRPersonDetailPage` já navega de volta com `navigate('/rh')`, então os filtros serão restaurados automaticamente.

**Arquivos**: `src/pages/HRPeoplePage.tsx`

---

### b) CurrencyInput — backspace não apaga o primeiro dígito

**Problema**: No `handleFocus`, o valor é convertido para string com vírgula (`value.toString().replace('.', ',')`), mas o `handleChange` filtra caracteres e atualiza `displayValue`. Porém, o `onChange` só é chamado no `handleBlur`, o que significa que durante a edição o valor interno do React não muda. O bug ocorre porque ao focar, se o valor for ex. `1234.56`, o display mostra `1234,56`. Ao dar backspace até restar `1`, o input nativo mantém o caractere por causa de como o controlled input interage.

**Solução**: Simplificar o `handleFocus` para selecionar todo o texto do input ao focar (usando `e.target.select()`), permitindo que o usuário simplesmente digite o novo valor. Também chamar `onChange` durante a digitação (no `handleChange`) para manter o valor sincronizado, removendo a dependência exclusiva do `onBlur`.

**Arquivos**: `src/components/ui/currency-input.tsx`

---

### c) Cards detalhados — mover resumo de FTEs para o final

**Problema**: O header do card mostra "Total alocado: X FTE" e "RH: N", e no corpo cada equipe mostra FTE. O pedido é remover FTEs da tarja do header e do corpo, colocando o resumo de FTEs ao final do card.

**Solução**: No `renderContractCard`, remover a linha de FTE do header. No `renderTeamBar` e no accordion trigger do `renderDetailedTeams`, remover a exibição de FTE. Adicionar um bloco de resumo de FTEs por equipe no final do card (antes dos botões de ação).

**Arquivos**: `src/pages/SquadsPage.tsx`

---

### d) Ordenação fixa de equipes nos cards

**Problema**: A ordem atual depende de `sortedTeams` que usa `sortOrder` da tabela de teams, que pode não corresponder à ordem desejada.

**Solução**: Definir uma ordenação fixa hardcoded no `SquadsPage`: Projetos, Desenvolvimento, Dados, IA, Qualidade, Suporte, SRE. As equipes serão ordenadas por essa sequência (match por nome case-insensitive). Equipes não listadas ficam ao final.

**Arquivos**: `src/pages/SquadsPage.tsx`

---

### e) Card compacto — mostrar quantidade de recursos ao invés de FTEs

**Problema**: O `renderTeamBar` mostra FTE e % de FTE.

**Solução**: No modo compacto, alterar para mostrar a **quantidade de recursos** e o **percentual** que essa equipe representa do total de recursos do card. Manter a barra de progresso proporcional.

**Arquivos**: `src/pages/SquadsPage.tsx`

---

### f) Cores distintas por card de squad

**Problema**: Todos os cards usam a mesma cor (baseada em saúde financeira).

**Solução**: Definir uma paleta rotativa de cores (similar à de clientes: azul, esmeralda, violeta, âmbar, rosa, ciano) aplicada como `border-left` de 4px, substituindo o border de saúde financeira. As cores se repetem ciclicamente conforme o índice do card. O badge de saúde continua visível no header.

**Arquivos**: `src/pages/SquadsPage.tsx`

