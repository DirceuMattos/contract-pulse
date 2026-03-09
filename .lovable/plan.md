

## Copiar recursos de outro contrato

### Objetivo
Adicionar um botão "Importar de outro contrato" na tela de recursos (`ContractResourcesPage`), que abre um dialog permitindo selecionar um contrato de origem. O sistema copia os recursos do contrato selecionado para o contrato atual, sem sobrepor recursos existentes, e avisa o usuário para revisar duplicidades.

### Componente: `CopyResourcesDialog`
Novo componente `src/components/contracts/CopyResourcesDialog.tsx`:
- Select com lista de contratos (excluindo o contrato atual), ordenados alfabeticamente por nome
- Preview dos recursos do contrato selecionado (nome, tipo, cargo)
- Botão "Importar"

### Lógica de importação (em `ContractResourcesPage`)
1. Buscar recursos do contrato de origem via `getResourcesByContract(sourceContractId)`
2. Filtrar recursos cujo `hrPersonId` já exista em `existingHrPersonIds` (evitar duplicata de pessoa)
3. Para cada recurso restante, chamar `addResource()` com os dados copiados (novo `contractId`, sem `id`)
4. Contabilizar: importados vs. ignorados (duplicatas)
5. Exibir toast:
   - Se contrato já tinha recursos: aviso amarelo "X recursos importados. Revise a alocação para evitar superfaturamento."
   - Se houve duplicatas ignoradas: informar quantas foram ignoradas
   - Se não havia recursos prévios: toast de sucesso simples

### Alterações em `ContractResourcesPage`
- Novo state `copyDialogOpen`
- Botão "Importar de outro contrato" ao lado de "Adicionar Recurso" no header (ícone `Copy`)
- Renderizar `CopyResourcesDialog`

### Detalhes técnicos
- Reutiliza `contracts` e `getResourcesByContract` do `DataContext`
- Reutiliza `resolveResource` para mostrar nomes resolvidos no preview
- Nenhuma alteração de banco de dados necessária — os recursos são criados via `addResource` existente
- Nenhuma alteração em `ContractFormPage` (novo contrato) — o usuário pode navegar para a tela de recursos após criar o contrato e usar a mesma funcionalidade

