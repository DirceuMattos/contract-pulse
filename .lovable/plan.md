

## Plano: Bloco D — Overhead Alocado (derivado do pool central) nos Contratos

### Resumo

Substituir o overhead manual por contrato pelo overhead derivado do rateio central (Bloco C). O custo mensal, margem e saude passam a incluir o overhead alocado automaticamente. A secao legada de overhead vira somente-leitura ou e removida.

### Arquitetura da mudanca

O calculo central ja existe em `calculateOverheadAllocation()`. Precisamos:
- Criar um hook `useOverheadPool()` que le o pool do localStorage e calcula as alocacoes para todos os contratos
- Modificar `calculateContractHealth` para aceitar um parametro `centralOverhead?: number` que sera somado ao custo
- Atualizar todos os 7 pontos que chamam `calculateContractHealth` para passar o overhead alocado
- Substituir a UI legada de overhead nos detalhes do contrato

### Alteracoes

**1. `src/hooks/useOverheadPool.ts`** (novo)
- Hook que le `overhead-central` do localStorage
- Usa `useData()` para obter contracts/clients
- Retorna `{ poolTotal, getAllocation(contractId) => { percent, value }, result }`
- Usa `calculateOverheadAllocation` internamente

**2. `src/lib/calculations.ts`** — `calculateContractHealth`
- Adicionar parametro opcional `centralOverhead?: number` (default 0)
- `custoMensal = custoRecursos + overheadCost.total + centralOverhead`
- O overhead per-contract (legado) continua no calculo por compatibilidade, mas a UI para de criar novos

**3. `src/pages/ContractDetailPage.tsx`**
- Importar e usar `useOverheadPool` para obter alocacao do contrato
- Passar `centralOverhead` para `calculateContractHealth`
- Na aba Resumo > Distribuicao de Custos: substituir barra de overhead legado por "Overhead alocado" com percentual e valor
- Na aba Recursos: substituir secao "Custos Indiretos (Overhead)" legada por card read-only "Overhead alocado" com:
  - Percentual do rateio e valor mensal
  - Tooltip explicativo
  - Link "Ver rateio" → `/configuracoes/overhead-rateio`
  - Estado "Indisponivel" se contrato nao entra no rateio (pendencia)
- Se existem overheadItems legados, mostrar secao colapsada "Legado (desativado)" em read-only com aviso

**4. `src/pages/ContractResourcesPage.tsx`**
- Importar `useOverheadPool`
- Passar `centralOverhead` para `calculateContractHealth`
- Substituir secao CRUD de overhead por card read-only "Overhead alocado" (mesmo layout do detail)
- Remover botao "Adicionar Overhead" e formulario de edicao
- Se existem itens legados, exibir colapsado como "Legado"

**5. Atualizar todos os outros callers de `calculateContractHealth`:**
- `src/pages/DashboardPage.tsx` — usar `useOverheadPool`
- `src/pages/ContractsPage.tsx` — idem
- `src/pages/ClientDetailPage.tsx` — idem
- `src/pages/SquadsPage.tsx` — idem
- `src/lib/alertGenerator.ts` — adicionar parametro `centralOverhead` ao contexto
- `src/lib/calculations.ts` > `calculateDashboardKPIs` — propagar centralOverhead

**6. Nao alterado**
- Consultoria por contrato (recursos tipo "outro" com categoria "consultoria") permanece intacta
- Pool de overhead central em Configuracoes nao muda
- Pagina de detalhamento do rateio nao muda
- Break-even nao e alterado (Bloco E)

### Card "Overhead alocado" — Layout

```text
┌─────────────────────────────────────────┐
│ ⓘ Overhead alocado                     │
│                                         │
│  Percentual do rateio: 12,45%           │
│  Valor mensal alocado: R$ 3.200         │
│                                         │
│  [Ver rateio →]                         │
└─────────────────────────────────────────┘
```

Estado indisponivel:
```text
┌─────────────────────────────────────────┐
│ ⚠ Overhead alocado — Indisponível      │
│  Contrato sem valor mensal              │
│  [Corrigir valor mensal]                │
└─────────────────────────────────────────┘
```

