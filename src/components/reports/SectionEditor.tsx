import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PAINEL_STATUSES, PAINEL_STATUS_COLORS, type PainelStatus } from '@/lib/reportSectionSchemas';
import type { ReportSectionKey } from '@/types';

interface EditorProps {
  content: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  readOnly?: boolean;
  meta?: {
    contractName?: string;
    clientName?: string;
    contractNumber?: string;
    month?: number;
    year?: number;
  };
}

function StatusSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
      <SelectContent>
        {PAINEL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StatusBadge({ value }: { value?: string }) {
  if (!value) return null;
  const color = PAINEL_STATUS_COLORS[value as PainelStatus] ?? 'bg-gray-200 text-gray-800';
  return <Badge className={`${color} border-0`}>{value}</Badge>;
}

// ============================================
// Capa
// ============================================
function CapaEditor({ content, onChange, readOnly, meta }: EditorProps) {
  const projeto = content.projeto || meta?.contractName || '';
  const cliente = content.cliente || meta?.clientName || '';
  const numeroContrato = content.numeroContrato || meta?.contractNumber || '';

  return (
    <div className="space-y-3 max-w-2xl">
      <div>
        <Label>Projeto</Label>
        <div className="flex items-center gap-2">
          <Input value={projeto} onChange={(e) => onChange({ ...content, projeto: e.target.value })} disabled={readOnly} />
          {!content.projeto && meta?.contractName && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 whitespace-nowrap">Auto</Badge>
          )}
        </div>
      </div>
      <div>
        <Label>Cliente</Label>
        <div className="flex items-center gap-2">
          <Input value={cliente} onChange={(e) => onChange({ ...content, cliente: e.target.value })} disabled={readOnly} />
          {!content.cliente && meta?.clientName && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 whitespace-nowrap">Auto</Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Criado por</Label><Input value={content.criadoPor ?? ''} onChange={(e) => onChange({ ...content, criadoPor: e.target.value })} disabled={readOnly} /></div>
        <div><Label>Revisado por</Label><Input value={content.revisadoPor ?? ''} onChange={(e) => onChange({ ...content, revisadoPor: e.target.value })} disabled={readOnly} /></div>
      </div>
      <div>
        <Label>Número do contrato</Label>
        <div className="flex items-center gap-2">
          <Input value={numeroContrato} onChange={(e) => onChange({ ...content, numeroContrato: e.target.value })} disabled={readOnly} />
          {!content.numeroContrato && meta?.contractNumber && (
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 whitespace-nowrap">Auto</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sumário (simple list)
// ============================================
function SumarioEditor({ content, onChange, readOnly, meta }: EditorProps) {
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesAno = meta?.month && meta?.year ? `${MESES[meta.month - 1]}/${meta.year}` : '';

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <span className="text-blue-500 mt-0.5">ℹ️</span>
        <div className="text-sm text-blue-700">
          <span className="font-medium">Geração automática</span>
          {mesAno && <span> — Relatório de <span className="font-semibold">{mesAno}</span></span>}
          <br />O sumário é gerado automaticamente na exportação a partir das seções ativas.
        </div>
      </div>
      <div>
        <Label>Notas adicionais (opcional)</Label>
        <Textarea value={content.notas ?? ''} onChange={(e) => onChange({ ...content, notas: e.target.value })} rows={4} disabled={readOnly} placeholder="Observações que devem aparecer no sumário..." />
      </div>
    </div>
  );
}

// ============================================
// Objetivo
// ============================================
function ObjetivoEditor({ content, onChange, readOnly }: EditorProps) {
  return (
    <div className="max-w-2xl">
      <Label>Texto do objetivo</Label>
      <Textarea value={content.texto ?? ''} onChange={(e) => onChange({ ...content, texto: e.target.value })} rows={8} disabled={readOnly} />
    </div>
  );
}

// ============================================
// Histórico TR
// ============================================
function HistoricoTrEditor({ content, onChange, readOnly }: EditorProps) {
  const linhas: { descricao: string; entregue: boolean }[] = content.linhas ?? [];
  const percentual = linhas.length > 0 ? Math.round((linhas.filter((l) => l.entregue).length / linhas.length) * 100) : 0;
  if (linhas.length === 0 && readOnly) {
    return (
      <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
        ⚠️ Nenhuma macroentrega do TR encontrada. Verifique se o documento do Termo de Referência está anexado na área de documentos do contrato.
      </div>
    );
  }
  if (linhas.length === 0) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
          ⚠️ Nenhuma macroentrega cadastrada. O documento do TR pode não estar disponível na área de documentos do contrato. Você pode adicionar as macroentregas manualmente abaixo.
        </div>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [{ descricao: '', entregue: false }] })}>
          <Plus className="w-4 h-4 mr-2" />Adicionar macroentrega
        </Button>
      </div>
    );
  }
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next, percentual });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Macroentregas do TR</Label>
          <p className="text-xs text-muted-foreground">Marque quais foram entregues no período.</p>
        </div>
        <Badge className="bg-blue-600 text-white">{percentual}% concluído</Badge>
      </div>
      <div className="space-y-2">
        {linhas.map((l, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-3">
            <Checkbox checked={l.entregue} onCheckedChange={(v) => update(i, { entregue: !!v })} disabled={readOnly} />
            <Input value={l.descricao} onChange={(e) => update(i, { descricao: e.target.value })} disabled={readOnly} />
            {!readOnly && <Button variant="ghost" size="icon" onClick={() => {
              const next = linhas.filter((_, idx) => idx !== i);
              onChange({ ...content, linhas: next });
            }}><Trash2 className="w-4 h-4" /></Button>}
          </CardContent></Card>
        ))}
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { descricao: '', entregue: false }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar macroentrega
      </Button>}
    </div>
  );
}

