import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Upload, Download } from 'lucide-react';
import { useOvertimeData } from '@/hooks/useOvertimeData';
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

export default function OvertimePage() {
  const now = new Date();
  const [ano, setAno] = useState<number | null>(now.getFullYear());
  const [mes, setMes] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { entries, availableYears, isLoading, refetch } = useOvertimeData({ year: ano, month: mes });

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

  const totais = useMemo(() => ({
    valor: entries.reduce((s, e) => s + Number(e.valor), 0),
    horas: entries.reduce((s, e) => s + Number(e.horas), 0),
    lancamentos: entries.length,
  }), [entries]);

  const anos = availableYears.length ? availableYears : [now.getFullYear()];

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

  // Por área (top 8)
  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = e.area ?? 'Sem área';
      m.set(k, (m.get(k) ?? 0) + Number(e.valor));
    }
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [entries]);

  // Por colaborador (top 10)
  const porColab = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.colaborador_nome, (m.get(e.colaborador_nome) ?? 0) + Number(e.valor));
    return Array.from(m, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [entries]);

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

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências{pendCount > 0 ? ` (${pendCount})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-6 mt-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtBRL(totais.valor)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Horas totais</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmtHoras(totais.horas)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lançamentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totais.lancamentos}</p></CardContent></Card>
      </div>

      {/* Dashboards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Por regime</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porRegime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nome" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {porRegime.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Por mês</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nome" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(v: number) => fmtBRL(v)} />
                  <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Por área (top 8)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porArea} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" fontSize={11} width={110} />
                  <RTooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Por colaborador (top 10)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porColab} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" fontSize={11} width={120} />
                  <RTooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lançamento no período.</p>
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
                  {entries.map((e) => (
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
