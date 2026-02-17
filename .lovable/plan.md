

# Fase 1: Schema do Banco de Dados (Tabelas, Enums, RLS e Storage)

## Resumo

Criar toda a estrutura do banco de dados no Lovable Cloud: enums, tabelas, funcao auxiliar de roles, politicas RLS, trigger de auto-criacao de perfil e bucket de storage para documentos. **Nenhuma alteracao no front-end nesta fase.**

---

## O que sera criado

### 1. Enums (~15 tipos)

Tipos customizados para padronizar valores: `app_role`, `contract_type`, `contract_segment`, `contract_status`, `gov_sphere`, `renewal_status`, `revenue_model`, `health_status`, `resource_type`, `other_cost_category`, `seniority`, `overhead_mode`, `overhead_category`, `history_event_type`, `history_impact_area`, `alert_severity`, `simulation_contract_type`, `simulation_complexity`, `simulation_pricing_model`, `simulation_status`.

### 2. Tabelas (~18 tabelas)

| Tabela | Descricao |
|--------|-----------|
| `profiles` | Perfil do usuario (nome, email, avatar) -- vinculado a conta de autenticacao |
| `user_roles` | Papel do usuario (c-level, intermediario, leitor) |
| `user_module_permissions` | Permissoes granulares por modulo (14 modulos) |
| `clients` | Cadastro de clientes (razao social, CNPJ, endereco, contato) |
| `contracts` | Contratos com todos os ~30 campos (vigencia, receita, escopo, responsaveis) |
| `resources` | Recursos alocados (RH CLT/PJ e outros custos, unificados como no front) |
| `overhead_items` | Itens de overhead por contrato (infra, admin, governanca) |
| `history_events` | Eventos do historico do contrato (14 tipos) |
| `document_attachments` | Metadados de documentos anexados (arquivo no storage) |
| `snapshots` | Snapshots financeiros periodicos |
| `settings` | Parametros globais do sistema (1 linha, seed automatico) |
| `teams` | Equipes |
| `job_titles` | Cargos vinculados a equipes |
| `alerts` | Alertas gerados pelo sistema |
| `attachment_description_configs` | Configuracao de tipos de anexo |
| `access_log_sessions` | Logs de acesso ao sistema |
| `simulations` | Simulacoes da calculadora (com JSONB para questionnaire e overhead) |
| `simulation_hr_items` | Itens de RH das simulacoes (suggested + custom em colunas separadas) |
| `simulation_other_costs` | Outros custos das simulacoes |

### 3. Seguranca (RLS)

- Funcao `has_role(uuid, app_role)` como SECURITY DEFINER para evitar recursao
- RLS habilitado em **todas** as tabelas
- **C-Level**: acesso total (SELECT, INSERT, UPDATE, DELETE)
- **Intermediario**: SELECT + INSERT + UPDATE em dados operacionais; sem acesso a settings, user_roles, user_module_permissions, access_log_sessions
- **Leitor**: apenas SELECT em dados operacionais
- Tabelas administrativas restritas a C-Level

### 4. Trigger automatico

- `on_auth_user_created`: ao criar usuario na autenticacao, cria automaticamente perfil em `profiles` e atribui papel `leitor` em `user_roles`

### 5. Storage

- Bucket privado `contract-documents`
- Politicas: upload/download para usuarios autenticados; delete para c-level e intermediario

### 6. Seed de dados

- Linha default na tabela `settings` com os parametros iniciais (encargos CLT 68%, impostos PJ 16%, etc.)
- Configs default de tipos de anexo em `attachment_description_configs`

---

## Detalhes tecnicos

### Migracao SQL

Tudo sera executado em uma unica migracao SQL via ferramenta de migracao, contendo:

1. Criacao de ~20 enums mapeando exatamente os tipos TypeScript existentes
2. ~18 tabelas com chaves estrangeiras, indices e valores default
3. Funcao `has_role()` SECURITY DEFINER
4. Trigger `on_auth_user_created` para auto-criacao de perfil + role
5. Habilitacao de RLS + politicas para cada tabela
6. Criacao do bucket `contract-documents` via INSERT em `storage.buckets`
7. Politicas de storage para controle de acesso
8. Seed da tabela `settings` e `attachment_description_configs`

### Mapeamento de campos (TypeScript para PostgreSQL)

Os campos seguem a convencao do front-end com conversao para snake_case:
- `clientId` -> `client_id`
- `custoBase` -> `custo_base`
- `dataInicio` -> `data_inicio`
- Arrays como `tags` -> `text[]`
- Campos JSONB para `questionnaire`, `suggested_overhead`, `custom_overhead` nas simulacoes

### Arquivos alterados

Nenhum arquivo do front-end sera alterado. Apenas a migracao SQL sera executada no banco.

---

## Proximos passos (apos esta fase)

- **Fase 2**: Autenticacao real (Supabase Auth) + Edge Function para gestao de usuarios
- **Fase 3**: Providers Supabase para conectar o front ao banco
- **Fase 4**: Storage de documentos + simulacoes + logs
- **Fase 5**: Rewiring dos contexts existentes

