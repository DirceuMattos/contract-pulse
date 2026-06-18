import { useEffect } from 'react';
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
    squadMembers?: any[];
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
  type Linha = { descricao: string; status: 'sim' | 'não' | 'parcialmente' };
  const linhas: Linha[] = (content.linhas as Linha[]) ?? [];
  const update = (i: number, patch: Partial<Linha>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  const totais = {
    sim:          linhas.filter((l) => l.status === 'sim').length,
    parcialmente: linhas.filter((l) => l.status === 'parcialmente').length,
    nao:          linhas.filter((l) => l.status === 'não').length,
  };
  const pct = linhas.length > 0
    ? Math.round(((totais.sim + totais.parcialmente * 0.5) / linhas.length) * 100)
    : 0;
  return (
    <div className="space-y-3">
      {linhas.length === 0 && (
        <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
          ⚠️ Nenhuma macroentrega cadastrada. Adicione manualmente abaixo.
        </div>
      )}
      {linhas.length > 0 && (
        <div className="flex gap-4 text-sm mb-2">
          <span className="text-green-600 font-medium">✓ Entregue: {totais.sim}</span>
          <span className="text-yellow-600 font-medium">◑ Parcial: {totais.parcialmente}</span>
          <span className="text-red-500 font-medium">✗ Pendente: {totais.nao}</span>
          <span className="ml-auto font-semibold text-blue-700">{pct}% concluído</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Macroentrega</th>
              <th className="p-2 text-left w-44">Status</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1">
                  <Input value={l.descricao} onChange={(e) => update(i, { descricao: e.target.value })} disabled={readOnly} />
                </td>
                <td className="p-1">
                  <select
                    className="w-full rounded border px-2 py-1 text-sm bg-background"
                    value={l.status ?? 'não'}
                    onChange={(e) => update(i, { status: e.target.value as Linha['status'] })}
                    disabled={readOnly}
                  >
                    <option value="sim">✓ Sim</option>
                    <option value="parcialmente">◑ Parcialmente</option>
                    <option value="não">✗ Não</option>
                  </select>
                </td>
                <td className="p-1">
                  {!readOnly && (
                    <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { descricao: '', status: 'não' }] })}>
          <Plus className="w-4 h-4 mr-2" />Adicionar macroentrega
        </Button>
      )}
    </div>
  );
}

