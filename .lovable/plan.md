

## Plano: Exibir todos os tipos de custos na aba Recursos do ContractDetailPage

### Problema atual

A aba "Recursos" na tela de resumo do contrato (`ContractDetailPage.tsx`, linhas 552-626) exibe apenas os recursos (CLT, PJ, Outros). Os itens de **Overhead** não aparecem nessa aba, mesmo estando disponíveis na página dedicada de recursos (`ContractResourcesPage`).

### Alterações

**Arquivo: `src/pages/ContractDetailPage.tsx`**

1. Buscar os overhead items do contrato via `getOverheadByContract(id)` (já disponível no contexto `useData`)
2. Reorganizar a aba "Recursos" em 3 seções visuais:
   - **Recursos Humanos** (CLT/PJ) -- lista existente filtrada por `tipo !== 'outro'`
   - **Outros Recursos** -- lista filtrada por `tipo === 'outro'`
   - **Custos Indiretos (Overhead)** -- lista de overhead items com categoria, modo (% ou fixo) e valor mensal
3. Cada seção terá um heading com ícone e contagem
4. Manter a lógica de permissões existente (`canViewValues`, `canViewHRCosts`)
5. Adicionar botão "Gerenciar Recursos" no topo da aba, direcionando para `/contratos/${id}/recursos`

Nenhuma alteração de banco de dados necessária.

