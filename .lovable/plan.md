## Plan: Bloco A (Flags Talento/Guardião no RH) + Bloco B (Overhead Central em Configurações) + Bloco C (Rateio) + Bloco D (Overhead Alocado nos Contratos)

**STATUS: ✅ IMPLEMENTADO**

### O que foi feito

#### BLOCO A — Flags Talento e Guardião

1. **Migração SQL** — Adicionadas colunas `is_talento` e `is_guardiao` (boolean, default false) em `hr_people`.
2. **Types** — Campos `isTalento` e `isGuardiao` adicionados ao `HRPerson`.
3. **Mappers** — `hrPersonFromDb` e `hrPersonToDb` mapeiam os novos campos.
4. **Lista RH** — Badges "⭐ Talento" (dourado) e "🛡️ Guardião" (azul) na coluna Nome. Filtros checkbox para ambos. Borda colorida na linha.
5. **Detalhe RH** — Switches Talento/Guardião com tooltips na seção Dados Profissionais. Desabilitados para quem não tem `canEdit`.
6. **Permissões** — `canEdit` controla edição (C-Level + Intermediário). Demais veem badges mas não editam.

#### BLOCO B — Overhead Central

1. **SettingsPage** — Nova seção "Overhead Central (mensal)" com 5 inputs R$ + total read-only.
2. **Persistência** — `localStorage` com chave `overhead-central`.
3. **UX** — Botão "Ver detalhamento do rateio" ativo (navega para /configuracoes/overhead-rateio). Toast ao salvar.

#### BLOCO C — Rateio do Overhead Central

1. **`src/lib/overheadAllocation.ts`** — Função `calculateOverheadAllocation` calcula percentual e overhead alocado por contrato, com ajuste de arredondamento no maior contrato.
2. **`src/pages/OverheadAllocationPage.tsx`** — Nova página `/configuracoes/overhead-rateio`:
   - Cards resumo: Pool total, Receita total, Soma alocada (com check ✓)
   - Tabela principal: Cliente, Contrato, Valor Mensal, Percentual, Overhead Alocado, Status, link abrir
   - Seção "Pendências do rateio": contratos excluídos (receita 0 ou não vigente) com motivo e link editar
   - Filtros: busca textual + select cliente
   - Tooltip de ajuste de arredondamento
3. **Rota** — Adicionada em App.tsx
4. **Não alterado** — Consultoria por contrato (CRUD de recursos) permanece intacta. Cálculo de break-even não alterado (Bloco E futuro).

#### BLOCO D — Overhead Alocado nos Contratos

1. **`src/hooks/useOverheadPool.ts`** (novo) — Hook que lê o pool central do localStorage, calcula alocações via `calculateOverheadAllocation`, e expõe `getAllocation(contractId)` retornando `{ percent, value, isPending, pendingReason }`.
2. **`src/lib/calculations.ts`** — `calculateContractHealth` recebe parâmetro opcional `centralOverhead` (default 0), somado ao custo mensal. `calculateDashboardKPIs` recebe `centralOverheadMap` opcional.
3. **`src/lib/alertGenerator.ts`** — Contexto de alertas aceita `centralOverheadMap`, propagado para checagem financeira.
4. **`src/hooks/useAlerts.ts`** — Usa `useOverheadPool` para construir o mapa e passá-lo ao gerador de alertas.
5. **Todas as páginas atualizadas** — `DashboardPage`, `ContractsPage`, `ClientDetailPage`, `SquadsPage`, `ContractDetailPage`, `ContractResourcesPage` passam o overhead alocado para `calculateContractHealth`.
6. **UI ContractDetailPage** — Seção "Distribuição de Custos" exibe barra "Overhead alocado" com percentual e valor. Aba "Recursos" exibe card "Overhead alocado" com estado normal ou "Indisponível". Itens legados aparecem colapsados como somente-leitura.
7. **UI ContractResourcesPage** — Seção CRUD de overhead substituída por card read-only "Overhead alocado" com link "Ver rateio". Itens legados exibidos em card opaco com aviso.
8. **Não alterado** — Consultoria por contrato, pool central em Configurações, página de rateio, break-even.

## Plan: Módulo IA — Estrutura, Análises Rule-Based e Minutas

**STATUS: ✅ IMPLEMENTADO**

### O que foi feito

#### IA-1 — Estrutura + Navegação + Placeholders
1. **moduleAccess.ts** — Adicionados `AI` e `AI_LOGS` ao `MODULE_KEYS`. AI_LOGS restrito a c-level. Intermediário sem acesso por default.
2. **Sidebar.tsx** — Item "IA" com ícone Sparkles adicionado entre RH e Usuários.
3. **App.tsx** — Rotas `/ai/*` com redirect `/ai` → `/ai/contracts-analysis`.
4. **AIPageLayout.tsx** — Tabs de navegação entre sub-páginas + badge "Simulação (Etapa 1)".
5. **Migração SQL** — Valores `AI` e `AI_LOGS` adicionados ao enum `module_key`.

#### IA-2 — Análises Rule-Based
1. **aiRuleEngine.ts** — Engine com funções puras:
   - `analyzeContractPortfolio()`: KPIs (críticos, atenção, reajustes, vencimentos), top 10 recomendações, diagnóstico por contrato.
   - `analyzeResources()`: mapa de carga por equipe, sobrecargas (>100%), ociosidade (<30%), comitê gestor, aniversários CLT.
2. **AIContractsAnalysisPage** — Filtros (cliente, segmento, saúde, busca), cards KPI, recomendações com badges, diagnóstico por contrato, botão copiar.
3. **AIResourcesAnalysisPage** — Toggle "Mostrar nomes" (admin default ON), filtro equipe, mapa de carga, sobrecargas, ociosidade, comitê, aniversários.

#### IA-3 — Minutas
1. **aiDrafts.ts** — Tipos Draft, DraftContractAnswers, DraftTRAnswers, DraftDocReference.
2. **draftTemplates.ts** — 4 templates: Contrato GovTech, Contrato Privado, TR Padrão, TR Completo. Placeholders substituídos automaticamente.
3. **useAIDrafts.ts** — Hook CRUD com localStorage (`ai-drafts`).
4. **AIDraftsPage** — Wizard 4 etapas (tipo → contexto → questionário → editor). Aba Rascunhos com abrir/duplicar/excluir. Auto-fill de dados do contrato selecionado. Referências de documentos. Copiar texto. Export PDF/DOCX em breve.
5. **AILogsPage** — Placeholder "Em breve".