// ============================================
// Painel Executivo
// ============================================
function PainelExecutivoEditor({ content, onChange, readOnly }: EditorProps) {
  const fields: Array<[string, string]> = [
    ['historicoTr', 'Histórico TR'],
    ['evolucaoInovacao', 'Evolução e Inovação'],
    ['eficienciaOperacional', 'Eficiência Operacional'],
    ['eficienciaPrevisibilidade', 'Eficiência e Previsibilidade'],
    ['desempenhoAplicacao', 'Desempenho da Aplicação'],
    ['engajamentoUsuario', 'Engajamento do Usuário'],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <Card key={key}><CardContent className="p-4 space-y-2">
            <Label>{label}</Label>
            <StatusSelect value={content[key] ?? ''} onChange={(v) => onChange({ ...content, [key]: v })} disabled={readOnly} />
          </CardContent></Card>
        ))}
      </div>
      <div>
        <Label>Observações <span className="text-xs text-muted-foreground">(opcional — não aparece no PPTX se vazio)</span></Label>
        <Textarea
          value={content.observacoes ?? ''}
          onChange={(e) => onChange({ ...content, observacoes: e.target.value })}
          rows={3}
          disabled={readOnly}
          placeholder="Comentários gerais sobre o período..."
        />
      </div>
    </div>
  );
}

// ============================================
// Evolução e Inovação (Asana auto)
// ============================================
function EvolucaoInovacaoEditor({ content, onChange, readOnly }: EditorProps) {
  const tags = content.tags ?? { 'Novas Funcionalidades': 0, 'Evolução': 0, 'Integrações': 0, 'Outros': 0 };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(tags).map(([tag, count]) => (
          <Card key={tag}><CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">{tag}</div>
            <div className="text-2xl font-bold">{String(count)}</div>
          </CardContent></Card>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Label className="m-0">% Inovação:</Label>
        <Input type="number" className="w-28" value={content.percentualInovacao ?? 0} onChange={(e) => onChange({ ...content, percentualInovacao: Number(e.target.value) })} disabled={readOnly} />
        <StatusBadge value={content.status} />
        <div className="ml-auto"><StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} /></div>
      </div>
      <div>
        <Label>Análise</Label>
        <Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} />
      </div>
    </div>
  );
}

