Criar utilitário de mascaramento de dados para o perfil demo e aplicá-lo em dois contextos.

## Escopo

1. **Criar `src/lib/demoMask.ts`**
   - Funções determinísticas que geram nomes fictícios consistentes a partir de um ID.
   - `maskClientName`, `maskContractName`, `maskPersonName`, `maskPersonEmail`, `maskFinancialValue`.
   - Usa hash simples sobre o ID para garantir que o mesmo ID sempre produz o mesmo nome mascarado.

2. **Alterar `src/contexts/DataContext.tsx`**
   - Importar `useAuth` e as funções `maskClientName`, `maskContractName`.
   - Após `setClients` e `setContracts` no carregamento inicial (linhas ~157-158), adicionar blocos condicionais `if (userRole === 'demo')` que sobrescrevem `nomeFantasia`, `razaoSocial` (clients) e `nome` (contracts) com os valores fictícios.

3. **Alterar `src/contexts/HRContext.tsx`**
   - Importar `useAuth` e as funções `maskPersonName`, `maskPersonEmail`.
   - Após `setHrPeople` no carregamento inicial (linha ~48), adicionar bloco condicional `if (userRole === 'demo')` que sobrescreve `nome` e `email` das pessoas com valores fictícios.

Nenhuma outra lógica existente será modificada.