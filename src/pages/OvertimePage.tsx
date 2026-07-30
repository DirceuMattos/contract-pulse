import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock } from 'lucide-react';
import { useOvertimeData } from '@/hooks/useOvertimeData';
import { OvertimeManualDialog } from '@/components/overtime/OvertimeManualDialog';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const REGIME_LABEL: Record<string, string> = { clt: 'CLT', pj: 'PJ', cooperado: 'Cooperado', socio: 'Sócio', estagio: 'Estágio' };
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtHoras = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export default function OvertimePage() {
  const now = new Date();
  const [ano, setAno] = useState<number | null>(now.getFullYear());
  const [mes, setMes] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { entries, availableYears, isLoading, refetch } = useOvertimeData({ year: ano, month: mes });

  const totais = useMemo(() => ({
    valor: entries.reduce((s, e) => s + Number(e.valor), 0),
    horas: entries.reduce((s, e) => s + Number(e.horas), 0),
    lancamentos: entries.length,
  }), [entries]);

  const anos = availableYears.length ? availableYears : [now.getFullYear()];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />Adm Horas Extras</h1>
          <p className="text-muted-foreground text-sm">Lançamentos e evolução das horas extras.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
      </div>

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

      <OvertimeManualDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refetch} />
    </div>
  );
}
