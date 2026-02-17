
# Modulo Squads -- Distribuicao de Equipes por Cliente/Contrato

## Resumo

Criar um modulo de visualizacao (somente leitura) que consolida os recursos humanos alocados por contrato, agrupa por equipe (via tabela de cargos) e exibe a dedicacao percentual de cada recurso. Inclui filtros, exportacao CSV/XLSX e respeito ao sigilo de custos de RH.

---

## 1. Atualizar seeds de Equipes

### `src/data/mockData.ts` (mod)

Substituir as 7 equipes atuais pelas 8 equipes da taxonomia obrigatoria (mantendo IDs existentes onde possivel e criando novos):

| sortOrder | Nome | ID |
|-----------|------|------|
| 1 | Lideranca Equipes | team-001 |
| 2 | Projetos | team-002 |
| 3 | Desenvolvimento | team-003 |
| 4 | Testes | team-004 |
| 5 | IA | team-005 |
| 6 | Dados | team-006 |
| 7 | Estrutura | team-007 |
| 8 | Suporte | team-008 |

Reatribuir `teamId` nos `defaultJobTitles`:
- Tech Lead, Gerente de Projetos, Scrum Master -> Lideranca Equipes
- Product Owner, UX Designer -> Projetos
- Devs Frontend/Backend/Full Stack, Arquiteto -> Desenvolvimento
- QA/Tester -> Testes
- Analista de Dados -> Dados
- DevOps, DBA -> Estrutura
- Analista de Suporte -> Suporte
- Analista de Sistemas -> sem equipe (testar "Sem equipe")

---

## 2. Tipos e moduleAccess

### `src/types/moduleAccess.ts` (mod)

Adicionar `'SQUADS'` ao `MODULE_KEYS`.

Adicionar ao `MODULE_CATALOG`:
```
{ key: 'SQUADS', label: 'Squads', description: 'Distribuicao de equipes por contrato',
  routes: ['/squads'], roleRestrictions: [] }
```

Atualizar `getModuleKeyForRoute` para mapear `/squads` -> `SQUADS`.

---

## 3. Sidebar e CommandPalette

### `src/components/layout/Sidebar.tsx` (mod)

Adicionar item na lista `navItems`:
```
{ path: '/squads', label: 'Squads', icon: LayoutGrid, moduleKey: 'SQUADS' }
```
Posicionar apos "Alertas" e antes de "Calculadora".

### `src/components/layout/CommandPalette.tsx` (mod)

Adicionar comando "Squads" com navegacao para `/squads`.

---

## 4. Pagina principal Squads

### `src/pages/SquadsPage.tsx` (novo)

Componente principal do modulo. Estrutura:

**Cabecalho**
- PageHeader: titulo "Squads", descricao "Distribuicao de equipes por cliente e contrato"

**Barra de filtros**
- Filtro por Cliente (Select com busca)
- Filtro por Contrato (Select com busca, filtrado pelo cliente selecionado)
- Filtro por Equipe (multi-select com as equipes na ordem fixa)
- Toggle de agrupamento: "Por Contrato" (default) | "Por Cliente"
- Busca textual (cargo/funcao)
- Botao Exportar (dropdown: CSV, XLSX)

**Logica de consolidacao (inline ou hook `useSquadsData`)**

Para cada contrato com recursos tipo `clt` ou `pj`:
1. Filtrar recursos HR (tipo !== 'outro')
2. Para cada recurso, mapear cargo -> jobTitle (match case-insensitive pelo label) -> teamId -> team
3. Se cargo nao encontrado ou sem teamId -> "Sem equipe"
4. Calcular:
   - `dedicacaoPercent = percentualDedicacao` (ja e 0-100)
   - `totalFTEContrato = soma(percentualDedicacao / 100)` de todos os HR do contrato
   - `fteEquipe[team] = soma(percentualDedicacao / 100)` por equipe
   - `percentEquipe[team] = fteEquipe / totalFTEContrato * 100`
