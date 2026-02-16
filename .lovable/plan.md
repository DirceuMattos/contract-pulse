

# Bloco 8 -- Polimento Final: UX, Consistencia, Acessibilidade, Performance e Qualidade

Este bloco nao adiciona novos modulos; foca exclusivamente em elevar a qualidade e o acabamento do prototipo existente. Dado o volume de alteracoes, o trabalho sera dividido em **7 sub-tarefas** sequenciais.

---

## Sub-tarefa 1: Componente PageHeader reutilizavel + padronizacao em todas as telas

### O que muda
Criar um componente `src/components/layout/PageHeader.tsx` que encapsula:
- Titulo (h1), descricao curta, acoes a direita, breadcrumbs opcionais
- Usar `motion.div` com `itemVariants` padrao

### Telas afetadas
Substituir headers manuais em: DashboardPage, ContractsPage, ClientsPage, AlertsPage, CalculatorPage, UsersPage, AccessLogsPage, ImportExportPage, SettingsPage, ContractDetailPage, ContractFormPage, ClientDetailPage, ClientFormPage, CalculatorWizardPage, ContractResourcesPage.

Adicionar breadcrumbs em: UsersPage > AccessLogsPage (`Admin > Usuarios > Logs`), ContractDetailPage (`Contratos > [codigo]`), ClientDetailPage (`Clientes > [nome]`).

---

## Sub-tarefa 2: Padronizacao de badges, cards KPI e tabelas

### Badges e severidade
Criar mapeamentos padronizados em `src/lib/uiConstants.ts`:
- **Saude**: Saudavel (emerald + CheckCircle2), Atencao (amber + AlertCircle), Deficitario (red + AlertTriangle)
- **Severidade alertas**: Info (blue + Info), Atencao (amber + AlertCircle), Critico (red + AlertTriangle)
- **Categoria alertas**: Financeiro (red), Prazo (orange), Reajuste (blue), Governanca (purple)
- Cada badge com tooltip explicativo via shadcn Tooltip

### Cards KPI
- Padronizar altura minima (`min-h-[120px]`) e hierarquia tipografica (titulo 12-13px muted, valor 28-32px bold, rodape 11-12px)
- Aplicar em DashboardPage e AlertsPage

### Tabelas
- Alinhar colunas de moeda a direita (`text-right`)
- Menu kebab (MoreHorizontal) consistente com mesma estrutura (Ver, Editar, Separador, Excluir)
- Estado "sem resultados" padronizado com icone + texto + CTA

---

## Sub-tarefa 3: Microinteracoes, toasts e confirmacoes destrutivas

### Toasts padronizados
Unificar em Sonner (`toast.success`, `toast.error`), eliminando usos mistos de `useToast` e `sonner`. Mensagens padrao:
- `toast.success('Criado com sucesso')`
- `toast.success('Alteracoes salvas')`
- `toast.success('Excluido com sucesso')`
- `toast.error('Erro de validacao: [campo]')`
- `toast.error('Falha no armazenamento local')`

### Confirmacoes destrutivas
Criar componente `src/components/ui/confirm-delete-dialog.tsx` reutilizavel com:
- Titulo, descricao, botao "Excluir" em destructive, botao "Cancelar"
- Substituir todos os AlertDialogs de exclusao existentes

### Validacao inline
- Garantir que todos os formularios (ContractForm, ClientForm, ResourceForm, OverheadForm, HistoryEventForm) usem zod + react-hook-form com `FormMessage` abaixo de cada campo
- Adicionar mascaras de CNPJ, telefone e moeda BR nos inputs relevantes

---

## Sub-tarefa 4: Empty states e loading states

### Empty states especificos
Criar componente `src/components/ui/empty-state.tsx` com icone, titulo, descricao e CTA opcional. Aplicar em:
- Contratos: "Nenhum contrato cadastrado" + CTA "Novo Contrato"
- Recursos: "Nenhum recurso alocado" + CTA "Adicionar Recurso"
- Historico: "Nenhum evento registrado" + CTA "Adicionar Evento"
- Documentos: "Nenhum documento anexado" + CTA "Anexar Documento"
- Calculadora: "Nenhuma simulacao" + CTA "Nova Simulacao" (ja existe)
- Dashboard sem alertas (ja existe)

### Skeletons
Criar componente `src/components/ui/page-skeleton.tsx` com variantes:
- `cards` (grid de 4 cards skeleton)
- `table` (header + 5 linhas skeleton)
- `detail` (header + tabs skeleton)

