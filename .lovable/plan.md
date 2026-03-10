

## Alterações Solicitadas

### 1. Renomear botão no painel de subprojetos
**Arquivo:** `src/components/squads/SubprojectManagementPanel.tsx` (linha 141)
- Alterar o texto "Adicionar Pessoa" para "Adicionar Recurso"

### 2. Cards de custo por subprojeto na tela de Recursos do Contrato
**Arquivo:** `src/pages/ContractResourcesPage.tsx`

Quando o contrato tem subprojetos (`contractHasSubprojects === true`) e o usuário pode ver valores (`canViewValues`), inserir uma seção logo após os cards de custo por tipo (CLT/PJ/Outro) com:

- Importar `getSubprojectsByContract` e `getAllocationsBySubproject` do `SubprojectContext`
- Para cada subprojeto ativo, calcular o custo mensal somando as alocações (pessoa do HR Mestre × dedicação%, aplicando encargos CLT/PJ conforme `settings`)
- Renderizar um card por subprojeto contendo:
  - Nome do subprojeto no header
  - Custo mensal total do subprojeto
  - Quantidade de recursos e FTE total
  - Percentual em relação ao custo total do contrato
- Respeitar `canViewHRCosts` para exibir ou ocultar valores de RH

A lógica de cálculo reutilizará `calculateResourceCost` criando objetos `Resource` sintéticos a partir das alocações + dados do HR Mestre, da mesma forma já feita no módulo Squads.

