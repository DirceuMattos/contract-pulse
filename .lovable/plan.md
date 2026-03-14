

## Plano: Bloco C — Rateio do Overhead Central + Tabela de Detalhamento

### Resumo

Criar uma nova pagina `/configuracoes/overhead-rateio` com tabela de detalhamento do rateio do pool de overhead central entre contratos vigentes, acessivel pelo botao ja existente em Configuracoes.

### Alteracoes

**1. Nova pagina `src/pages/OverheadAllocationPage.tsx`**

- Rota: `/configuracoes/overhead-rateio`
- Le o pool overhead do `localStorage` (chave `overhead-central`)
- Usa `useData()` para obter `contracts` e `clients`
- Usa `getContractRevenue()` para obter receita mensal de cada contrato
- Filtra contratos vigentes (status `operacao` ou `implantacao`) com receita > 0
- Calcula: `percentualContrato = receitaContrato / receitaTotal`, `overheadAlocado = percentual * totalPool`
- Aplica ajuste de arredondamento no maior contrato se soma nao bater com total pool
- Tabela principal com colunas: Cliente, Contrato, Valor Mensal (R$), Percentual (%), Overhead Alocado (R$), Acao (link abrir contrato)
- Ordenacao default: overhead alocado desc
- Rodape de validacao: receita total, total pool, soma alocada
- Secao "Pendencias do rateio": contratos excluidos (receita = 0 ou ausente, status nao vigente) com motivo e link editar
- Filtros: busca textual, select cliente

**2. `src/App.tsx`** — Adicionar rota `/configuracoes/overhead-rateio` apontando para `OverheadAllocationPage`

**3. `src/pages/SettingsPage.tsx`** — Ativar botao "Ver detalhamento do rateio":
- Remover `disabled`
- Adicionar `onClick={() => navigate('/configuracoes/overhead-rateio')}`

**4. `src/lib/overheadAllocation.ts`** — Funcao utilitaria reutilizavel:

```text
calculateOverheadAllocation(contracts, clients, poolTotal) => {
  allocations: { contractId, clientName, contractName, monthlyRevenue, percent, overheadAllocated }[]
  pending: { contractId, clientName, contractName, reason }[]
  totalRevenue: number
  totalAllocated: number
}
```

- Logica de arredondamento com ajuste residual no maior contrato
- Exportada para uso futuro nos Blocos D/E

### Nao alterado

- Consultoria por contrato (CRUD de recursos) permanece intacta
- Calculo de break-even nao e alterado (Bloco E)
- Overhead por contrato existente nao e modificado

