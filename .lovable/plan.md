
# Fase 3: Migração do DataContext e SimulationContext para o Banco de Dados

## Objetivo

Substituir o armazenamento em localStorage (DataContext) e SimulationContext por persistência real no banco de dados do Lovable Cloud. Os dados de clientes, contratos, recursos, histórico, snapshots, configurações, overhead, anexos de documentos, cargos, equipes e simulações passarão a ser armazenados de forma centralizada e multi-usuário.

---

## Escopo da migração

### Entidades a migrar (DataContext)

| Entidade | Tabela no banco | Observações |
|----------|----------------|-------------|
| clients | `clients` | snake_case → camelCase via mapper |
| contracts | `contracts` | snake_case → camelCase via mapper |
| resources | `resources` | snake_case → camelCase |
| overhead_items | `overhead_items` | snake_case → camelCase |
| history_events | `history_events` | snake_case → camelCase |
| snapshots | `snapshots` | snake_case → camelCase |
| settings | `settings` | único registro global (c-level) |
| attachments | `document_attachments` | arquivo binário → Supabase Storage |
| attachment_configs | `attachment_description_configs` | snake_case → camelCase |
| job_titles | `job_titles` | snake_case → camelCase |
| teams | `teams` | snake_case → camelCase |

### Simulações (SimulationContext)

| Entidade | Tabelas no banco |
|----------|----------------|
| ContractSimulation | `simulations` + `simulation_hr_items` + `simulation_other_costs` |

### Alertas

Os alertas são gerados dinamicamente pelo `alertGenerator.ts` a partir dos dados carregados — **não são persistidos no banco**. A tabela `alerts` existente não será usada nessa fase. O comportamento atual é mantido.

---

## Abordagem técnica

### Camada de mapeamento (DTO)

O banco usa snake_case e o front-end usa camelCase. Cada entidade terá funções:
- `fromDbRow()` — converte registro do banco para tipo TypeScript
- `toDbInsert()` — converte tipo TypeScript para objeto de inserção no banco

Essas funções serão criadas num novo arquivo `src/lib/dbMappers.ts`.

### Carregamento de dados

O DataProvider usará `useEffect` (disparado após autenticação) para buscar todos os dados do banco via `supabase.from(...)`. Estados React continuam sendo a fonte de dados local para performance — a UI não muda.

### Operações CRUD

Cada operação (add/update/delete) irá:
1. Executar a mutation no banco (`supabase.from(...).insert/update/delete`)
2. Atualizar o estado React localmente para resposta imediata (sem esperar reload)
3. Em caso de erro, reverter o estado e exibir toast de erro

### Settings

A tabela `settings` tem um único registro. O sistema tentará buscar via `SELECT ... LIMIT 1`. Se não existir, usará os defaults. A `updateSettings` fará `UPDATE` (o registro é criado na migração SQL da Fase 1).

### Arquivos (Anexos)

Mudança importante: em vez de salvar em IndexedDB, os arquivos passarão a ser enviados para o bucket `contract-documents` do Supabase Storage.
- **Upload**: `supabase.storage.from('contract-documents').upload(storageKey, file)`
- **Download/Visualização**: `supabase.storage.from('contract-documents').createSignedUrl(storageKey, 3600)`
- O `AttachmentUploadDialog` e o `PDFViewerDialog` serão adaptados.
- Arquivos antigos em IndexedDB (dados mock) serão tratados como incompatíveis e mostrarão mensagem.

### Simulações

`SimulationContext` terá a mesma abordagem: carrega todas as simulações do banco na montagem, mantém estado local, e cada operação CRUD persiste no banco. A complexidade aqui é que uma simulação tem 3 tabelas relacionadas (`simulations`, `simulation_hr_items`, `simulation_other_costs`), então:
- **create/update**: upsert na tabela principal + delete/re-insert dos itens relacionados
- **delete**: deleta a simulação (CASCADE no banco apaga os filhos)
- **duplicate**: cria nova entrada completa

### resetToDemo

