

# Fase 1: Criacao do Schema do Banco de Dados

## Resumo

Executar uma migracao SQL unica no Lovable Cloud para criar toda a estrutura do banco de dados: enums, tabelas, funcoes auxiliares, RLS, triggers, bucket de storage e seed de dados. Nenhum arquivo do front-end sera alterado.

## Migracao SQL -- conteudo

### 1. Enums (~20 tipos)

Mapeamento direto dos tipos TypeScript existentes:

- `app_role`: c-level, intermediario, leitor
- `contract_type`: sistema, infraestrutura, hibrido
- `contract_segment`: govtech, privado
- `contract_status`: implantacao, operacao, suspenso, encerrado
- `gov_sphere`: municipal, estadual, federal
- `renewal_status`: negociacao, renovado, sem-tratativa
- `revenue_model`: mrr, media-mensal
- `health_status`: saudavel, atencao, critico
- `resource_type`: clt, pj, outro
- `other_cost_category`: cloud, licenca, equipamento, terceiros, outros, consultoria
- `seniority`: junior, pleno, senior, especialista
- `overhead_mode`: percentual, fixo
- `overhead_category`: infraestrutura, administrativo, governanca
- `history_event_type`: 14 valores (assinatura, aditivo, reajuste-aplicado, etc.)
- `history_impact_area`: financeiro, prazo, reajuste, juridico, operacional, governanca
- `alert_severity`: atencao, critico, info
- `simulation_contract_type`: gov, private
- `simulation_complexity`: baixa, media, alta
- `simulation_pricing_model`: mensal, total
- `simulation_status`: draft, archived
- `module_key`: DASHBOARD, CLIENTS, CONTRACTS, CONTRACT_DETAIL, RESOURCES, HISTORY, DOCUMENTS, ALERTS, SQUADS, CALCULATOR, USERS_ADMIN, ACCESS_LOGS, SETTINGS, IMPORT_EXPORT

### 2. Tabelas (19 tabelas)

Todas com `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` e timestamps `created_at`/`updated_at` onde aplicavel.

| Tabela | Campos principais | FK |
|--------|-------------------|-----|
| profiles | id (= auth.users.id), name, email, avatar_url | auth.users(id) CASCADE |
| user_roles | user_id, role (app_role) | profiles(id) CASCADE |
| user_module_permissions | user_id, module_key, is_allowed | profiles(id) CASCADE |
| clients | razao_social, nome_fantasia, cnpj, segmento, tags text[], etc. | -- |
| contracts | ~30 campos mapeados do TypeScript, client_id | clients(id) |
| resources | contract_id, tipo, nome, custo_base, etc. | contracts(id) CASCADE |
| overhead_items | contract_id, categoria, modo, percentual, valor_fixo | contracts(id) CASCADE |
| history_events | contract_id, event_type, title, severity, etc. | contracts(id) CASCADE |
| document_attachments | contract_id, file_name, storage_key, etc. | contracts(id) CASCADE |
| snapshots | contract_id, receita, custo, margem, health | contracts(id) CASCADE |
| settings | 1 linha, todos os parametros globais | -- |
| teams | name, description, is_active, sort_order | -- |
| job_titles | label, is_active, team_id | teams(id) |
| alerts | contract_id, type, severity, title, description | contracts(id) CASCADE |
| attachment_description_configs | label, is_active, sort_order | -- |
| access_log_sessions | user_id, ip, user_agent, modules/routes arrays | profiles(id) |
| simulations | ~20 campos + JSONB (questionnaire, overhead) | -- |
| simulation_hr_items | simulation_id, role, hiring_type, quantity, etc. | simulations(id) CASCADE |
| simulation_other_costs | simulation_id, category, description, value | simulations(id) CASCADE |

### 3. Funcoes auxiliares

- `has_role(uuid, app_role)`: SECURITY DEFINER, verifica se usuario tem determinado papel
- `has_any_role(uuid, app_role[])`: SECURITY DEFINER, verifica se usuario tem qualquer um dos papeis listados
- `update_updated_at_column()`: trigger function para manter timestamps

### 4. RLS (Row Level Security)

Habilitado em todas as 19 tabelas. Politicas:

- **Tabelas operacionais** (clients, contracts, resources, overhead, history, documents, snapshots, teams, job_titles, alerts, attachment_configs, simulations, simulation_hr, simulation_other_costs):
  - SELECT: qualquer usuario autenticado
  - INSERT/UPDATE: c-level ou intermediario
  - DELETE: apenas c-level

- **Tabelas administrativas** (user_roles, user_module_permissions, settings, access_log_sessions):
  - SELECT/INSERT/UPDATE/DELETE: apenas c-level

- **profiles**:
  - SELECT: qualquer autenticado
  - UPDATE: proprio usuario OU c-level
  - INSERT: via trigger (automatico)

### 5. Triggers

- `on_auth_user_created`: ao criar usuario no Auth, cria perfil em profiles e atribui role leitor em user_roles
- `update_updated_at`: aplicado em todas as tabelas com coluna updated_at

### 6. Storage

- Bucket privado `contract-documents`
- Politicas:
  - SELECT (download): qualquer autenticado
  - INSERT (upload): c-level ou intermediario
  - DELETE: c-level ou intermediario

### 7. Seed de dados

- 1 linha em `settings` com valores default (encargos CLT 68%, impostos PJ 15%, impostos faturamento 16.33%, dolar 5.15, limiares de saude, dias de alerta)
- 8 linhas em `attachment_description_configs` (contrato, aditivo, reajuste, notificacao, multa-penalidade, ata-reuniao, proposta-comercial, outro)

## Resultado esperado

Apos a execucao:
- Banco de dados pronto com todas as tabelas e relacoes
- Seguranca RLS ativa em todas as tabelas
- Trigger de auto-criacao de perfil funcional
- Bucket de storage criado e protegido
- Dados iniciais de settings e configs inseridos
- Front-end inalterado -- continua funcionando com dados locais

## Proxima fase

Fase 2: Autenticacao real (login/signup com Supabase Auth) + Edge Function para gestao de usuarios pelo C-Level.

