import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Car,
  MapPin,
  Users,
  Route as RouteIcon,
  Activity,
  DollarSign,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransportImportDialog } from '@/components/transport/TransportImportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransportData, TransportRide } from '@/hooks/useTransportData';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (v: number, d = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function sum(arr: TransportRide[], k: 'value' | 'distance_km') {
  return arr.reduce((s, r) => s + (Number(r[k]) || 0), 0);
}

const VEHICLE_COST_KEY = 'transport-vehicle-cost';

export default function TransportPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importModelo, setImportModelo] = useState<'99corp' | 'uber'>('99corp');
  const [vehicleCost, setVehicleCost] = useState<number>(() => {
    const v = Number(localStorage.getItem(VEHICLE_COST_KEY));
    return v > 0 ? v : 3000;
  });
  const [sortKey, setSortKey] = useState<'rides' | 'km' | 'total' | 'avg' | 'name'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { rides, previousRides, last3Months, yearlyComparison, availableYears, isLoading, refetch } =
    useTransportData({ year, month });

  const totals = useMemo(() => {
    const totalValue = sum(rides, 'value');
    const totalKm = sum(rides, 'distance_km');
    const prevTotal = sum(previousRides, 'value');
    const collaborators = new Set(rides.map((r) => r.collaborator_email || r.collaborator_name).filter(Boolean));
    const delta = prevTotal > 0 ? ((totalValue - prevTotal) / prevTotal) * 100 : 0;
    return {
      totalValue,
      totalKm,
      avgPerKm: totalKm > 0 ? totalValue / totalKm : 0,
      rideCount: rides.length,
      collaborators: collaborators.size,
      avgPerCollab: collaborators.size > 0 ? totalValue / collaborators.size : 0,
      delta,
      prevTotal,
    };
  }, [rides, previousRides]);

  const monthlyChart = useMemo(() => {
    const map = new Map<number, number>();
    rides.forEach((r) => {
      const m = r.month ?? (r.ride_start_at ? new Date(r.ride_start_at).getMonth() + 1 : 0);
      if (!m) return;
      map.set(m, (map.get(m) || 0) + (Number(r.value) || 0));
    });
    return MONTHS.map((label, i) => ({ mes: label.slice(0, 3), total: map.get(i + 1) || 0 }));
  }, [rides]);

  const yearlyChart = useMemo(() => {
    const byYM = new Map<string, number>();
    yearlyComparison.forEach((r) => {
      if (!r.year || !r.month) return;
      const k = `${r.year}-${r.month}`;
      byYM.set(k, (byYM.get(k) || 0) + (Number(r.value) || 0));
    });
    const years = [year - 2, year - 1, year];
    return MONTHS.map((label, i) => {
      const row: Record<string, number | string> = { mes: label.slice(0, 3) };
      years.forEach((y) => {
        row[String(y)] = byYM.get(`${y}-${i + 1}`) || 0;
      });
      return row;
    });
  }, [yearlyComparison, year]);

  const vehicleAnalysis = useMemo(() => {
    const byMonth = new Map<string, number>();
    last3Months.forEach((r) => {
      if (!r.year || !r.month) return;
      const k = `${r.year}-${r.month}`;
      byMonth.set(k, (byMonth.get(k) || 0) + (Number(r.value) || 0));
    });
    const values = Array.from(byMonth.values());
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return { avg, worthVehicle: avg > vehicleCost };
  }, [last3Months, vehicleCost]);

  const byCollaborator = useMemo(() => {
    const map = new Map<string, { name: string; rides: number; km: number; total: number }>();
    rides.forEach((r) => {
      const name = r.collaborator_name || r.collaborator_email || '—';
      const cur = map.get(name) || { name, rides: 0, km: 0, total: 0 };
      cur.rides++;
      cur.km += Number(r.distance_km) || 0;
      cur.total += Number(r.value) || 0;
      map.set(name, cur);
    });
    const list = Array.from(map.values()).map((c) => ({
      ...c,
      avg: c.rides > 0 ? c.total / c.rides : 0,
    }));
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return list;
  }, [rides, sortKey, sortDir]);

  const topDestinations = useMemo(() => {
    const map = new Map<string, { addr: string; count: number; total: number }>();
    rides.forEach((r) => {
      const addr = r.destination_address?.trim();
      if (!addr) return;
      const cur = map.get(addr) || { addr, count: 0, total: 0 };
      cur.count++;
      cur.total += Number(r.value) || 0;
      map.set(addr, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rides]);

  const bySupervisor = useMemo(() => {
    const map = new Map<string, { name: string; rides: number; km: number; total: number }>();
    rides.forEach((r) => {
      const name = r.supervisor_name?.trim() || '—';
      const cur = map.get(name) || { name, rides: 0, km: 0, total: 0 };
      cur.rides++;
      cur.km += Number(r.distance_km) || 0;
      cur.total += Number(r.value) || 0;
      map.set(name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rides]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  const handleClearFilters = () => {
    setYear(now.getFullYear());
    setMonth(null);
  };

  const handleVehicleCost = (v: string) => {
    const n = Number(v);
    setVehicleCost(n);
    localStorage.setItem(VEHICLE_COST_KEY, String(n));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Adm Deslocamento por Aplicativo"
        description="Gestão de gastos com deslocamento de colaboradores"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Importar planilha
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setImportModelo('99corp');
                  setImportOpen(true);
                }}
              >
                99Corp
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setImportModelo('uber');
                  setImportOpen(true);
                }}
              >
                Uber for Business
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ano</label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mês</label>
            <Select
              value={month ? String(month) : 'all'}
              onValueChange={(v) => setMonth(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Total Gasto no Período"
          value={fmtBRL(totals.totalValue)}
          extra={
            totals.prevTotal > 0 && (
              <Badge variant={totals.delta >= 0 ? 'destructive' : 'default'} className="gap-1">
                {totals.delta >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {totals.delta >= 0 ? '+' : ''}
                {totals.delta.toFixed(1)}% vs período anterior
              </Badge>
            )
          }
        />
        <SummaryCard
          icon={<RouteIcon className="w-4 h-4" />}
          label="Total KM Rodado"
          value={`${fmtNum(totals.totalKm, 1)} km`}
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4" />}
          label="Custo Médio por KM"
          value={fmtBRL(totals.avgPerKm)}
        />
        <SummaryCard
          icon={<Car className="w-4 h-4" />}
          label="Nº de Corridas"
          value={fmtNum(totals.rideCount)}
        />
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="Colaboradores Ativos"
          value={fmtNum(totals.collaborators)}
        />
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="Média por Colaborador"
          value={fmtBRL(totals.avgPerCollab)}
        />
      </div>

      {/* Vale ter veículo? */}
      <Card
        className={`border-2 ${
          vehicleAnalysis.worthVehicle ? 'border-destructive/50' : 'border-emerald-500/50'
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="w-5 h-5" /> Vale ter veículo próprio?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Custo fixo mensal de um veículo</label>
              <Input
                type="number"
                value={vehicleCost}
                onChange={(e) => handleVehicleCost(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="text-sm">
              <p>
                Gasto médio com transporte (últimos 3 meses):{' '}
                <span className="font-semibold">{fmtBRL(vehicleAnalysis.avg)}</span>
              </p>
              <p className="text-muted-foreground">Custo veículo informado: {fmtBRL(vehicleCost)}</p>
            </div>
          </div>
          {vehicleAnalysis.worthVehicle ? (
            <Badge variant="destructive">Considere ter veículo próprio</Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Transporte por app é mais econômico</Badge>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos mensais — {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <RTooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativo ano a ano</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={yearlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <RTooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                {[year - 2, year - 1, year].map((y, i) => (
                  <Line
                    key={y}
                    type="monotone"
                    dataKey={String(y)}
                    stroke={['hsl(var(--muted-foreground))', 'hsl(var(--accent-foreground))', 'hsl(var(--primary))'][i]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking por colaborador</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Colaborador" k="name" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHead label="Corridas" k="rides" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHead label="KM" k="km" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHead label="Total" k="total" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortableHead label="Média/corrida" k="avg" sortKey={sortKey} dir={sortDir} onClick={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCollaborator.slice(0, 20).map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.rides}</TableCell>
                    <TableCell>{fmtNum(c.km, 1)}</TableCell>
                    <TableCell>{fmtBRL(c.total)}</TableCell>
                    <TableCell>{fmtBRL(c.avg)}</TableCell>
                  </TableRow>
                ))}
                {byCollaborator.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top 10 destinos
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Corridas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDestinations.map((d) => (
                  <TableRow key={d.addr}>
                    <TableCell className="max-w-xs truncate" title={d.addr}>
                      {d.addr}
                    </TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="text-right">{fmtBRL(d.total)}</TableCell>
                  </TableRow>
                ))}
                {topDestinations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Por supervisor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totais por supervisor / área</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-right">Corridas</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySupervisor.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.rides}</TableCell>
                  <TableCell className="text-right">{fmtNum(s.km, 1)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(s.total)}</TableCell>
                </TableRow>
              ))}
              {bySupervisor.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem dados no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <TransportImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetch} modelo={importModelo} />
    </motion.div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {extra}
      </CardContent>
    </Card>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  dir,
  onClick,
}: {
  label: string;
  k: 'rides' | 'km' | 'total' | 'avg' | 'name';
  sortKey: string;
  dir: 'asc' | 'desc';
  onClick: (k: any) => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onClick(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
        {sortKey === k && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </TableHead>
  );
}