A função `resetToDemo` será adaptada para limpar os dados do banco e inserir os dados mock.

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/dbMappers.ts` | Criar | Funções fromDbRow/toDbInsert para todas as entidades |
| `src/contexts/DataContext.tsx` | Reescrever | Supabase em vez de localStorage |
| `src/contexts/SimulationContext.tsx` | Reescrever | Supabase em vez de localStorage |
| `src/components/contracts/AttachmentUploadDialog.tsx` | Modificar | Upload para Supabase Storage |
| `src/components/contracts/PDFViewerDialog.tsx` | Modificar | Signed URL do Supabase Storage |
| `src/pages/SettingsPage.tsx` | Verificar | Compatível, sem alteração esperada |

---

## Detalhes técnicos dos mappers (snake_case ↔ camelCase)

Exemplos de campos que precisam de conversão:

**Client**:
- `razao_social` ↔ `razaoSocial`
- `nome_fantasia` ↔ `nomeFantasia`
- `contato_principal` ↔ `contatoPrincipal`
- `inscricao_estadual` ↔ `inscricaoEstadual`
- `created_at` ↔ `createdAt`, `updated_at` ↔ `updatedAt`

**Contract**:
- `client_id` ↔ `clientId`
- `data_inicio` ↔ `dataInicio`, `data_fim` ↔ `dataFim`
- `renovacao_automatica` ↔ `renovacaoAutomatica`
- `status_renovacao` ↔ `statusRenovacao`
- `modelo_receita` ↔ `modeloReceita`
- `valor_mensal_referencia` ↔ `valorMensalReferencia`
- `responsavel_interno` ↔ `responsavelInterno`
- `ultima_atualizacao_recursos` ↔ `ultimaAtualizacaoRecursos`
- E outros ~20 campos

**Simulation** (mais complexo, 3 tabelas):
- `client_name` ↔ `clientName`
- `contract_type` ↔ `contractType`
- `complexity_level` ↔ `complexityLevel`
- `suggested_overhead` / `custom_overhead` ↔ `suggestedOverhead` / `customOverhead` (JSONB)
- `using_suggested` ↔ `usingSuggested`
- HR items e other costs: tabelas filhas com `is_suggested` ↔ `isSuggested`, `hiring_type` ↔ `hiringType`, etc.

---

## Tratamento de carregamento (loading state)

O DataContext expõe `loading: boolean`. Enquanto os dados não chegam do banco:
- O `MainLayout` já trata `loading` do AuthContext
- O DataContext terá seu próprio `loading` para mostrar esqueletos nas páginas

---

## Compatibilidade com dados locais existentes

Dados no localStorage do usuário NÃO serão migrados automaticamente. A migração é de base de código — a partir da Fase 3, todos os dados novos vão para o banco. Os dados demo antigos no localStorage ficam "esquecidos".

---

## Impacto no restante do sistema

- `useAlerts.ts` — sem alteração (lê do DataContext, que mantem mesma interface)
- `alertGenerator.ts` — sem alteração (lógica pura)
- `useModuleAccess.ts` — sem alteração
- `calculations.ts`, `simulationEngine.ts` — sem alteração (lógica pura)
- `importExport.ts` — compatível, usa a mesma interface do DataContext
- Todas as páginas e formulários — sem alteração (mesma interface de contexto)

---

## Ordem de implementação

1. Criar `src/lib/dbMappers.ts` (todos os mappers)
2. Reescrever `DataContext.tsx` (carrega do banco, CRUD persiste no banco)
3. Reescrever `SimulationContext.tsx` (idem, com 3 tabelas)
4. Adaptar `AttachmentUploadDialog.tsx` (Supabase Storage)
5. Adaptar `PDFViewerDialog.tsx` (Signed URLs)

---

## Resultado esperado

- Todos os dados de clientes, contratos, recursos, simulações e configurações persistidos de forma centralizada no banco
- Múltiplos usuários veem os mesmos dados em tempo real (sem precisar de Realtime — refetch acontece no carregamento)
- Arquivos de documentos armazenados em storage seguro com URLs assinadas temporárias
- Mesma interface do usuário, sem mudanças visuais
- A função "Restaurar Demo" limpa e repopula o banco com dados mock
