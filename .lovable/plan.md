## Objetivo
Remover completamente o sistema de mascaramento de dados para o perfil `demo` adicionado anteriormente.

## Alterações

### 1. `src/lib/demoMask.ts`
- Deletar o arquivo inteiro.

### 2. `src/contexts/DataContext.tsx`
- Remover o import de `demoMask`.
- Remover o import e desestruturação de `useAuth`/`userRole` (não utilizados para outra finalidade).
- Remover os dois blocos `if (userRole === 'demo')` que mascaram `nomeFantasia`/`razaoSocial` em clients e `nome` em contracts.
- Restaurar `setClients` e `setContracts` ao comportamento original sem mascaramento.

### 3. `src/contexts/HRContext.tsx`
- Remover o import de `demoMask`.
- Remover o import e desestruturação de `useAuth`/`userRole` (não utilizados para outra finalidade).
- Remover o bloco `if (userRole === 'demo')` que mascara `nome` e `email` em `hrPeople`.
- Restaurar `setHrPeople` ao comportamento original sem mascaramento.

## Restrições
- Nenhuma outra lógica existente será alterada.
- O build/TypeScript deve continuar passando após as remoções.