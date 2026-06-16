# Módulo de Relatórios Mensais — BNPHub

Sistema completo de elaboração colaborativa de relatórios mensais por contrato, com coleta contínua de dados (Asana + Fireflies) e geração de PPTX no template BNP.

## 1. Banco de Dados (migração)

Criar tabelas no schema `public` com GRANTs + RLS:

- **`monthly_reports`** — id, contract_id (FK contracts), month, year, status (`draft|review|approved|published`), asana_project_id, client_email_domain, created_by, reviewed_by, published_at, timestamps. Unique (contract_id, month, year).
- **`report_sections`** — id, report_id (FK monthly_reports, cascade), section_key, content (jsonb), source (`manual|asana|fireflies|bnphub`), synced_at, timestamps. Unique (report_id, section_key).
- **`report_template_configs`** — id, contract_id (FK unique), 12 booleans `show_*` (default true), asana_project_id, client_email_domain, fireflies_keywords (text[]), timestamps.
- **`report_collaborators`** — id, report_id (FK cascade), user_id (FK auth.users), role (`owner|editor|reviewer`), added_at. Unique (report_id, user_id).
- **`report_sync_logs`** — id, report_id, source (`asana|fireflies`), status, message, payload (jsonb), created_at.

RLS: SELECT para todos authenticated; INSERT/UPDATE para roles `c-level, superadmin, intermediario, lider_tribo, administrativo` (via `has_any_role`); DELETE apenas `c-level, superadmin`. Trigger `update_updated_at_column` em todas.

## 2. Tipos e Mappers

- `src/types/index.ts` — adicionar `ReportStatus`, `ReportSectionKey`, `MonthlyReport`, `ReportSection`, `ReportTemplateConfig`, `ReportCollaborator` (conforme especificação).
- `src/lib/dbMappers.ts` — adicionar `monthlyReportFromDb`, `monthlyReportToDb`, `reportSectionFromDb`, `reportSectionToDb`, `reportTemplateConfigFromDb`, `reportTemplateConfigToDb`, `reportCollaboratorFromDb`.

## 3. Rota e Navegação

- `AppRoutes.tsx` — adicionar `/relatorios` → `ReportsPage`, `/relatorios/:reportId` → `ReportEditPage`, `/relatorios/config/:contractId` → `ReportTemplateConfigPage`. Proteger por `moduleAccess` para os 5 roles.
- Sidebar (`AppSidebar`/equivalente no grupo "Adm Clientes e Contratos") — item "Relatórios Mensais" com ícone `FileBarChart2`, visível para `c-level, superadmin, intermediario, lider_tribo, administrativo`.

## 4. Páginas

### `src/pages/ReportsPage.tsx`
- Filtros: Contrato, Ano, Status.
- Grid de cards: nome do contrato + `<ClientLogo />`, Mês/Ano, badge de status (cores: cinza/amarelo/verde/azul), barra de progresso (% de seções com `content != {}`), avatares de colaboradores, ações (Abrir, Duplicar, Excluir — Excluir apenas c-level/superadmin).
- Botão "+ Novo Relatório" → `ReportCreateDialog`.

### `src/components/reports/ReportCreateDialog.tsx`
- Select Contrato, Mês (1-12), Ano. Ao escolher contrato → busca `report_template_configs`; se ausente, usa defaults. Cria `monthly_reports` + `report_sections` vazias para cada seção ativa. Dispara `report-sync-asana` e `report-sync-fireflies` em background.

### `src/pages/ReportEditPage.tsx`
- **Header**: nome do contrato + logo, Mês/Ano, badge de status, botões "Sincronizar Dados", "Gerar PPTX", "Alterar Status", avatares de colaboradores + dialog para adicionar (usuários com role `intermediario` ou `lider_tribo`).
- **Coluna esquerda**: lista vertical de seções com ícone (⬜/🟡/✅) e badge Auto/Manual.
- **Coluna direita**: editor da seção selecionada. Seções com `source != 'manual'` exibem banner azul + botão "Re-sincronizar" (com confirm).
- **Auto-sync**: ao abrir, se `status='draft'` e `synced_at < now() - 24h`, dispara sync em background com toast discreto.

