

# Plano: Ordenacao, Filtro por Admissao e Scroll Horizontal na Listagem RH

## 1. Ordenacao por colunas clicaveis

**Arquivo**: `src/pages/HRPeoplePage.tsx`

Adicionar estado de ordenacao:
```
const [sortField, setSortField] = useState<string>('nome');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
```

Criar funcao `handleSort(field)` que alterna direcao se mesmo campo, ou define asc para novo campo.

Aplicar `useMemo` de ordenacao sobre o array `filtered`, comparando pelos campos:
- **nome**: string compare
- **tipoVinculo**: string compare (clt/pj)
- **cargo**: resolve `getCargoLabel()` e compara strings
- **team**: resolve `getTeamName()` e compara strings
- **localAtuacao**: string compare
- **dataAdmissao**: string compare (yyyy-MM-dd ja ordena corretamente)
- **tempo**: usa `calcularTempoDeCasa().meses` (numerico)
- **custoTotal**: `remuneracaoMensal + beneficios` (numerico, so se canViewHRCosts)
- **situacao**: string compare
- **comiteGestor**: string compare (yyyy-MM)

Nos `<TableHead>`, adicionar `onClick` e `cursor-pointer`, com indicador visual (seta/chevron) mostrando direcao ativa via icones `ArrowUp`/`ArrowDown` do lucide-react.

## 2. Filtro por mes/ano de admissao

Adicionar estado `filterAdmissao` (string, formato `yyyy-MM`).

Adicionar um `<input type="month">` nos filtros (similar ao comite gestor inline) para selecionar mes/ano de admissao. A filtragem compara `p.dataAdmissao.slice(0, 7) === filterAdmissao`.

Ajustar a grid de filtros para acomodar o novo campo — de `xl:grid-cols-7` para `xl:grid-cols-8`, com o campo de busca ocupando `xl:col-span-2`.

## 3. Scroll horizontal visivel desde o primeiro acesso

**Problema**: A tabela esta dentro de `<div className="overflow-x-auto">`, mas o container pai (Card/CardContent) nao tem altura fixa, entao a barra de scroll horizontal so aparece no fundo do conteudo.

**Solucao**: Usar `ScrollArea` do Radix (ja disponivel em `@/components/ui/scroll-area`) com orientacao horizontal, substituindo o `<div className="overflow-x-auto">`. Definir uma altura maxima no container com `max-h-[calc(100vh-320px)]` para que tanto o scroll vertical quanto o horizontal fiquem visiveis sem precisar rolar a pagina inteira. Alternativamente, usar `overflow-x-auto` com `sticky` positioning na tabela wrapper para manter a scrollbar acessivel.

A abordagem mais simples e eficaz: envolver a tabela em um `ScrollArea` com `orientation="horizontal"` e adicionar `<ScrollBar orientation="horizontal" />` explicitamente, junto com uma altura fixa no container para garantir que a barra horizontal fique visivel na viewport.

## Resumo de alteracoes

**Arquivo unico**: `src/pages/HRPeoplePage.tsx`
- Import `ArrowUp`, `ArrowDown` do lucide
- Import `ScrollArea`, `ScrollBar` de `@/components/ui/scroll-area`
- Estados: `sortField`, `sortDir`, `filterAdmissao`
- `useMemo` para ordenacao do array filtrado
- `TableHead` clicaveis com indicadores visuais
- Novo filtro `<input type="month">` para admissao
- Grid de filtros `xl:grid-cols-8`
- Container da tabela com `ScrollArea` + altura controlada

