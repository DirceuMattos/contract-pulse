

## Plano: Modulo IA — Estrutura, Analises Rule-Based e Minutas

Este e um bloco grande com 3 partes. Recomendo implementar em etapas sequenciais.

---

### Etapa 1 — IA-1: Estrutura + Navegacao + Placeholders

**1.1 Modulo de acesso (`src/types/moduleAccess.ts`)**
- Adicionar `'AI'` e `'AI_LOGS'` ao `MODULE_KEYS`
- `AI`: roleRestrictions `[]` (todos podem, controlado por moduleAccess)
- `AI_LOGS`: roleRestrictions `['c-level']` (somente admin)
- Adicionar rotas `/ai/*` no `getModuleKeyForRoute`
- Defaults: c-level/leitor com AI habilitado; intermediario com AI desabilitado; comercial/juridico/rh/administrativo/lider_tribo desabilitado

**1.2 Navegacao (`src/components/layout/Sidebar.tsx`)**
- Adicionar item `{ path: '/ai', label: 'IA', icon: Sparkles, moduleKey: 'AI' }` antes de Usuarios
- Subitens nao sao necessarios no sidebar (navegacao interna nas paginas)

**1.3 Rotas (`src/App.tsx`)**
- `/ai/contracts-analysis` → `AIContractsAnalysisPage`
- `/ai/resources-analysis` → `AIResourcesAnalysisPage`
- `/ai/drafts` → `AIDraftsPage`
- `/ai/logs` → `AILogsPage`
- `/ai` → redirect para `/ai/contracts-analysis`

**1.4 Paginas placeholder (4 arquivos novos em `src/pages/`)**
Cada pagina com:
- PageHeader (titulo, descricao, botao primario desabilitado)
- Badge "Simulacao (Etapa 1)"
- Navegacao interna (tabs ou links entre as 4 sub-paginas)
- EmptyState com CTA contextual

Arquivos:
- `src/pages/AIContractsAnalysisPage.tsx`
- `src/pages/AIResourcesAnalysisPage.tsx`
- `src/pages/AIDraftsPage.tsx`
- `src/pages/AILogsPage.tsx`

**1.5 Componente de layout compartilhado (`src/components/ai/AIPageLayout.tsx`)**
- Tabs de navegacao entre as sub-paginas
- Verificacao de permissao para tab "Logs"
- Badge "Simulacao (Etapa 1)"

---

### Etapa 2 — IA-2: Analises Rule-Based

**2.1 Engine de regras (`src/lib/aiRuleEngine.ts`)**
Funcoes puras que recebem dados e retornam insights:

- `analyzeContractPortfolio(contracts, resources, settings, overheadMap)` → retorna:
  - KPIs: contratos criticos, atencao, reajustes proximos, vencimentos proximos
  - Top recomendacoes (lista priorizada ate 10)
  - Por contrato: diagnostico (bullets) + checklist de acoes

- Regras implementadas:
  - Resultado mensal < 0 → "Critico"
  - Margem 0-5% → "Atencao"
  - endDate <= 60 dias → "Renovacao"
  - Reajuste proximo <= 60 dias → "Reajuste"
  - Subprojetos + equipe grande → "Risco operacional"

- `analyzeResources(resources, hrPeople, contracts, settings)` → retorna:
  - Mapa de carga por equipe (FTE total, concentracao em criticos)
  - Sobrecargas (>100% dedicacao)
  - Ociosidade (baixa alocacao)
  - Agenda Comite Gestor (mes atual)
  - Aniversarios CLT (mes atual)

**2.2 Pagina Analise de Contratos (`AIContractsAnalysisPage.tsx`)**
- Filtros: Cliente, Contrato, Tipo (Gov/Privado), Saude
- Botao "Gerar analise" executa `analyzeContractPortfolio`
- Cards de visao geral do portfolio
- Lista de recomendacoes com badges de severidade
- Cards por contrato com diagnostico e acoes
- Botao "Copiar resumo" (clipboard)
- Link "Ver rateio" e "Abrir contrato"

**2.3 Pagina Analise de Recursos (`AIResourcesAnalysisPage.tsx`)**
- Filtros: Equipe, Cliente/Contrato, Status RH
- Toggle "Mostrar nomes" (admin default ON, outros OFF — respeita sigilo)
- Mapa de carga, pontos de atencao, agenda comite, aniversarios
- Botao "Copiar resumo"
- Usa dados de `useData()` + `useHR()` (HRContext)

---

### Etapa 3 — IA-3: Minutas

**3.1 Tipos (`src/types/aiDrafts.ts`)**
- `DraftType`: 'contract' | 'tr'
- `ContractVariant`: 'govtech' | 'privado'
- `Draft`: id, tipo, variante, contexto (clientId/contractId), respostas do questionario, documentos referencia, texto final, status, timestamps

**3.2 Templates (`src/lib/draftTemplates.ts`)**
- 4 templates com placeholders (`{{contratante}}`, `{{objeto}}`, etc.)
- Contrato GovTech, Contrato Privado, TR Padrao, TR Completo
- Funcao `generateDraft(template, answers)` que substitui placeholders

**3.3 Pagina Minutas (`AIDraftsPage.tsx`)**
- Fluxo wizard:
  1. Seletor de tipo (cards: Contrato / TR)
  2. Contexto (selecionar cliente/contrato, toggle docs referencia)
  3. Questionario dinamico (campos conforme PRD)
  4. Geracao + editor rich-text simples (textarea com formatacao basica)
- Aba "Rascunhos": lista salva em localStorage
- Acoes: Copiar, Exportar PDF/DOCX (badges "Em breve")

**3.4 Storage de rascunhos**
- localStorage key `ai-drafts`
- CRUD basico via hook `useAIDrafts()`

---

### Resumo de arquivos

**Novos (11 arquivos):**
- `src/pages/AIContractsAnalysisPage.tsx`
- `src/pages/AIResourcesAnalysisPage.tsx`
- `src/pages/AIDraftsPage.tsx`
- `src/pages/AILogsPage.tsx`
- `src/components/ai/AIPageLayout.tsx`
- `src/lib/aiRuleEngine.ts`
- `src/types/aiDrafts.ts`
- `src/lib/draftTemplates.ts`
- `src/hooks/useAIDrafts.ts`

**Editados (3 arquivos):**
- `src/types/moduleAccess.ts` — adicionar AI, AI_LOGS
- `src/components/layout/Sidebar.tsx` — adicionar item IA
- `src/App.tsx` — adicionar rotas /ai/*

**Nao alterados:**
- Todos os modulos existentes, permissoes, calculos, overhead, contratos, RH

