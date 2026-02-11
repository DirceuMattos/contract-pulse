

# Plano: Contratos V2 -- Historico + Aba Timeline + Eventos Editaveis

## Resumo
Adicionar uma aba "Historico" no detalhe do contrato com timeline vertical de eventos editaveis (aditivos, reajustes, notificacoes, multas, marcos). Inclui CRUD manual, filtros por tipo, busca textual e integracao leve com alertas de governanca.

---

## 1. Novo Tipo HistoryEvent

### Arquivo: `src/types/index.ts`

Adicionar:

```typescript
export type HistoryEventType =
  | 'assinatura'
  | 'inicio-vigencia'
  | 'aditivo'
  | 'reajuste-aplicado'
  | 'notificacao-recebida'
  | 'notificacao-enviada'
  | 'multa-penalidade'
  | 'marco-operacional'
  | 'reuniao-ata'
  | 'ocorrencia'
  | 'renegociacao'
  | 'renovacao'
  | 'encerramento'
  | 'outro';

export type HistoryImpactArea =
  | 'financeiro'
  | 'prazo'
  | 'reajuste'
  | 'juridico'
  | 'operacional'
  | 'governanca';

export interface HistoryEvent {
  id: string;
  contractId: string;
  eventDate: string;
  eventType: HistoryEventType;
  title: string;
  description: string;
  impactArea: HistoryImpactArea;
  severity: AlertSeverity; // 'info' | 'atencao' | 'critico'
  relatedValue?: number;
  relatedClause?: string;
  createdAt: string;
  createdByUserId?: string;
  updatedAt?: string;
}
```

---

## 2. DataContext -- HistoryEvent CRUD

### Arquivo: `src/contexts/DataContext.tsx`

- Adicionar estado `historyEvents: HistoryEvent[]` com persistencia localStorage (chave `bnp_history_events`)
- Expor funcoes: `addHistoryEvent`, `updateHistoryEvent`, `deleteHistoryEvent`, `getHistoryEventsByContract`
- Incluir no `resetToDemo`
- Deletar eventos ao deletar contrato (cascade)

---

## 3. Formulario de Evento

### Novo arquivo: `src/components/forms/HistoryEventForm.tsx`

Dialog/modal com campos:
- Data do evento (date picker, obrigatorio)
- Tipo do evento (select com 14 opcoes, obrigatorio)
- Titulo (input, obrigatorio, max 120 chars)
- Descricao (textarea, obrigatoria)
- Area de impacto (select: Financeiro/Prazo/Reajuste/Juridico/Operacional/Governanca, obrigatorio)
- Severidade (select: Info/Atencao/Critico, default Info)
- Valor relacionado (input numerico, opcional, com formatacao moeda)
- Clausula relacionada (input texto, opcional)

Validacoes:
- Titulo, descricao, tipo, data e impacto obrigatorios
- Toast ao salvar/editar
- Confirmacao ao excluir (AlertDialog)

---

## 4. Aba "Historico" no Detalhe do Contrato

### Arquivo: `src/pages/ContractDetailPage.tsx`

Adicionar nova aba "Historico" apos "Vigencia":

```
<TabsTrigger value="historico">Historico</TabsTrigger>
```

### Novo arquivo: `src/components/contracts/ContractHistoryTab.tsx`

Layout:
- **Topo**: Titulo "Historico do contrato" + subtexto explicativo
- **Acoes**: Botao "Adicionar evento" (visivel apenas se `canEdit`) + Botao "Exportar historico (Em breve)" desabilitado
- **Filtros**: Chips de tipo (Aditivo, Reajuste, Notificacao, Multa, Marco, Ocorrencia) + campo de busca textual
- **Toggle de ordenacao**: Mais recente primeiro (default) / Mais antigo primeiro

