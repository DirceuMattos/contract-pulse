
# Plano: Dashboard V2 -- Filtros por Cliente/Contrato + Lista de Alertas

## Resumo
Aprimorar o Dashboard com filtros por cliente e contrato (combobox com busca), substituir a lista inferior de contratos por uma tabela "Contratos com alertas" usando o motor de alertas existente (useAlerts + alertGenerator), e adicionar persistencia de filtros em localStorage.

---

## 1. Expandir o Motor de Alertas

### Arquivo: `src/types/index.ts`

Atualizar tipos de alerta para incluir novas categorias:
- Adicionar ao `AlertType`: `'financeiro-deficit'`, `'financeiro-margem-baixa'`, `'vigencia-vencido'`, `'governanca-contatos'`, `'governanca-dados'`
- Adicionar ao `AlertSeverity`: `'info'`
- Adicionar novo campo opcional `alertCategory` ao `Alert`: `'financeiro' | 'prazo' | 'reajuste' | 'governanca'`

### Arquivo: `src/lib/alertGenerator.ts`

Adicionar novas regras ao `generateAlerts`:
- **Deficit financeiro**: `resultadoMensal < 0` -> severidade `critico`, categoria `financeiro`
- **Margem baixa**: `resultadoMensal >= 0` e `margemPercentual < 5` -> severidade `atencao`, categoria `financeiro`
- **Contrato vencido**: `dataFim < hoje` e status ativo -> severidade `critico`, categoria `prazo`
- **Governanca - contatos incompletos**: contrato sem `responsavelCS` e sem `responsavelComercial` -> severidade `info`, categoria `governanca`

A funcao precisa receber `overheadItems` para calcular health corretamente.

### Arquivo: `src/hooks/useAlerts.ts`

Passar `overheadItems` do DataContext para `generateAlerts`. Adicionar contagem de `info`.

---

## 2. Filtros no Dashboard

### Arquivo: `src/pages/DashboardPage.tsx`

Adicionar na barra superior (abaixo do header, acima dos KPIs):

**Estado dos filtros:**
```typescript
const [selectedClientId, setSelectedClientId] = useState<string>('all');
const [selectedContractId, setSelectedContractId] = useState<string>('all');
```

**Filtro por cliente:**
- Combobox (usando cmdk/command, ja instalado) com busca
- Opcoes: "Todos os clientes" + lista de clientes unicos dos contratos ativos
- Formato: "Razao Social -- CNPJ"

**Filtro por contrato:**
- Combobox com busca
- Opcoes filtradas pelo cliente selecionado
- Formato: "Codigo -- Nome (vigencia)"

**Comportamento:**
- Ao selecionar cliente, reseta contrato para "Todos"
- Ao selecionar contrato, foca dashboard inteiro nele
- Filtros aplicados a KPIs, graficos e tabela

**Persistencia localStorage:**
- Chave `bnp_dashboard_filters`
- Salvar/carregar: `selectedClientId`, `selectedContractId`

---

## 3. Tabela "Contratos com Alertas"

### Arquivo: `src/pages/DashboardPage.tsx`

Substituir a secao inferior (Cards Alertas + Contratos List) por:

**Nova secao:**
- Titulo: "Contratos com alertas"
- Subtitulo: "Lista automatica de contratos que exigem atencao: deficit, margem baixa, vencimento ou reajuste proximos."
- Contador no topo: "X alertas criticos, Y em atencao, Z informativos"

**Tabela com colunas:**
1. Severidade (icone + badge colorido)
2. Tipo de alerta (chips: Financeiro / Prazo / Reajuste / Governanca)
3. Cliente
4. Contrato (codigo)
5. Saude financeira (badge)
6. Resultado mensal (R$) -- se canViewValues
7. Data fim
8. Proximo reajuste
9. Acoes: "Ver contrato" (botao)

**Ordenacao default:**
1. Severidade (critico primeiro)
2. Resultado mensal mais negativo
3. Menor tempo ate vencimento/reajuste

**Drill-down:**
- Clique na linha navega para `/contratos/{id}` (detalhe do contrato)

**Empty state:**
- Titulo: "Nenhum alerta neste periodo"
- Texto: "Nao ha contratos com deficit, margem baixa ou eventos proximos de vencimento/reajuste com os filtros atuais."
- Acao: "Ver todos os contratos" -> navega para `/contratos`

---

## 4. Logica de Filtragem

A filtragem aplica-se a todo o dashboard:
1. Filtrar contratos ativos por cliente (se selecionado)
2. Filtrar por contrato (se selecionado)
3. Calcular KPIs apenas com contratos filtrados
4. Graficos refletem contratos filtrados
5. Tabela inferior mostra apenas contratos filtrados que tenham alertas

---

## 5. Dados Mock

### Arquivo: `src/data/mockData.ts`

Atualizar datas de contratos para garantir testabilidade com data atual (2026-02-10):
- Ajustar `dataFim` de pelo menos 4 contratos para vencer em ate 60 dias (marco-abril 2026)
- Garantir pelo menos 3 contratos com margem baixa (0-5%)
- Garantir pelo menos 3 deficitarios
- Pelo menos 2 com reajuste proximo

Contratos candidatos a ajuste:
- `ctr-003` (dataFim 2025-05-31 -- ja vencido, gera alerta critico de prazo)
- `ctr-007` (dataFim 2025-07-31 -- ja vencido)
- `ctr-010` (dataFim 2025-08-31 -- ja vencido)
- `ctr-011` (dataFim 2025-06-30 -- ja vencido)
- Ajustar alguns `dataFim` para 2026-03 e 2026-04 para alertas de "vencimento proximo"
- Ajustar `dataBaseReajuste` de 2-3 contratos para mar-abr 2026

---

## 6. Skeleton Loading

Ao mudar filtros (cliente/contrato), aplicar breve skeleton (usando componente Skeleton existente) nos KPIs, graficos e tabela -- via transicao CSS (simples, sem delay artificial, apenas re-render visual).

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Novos AlertTypes, severity 'info', campo alertCategory |
| `src/lib/alertGenerator.ts` | Novas regras financeiro/deficit/margem/governanca + receber overheadItems |
| `src/hooks/useAlerts.ts` | Passar overheadItems, contagem info |
| `src/pages/DashboardPage.tsx` | Filtros combobox + tabela alertas + empty state + persistencia |
| `src/data/mockData.ts` | Ajustar datas para testabilidade |

---

## Ordem de Implementacao

1. Tipos (`types/index.ts`) -- novos alert types e severity
2. Motor de alertas (`alertGenerator.ts`) -- novas regras
3. Hook (`useAlerts.ts`) -- overhead + info count
4. Mock data (`mockData.ts`) -- ajustar datas
5. Dashboard (`DashboardPage.tsx`) -- filtros + tabela + empty state + persistencia
