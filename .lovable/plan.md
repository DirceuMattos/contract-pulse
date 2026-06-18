## Objetivo

Substituir `src/pages/ReportsPage.tsx` por uma versão que agrupa relatórios por contrato em cards expansíveis, mostrando status visual das integrações (Asana/Fireflies/Milvus).

## Mudanças

### 1. Nova query: `report_template_configs`
Adicionar `useQuery` paralela para buscar todos os configs:
```ts
supabase.from('report_template_configs').select('contract_id, asana_project_id, client_email_domain, milvus_client_names')
```
Mapear para `Map<contractId, { asana: bool, fireflies: bool, milvus: bool }>`.

### 2. Agrupamento
`useMemo` que agrupa `filtered` por `contractId` → `Array<{ contract, client, reports, integrations }>`, ordenado pelo nome do contrato.

### 3. Estado de expansão
`const [expanded, setExpanded] = useState<Set<string>>(new Set())` — toggle por contrato. Por padrão todos colapsados (ou expande o primeiro se houver poucos — decidir: começar **todos colapsados**).

### 4. Layout do header do contrato (card clicável)
```
[logo] [Nome contrato]              [● ● ●] [badge N] [⚙️] [chevron]
       [Nome cliente]                 A F M
```
- 3 dots: `bg-green-500` se configurada, `bg-muted` se não. Tooltip mostrando "Asana", "Fireflies", "Milvus".
- Badge: `<Badge variant="secondary">{reports.length}</Badge>`
- Botão ⚙️: cor depende de `configuredCount` — verde (3/3), amarelo (1-2), cinza (0). Click navega para `/relatorios/config/${contract.id}` (com `stopPropagation`).
- Chevron rota baseado em expanded.

### 5. Grid expandido
Quando expandido: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3` com cards de relatório (sem repetir logo/nome do contrato — agora mostram só mês/ano em destaque, status badge, barra progresso e menu `...`).

### 6. Menu `...` do relatório
- Abrir → `navigate(/relatorios/:id)`
- Duplicar → `handleDuplicate`
- Excluir → só se `report.status === 'draft' && canDelete` (com confirm)

### 7. Filtros
- **Remover** filtro de Contrato
- **Manter** Ano e Status
- Aplicados antes do agrupamento; contratos sem relatórios após filtro são omitidos.

### 8. Lógica preservada
- `handleDuplicate`, `handleDelete`, `canDelete`, `ReportCreateDialog`, `AlertDialog` mantidos exatamente como estão.
- Mesmo `queryKey` `['monthly_reports']` e cálculo de `filledSections/totalSections`.

## Detalhes técnicos

- Imports adicionais: `ChevronDown`, `Badge`, `Tooltip*` do shadcn.
- Cor do ⚙️ via classe condicional: `text-green-500` / `text-yellow-500` / `text-muted-foreground`.
- Animação de expansão: `motion.div` com `initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}` ou simplesmente conditional render (mais simples e performante — usar conditional).
- Nenhuma mudança em schema/DB, em outros componentes, ou em `ReportCreateDialog`.

## Arquivos

- `src/pages/ReportsPage.tsx` — reescrita completa