// ============================================
// Entregas / Priorizadas (table)
// ============================================
function TaskTableEditor({ content, onChange, readOnly }: EditorProps) {
  const linhas: { tarefa: string; status: string; categoria: string; assignee: string; url?: string }[] = content.linhas ?? [];
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Tarefa</th>
              <th className="p-2 text-left w-32">Status</th>
              <th className="p-2 text-left w-40">Categoria</th>
              <th className="p-2 text-left w-32">Assignee</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1">
                  <div className="flex items-center gap-1">
                    <Input value={l.tarefa} onChange={(e) => update(i, { tarefa: e.target.value })} disabled={readOnly} />
                    {l.url && <a href={l.url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                </td>
                <td className="p-1"><Input value={l.status} onChange={(e) => update(i, { status: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.categoria} onChange={(e) => update(i, { categoria: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.assignee} onChange={(e) => update(i, { assignee: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1">
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { tarefa: '', status: '', categoria: '', assignee: '' }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar linha
      </Button>}
    </div>
  );
}

// ============================================
// Demonstrativo de Horas
// ============================================
function DemonstrativoHorasEditor({ content, onChange, readOnly }: EditorProps) {
  const linhas: { recurso: string; servicos: string; unidade: string; quantidade: number }[] = content.linhas ?? [];
  const total = linhas.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Recurso</th>
              <th className="p-2 text-left">Serviços</th>
              <th className="p-2 text-left w-32">Unidade</th>
              <th className="p-2 text-left w-32">Quantidade</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1"><Input value={l.recurso} onChange={(e) => update(i, { recurso: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.servicos} onChange={(e) => update(i, { servicos: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.unidade} onChange={(e) => update(i, { unidade: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input type="number" value={l.quantidade ?? 0} onChange={(e) => update(i, { quantidade: Number(e.target.value) })} disabled={readOnly} /></td>
                <td className="p-1">
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
            <tr className="bg-muted font-semibold"><td colSpan={3} className="p-2 text-right">Total</td><td className="p-2">{total}</td><td /></tr>
          </tbody>
        </table>
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { recurso: '', servicos: '', unidade: 'horas', quantidade: 0 }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar linha
      </Button>}
      <div>
        <Label>Legenda</Label>
        <Textarea value={content.legenda ?? ''} onChange={(e) => onChange({ ...content, legenda: e.target.value })} rows={2} disabled={readOnly} />
      </div>
    </div>
  );
}

// ============================================
// Eficiência Operacional (manual)
// ============================================
function EficienciaOperacionalEditor({ content, onChange, readOnly }: EditorProps) {
  const fields: Array<[string, string]> = [['sla', 'SLA %'], ['tickets', 'Tickets'], ['crises', 'Crises'], ['bugs', 'Bugs'], ['intercorrencias', 'Intercorrências']];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {fields.map(([k, label]) => (
          <div key={k}><Label>{label}</Label><Input type="number" value={content[k] ?? ''} onChange={(e) => onChange({ ...content, [k]: e.target.value })} disabled={readOnly} /></div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge value={content.status} />
        <div className="ml-auto"><StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} /></div>
      </div>
      <div><Label>Análise</Label><Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Eficiência e Previsibilidade (Asana auto)
// ============================================
function EficienciaPrevisibilidadeEditor({ content, onChange, readOnly }: EditorProps) {
  const fields: Array<[string, string]> = [
    ['frequenciaDeploy', 'Frequência de deploy'],
    ['leadTime', 'Lead Time (dias)'],
    ['pbiTestedRatio', 'PBI Tested Ratio (%)'],
    ['efficiencyRatio', 'Efficiency Ratio (%)'],
    ['demandas', 'Demandas'],
    ['falhasEvitadas', 'Falhas Evitadas'],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map(([k, label]) => (
          <div key={k}><Label>{label}</Label><Input value={content[k] ?? ''} onChange={(e) => onChange({ ...content, [k]: e.target.value })} disabled={readOnly} /></div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge value={content.status} />
        <div className="ml-auto"><StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} /></div>
      </div>
      <div><Label>Análise</Label><Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Desempenho da Aplicação
// ============================================
function DesempenhoAplicacaoEditor({ content, onChange, readOnly }: EditorProps) {
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center gap-3">
        <Label>Status</Label>
        <div className="flex-1"><StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} /></div>
        <StatusBadge value={content.status} />
      </div>
      <div><Label>Análise</Label><Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={6} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Engajamento do Usuário
// ============================================
function EngajamentoUsuarioEditor({ content, onChange, readOnly }: EditorProps) {
  const fields: Array<[string, string]> = [
    ['usuariosCadastrados', 'Usuários Cadastrados'],
    ['usuariosUnicos', 'Usuários Únicos'],
    ['sessoes', 'Sessões'],
    ['usuariosRetornados', 'Usuários Retornados %'],
    ['tempoMedioAtivo', 'Tempo Médio Ativo'],
    ['acessosPorUsuario', 'Acessos por Usuário'],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map(([k, label]) => (
          <div key={k}><Label>{label}</Label><Input value={content[k] ?? ''} onChange={(e) => onChange({ ...content, [k]: e.target.value })} disabled={readOnly} /></div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge value={content.status} />
        <div className="ml-auto"><StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} /></div>
      </div>
      <div><Label>Análise</Label><Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Maturidade da Plataforma (dynamic metrics)
// ============================================
function MaturidadePlataformaEditor({ content, onChange, readOnly }: EditorProps) {
  const metricas: { nome: string; valor: string }[] = content.metricas ?? [];
  const update = (i: number, patch: Partial<typeof metricas[0]>) => {
    const next = [...metricas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, metricas: next });
  };
  return (
    <div className="space-y-3">
      {metricas.map((m, i) => (
        <Card key={i}><CardContent className="p-3 flex gap-2">
          <Input placeholder="Nome da métrica" value={m.nome} onChange={(e) => update(i, { nome: e.target.value })} disabled={readOnly} />
          <Input placeholder="Valor" value={m.valor} onChange={(e) => update(i, { valor: e.target.value })} disabled={readOnly} />
          {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, metricas: metricas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
        </CardContent></Card>
      ))}
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, metricas: [...metricas, { nome: '', valor: '' }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar métrica
      </Button>}
      <div><Label>Análise</Label><Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Treinamentos e Reuniões (Fireflies)
// ============================================
function TreinamentosReunioesEditor({ content, onChange, readOnly }: EditorProps) {
  const linhas: { tipo: string; data: string; horario: string; descricao: string }[] = content.linhas ?? [];
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left w-40">Tipo</th>
              <th className="p-2 text-left w-32">Data</th>
              <th className="p-2 text-left w-28">Horário</th>
              <th className="p-2 text-left">Descrição</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1"><Input value={l.tipo} onChange={(e) => update(i, { tipo: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input type="date" value={l.data} onChange={(e) => update(i, { data: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input type="time" value={l.horario ?? ''} onChange={(e) => update(i, { horario: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.descricao} onChange={(e) => update(i, { descricao: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1">
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { tipo: '', data: '', horario: '', descricao: '' }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar linha
      </Button>}
      <div><Label>Rodapé</Label><Textarea value={content.rodape ?? ''} onChange={(e) => onChange({ ...content, rodape: e.target.value })} rows={2} disabled={readOnly} /></div>
    </div>
  );
}

// ============================================
// Oportunidades e Fatores de Atenção
// ============================================
function OportunidadesAtencaoEditor({ content, onChange, readOnly }: EditorProps) {
  const linhas: { descricao: string; tipo: 'Oportunidade' | 'Fator' }[] = content.linhas ?? [];
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Descrição</th>
              <th className="p-2 text-left w-40">Tipo</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1"><Input value={l.descricao} onChange={(e) => update(i, { descricao: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1">
                  <Select value={l.tipo} onValueChange={(v) => update(i, { tipo: v as any })} disabled={readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oportunidade">Oportunidade</SelectItem>
                      <SelectItem value="Fator">Fator de Atenção</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { descricao: '', tipo: 'Oportunidade' }] })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar linha
      </Button>}
    </div>
  );
}

// ============================================
// Dispatcher
// ============================================
export function SectionEditor({ sectionKey, content, onChange, readOnly, meta }: { sectionKey: ReportSectionKey } & EditorProps) {
  switch (sectionKey) {
    case 'capa': return <CapaEditor content={content} onChange={onChange} readOnly={readOnly} meta={meta} />;
    case 'sumario': return <SumarioEditor content={content} onChange={onChange} readOnly={readOnly} meta={meta} />;
    case 'objetivo': return <ObjetivoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'historico_tr': return <HistoricoTrEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'painel_executivo': return <PainelExecutivoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'evolucao_inovacao': return <EvolucaoInovacaoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'entregas':
    case 'priorizadas': return <TaskTableEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'demonstrativo_horas': return <DemonstrativoHorasEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'eficiencia_operacional': return <EficienciaOperacionalEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'eficiencia_previsibilidade': return <EficienciaPrevisibilidadeEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'desempenho_aplicacao': return <DesempenhoAplicacaoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'engajamento_usuario': return <EngajamentoUsuarioEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'maturidade_plataforma': return <MaturidadePlataformaEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'treinamentos_reunioes': return <TreinamentosReunioesEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'oportunidades_atencao': return <OportunidadesAtencaoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    default: return null;
  }
}
