

## Auto-preenchimento do Cargo ao Selecionar Recurso Existente

### O que muda
Quando o usuario selecionar um nome de recurso humano (CLT ou PJ) que ja existe no banco de dados, alem do custo mensal (que ja e preenchido automaticamente), o campo "Cargo / Papel" tambem sera preenchido automaticamente com o ultimo cargo registrado para aquele profissional.

### Alteracoes

**1. `src/contexts/DataContext.tsx`**
- Expandir o tipo de `distinctHRNames` de `{ nome: string; custoBase: number }` para `{ nome: string; custoBase: number; cargo?: string }`
- No `useMemo` que calcula `distinctHRNames`, tambem capturar o campo `cargo` do recurso mais recente
- Atualizar a tipagem no tipo do contexto (interface `DataContextType`)

**2. `src/components/forms/ResourceForm.tsx`**
- No handler `onValueChange` do Select de "Nome / Pessoa" (linha ~241-249), ao encontrar o match, tambem chamar `form.setValue('cargo', match.cargo || '')` para preencher automaticamente o campo cargo
- Se o cargo retornado existir na lista de cargos ativos (`activeJobTitles`), manter o modo Select; se nao, ativar o modo texto customizado (`setCustomCargo`)

### Comportamento esperado
1. Usuario abre formulario de recurso CLT ou PJ
2. Seleciona um nome da lista (ex: "Joao Silva")
3. O campo "Custo Base" e preenchido automaticamente (comportamento existente)
4. O campo "Cargo / Papel" tambem e preenchido automaticamente com o cargo mais recente de "Joao Silva"
5. O usuario pode alterar qualquer campo manualmente apos o preenchimento