### Editores de seção (`src/components/reports/sections/*.tsx`)
Um componente por chave: `CapaEditor`, `SumarioEditor`, `ObjetivoEditor`, `HistoricoTrEditor`, `PainelExecutivoEditor`, `EvolucaoInovacaoEditor`, `EntregasEditor`, `PriorizadasEditor`, `DemonstrativoHorasEditor`, `EficienciaOperacionalEditor`, `EficienciaPrevisibilidadeEditor`, `DesempenhoAplicacaoEditor`, `EngajamentoUsuarioEditor`, `MaturidadePlataformaEditor`, `TreinamentosReunioesEditor`, `OportunidadesAtencaoEditor`. Cada um lê/escreve `content` (jsonb) via debounced save.

### `src/pages/ReportTemplateConfigPage.tsx`
- Acesso apenas c-level/superadmin (redirect caso contrário).
- 12 checkboxes de seções, campos Asana Project ID, domínio de e-mail, palavras-chave Fireflies (chip input).
- Botão de acesso no header da `ReportEditPage` e na listagem de contratos.

## 5. Hooks de Sync

- `src/hooks/useReportAsanaSync.ts` — invoca edge function `report-sync-asana` com `{reportId, asanaProjectId, month, year}`. Atualiza seções `entregas`, `priorizadas`, `evolucao_inovacao`, `eficiencia_previsibilidade` com `source='asana'` e `synced_at=now()`.
- `src/hooks/useReportFirefliesSync.ts` — invoca `report-sync-fireflies` com `{reportId, clientEmailDomain, firefliesKeywords, month, year}`. Atualiza seção `treinamentos_reunioes`.

## 6. Edge Functions

### `supabase/functions/report-sync-asana/index.ts`
- Usa connector gateway Asana (`ASANA_API_KEY`). Busca tarefas do projeto via `/tasks?project=...&opt_fields=name,completed,completed_at,memberships.section.name,tags.name,assignee.name,permalink_url`.
- Filtra concluídas no mês (por `completed_at`), em andamento/planejado (por seção).
- Agrega contagens por TAG-Produto (`Novas Funcionalidades`, `Evolução`, `Integrações`, `Outros`); calcula percentual de inovação; estima frequência de deploy.
- Upsert nas seções; log em `report_sync_logs`.

### `supabase/functions/report-sync-fireflies/index.ts`
- Connector gateway Fireflies (GraphQL `/graphql`, `FIREFLIES_API_KEY`). Query `transcripts(fromDate, toDate)` com `title`, `date`, `duration`, `participants`, `summary.short_summary`.
- Filtra por participante com `@{clientEmailDomain}` OU título contendo qualquer keyword.
- Upsert seção `treinamentos_reunioes`; log em `report_sync_logs`.

### `supabase/functions/report-generate-pptx/index.ts`
- Recebe `reportId`; carrega report + sections + contract + client (incluindo `logo_url` via signed URL do bucket `client-logos`).
- Usa `pptxgenjs` (npm) para gerar slides no template BNP: fundo branco, header `#1A4F8A`, logo BNP à direita, logo cliente na capa, badges (verde `#22C55E`/amarelo `#EAB308`/laranja `#F97316`/vermelho `#EF4444`), tabelas com header `#2D7FC1`, slide final em azul claro.
- Retorna binário `.pptx` (`application/vnd.openxmlformats-officedocument.presentationml.presentation`) para download direto.

Conectores necessários: Asana e Fireflies (verificar/linkar via `standard_connectors--connect` antes do deploy).

## 7. Detalhes técnicos

- `content` jsonb por seção com schema próprio do editor (definido em `src/lib/reportSectionSchemas.ts` para tipagem leve).
- Progresso = nº seções com `content != {}` / nº seções ativas na config.
- Status do item no menu lateral: vazio se `content == {}`, completo se atende campos mínimos do schema, parcial caso contrário.
- Reutilizar `<ClientLogo />`, `handleFormValidationError`, `HRAvatar`, tokens existentes — nenhuma alteração de lógica fora do escopo descrito.

## 8. Ordem de execução

1. Migração DB (aguarda aprovação) → tipos regenerados.
2. Tipos + mappers + rota + sidebar.
3. `ReportsPage` + `ReportCreateDialog`.
4. `ReportEditPage` + editores de seção (manuais primeiro, automáticos depois).
5. `ReportTemplateConfigPage`.
6. Edge functions (sync Asana, sync Fireflies, generate PPTX).
7. Hooks de sync + auto-sync 24h.
8. QA visual do PPTX gerado.
