
# Bloco 9 -- Preparacao para Etapa 2 + Calculadora + Permissoes RH

Dado o volume do bloco, o trabalho sera dividido em **3 partes** correspondentes as secoes A, B e C do PRD.

---

## Parte B: Cards da Calculadora (margem em R$ + tags coloridas + borda por saude)

### Arquivo: `src/pages/CalculatorPage.tsx`

**B1 -- Exibir margem em valor alem do percentual**

No grid de informacoes de cada card, adicionar uma linha com o valor da margem mensal (`resultadoMensal`) retornado por `calculateSimulationResults`. Layout:

```
Margem: +R$ 12.345/mes  |  Margem: 8,4%
```

O valor sera formatado com `formatCurrency` e precedido de sinal (+/-). A cor segue a mesma logica ja existente (verde/amarelo/vermelho).

**B2 -- Badges de saude com cores padrao (uiConstants)**

Substituir as funcoes locais `healthLabel` e `healthBg` pelos mapeamentos de `src/lib/uiConstants.ts` (`healthConfig`). Adicionar tooltip ao badge usando `Tooltip` do shadcn, explicando:
- Saudavel: margem >= 15%
- Atencao: 0% a < 15%
- Critico: < 0%

**B3 -- Borda colorida no card por status de saude**

Adicionar `border-l-4` ao Card com cor condicional:
- `border-l-health-healthy` (verde)
- `border-l-health-attention` (amarelo)
- `border-l-health-critical` (vermelho)

Nao colorir fundo inteiro para manter legibilidade.

---

## Parte C: Permissoes refinadas -- ocultar decomposicao de RH para nao-C-Level

### Contexto atual

`canViewValues` (somente c-level) ja oculta TODOS os valores monetarios. O PRD pede uma distincao mais fina:
- **C-Level**: ve tudo (RH detalhado, receita, custo, margem em R$)
- **Intermediario e Leitor**: veem saude/badge, margem %, resultado agregado (superavit/deficit), mas NAO veem decomposicao de RH (custo base, encargos, custo total por recurso)

### Novo campo no AuthContext: `canViewHRCosts`

Arquivo: `src/contexts/AuthContext.tsx`
- Adicionar `canViewHRCosts: boolean` = `user?.role === 'c-level'`
- `canViewValues` permanece como esta (c-level only) para valores financeiros agregados de contratos

### Onde aplicar `canViewHRCosts`

**`src/pages/ContractResourcesPage.tsx`**:
- Section "Cost Breakdown by Type" (linhas 312-344): condicionar com `canViewHRCosts` para tipos `clt` e `pj` -- ocultar `formatCurrency(custo)` e mostrar "Restrito" ou apenas quantidade
- Lista de recursos (linhas 408-420): para recursos tipo `clt`/`pj`, ocultar custo e custo base; manter nome, cargo, senioridade, dedicacao visiveis
- Cards de KPI de custo total (linhas 277-289): manter visivel apenas com `canViewValues` (como ja esta)
- Ocultar botoes de edicao/exclusao de RH para quem nao tem `canEdit`

**`src/pages/ContractDetailPage.tsx`**:
- Aba "Recursos" (linhas 496-561): ocultar `formatCurrency(cost)` para recursos `clt`/`pj` quando `!canViewHRCosts`
- Distribuicao de custos (linhas 421-480): ocultar barras de CLT/PJ quando `!canViewHRCosts`, manter Overhead e Outros visiveis

**`src/pages/DashboardPage.tsx`**:
- O dashboard ja usa `canViewValues` para KPIs monetarios -- manter como esta

### UX de mascaramento

Onde valores sao ocultos, exibir:
- Texto: "---" alinhado a direita
- Tooltip: "Valores de RH restritos ao perfil C-Level"

---

## Parte A: Camada de Data Provider (preparacao para backend)

### A1 -- Interfaces de provider por dominio

Criar arquivo `src/providers/types.ts` com interfaces:

```typescript
interface ContractsProvider {
  list(filters?: ContractFilters): Promise<Contract[]>;
  getById(id: string): Promise<Contract | undefined>;
  create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract>;
  update(id: string, data: Partial<Contract>): Promise<void>;
  delete(id: string): Promise<void>;
  getByClient(clientId: string): Promise<Contract[]>;
}
// ... similar para Resources, History, Documents, Users, AccessLogs, Calculator
```

Definir tambem `ProviderError` com `code` e `message`.

### A2 -- LocalProvider (implementacao usando stores existentes)

Criar `src/providers/local/index.ts` que implementa todas as interfaces delegando para os stores de localStorage/IndexedDB ja existentes.

Nesta etapa o LocalProvider sera importado diretamente nos contextos, sem alterar o fluxo funcional. A integracao real (redirecionar DataContext/SimulationContext para usar o provider) sera feita na Etapa 2 para minimizar risco de regressao agora.

### A3 -- ApiProvider (stub)

Criar `src/providers/api/index.ts` com implementacoes que lancam `throw new Error('API provider not available in this version')`.

### A4 -- Feature flag e seletor

Arquivo: `src/pages/SettingsPage.tsx` (secao Admin/Preferencias):
- Adicionar Select "Fonte de dados" com opcoes "Local (padrao)" e "API (Em breve)"
- Selecionar API mostra toast de aviso e reverte para Local
- Armazenar `dataMode` em localStorage (`bnp_data_mode`)

### A5 -- DTOs e mapeamento

Criar `src/providers/dtos.ts` com tipos DTO alinhados ao futuro backend:
- `ContractDTO`, `ResourceDTO`, `HistoryEventDTO`, `DocumentDTO`, `UserDTO`, `SimulationDTO`
- Funcoes `mapContractToDTO` / `mapDTOToContract` (e equivalentes para cada dominio)
- Objetivo: documentar o formato esperado do backend sem alterar o funcionamento atual

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/providers/types.ts` | Novo | Interfaces de provider por dominio |
| `src/providers/local/index.ts` | Novo | LocalProvider usando stores existentes |
| `src/providers/api/index.ts` | Novo | ApiProvider stub |
| `src/providers/dtos.ts` | Novo | DTOs e funcoes de mapeamento |
| `src/contexts/AuthContext.tsx` | Mod | Adicionar `canViewHRCosts` |
| `src/pages/CalculatorPage.tsx` | Mod | Margem em R$, badges padronizadas, borda colorida |
| `src/pages/ContractResourcesPage.tsx` | Mod | Mascarar custos RH para nao-C-Level |
| `src/pages/ContractDetailPage.tsx` | Mod | Mascarar custos RH na aba Recursos |
| `src/pages/SettingsPage.tsx` | Mod | Seletor de fonte de dados |

## Ordem de implementacao

1. Parte B (calculadora) -- menor risco, alteracao localizada
2. Parte C (permissoes) -- alteracao em AuthContext + 2 paginas
3. Parte A (providers) -- novos arquivos sem alterar fluxo existente
