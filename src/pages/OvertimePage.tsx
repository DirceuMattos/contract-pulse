import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Clock, Upload, Download } from 'lucide-react';
import { useOvertimeData, type OvertimeEntry } from '@/hooks/useOvertimeData';
import { OvertimeManualDialog } from '@/components/overtime/OvertimeManualDialog';
import { OvertimeImportDialog } from '@/components/overtime/OvertimeImportDialog';
import { OvertimePendingTab } from '@/components/overtime/OvertimePendingTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const REGIME_LABEL: Record<string, string> = { clt: 'CLT', pj: 'PJ', cooperado: 'Cooperado', socio: 'Sócio', estagio: 'Estágio' };
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtHoras = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// Agrupa entries por chave -> linha { nome, [ano]: valor, __total }, ordena pelo total (top N).
// Usada nas barras agrupadas por ano (regime/área/colaborador quando "todos os anos").
function agrupaPorAno(
  entries: OvertimeEntry[],
  anos: number[],
  keyFn: (e: OvertimeEntry) => string,
  topN: number,
): Record<string, number | string>[] {
  const porChave = new Map<string, { total: number; anos: Map<number, number> }>();
  for (const e of entries) {
    const k = keyFn(e);
    const reg = porChave.get(k) ?? { total: 0, anos: new Map<number, number>() };
    reg.total += Number(e.valor);
    reg.anos.set(e.ano, (reg.anos.get(e.ano) ?? 0) + Number(e.valor));
    porChave.set(k, reg);
  }
  return Array.from(porChave, ([nome, reg]) => {
    const row: Record<string, number | string> = { nome };
    for (const a of anos) row[String(a)] = reg.anos.get(a) ?? 0;
    row.__total = reg.total;
    return row;
  }).sort((a, b) => (b.__total as number) - (a.__total as number)).slice(0, topN);
}

