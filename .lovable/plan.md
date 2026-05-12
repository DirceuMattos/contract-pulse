## Campo "Regime de Trabalho" em RH

Adiciona dois novos campos opcionais ao cadastro de colaboradores: **Regime de Trabalho** (Remoto / Híbrido / Presencial) e **Observações do Regime**, com filtro correspondente na listagem.

### 1. Banco de dados (migração)
Adicionar duas colunas na tabela `hr_people`:
- `regime_trabalho` (text, nullable) — valores aceitos: `remoto`, `hibrido`, `presencial`
- `regime_observacoes` (text, nullable)

Sem alterações em RLS ou triggers.

### 2. Tipos — `src/types/index.ts`
- Novo tipo `HRRegimeTrabalho = 'remoto' | 'hibrido' | 'presencial'` antes da interface `HRPerson`.
- Em `HRPerson`, após `localAtuacao`, adicionar `regimeTrabalho?` e `regimeObservacoes?`.

### 3. Mapeadores — `src/lib/dbMappers.ts`
- `hrPersonFromDb`: ler `regime_trabalho` e `regime_observacoes` (null → undefined).
- `hrPersonToDb`: gravar `regime_trabalho` e `regime_observacoes` (undefined → null).

### 4. Formulário — `src/components/hr/HRPersonForm.tsx`
Após o campo `localAtuacao`, adicionar:
- `Select` "Regime de Trabalho" com opções: Não informado (''), Remoto / Home Office, Híbrido, Presencial.
- `Textarea` "Observações do Regime" com placeholder de exemplo.

### 5. Detalhe — `src/pages/HRPersonDetailPage.tsx`
Mostrar "Regime de Trabalho" e "Observações do Regime" próximos a `localAtuacao` na aba de dados.

### 6. Lista/Filtros — `src/pages/HRPeoplePage.tsx`
- Estado `filterRegime` persistido em sessionStorage junto aos demais filtros.
- `matchRegime` no `useMemo` de `filtered`.
- `Select` "Regime" na barra de filtros (Todos / Remoto / Híbrido / Presencial).
- Incluir em `handleClearFilters` e `hasActiveFilters`.

### Escopo / não-objetivos
- Não alterar nenhum outro campo, tela, regra de negócio, importação/exportação, sincronização Feedz, ou cálculos.
- Sem novas permissões, RLS, ou validação obrigatória — ambos os campos são opcionais.
