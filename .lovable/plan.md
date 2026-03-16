

## Plano: Subprojetos — Remover Overhead Antigo e Ratear Overhead Central

### Contexto

Atualmente os subprojetos permitem alocar `overhead_items` (overhead por contrato) como um tipo de alocacao. O sistema ja possui um **Overhead Central** (pool corporativo rateado por receita entre contratos via `useOverheadPool`). A proposta e:

1. Remover a alocacao manual de `overhead_items` nos subprojetos
2. Distribuir automaticamente a parcela de overhead central do contrato entre seus subprojetos, proporcionalmente ao custo direto de cada subprojeto

### 1. Remocao do tipo "Overhead" das alocacoes de subprojeto

**Arquivos afetados:**

- `SubprojectManagementPanel.tsx` — remover a secao "Overheads" e o botao de adicionar overhead
- `SubprojectAllocationDialog.tsx` — remover o tipo `'overhead'` do `AllocationType`; remover a branch de `overheadItems` no select
- `SubprojectCostCards.tsx` — remover o calculo de custo baseado em `overheadItemId`; substituir pelo rateio do overhead central
- `SubprojectContext.tsx` — manter `overheadItemId` no tipo (backward compat) mas ignorar no fluxo

Nao e necessario remover a coluna `overhead_item_id` do banco — ela fica inerte.

### 2. Rateio automatico do Overhead Central por subprojeto

**Logica:**
- Obter a parcela de overhead central do contrato via `useOverheadPool().getAllocation(contractId)`
- Calcular o custo direto de cada subprojeto (pessoas + recursos, sem overhead)
- Ratear o overhead central proporcionalmente ao custo direto de cada subprojeto
- Se o contrato nao tiver subprojetos, o overhead se aplica ao contrato inteiro (sem mudanca)

**Em `SubprojectCostCards.tsx`:**
- Receber `overheadAllocated` (do pool central) como prop
- Para cada subprojeto, calcular: `overheadSubprojeto = overheadTotal * (custoSubprojeto / somaCustosSubprojetos)`
- Exibir o overhead rateado no card junto com custo direto

**Em `SubprojectManagementPanel.tsx`:**
- Substituir a secao "Overheads" por uma linha informativa: "Overhead Central: R$ X (Y% do contrato)" calculado automaticamente
- Sem interacao manual — o rateio e automatico

### 3. Ajustes visuais

- No card de cada subprojeto, mostrar:
  - Custo direto (pessoas + recursos)
  - Overhead rateado
  - Custo total (direto + overhead)
- Remover contagem de "overhead items" dos badges

### 4. Arquivos

**Editados (4):**
- `src/components/squads/SubprojectManagementPanel.tsx` — remover secao overhead, adicionar linha informativa
- `src/components/squads/SubprojectAllocationDialog.tsx` — remover tipo `overhead`
- `src/components/contracts/SubprojectCostCards.tsx` — novo calculo com overhead central rateado
- `src/types/index.ts` — remover `overhead` de `AllocationType` (se definido la)

**Nao alterados:**
- Banco de dados (coluna `overhead_item_id` permanece, sem migracao)
- `SubprojectContext.tsx` (manter mapeamento para backward compat)
- `overhead_items` tabela e logica — continuam existindo para contratos sem subprojetos
- `useOverheadPool` — sem alteracao, ja fornece a parcela por contrato