export default function OvertimePage() {
  const now = useMemo(() => new Date(), []);
  const [ano, setAno] = useState<number | null>(now.getFullYear());
  const [mes, setMes] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Filtros locais da aba Lançamentos (refinam a tabela, não os dashboards).
  const [fColab, setFColab] = useState('');
  const [fArea, setFArea] = useState<string>('all');
  const [fMes, setFMes] = useState<string>('all');

  const { entries, availableYears, yearlyComparison, isLoading, refetch } = useOvertimeData({ year: ano, month: mes });

  const [pendCount, setPendCount] = useState(0);
  const loadPendCount = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('overtime_pending')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente');
    setPendCount(count ?? 0);
  }, []);
  useEffect(() => { loadPendCount(); }, [loadPendCount]);

  const refetchAll = useCallback(() => { refetch(); loadPendCount(); }, [refetch, loadPendCount]);

  const anos = availableYears.length ? availableYears : [now.getFullYear()];

  // Áreas presentes no conjunto atual, para o filtro local.
  const areasDisponiveis = useMemo(
    () => Array.from(new Set(entries.map((e) => e.area).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [entries],
  );

  // Tabela da aba Lançamentos: aplica os filtros locais sobre entries.
  const entriesLista = useMemo(() => {
    const termo = fColab.trim().toLowerCase();
    return entries.filter((e) => {
      if (termo && !e.colaborador_nome.toLowerCase().includes(termo)) return false;
      if (fArea !== 'all' && (e.area ?? '') !== fArea) return false;
      if (fMes !== 'all' && e.mes !== Number(fMes)) return false;
      return true;
    });
  }, [entries, fColab, fArea, fMes]);

  // Média mensal do ano e valor do último mês fechado.
  // Base: todos os lançamentos do ano filtrado (ignora o filtro de mês, pois
  // são métricas anuais). Se "todos os anos", usa o conjunto inteiro.
  const cardsMetrics = useMemo(() => {
    // agrupa valor por mês (1-12) no escopo atual de entries
    const porMesMap = new Map<number, number>();
    for (const e of entries) porMesMap.set(e.mes, (porMesMap.get(e.mes) ?? 0) + Number(e.valor));
    const mesesComDados = Array.from(porMesMap.keys()).sort((a, b) => a - b);
    const totalAno = Array.from(porMesMap.values()).reduce((s, v) => s + v, 0);
    const media = mesesComDados.length > 0 ? totalAno / mesesComDados.length : 0;

    // último mês fechado = maior mês com dados que seja < mês atual (se ano corrente)
    // ou simplesmente o maior mês com dados (anos passados / todos).
    let ultimoMesFechado: number | null = null;
    if (mesesComDados.length > 0) {
      if (ano === now.getFullYear()) {
        const fechados = mesesComDados.filter((m) => m < now.getMonth() + 1);
        ultimoMesFechado = fechados.length ? fechados[fechados.length - 1] : null;
      } else {
        ultimoMesFechado = mesesComDados[mesesComDados.length - 1];
      }
    }
    const valorUltimoMes = ultimoMesFechado ? (porMesMap.get(ultimoMesFechado) ?? 0) : 0;
    return { media, ultimoMesFechado, valorUltimoMes };
  }, [entries, ano, now]);

  const CORES = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

  // Por regime
  const porRegime = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = REGIME_LABEL[e.regime ?? ''] ?? (e.regime ?? 'Sem regime');
      m.set(k, (m.get(k) ?? 0) + Number(e.valor));
    }
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [entries]);

  // Por mês (do ano filtrado)
  const porMes = useMemo(() => {
    const arr = MESES.map((nome, i) => ({ nome, valor: 0 }));
    for (const e of entries) if (e.mes >= 1 && e.mes <= 12) arr[e.mes - 1].valor += Number(e.valor);
    return arr;
  }, [entries]);

  // Por área (top 10)
  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = e.area ?? 'Sem área';
      m.set(k, (m.get(k) ?? 0) + Number(e.valor));
    }
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [entries]);

  // Por colaborador (top 10)
  const porColab = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.colaborador_nome, (m.get(e.colaborador_nome) ?? 0) + Number(e.valor));
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [entries]);

  // Comparativo anual: eixo X = meses, uma linha por ano (base inteira, sem filtro).
  const anosComparativo = useMemo(
    () => Array.from(new Set(yearlyComparison.map((r) => r.ano))).sort((a, b) => a - b),
    [yearlyComparison],
  );
  const comparativoAnual = useMemo(() => {
    const base = MESES.map((nome, i) => {
      const ponto: Record<string, number | string> = { mes: nome };
      for (const a of anosComparativo) ponto[String(a)] = 0;
      // preenche os valores existentes daquele mês (i+1)
      for (const r of yearlyComparison) if (r.mes === i + 1) ponto[String(r.ano)] = Number(r.total_valor);
      return ponto;
    });
    return base;
  }, [yearlyComparison, anosComparativo]);

  // Anos presentes em entries (para as barras agrupadas por ano).
  const anosEntries = useMemo(
    () => Array.from(new Set(entries.map((e) => e.ano))).sort((a, b) => a - b),
    [entries],
  );

  const regimePorAno = useMemo(
    () => agrupaPorAno(entries, anosEntries, (e) => REGIME_LABEL[e.regime ?? ''] ?? (e.regime ?? 'Sem regime'), 10),
    [entries, anosEntries],
  );
  const areaPorAno = useMemo(
    () => agrupaPorAno(entries, anosEntries, (e) => e.area ?? 'Sem área', 10),
    [entries, anosEntries],
  );
  const colabPorAno = useMemo(
    () => agrupaPorAno(entries, anosEntries, (e) => e.colaborador_nome, 10),
    [entries, anosEntries],
  );

  const exportarCsv = () => {
    const head = ['Colaborador', 'Mes', 'Ano', 'Regime', 'Area', 'Horas', 'Valor', 'Ocorrencias', 'Origem'];
    const linhas = entries.map((e) => [
      e.colaborador_nome, e.mes, e.ano, e.regime ?? '', e.area ?? '',
      Number(e.horas).toFixed(2).replace('.', ','), Number(e.valor).toFixed(2).replace('.', ','),
      e.ocorrencias, e.origem,
    ]);
    const csv = [head, ...linhas].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horas_extras_${ano ?? 'todos'}${mes ? '_' + mes : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />Adm Horas Extras</h1>
          <p className="text-muted-foreground text-sm">Lançamentos e evolução das horas extras.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={entries.length === 0}><Download className="h-4 w-4 mr-2" />Exportar</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Importar planilha</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
        </div>
      </div>

      <Tabs defaultValue="painel">
        <TabsList>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências{pendCount > 0 ? ` (${pendCount})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-6 mt-4">
      {/* Filtros */}
      <div className="flex gap-3">
        <Select value={ano === null ? 'all' : String(ano)} onValueChange={(v) => setAno(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mes === null ? 'all' : String(mes)} onValueChange={(v) => setMes(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">
            Média mensal {ano ?? '(todos os anos)'}
          </CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(cardsMetrics.media)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">
            Último mês fechado{cardsMetrics.ultimoMesFechado ? ` · ${MESES[cardsMetrics.ultimoMesFechado - 1]}` : ''}
          </CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(cardsMetrics.valorUltimoMes)}</p></CardContent>
        </Card>
      </div>

      {/* Dashboards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">
              {ano === null ? 'Por regime (por ano)' : 'Por regime'}
            </CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                {ano === null ? (
                  <BarChart data={regimePorAno}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nome" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    {anosEntries.map((a, i) => (
                      <Bar key={a} dataKey={String(a)} name={String(a)} fill={CORES[i % CORES.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={porRegime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nome" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {porRegime.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">
              {ano === null ? 'Por mês (comparativo por ano)' : 'Por mês'}
            </CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                {ano === null ? (
                  <LineChart data={comparativoAnual}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" fontSize={12} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    {anosComparativo.map((a, i) => (
                      <Line key={a} type="monotone" dataKey={String(a)} name={String(a)}
                        stroke={CORES[i % CORES.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : (
                  <LineChart data={porMes}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nome" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">
              {ano === null ? 'Ranking por área (por ano · top 10)' : 'Por área (top 10)'}
            </CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={ano === null ? 320 : 260}>
                {ano === null ? (
                  <BarChart data={areaPorAno} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" fontSize={11} width={110} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    {anosEntries.map((a, i) => (
                      <Bar key={a} dataKey={String(a)} name={String(a)} fill={CORES[i % CORES.length]} radius={[0, 3, 3, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={porArea} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" fontSize={11} width={110} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#16a34a" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">
              {ano === null ? 'Ranking por colaborador (por ano · top 10)' : 'Por colaborador (top 10)'}
            </CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={ano === null ? 320 : 260}>
                {ano === null ? (
                  <BarChart data={colabPorAno} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" fontSize={11} width={120} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Legend />
                    {anosEntries.map((a, i) => (
                      <Bar key={a} dataKey={String(a)} name={String(a)} fill={CORES[i % CORES.length]} radius={[0, 3, 3, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={porColab} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" fontSize={11} width={120} />
                    <RTooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#7c3aed" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-4">
      {/* Lista */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {/* Filtros locais */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Input
              value={fColab}
              onChange={(e) => setFColab(e.target.value)}
              placeholder="Buscar colaborador…"
              className="w-56"
            />
            <Select value={fArea} onValueChange={setFArea}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {areasDisponiveis.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fMes} onValueChange={setFMes}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {(fColab || fArea !== 'all' || fMes !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFColab(''); setFArea('all'); setFMes('all'); }}>
                Limpar
              </Button>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : entriesLista.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lançamento com os filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Colaborador</th>
                    <th className="py-2 pr-4">Período</th>
                    <th className="py-2 pr-4">Regime</th>
                    <th className="py-2 pr-4">Área</th>
                    <th className="py-2 pr-4 text-right">Horas</th>
                    <th className="py-2 pr-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesLista.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{e.colaborador_nome}</td>
                      <td className="py-2 pr-4">{MESES[e.mes - 1]}/{e.ano}</td>
                      <td className="py-2 pr-4">{REGIME_LABEL[e.regime ?? ''] ?? e.regime ?? '—'}</td>
                      <td className="py-2 pr-4">{e.area ?? '—'}</td>
                      <td className="py-2 pr-4 text-right">{fmtHoras(Number(e.horas))}</td>
                      <td className="py-2 pr-4 text-right">{fmtBRL(Number(e.valor))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pendencias" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pendências de conciliação</CardTitle></CardHeader>
            <CardContent>
              <OvertimePendingTab onResolved={refetchAll} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OvertimeManualDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refetchAll} />
      <OvertimeImportDialog open={importOpen} onOpenChange={setImportOpen} onSaved={refetchAll} />
    </div>
  );
}