5. Ordenar equipes pela ordem fixa (sortOrder)

**Conteudo -- Cards por contrato**

Cada card exibe:
- Cabecalho: Cliente (razaoSocial), codigo do contrato, badge segmento (Gov/Privado), badge saude (via `calculateContractHealth`)
- Resumo: Total FTE, N de recursos HR
- Barras por equipe: nome da equipe, FTE, % do total
- Botao "Ver detalhes" que expande um Collapsible/Accordion

**Detalhe expandido**
- Secoes por equipe (na ordem fixa)
- Cada secao mostra os recursos HR:
  - Cargo/Funcao
  - Tipo contratacao (CLT/PJ)
  - Dedicacao: "XX%" (com badge ">100%" se percentualDedicacao > 100)
- NAO exibir valores salariais/custos (respeitar `canViewHRCosts`)
  - Se `canViewHRCosts` for true (C-Level), opcionalmente mostrar custo base (nao obrigatorio nesta versao)

**Empty state**
- "Nenhum recurso humano cadastrado" + CTA "Ir para Contratos"

**Agrupamento "Por Cliente"**
- Agrupa contratos sob o mesmo cliente
- Card externo = cliente, cards internos = contratos

---

## 5. Exportacao

### Dentro de `SquadsPage.tsx`

**CSV/XLSX**: gerar tabela com colunas:
- Cliente, Contrato (codigo), Equipe, Cargo/Funcao, Tipo (CLT/PJ), Dedicacao (%), FTE
- Linha de resumo por contrato: Total FTE, % por equipe

Usar `xlsx` (ja instalado) para XLSX e `papaparse` (ja instalado) para CSV.

Respeitar permissoes: se nao `canViewHRCosts`, nao incluir colunas de custo.

---

## 6. Rota

### `src/App.tsx` (mod)

Adicionar:
```
<Route path="/squads" element={<SquadsPage />} />
```

---

## 7. Permissoes e sigilo

O modulo e acessivel a todos os roles (roleRestrictions = []).

Regras de exibicao:
- Todos veem: cargo, equipe, dedicacao percentual, tipo contratacao
- Somente C-Level (`canViewHRCosts`): pode ver custos (nao obrigatorio nesta versao; manter oculto por padrao)
- Nenhum role ve salarios no Squads (alinhado com o PRD)

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/data/mockData.ts` | Mod | Atualizar equipes seed para taxonomia de 8 equipes e reatribuir cargos |
| `src/types/moduleAccess.ts` | Mod | Adicionar SQUADS ao catalogo de modulos |
| `src/components/layout/Sidebar.tsx` | Mod | Adicionar item Squads no menu |
| `src/components/layout/CommandPalette.tsx` | Mod | Adicionar comando Squads |
| `src/pages/SquadsPage.tsx` | Novo | Pagina principal do modulo Squads |
| `src/App.tsx` | Mod | Adicionar rota /squads |

## Ordem de implementacao

1. Mock data (equipes + cargos atualizados)
2. moduleAccess (SQUADS)
3. Sidebar + CommandPalette
4. SquadsPage (consolidacao, filtros, cards, detalhe, exportacao)
5. App.tsx (rota)

## Preservacao

- Nenhuma alteracao em dados de recursos, contratos ou clientes
- Modulo e somente leitura (nao altera dados)
- Todas as regras de role, moduleAccess e mascaramento permanecem
- Equipes existentes no localStorage dos usuarios serao diferentes das novas seeds; usuarios devem "Restaurar Demo" para ver as novas equipes

## Nota importante sobre seeds

Como os usuarios podem ter dados no localStorage das equipes anteriores (Engenharia, Produto, QA...), o modulo Squads fara match de cargos por `teamId` do cargo, nao pelo nome da equipe. Assim funciona com qualquer configuracao de equipes. A ordem fixa da taxonomia sera aplicada apenas aos dados seed; em runtime, a ordem segue o `sortOrder` das equipes cadastradas.
