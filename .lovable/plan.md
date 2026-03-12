

## Plano: Edição independente de RH, Outros Recursos e Overheads por subprojeto

### Problema atual

O `SubprojectManagementPanel` só exibe e gerencia alocações de **RH** (`hrPersonId`). Alocações com `resource_id` (outros recursos) e `overhead_item_id` (overheads) existem no banco mas são ignoradas na UI. Não há como adicionar/editar/remover esses tipos separadamente por subprojeto.

### Alterações planejadas

**1. Refatorar `SubprojectManagementPanel.tsx`**

Reorganizar cada card de subprojeto com 3 seções (abas ou seções colapsáveis):
- **Pessoas (RH)**: lista atual de alocações com `hrPersonId` — adicionar, editar dedicação, remover
- **Outros Recursos**: alocações com `resource_id` — adicionar recurso do tipo `outro` do contrato, editar dedicação, remover
- **Overheads**: alocações com `overhead_item_id` — adicionar item de overhead do contrato, editar dedicação (% aplicada), remover

Cada seção terá seu próprio botão "Adicionar" e listagem independente, com contagem e resumo.

**2. Refatorar `SubprojectAllocationDialog.tsx`**

Atualmente só adiciona pessoas (HR). Será parametrizado para aceitar um `allocationType: 'hr' | 'resource' | 'overhead'`:
- **hr**: mantém o fluxo atual (busca/seleciona pessoa do RH)
- **resource**: lista recursos do tipo `outro` do contrato (`resources` com `tipo === 'outro'`) para seleção
- **overhead**: lista overhead items do contrato para seleção

**3. Atualizar `EditAllocationDialog.tsx`**

Exibir informações contextuais conforme o tipo da alocação (nome do recurso ou nome do overhead, em vez de nome de pessoa).

**4. Atualizar `SubprojectCostCards.tsx`**

Incluir no cálculo de custo mensal por subprojeto os valores de outros recursos e overheads alocados, não apenas RH.

**5. Atualizar `SquadsPage.tsx`**

Na visão por contrato/subprojeto, ao exibir cards de subprojetos, incluir contadores de outros recursos e overheads alocados. O painel de gestão de subprojetos (quando um contrato específico está selecionado) já usa o `SubprojectManagementPanel` atualizado.

### Arquivos impactados

| Arquivo | Mudança |
|---------|---------|
| `SubprojectManagementPanel.tsx` | Seções separadas para HR, recursos e overheads |
| `SubprojectAllocationDialog.tsx` | Parametrizar tipo de alocação |
| `EditAllocationDialog.tsx` | Suporte a edição de qualquer tipo de alocação |
| `SubprojectCostCards.tsx` | Incluir custos de recursos e overheads |
| `SquadsPage.tsx` | Exibir contadores dos 3 tipos nos cards |

Nenhuma alteração de banco de dados — o schema `subproject_allocations` já possui as colunas `resource_id` e `overhead_item_id`.