// ============================================
// Glossário
// ============================================
function GlossarioEditor({ content, onChange, readOnly }: EditorProps) {
  type Termo = { termo: string; definicao: string };
  const termos: Termo[] = (content.termos as Termo[]) ?? [];
  const update = (i: number, patch: Partial<Termo>) => {
    const next = [...termos];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, termos: next });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Termos técnicos que aparecerão no slide de glossário do relatório.</p>
      <div className="space-y-2">
        {termos.map((t, i) => (
          <div key={i} className="flex gap-2 items-start border rounded-lg p-2">
            <div className="flex-shrink-0 w-48">
              <Label className="text-xs">Termo</Label>
              <Input value={t.termo} onChange={(e) => update(i, { termo: e.target.value })} disabled={readOnly} placeholder="ex: Backlog" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Definição</Label>
              <Textarea value={t.definicao} onChange={(e) => update(i, { definicao: e.target.value })} disabled={readOnly} rows={2} placeholder="Definição do termo..." />
            </div>
            {!readOnly && (
              <Button variant="ghost" size="icon" className="mt-5" onClick={() => onChange({ ...content, termos: termos.filter((_, idx) => idx !== i) })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange({ ...content, termos: [...termos, { termo: '', definicao: '' }] })}>
          <Plus className="w-4 h-4 mr-2" />Adicionar termo
        </Button>
      )}
    </div>
  );
}

// ============================================
// Indicadores do Relatório
// ============================================
function IndicadoresEditor({ content, onChange, readOnly }: EditorProps) {
  const indicadores = [
    { key: 'evolucaoInovacao',          label: 'Evolução e Inovação',                  defaultDesc: 'Mede o percentual de entregas voltadas à melhoria contínua e novas funcionalidades em relação ao total de tarefas trabalhadas no período.' },
    { key: 'eficienciaPrevisibilidade', label: 'Eficiência e Previsibilidade',         defaultDesc: 'Mede a capacidade do time de cumprir prazos planejados e entregar demandas com estabilidade e consistência ao longo do tempo.' },
    { key: 'engajamentoUsuario',        label: 'Engajamento e Experiência do Usuário', defaultDesc: 'Avalia o uso da plataforma com base em acessos, recorrência, tempo de navegação e profundidade de uso.' },
    { key: 'desempenhoAplicacao',       label: 'Desempenho da Aplicação',              defaultDesc: 'Avalia a performance técnica e a experiência de carregamento, considerando métricas de estabilidade, velocidade e usabilidade.' },
    { key: 'eficienciaOperacional',     label: 'Eficiência Operacional',               defaultDesc: 'Mede a capacidade de atendimento, resolução de demandas e cumprimento dentro dos prazos (SLAs).' },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Descrições dos indicadores utilizados neste relatório. Edite conforme o contexto do contrato.</p>
      {indicadores.map((ind) => {
        const fieldKey = `desc${ind.key.charAt(0).toUpperCase()}${ind.key.slice(1)}`;
        return (
          <div key={ind.key} className="border rounded-lg p-3 space-y-1">
            <Label className="font-semibold">{ind.label}</Label>
            <Textarea
              value={(content[fieldKey] as string) ?? ind.defaultDesc}
              onChange={(e) => onChange({ ...content, [fieldKey]: e.target.value })}
              rows={3}
              disabled={readOnly}
            />
          </div>
        );
      })}
      <div className="border rounded-lg p-3 space-y-1">
        <Label className="font-semibold">Severidades SLA</Label>
        <div className="grid grid-cols-2 gap-2">
          {['sev4', 'sev3', 'sev2', 'sev1'].map((sev, i) => (
            <div key={sev} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-28">Severidade {4 - i}</span>
              <Input value={(content[sev] as string) ?? ''} onChange={(e) => onChange({ ...content, [sev]: e.target.value })} disabled={readOnly} placeholder="ex: Até 24h úteis" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Histórico TR — Aderência Global
// ============================================
function HistoricoTrAderenciaEditor({ content, onChange, readOnly }: EditorProps) {
  type Categoria = { label: string; total: number; percentual: number; cor: string };
  const categorias: Categoria[] = (content.categorias as Categoria[]) ?? [
    { label: 'Implementado em Produção', total: 0, percentual: 100, cor: 'verde' },
    { label: 'Atende Parcialmente',      total: 0, percentual: 66,  cor: 'amarelo' },
    { label: 'Oportunidade de evolução', total: 0, percentual: 17,  cor: 'vermelho' },
    { label: 'Depende de Dados',         total: 0, percentual: 60,  cor: 'azul' },
  ];
  const update = (i: number, patch: Partial<Categoria>) => {
    const next = [...categorias];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, categorias: next });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>% Aderência Global</Label>
          <Input type="number" value={(content.percentual_global as number) ?? 0} onChange={(e) => onChange({ ...content, percentual_global: Number(e.target.value) })} disabled={readOnly} />
        </div>
        <div>
          <Label>Total de itens avaliados</Label>
          <Input type="number" value={(content.total_itens as number) ?? 0} onChange={(e) => onChange({ ...content, total_itens: Number(e.target.value) })} disabled={readOnly} />
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Categorias</Label>
        <div className="space-y-2">
          {categorias.map((c, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center border rounded p-2">
              <Input value={c.label} onChange={(e) => update(i, { label: e.target.value })} disabled={readOnly} placeholder="Categoria" />
              <Input type="number" value={c.total} onChange={(e) => update(i, { total: Number(e.target.value) })} disabled={readOnly} placeholder="Qtd" />
              <Input type="number" value={c.percentual} onChange={(e) => update(i, { percentual: Number(e.target.value) })} disabled={readOnly} placeholder="%" />
              <select className="rounded border px-2 py-1 text-sm bg-background" value={c.cor} onChange={(e) => update(i, { cor: e.target.value })} disabled={readOnly}>
                <option value="verde">Verde</option>
                <option value="amarelo">Amarelo</option>
                <option value="vermelho">Vermelho</option>
                <option value="azul">Azul</option>
              </select>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Análise</Label>
        <Textarea value={(content.analise as string) ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={5} disabled={readOnly} />
      </div>
    </div>
  );
}

// ============================================
// Ambientes Implementados
// ============================================
function AmbientesEditor({ content, onChange, readOnly }: EditorProps) {
  type Ambiente = { nome: string; status: 'ativo' | 'inativo' | 'parcial'; itens: string[] };
  const ambientes: Ambiente[] = (content.ambientes as Ambiente[]) ?? [
    { nome: 'Ambiente de Produção',    status: 'ativo', itens: ['Plataforma web acessível para usuários finais', 'Hospedagem Azure Tier III — SLA ≥ 99,7%', 'NOC 24x7x365 ativo', 'LGPD: tratamento de dados auditável'] },
    { nome: 'Ambiente de Homologação', status: 'ativo', itens: ['Ambiente de validação de novas funcionalidades', 'Testes de aceite pela equipe municipal', 'Isolado do ambiente de produção', 'Processo de QA estabelecido (smoke test, suíte automatizada)'] },
  ];
  const updateAmbiente = (i: number, patch: Partial<Ambiente>) => {
    const next = [...ambientes];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, ambientes: next });
  };
  const updateItem = (ai: number, ii: number, val: string) => {
    const next = [...ambientes];
    const itens = [...next[ai].itens];
    itens[ii] = val;
    next[ai] = { ...next[ai], itens };
    onChange({ ...content, ambientes: next });
  };
  return (
    <div className="space-y-4">
      {ambientes.map((amb, ai) => (
        <div key={ai} className="border rounded-lg p-3 space-y-3">
          <div className="flex gap-3 items-center">
            <Input value={amb.nome} onChange={(e) => updateAmbiente(ai, { nome: e.target.value })} disabled={readOnly} className="flex-1" placeholder="Nome do ambiente" />
            <select className="rounded border px-2 py-1 text-sm bg-background" value={amb.status} onChange={(e) => updateAmbiente(ai, { status: e.target.value as Ambiente['status'] })} disabled={readOnly}>
              <option value="ativo">✅ Ativo</option>
              <option value="inativo">❌ Inativo</option>
              <option value="parcial">⚠️ Parcial</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Características</Label>
            {amb.itens.map((item, ii) => (
              <div key={ii} className="flex gap-2">
                <Input value={item} onChange={(e) => updateItem(ai, ii, e.target.value)} disabled={readOnly} />
                {!readOnly && (
                  <Button variant="ghost" size="icon" onClick={() => {
                    const next = [...ambientes];
                    next[ai] = { ...next[ai], itens: next[ai].itens.filter((_, idx) => idx !== ii) };
                    onChange({ ...content, ambientes: next });
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => {
                const next = [...ambientes];
                next[ai] = { ...next[ai], itens: [...next[ai].itens, ''] };
                onChange({ ...content, ambientes: next });
              }}>
                <Plus className="w-4 h-4 mr-1" />Item
              </Button>
            )}
          </div>
        </div>
      ))}
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange({ ...content, ambientes: [...ambientes, { nome: '', status: 'ativo', itens: [] }] })}>
          <Plus className="w-4 h-4 mr-2" />Adicionar ambiente
        </Button>
      )}
    </div>
  );
}

// ============================================
// Ambientes — Detalhamento
// ============================================
function AmbientesDetalheEditor({ content, onChange, readOnly }: EditorProps) {
  type Link = { label: string; url: string };
  const links: Link[] = (content.links as Link[]) ?? [];
  return (
    <div className="space-y-3">
      <div>
        <Label>Texto descritivo</Label>
        <Textarea value={(content.texto as string) ?? ''} onChange={(e) => onChange({ ...content, texto: e.target.value })} rows={8} disabled={readOnly} placeholder="Descreva os detalhes dos ambientes implementados..." />
      </div>
      <div>
        <Label className="mb-2 block">Links dos ambientes</Label>
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input value={l.label} onChange={(e) => { const next = [...links]; next[i] = { ...next[i], label: e.target.value }; onChange({ ...content, links: next }); }} disabled={readOnly} placeholder="ex: Produção" className="w-32" />
              <Input value={l.url} onChange={(e) => { const next = [...links]; next[i] = { ...next[i], url: e.target.value }; onChange({ ...content, links: next }); }} disabled={readOnly} placeholder="https://..." className="flex-1" />
              {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, links: links.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
            </div>
          ))}
          {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, links: [...links, { label: '', url: '' }] })}><Plus className="w-4 h-4 mr-2" />Adicionar link</Button>}
        </div>
      </div>
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
  // Suporta formato Asana (contagem_por_tag) e formato legado (tags)
  const tags = content.contagem_por_tag ?? content.tags ?? {
    'Novas Funcionalidades': 0, 'Evolução': 0, 'Integrações': 0, 'Outros': 0,
  };
  const percentualInovacao = content.percentual_inovacao ?? content.percentualInovacao ?? 0;
  const totalEntregas = content.total_entregas ?? 0;

  return (
    <div className="space-y-3">
      {totalEntregas > 0 && (
        <p className="text-sm text-muted-foreground">
          Total de entregas no período: <span className="font-semibold">{totalEntregas}</span>
        </p>
      )}
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
        <Input
          type="number"
          className="w-28"
          value={percentualInovacao}
          onChange={(e) => onChange({ ...content, percentual_inovacao: Number(e.target.value), percentualInovacao: Number(e.target.value) })}
          disabled={readOnly}
        />
        <StatusBadge value={content.status} />
        <div className="ml-auto">
          <StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} />
        </div>
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
  // Suporta formato Asana (tarefas[].nome) e formato manual (linhas[].tarefa)
  const rawLinhas = content.linhas ?? content.tarefas ?? [];
  const linhas: { tarefa: string; status: string; categoria: string; assignee: string; url?: string }[] = rawLinhas.map((t: any) => ({
    tarefa: t.tarefa ?? t.nome ?? '',
    status: t.status ?? '',
    categoria: t.categoria ?? '',
    assignee: t.assignee ?? '',
    url: t.url ?? t.link ?? t.permalink_url ?? '',
  }));
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next, tarefas: undefined });
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
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i), tarefas: undefined })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { tarefa: '', status: '', categoria: '', assignee: '' }], tarefas: undefined })}>
        <Plus className="w-4 h-4 mr-2" />Adicionar linha
      </Button>}
    </div>
  );
}

