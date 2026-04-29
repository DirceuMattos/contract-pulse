## Filtro de Benefício em HRPeoplePage

Em `src/pages/HRPeoplePage.tsx`:

1. **Estado** (após linha 67): `const [filterBeneficio, setFilterBeneficio] = useState(storedFilters?.filterBeneficio ?? '');`

2. **Persistência sessionStorage** (linhas 75–76): incluir `filterBeneficio` no objeto salvo e no array de dependências.

3. **hasActiveFilters / handleClearFilters** (linhas 78–79): incluir `filterBeneficio !== ''` na condição e `setFilterBeneficio('')` no clear.

4. **`beneficioOptions`** (após `comiteOptions`, linha 98): useMemo que coleta nomes únicos de `p.beneficiosLista[].nome`, ordenados alfabeticamente.

5. **`filtered`** (linhas 100–118): adicionar `matchBeneficio = !filterBeneficio || (p.beneficiosLista?.some(b => b.nome === filterBeneficio) ?? false)` e incluir no return + dependências.

6. **UI**: novo bloco `<div className="flex flex-col gap-1">` com label "Benefício" e Select listando `beneficioOptions`, posicionado junto aos demais filtros do Card (após o filtro de Mês de Admissão).

Nenhum outro estado, lógica ou layout é alterado.