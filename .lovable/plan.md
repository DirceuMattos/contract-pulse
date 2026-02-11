
# Plano: Bloco 7 -- Calculadora de Contratos (Simulacao de Negociacao)

## Resumo
Novo modulo independente com wizard de 5 passos para simular contratos em negociacao. Motor de sugestao deterministico (sem IA) gera baseline de recursos com base em presets e questionario. Exibe resultado com cenarios (conservador/base/otimista) e grafico comparativo. Persistencia em localStorage.

---

## 1. Novos Tipos

### Arquivo: `src/types/index.ts`

```typescript
// Simulation Types
export type SimulationContractType = 'gov' | 'private';
export type SimulationComplexity = 'baixa' | 'media' | 'alta';
export type SimulationPricingModel = 'mensal' | 'total';
export type SimulationStatus = 'draft' | 'archived';

export type DemandType = 'sustentacao' | 'evolucao' | 'novo-sistema' | 'implantacao';
export type CriticalityLevel = 'baixa' | 'media' | 'alta';
export type IntegrationCount = 'nenhuma' | '1-2' | '3-5' | 'mais-5';
export type ModuleCount = '1-2' | '3-5' | '6-10' | 'mais-10';
export type UserVolume = 'menos-200' | '200-2k' | '2k-20k' | 'mais-20k';
export type SLALevel = 'comercial' | '12x5' | '24x7';
export type DeliveryPace = 'flexivel' | 'moderado' | 'agressivo';

export interface SimulationQuestionnaire {
  demandType: DemandType;
  criticality: CriticalityLevel;
  integrations: IntegrationCount;
  modules: ModuleCount;
  userVolume: UserVolume;
  slaLevel: SLALevel;
  deliveryPace: DeliveryPace;
  fieldDependency: boolean;
}

export interface SimulationHRItem {
  id: string;
  role: string;
  hiringType: 'clt' | 'pj';
  quantity: number;
  grossMonthly: number;
  chargesPercent: number;
}

export interface SimulationOtherCost {
  id: string;
  category: string;
  description: string;
  valueMonthly: number;
}

export interface SimulationOverhead {
  infraPercent: number;
  adminPercent: number;
  governancePercent: number;
}

export interface SimulationScenario {
  label: string;
  receitaMensal: number;
  custoMensal: number;
  overheadMensal: number;
  resultadoMensal: number;
  margemPercent: number;
  healthStatus: HealthStatus;
}

export interface ContractSimulation {
  id: string;
  name: string;
  clientName: string;
  contractType: SimulationContractType;
  govSphere?: GovSphere;
  expectedStartDate?: string;
  termMonths: number;
  pricingModel: SimulationPricingModel;
  proposedMonthlyValue?: number;
  proposedTotalValue?: number;
  description: string;
  complexityLevel: SimulationComplexity;
  questionnaire: SimulationQuestionnaire;
  suggestedHR: SimulationHRItem[];
  suggestedOtherCosts: SimulationOtherCost[];
  suggestedOverhead: SimulationOverhead;
  customHR: SimulationHRItem[];
  customOtherCosts: SimulationOtherCost[];
  customOverhead: SimulationOverhead;
  usingSuggested: boolean;
  status: SimulationStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
}
```

---

## 2. Motor de Sugestao Deterministico

### Novo arquivo: `src/lib/simulationEngine.ts`

Funcoes:
- `generateSuggestedResources(questionnaire, complexity, termMonths)`: retorna `{ hr, otherCosts, overhead }`
- `calculateSimulationResults(simulation)`: retorna `{ receitaMensal, custoMensal, overheadMensal, resultadoMensal, margemPercent, healthStatus }`
- `generateScenarios(simulation)`: retorna array de 3 cenarios (conservador +10% custo, base, otimista -10% custo)

### Presets base (hardcoded, editaveis na UI):

| Perfil | PO | TechLead | Dev | QA | Suporte | UX | DevOps |
|--------|-----|----------|-----|-----|---------|-----|--------|
| Sustentacao BAIXA | 0.2 | - | 1 | 0.5 | - | - | - |
| Sustentacao MEDIA | 0.5 | - | 2 | 1 | 0.5 | - | - |
| Evolucao MEDIA | 0.5 | 0.5 | 3 | 1 | - | 0.5 | - |
| Novo sistema ALTA | 1 | 1 | 4 | 2 | - | 0.5 | 0.5 |
| Implantacao ALTA | 1 | 0.5 | 3 | 1.5 | 1 | 0.5 | 0.5 |

Salarios medios default (R$/mes): PO 12k, TechLead 18k, Dev 14k, QA 10k, Suporte 6k, UX 12k, DevOps 15k

### Regras de ajuste por questionario:
- Integracoes 3-5: +0.5 Dev, +0.5 QA
- Integracoes >5: +1 Dev, +1 QA
- Criticidade alta: +0.5 QA, +custo "Observabilidade" R$2k
- SLA 24x7: +2 Suporte, +custo "Plantao" R$5k
- SLA 12x5: +1 Suporte
- Prazo agressivo: +1 Dev
- Modulos >10: +1 Dev, +0.5 PO
- Modulos 6-10: +0.5 Dev
- Dependencia presencial: +custo "Viagens" R$4k
- Volume >20k: +custo "Infra escalavel" R$3k