// ============================================
// Demonstrativo de Horas
// ============================================
function DemonstrativoHorasEditor({ content, onChange, readOnly, meta }: EditorProps) {
  const linhas: { recurso: string; funcao: string; dedicacao: string; unidade: string; quantidade: number }[] = content.linhas ?? [];
  const total = linhas.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
  const update = (i: number, patch: Partial<typeof linhas[0]>) => {
    const next = [...linhas];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, linhas: next });
  };
  // Auto-preencher com squad do contrato se linhas vazias
  useEffect(() => {
    if (linhas.length === 0 && meta?.squadMembers && (meta.squadMembers as any[]).length > 0) {
      const novasLinhas = (meta.squadMembers as any[]).map((m: any) => ({
        recurso:    m.nome ?? m.name ?? '',
        funcao:     m.funcao ?? m.role ?? '',
        dedicacao:  m.dedicacao ?? '',
        unidade:    'horas',
        quantidade: 0,
      }));
      onChange({ ...content, linhas: novasLinhas });
    }
  }, [meta?.squadMembers]);
  return (
    <div className="space-y-3">
      {linhas.length === 0 && (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm">
          ℹ️ Nenhum membro cadastrado. Adicione manualmente ou verifique se a squad está configurada no contrato.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Recurso</th>
              <th className="p-2 text-left">Função</th>
              <th className="p-2 text-left w-32">Dedicação</th>
              <th className="p-2 text-left w-28">Unidade</th>
              <th className="p-2 text-left w-28">Quantidade</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="p-1"><Input value={l.recurso} onChange={(e) => update(i, { recurso: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.funcao ?? ''} onChange={(e) => update(i, { funcao: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input value={l.dedicacao ?? ''} onChange={(e) => update(i, { dedicacao: e.target.value })} disabled={readOnly} placeholder="ex: 100%" /></td>
                <td className="p-1"><Input value={l.unidade} onChange={(e) => update(i, { unidade: e.target.value })} disabled={readOnly} /></td>
                <td className="p-1"><Input type="number" value={l.quantidade ?? 0} onChange={(e) => update(i, { quantidade: Number(e.target.value) })} disabled={readOnly} /></td>
                <td className="p-1">
                  {!readOnly && <Button variant="ghost" size="icon" onClick={() => onChange({ ...content, linhas: linhas.filter((_, idx) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>}
                </td>
              </tr>
            ))}
            <tr className="bg-muted font-semibold">
              <td colSpan={4} className="p-2 text-right">Total</td>
              <td className="p-2">{total}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange({ ...content, linhas: [...linhas, { recurso: '', funcao: '', dedicacao: '', unidade: 'horas', quantidade: 0 }] })}>
          <Plus className="w-4 h-4 mr-2" />Adicionar linha
        </Button>
      )}
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
  const fields: Array<[string, string]> = [
    ['sla', 'SLA %'],
    ['tickets', 'Tickets'],
    ['crises', 'Crises'],
    ['bugs', 'Bugs'],
    ['intercorrencias', 'Intercorrências'],
  ];
  const porTipo = content.por_tipo as Record<string, number> | undefined;
  const tipoLabels: Record<string, string> = {
    incidente: 'Incidentes',
    problema: 'Problemas',
    requisicao: 'Requisições',
    melhoria: 'Melhorias',
    duvida: 'Dúvidas',
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {fields.map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input
              type="number"
              value={content[k] ?? ''}
              onChange={(e) => onChange({ ...content, [k]: e.target.value })}
              disabled={readOnly}
            />
          </div>
        ))}
      </div>
      {porTipo && Object.keys(porTipo).length > 0 && (
        <div>
          <Label className="mb-2 block">Breakdown por tipo</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(porTipo).map(([tipo, qtd]) => (
              <Card key={tipo}>
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">{tipoLabels[tipo] ?? tipo}</div>
                  <div className="text-2xl font-bold">{qtd}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <StatusBadge value={content.status} />
        <div className="ml-auto">
          <StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} />
        </div>
      </div>
      <div>
        <Label>Análise</Label>
        <Textarea
          value={content.analise ?? ''}
          onChange={(e) => onChange({ ...content, analise: e.target.value })}
          rows={5}
          disabled={readOnly}
          placeholder="Descreva sua análise sobre a eficiência operacional do período..."
        />
      </div>
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
function GaugeChart({ status }: { status: string }) {
  const angles: Record<string, number> = { critico: -80, atencao: -30, adequado: 30, alta: 80 };
  const key = status?.toLowerCase().replace('ç', 'c').replace('ã', 'a') ?? 'adequado';
  const angle = angles[key] ?? 30;
  const rad = (angle * Math.PI) / 180;
  const cx = 100; const cy = 90; const r = 70;
  const nx = cx + r * Math.sin(rad);
  const ny = cy - r * Math.cos(rad);
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-xs mx-auto">
      <path d="M 30 90 A 70 70 0 0 1 60 31" stroke="#C81E1E" strokeWidth="18" fill="none" strokeLinecap="butt" />
      <path d="M 60 31 A 70 70 0 0 1 100 20" stroke="#C85000" strokeWidth="18" fill="none" strokeLinecap="butt" />
      <path d="M 100 20 A 70 70 0 0 1 140 31" stroke="#C8A000" strokeWidth="18" fill="none" strokeLinecap="butt" />
      <path d="M 140 31 A 70 70 0 0 1 170 90" stroke="#1E8A3E" strokeWidth="18" fill="none" strokeLinecap="butt" />
      <circle cx={cx} cy={cy} r="10" fill="#1A4F8A" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1A4F8A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DesempenhoAplicacaoEditor({ content, onChange, readOnly }: EditorProps) {
  const imagens: string[] = content.imagens ?? [];
  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...content, imagens: [...imagens, ev.target?.result as string] });
    reader.readAsDataURL(file);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...content, imagens: [...imagens, ev.target?.result as string] });
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Label>Status</Label>
        <div className="flex-1">
          <StatusSelect value={(content.status as string) ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} />
        </div>
        <StatusBadge value={content.status as string} />
      </div>
      {content.status && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <GaugeChart status={content.status as string} />
        </div>
      )}
      <div>
        <Label>Análise</Label>
        <Textarea
          value={(content.analise as string) ?? ''}
          onChange={(e) => onChange({ ...content, analise: e.target.value })}
          rows={4}
          disabled={readOnly}
          placeholder="Descreva o desempenho da aplicação no período..."
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Imagens / Dashboards</Label>
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Temporário</Badge>
        </div>
        {!readOnly && (
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center text-sm text-muted-foreground hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onPaste={handleImagePaste}
            tabIndex={0}
          >
            <p>Cole uma imagem aqui (Ctrl+V) ou</p>
            <label className="mt-2 inline-block cursor-pointer text-blue-600 underline">
              clique para fazer upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        )}
        {imagens.length > 0 && (
          <div className="space-y-3 mt-3">
            {imagens.map((img, i) => (
              <div key={i} className="relative border rounded-lg overflow-hidden">
                <img src={img} alt={`Dashboard ${i + 1}`} className="w-full object-contain max-h-96" />
                {!readOnly && (
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2 opacity-80" onClick={() => onChange({ ...content, imagens: imagens.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  const imagens: string[] = content.imagens ?? [];
  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      onChange({ ...content, imagens: [...imagens, base64] });
    };
    reader.readAsDataURL(file);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      onChange({ ...content, imagens: [...imagens, base64] });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input value={content[k] ?? ''} onChange={(e) => onChange({ ...content, [k]: e.target.value })} disabled={readOnly} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge value={content.status} />
        <div className="ml-auto">
          <StatusSelect value={content.status ?? ''} onChange={(v) => onChange({ ...content, status: v })} disabled={readOnly} />
        </div>
      </div>
      <div>
        <Label>Análise</Label>
        <Textarea value={content.analise ?? ''} onChange={(e) => onChange({ ...content, analise: e.target.value })} rows={4} disabled={readOnly} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Imagens / Dashboards</Label>
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Temporário — será automatizado</Badge>
        </div>
        {!readOnly && (
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center text-sm text-muted-foreground hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onPaste={handleImagePaste}
            tabIndex={0}
          >
            <p>Cole uma imagem aqui (Ctrl+V) ou</p>
            <label className="mt-2 inline-block cursor-pointer text-blue-600 underline">
              clique para fazer upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        )}
        {imagens.length > 0 && (
          <div className="space-y-3 mt-3">
            {imagens.map((img, i) => (
              <div key={i} className="relative border rounded-lg overflow-hidden">
                <img src={img} alt={`Dashboard ${i + 1}`} className="w-full object-contain max-h-96" />
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-80"
                    onClick={() => onChange({ ...content, imagens: imagens.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
    case 'glossario': return <GlossarioEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'indicadores': return <IndicadoresEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'historico_tr': return <HistoricoTrEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'historico_tr_aderencia': return <HistoricoTrAderenciaEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'ambientes': return <AmbientesEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'ambientes_detalhe': return <AmbientesDetalheEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'painel_executivo': return <PainelExecutivoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'evolucao_inovacao': return <EvolucaoInovacaoEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'entregas':
    case 'priorizadas': return <TaskTableEditor content={content} onChange={onChange} readOnly={readOnly} />;
    case 'demonstrativo_horas': return <DemonstrativoHorasEditor content={content} onChange={onChange} readOnly={readOnly} meta={meta} />;
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