**Timeline vertical** (estilo feed):
- Linha vertical conectando eventos
- Cada item mostra:
  - Icone de severidade (colorido) na timeline
  - Data do evento (formatada pt-BR)
  - Badge do tipo
  - Titulo
  - Descricao (expansivel via Collapsible se longa)
  - Chip de area de impacto
  - Valor relacionado (se existir e `canViewValues`)
  - Clausula (se existir)
  - Botoes Editar/Excluir (se `canEdit`)

**Empty state**:
- Icone de timeline
- "Nenhum evento registrado"
- "Registre acontecimentos relevantes do contrato: aditivos, reajustes, notificacoes, marcos."
- Botao "Adicionar primeiro evento" (se `canEdit`)

**Secao "Eventos sugeridos (Em breve)"**:
- Card discreto no final da aba, desabilitado
- Tooltip: "Na etapa com backend, o sistema podera sugerir eventos a partir de reajustes, vencimentos, documentos e integracoes."

---

## 5. Integracao com Alertas (leve)

### Arquivo: `src/lib/alertGenerator.ts`

Adicionar duas regras opcionais que recebem `historyEvents`:

1. **Ocorrencia critica recente**: se existe `HistoryEvent` com `severity === 'critico'` nos ultimos 90 dias -> alerta de governanca "Ocorrencia critica recente"
2. **Risco contratual recente**: se existe evento do tipo `'notificacao-recebida'` ou `'multa-penalidade'` nos ultimos 90 dias -> alerta "Risco contratual recente"

Esses alertas aparecerao na tabela "Contratos com alertas" do Dashboard.

Atualizar `useAlerts.ts` para passar `historyEvents` ao generator.

---

## 6. Dados Mock

### Arquivo: `src/data/mockData.ts`

Adicionar array `mockHistoryEvents` com eventos para 6+ contratos:

- `ctr-001`: Assinatura, Inicio vigencia, Reajuste aplicado, Marco operacional (go-live)
- `ctr-003`: Aditivo (escopo), Notificacao recebida, Marco operacional
- `ctr-004`: Assinatura, Aditivo (valor), Reuniao/Ata, Multa/Penalidade (critico recente)
- `ctr-005`: Inicio vigencia, Reajuste aplicado, Renovacao
- `ctr-006`: Assinatura, Ocorrencia critica (incidente recente), Marco operacional
- `ctr-008`: Notificacao enviada, Renegociacao, Marco operacional

Garantir:
- 2 contratos com aditivo
- 2 com reajuste aplicado
- 2 com notificacao
- 1 com multa/penalidade
- 2 com marco operacional
- 2 com evento Critico recente (para testar alertas de governanca)

---

## 7. Propagacao

- `DashboardPage.tsx`: passar `historyEvents` para calculo de alertas (via DataContext)
- `AlertsPage.tsx` / `NotificationCenter.tsx`: suportar novos tipos de alerta de governanca do historico

---

## Arquivos Alterados/Criados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | Novos tipos HistoryEvent, HistoryEventType, HistoryImpactArea |
| `src/contexts/DataContext.tsx` | CRUD historyEvents + estado + persistencia + cascade |
| `src/components/forms/HistoryEventForm.tsx` | Novo formulario de evento |
| `src/components/contracts/ContractHistoryTab.tsx` | Nova aba timeline |
| `src/pages/ContractDetailPage.tsx` | Adicionar aba "Historico" |
| `src/lib/alertGenerator.ts` | 2 regras de governanca baseadas em historico |
| `src/hooks/useAlerts.ts` | Passar historyEvents |
| `src/data/mockData.ts` | Mock de eventos historicos |
| `src/pages/DashboardPage.tsx` | Passar historyEvents para alertas |

---

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. Mock data (`mockData.ts`)
3. DataContext (CRUD historyEvents)
4. HistoryEventForm (componente de formulario)
5. ContractHistoryTab (componente da timeline)
6. ContractDetailPage (nova aba)
7. alertGenerator + useAlerts (regras de governanca)
8. Propagacao (Dashboard, AlertsPage)