Overhead default: infra 6%, admin 4%, governanca 3%

---

## 3. Contexto de Simulacoes

### Novo arquivo: `src/contexts/SimulationContext.tsx`

- Estado `simulations: ContractSimulation[]` persistido em localStorage (`bnp_simulations`)
- Funcoes: `addSimulation`, `updateSimulation`, `deleteSimulation`, `duplicateSimulation`, `getSimulation`, `getAllSimulations`
- Seed com mock data no primeiro load
- Provider adicionado no `App.tsx`

---

## 4. Dados Mock

### Novo arquivo: `src/data/mockSimulations.ts`

8 simulacoes seed:
- 3 GOV (municipal/estadual) e 3 PRIVATE
- 2 mistas
- Pelo menos 2 deficitarias, 2 atencao, 2-4 saudaveis
- Modelos mensal e total variados
- Questionarios preenchidos com respostas variadas

---

## 5. Paginas e Componentes

### 5.1 Lista de Simulacoes
**Novo arquivo: `src/pages/CalculatorPage.tsx`**
Rota: `/calculadora`

- Titulo "Calculadora de Contratos" + subtexto "Simule contratos em negociacao"
- Botao "Nova simulacao"
- Cards ou tabela com simulacoes salvas:
  - Nome, cliente, tipo, prazo, margem projetada, status saude, data
  - Acoes: Abrir, Duplicar, Arquivar, Excluir
- Empty state com CTA
- Filtros: busca + tipo (GOV/PRIVATE) + status (draft/archived)

### 5.2 Wizard de Nova Simulacao
**Novo arquivo: `src/pages/CalculatorWizardPage.tsx`**
Rota: `/calculadora/nova` e `/calculadora/:id`

Stepper com 5 passos, navegacao livre entre passos ja visitados:

**Passo 1 - Identificacao**: nome, cliente, tipo, esfera (condicional), prazo, data inicio, descricao
**Passo 2 - Precificacao**: modelo (mensal/total), valor, exibicao read-only da receita mensal/total projetada
**Passo 3 - Complexidade e Questionario**: nivel de complexidade + 8 campos do questionario
**Passo 4 - Estrutura de Recursos**: tabelas editaveis (RH + Outros custos + Overhead), accordion "Como foi calculado", botoes "Aplicar sugestao" / "Resetar"
**Passo 5 - Resultado e Cenarios**: cards KPI, indicador saude, tabela comparativa 3 cenarios, grafico de barras (recharts), acoes finais

### 5.3 Componentes auxiliares (dentro de `src/components/calculator/`)

| Componente | Responsabilidade |
|------------|-----------------|
| `SimulationStepper.tsx` | Stepper visual com 5 passos |
| `Step1Identification.tsx` | Formulario passo 1 |
| `Step2Pricing.tsx` | Formulario passo 2 |
| `Step3Questionnaire.tsx` | Formulario passo 3 |
| `Step4Resources.tsx` | Tabelas editaveis + sugestao |
| `Step5Results.tsx` | Cards + cenarios + grafico |

---

## 6. Sidebar e Rotas

### Arquivo: `src/components/layout/Sidebar.tsx`
Adicionar item apos "Alertas":
```typescript
{ path: '/calculadora', label: 'Calculadora', icon: Calculator }
```

### Arquivo: `src/App.tsx`
Adicionar rotas + SimulationProvider:
```
/calculadora -> CalculatorPage
/calculadora/nova -> CalculatorWizardPage
/calculadora/:id -> CalculatorWizardPage
```

---

## 7. Permissoes

Calculadora acessivel para `c-level` e `leitor`. Verificacao no componente com tela de acesso restrito para `intermediario`.

---

## Arquivos Criados/Alterados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Tipos de simulacao |
| `src/lib/simulationEngine.ts` | Novo -- motor deterministico + presets |
| `src/contexts/SimulationContext.tsx` | Novo -- CRUD + persistencia |
| `src/data/mockSimulations.ts` | Novo -- 8 simulacoes seed |
| `src/pages/CalculatorPage.tsx` | Novo -- lista de simulacoes |
| `src/pages/CalculatorWizardPage.tsx` | Novo -- wizard 5 passos |
| `src/components/calculator/SimulationStepper.tsx` | Novo |
| `src/components/calculator/Step1Identification.tsx` | Novo |
| `src/components/calculator/Step2Pricing.tsx` | Novo |
| `src/components/calculator/Step3Questionnaire.tsx` | Novo |
| `src/components/calculator/Step4Resources.tsx` | Novo |
| `src/components/calculator/Step5Results.tsx` | Novo |
| `src/components/layout/Sidebar.tsx` | Item "Calculadora" |
| `src/App.tsx` | Rotas + SimulationProvider |

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. Motor de sugestao (`simulationEngine.ts`)
3. Mock data (`mockSimulations.ts`)
4. Contexto (`SimulationContext.tsx`)
5. Componentes do wizard (Step1-5 + Stepper)
6. Paginas (CalculatorPage + CalculatorWizardPage)
7. Sidebar + App.tsx (rotas e provider)