Aplicar skeleton ao trocar filtros no Dashboard (breve delay antes de recomputar KPIs) e na abertura do detalhe de contrato.

---

## Sub-tarefa 5: Acessibilidade (A11y) e teclado

### Foco e navegacao
- Garantir que todos os Dialog/Sheet tenham `autoFocus` no primeiro campo interativo
- Todos os botoes de icone recebem `aria-label` descritivo
- Badges com `title` ou tooltip para explicar a regra

### Contraste
- Revisar badges de saude em dark mode para garantir contraste minimo
- Manter Inter como font-family, tamanhos: titulos 20-24px, texto 14-16px, metadados 12-13px

---

## Sub-tarefa 6: Command Palette e atalhos de teclado

### Command Palette (`src/components/layout/CommandPalette.tsx`)
Usar `cmdk` (ja instalado) para criar palette global:
- Abrir com `Ctrl/Cmd+K`
- Secoes: Navegar (Dashboard, Contratos, Clientes, Calculadora, Usuarios, Alertas, Configuracoes, Importar/Exportar), Acoes rapidas (Novo contrato, Novo cliente, Nova simulacao), Utilidades (Resetar dados demo, Alternar tema)

### Atalhos globais
Registrar via `useEffect` no `MainLayout.tsx`:
- `/`: focar busca no header
- `g d`: Dashboard, `g c`: Contratos, `g r`: Clientes, `g k`: Calculadora
- `Esc`: fechar modal/drawer (ja nativo do Radix)

### Atalhos contextuais
- `n`: novo contrato (em ContractsPage), novo cliente (em ClientsPage)
- `a`: anexar documento (em aba Documentos)

### Hint de atalhos
Exibir um pequeno rodape no command palette mostrando os atalhos disponiveis.

---

## Sub-tarefa 7: Performance, robustez de storage e modo debug

### Memoizacao
- Envolver calculos de KPIs no Dashboard com `useMemo` (ja existente, validar dependencias)
- Envolver `useAlerts` com memoizacao para evitar recomputacao desnecessaria

### Limites de storage
- Logs: limitar a 500 sessoes no `AccessLogContext` (descartar mais antigos)
- Rotas por sessao: limitar a 50 no `AccessLogContext`

### Reset demo aprimorado
- Garantir que `resetToDemo` limpa: localStorage do app, IndexedDB (anexos), logs de acesso
- Usar `ConfirmDeleteDialog` com mensagem "Isso restaurara todos os dados de demonstracao"

### Exportar/Importar dados JSON (Admin)
- Na pagina ImportExportPage, adicionar secao "Backup completo":
  - "Exportar JSON" -- gera download com contratos, clientes, recursos, historico, simulacoes, configuracoes (sem anexos binarios)
  - "Importar JSON" -- botao com label "Em breve" (disabled)

### Modo debug (toggle em Configuracoes, visivel apenas para C-Level)
- Adicionar campo `debugMode` no localStorage
- Quando ativo, exibir chips diagnosticos no Dashboard: total contratos filtrados, total alertas, custo base e overhead

---

## Resumo de arquivos novos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/PageHeader.tsx` | Header de pagina reutilizavel |
| `src/components/layout/CommandPalette.tsx` | Command palette global (cmdk) |
| `src/components/ui/confirm-delete-dialog.tsx` | Dialog de confirmacao destrutiva |
| `src/components/ui/empty-state.tsx` | Componente de estado vazio |
| `src/components/ui/page-skeleton.tsx` | Skeletons de carregamento |
| `src/lib/uiConstants.ts` | Mapeamentos de cores, labels e icones |

## Arquivos modificados (principais)

| Arquivo | Alteracao |
|---------|-----------|
| Todas as pages (15+) | Usar PageHeader, empty-state, confirm-delete-dialog |
| `src/components/layout/MainLayout.tsx` | Registrar atalhos globais, incluir CommandPalette |
| `src/components/layout/Header.tsx` | Integrar ref para foco via atalho `/` |
| `src/contexts/AccessLogContext.tsx` | Limites de 500 sessoes e 50 rotas |
| `src/contexts/DataContext.tsx` | resetToDemo limpar logs e IndexedDB |
| `src/pages/ImportExportPage.tsx` | Secao backup JSON |
| `src/pages/SettingsPage.tsx` | Toggle modo debug |
| `src/index.css` | Ajustes de contraste em dark mode |

