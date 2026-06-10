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
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  Cell,
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

const YEAR_COLORS = [
  'hsl(210, 85%, 55%)',
  'hsl(340, 80%, 55%)',
  'hsl(150, 75%, 45%)',
  'hsl(40, 90%, 55%)',
  'hsl(280, 70%, 60%)',
  'hsl(190, 85%, 50%)',
  'hsl(25, 90%, 55%)',
  'hsl(120, 65%, 45%)',
  'hsl(260, 75%, 60%)',
  'hsl(55, 90%, 50%)',
];

const VEHICLE_COSTS_KEY = 'transport_vehicle_costs';

type VehicleCosts = {
  locacao: number;
  combustivel: number;
  manutencao: number;
  seguro: number;
  motoristaClt: number;
  outros: number;
};
type VehicleSource = 'ai' | 'manual' | 'default';
type VehicleMeta = { source: VehicleSource; updatedAt: string | null };

const DEFAULT_VEHICLE_COSTS: VehicleCosts = {
  locacao: 3000,
  combustivel: 800,
  manutencao: 400,
  seguro: 500,
  motoristaClt: 4000,
  outros: 300,
};

const VEHICLE_FIELDS: { key: keyof VehicleCosts; label: string }[] = [
  { key: 'locacao', label: 'Locação/Financiamento' },
  { key: 'combustivel', label: 'Combustível' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'seguro', label: 'Seguro' },
  { key: 'motoristaClt', label: 'Motorista CLT' },
  { key: 'outros', label: 'Outros' },
];

function loadVehicleState(): { costs: VehicleCosts; meta: VehicleMeta } {
  try {
    const raw = localStorage.getItem(VEHICLE_COSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.costs && parsed?.meta) {
        return {
          costs: { ...DEFAULT_VEHICLE_COSTS, ...parsed.costs },
          meta: parsed.meta,
        };
      }
    }
  } catch {}
  return { costs: DEFAULT_VEHICLE_COSTS, meta: { source: 'default', updatedAt: null } };
}

export default function TransportPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = useState<number | null>(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importModelo, setImportModelo] = useState<'99corp' | 'uber'>('99corp');
  const initialVehicle = loadVehicleState();
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCosts>(initialVehicle.costs);
  const [vehicleMeta, setVehicleMeta] = useState<VehicleMeta>(initialVehicle.meta);
  const [aiLoading, setAiLoading] = useState(false);
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
    if (year === null) {
      // Agrupar por ano quando "todos os anos"
      const map = new Map<number, number>();
      rides.forEach((r) => {
        const y = r.year ?? (r.ride_start_at ? new Date(r.ride_start_at).getFullYear() : 0);
        if (!y) return;
        map.set(y, (map.get(y) || 0) + (Number(r.value) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([y, total]) => ({ mes: String(y), total }));
    }
    const map = new Map<number, number>();
    rides.forEach((r) => {
      const m = r.month ?? (r.ride_start_at ? new Date(r.ride_start_at).getMonth() + 1 : 0);
      if (!m) return;
      map.set(m, (map.get(m) || 0) + (Number(r.value) || 0));
    });
    return MONTHS.map((label, i) => ({ mes: label.slice(0, 3), total: map.get(i + 1) || 0 }));
  }, [rides, year]);

  const yearlyChart = useMemo(() => {
    const byYM = new Map<string, number>();
    yearlyComparison.forEach((r) => {
      if (!r.year || !r.month) return;
      const k = `${r.year}-${r.month}`;
      byYM.set(k, (byYM.get(k) || 0) + (Number(r.value) || 0));
    });
    const years =
      year === null
        ? availableYears.slice().sort((a, b) => a - b)
        : [year - 2, year - 1, year];
    return MONTHS.map((label, i) => {
      const row: Record<string, number | string> = { mes: label.slice(0, 3) };
      years.forEach((y) => {
        row[String(y)] = byYM.get(`${y}-${i + 1}`) || 0;
      });
      return row;
    });
  }, [yearlyComparison, year, availableYears]);



  const comparisonYears = useMemo(
    () =>
      year === null
        ? availableYears.slice().sort((a, b) => a - b)
        : [year - 2, year - 1, year],
    [year, availableYears],
  );

  const latestPeriod = useMemo(() => {
    const anos = Array.from(new Set(yearlyComparison.map((r) => r.year).filter(Boolean) as number[]));
    const latestYear = anos.length ? Math.max(...anos) : 0;
    const meses = latestYear
      ? (yearlyComparison
          .filter((r) => r.year === latestYear && r.month)
          .map((r) => r.month) as number[])
      : [];
    const latestMonth = meses.length ? Math.max(...meses) : 12;
    return { latestYear, latestMonth };
  }, [yearlyComparison]);

  const yearlyTotals = useMemo(() => {
    const map = new Map<number, number>();
    yearlyComparison.forEach((r) => {
      if (!r.year || !r.month) return;
      // Ano atual: cortar no mês vigente. Anos anteriores: total completo.
      if (r.year === currentYear && r.month > currentMonth) return;
      map.set(r.year, (map.get(r.year) || 0) + (Number(r.value) || 0));
    });
    const years = Array.from(map.keys()).sort((a, b) => a - b);
    return years.map((y, i) => {
      const total = map.get(y) || 0;
      const prev = i > 0 ? map.get(years[i - 1]) || 0 : null;
      const deltaAbs = prev === null ? null : total - prev;
      const deltaPct = prev === null || prev === 0 ? null : ((total - prev) / prev) * 100;
      return { year: y, total, deltaAbs, deltaPct };
    });
  }, [yearlyComparison, currentYear, currentMonth]);

  const yearProjection = useMemo(() => {
    const currentYearData = yearlyTotals.find((r) => r.year === currentYear);
    if (!currentYearData) return null;
    const monthsElapsed = currentMonth;
    const monthlyAvg = currentYearData.total / monthsElapsed;
    const monthsRemaining = 12 - monthsElapsed;
    const projectedTotal = currentYearData.total + monthlyAvg * monthsRemaining;
    const prevYearData = yearlyTotals.find((r) => r.year === currentYear - 1);
    const deltaAbs = prevYearData ? projectedTotal - prevYearData.total : null;
    const deltaPct =
      prevYearData && prevYearData.total > 0
        ? ((projectedTotal - prevYearData.total) / prevYearData.total) * 100
        : null;
    return { projectedTotal, monthlyAvg, monthsRemaining, deltaAbs, deltaPct };
  }, [yearlyTotals, currentYear, currentMonth]);

  const periodSummary = useMemo(() => {
    const inMonth = (m: number | null | undefined) => month === null || m === month;
    const abbr = (m: number) => MONTHS[m - 1]?.slice(0, 3).toLowerCase() ?? '';
    let total = 0;
    let prevTotal = 0;
    let comparisonLabel = '';
    let periodLabel = '';
    if (year === null) {
      yearlyComparison.forEach((r) => {
        if (!r.year || !inMonth(r.month)) return;
        // Ano atual cortado em currentMonth; anos anteriores completos.
        if (r.year === currentYear && r.month && r.month > currentMonth) return;
        total += Number(r.value) || 0;
      });
      periodLabel = `Todos os anos (${currentYear} até ${abbr(currentMonth)})`;
    } else {
      const isCurrentYear = year === currentYear;
      yearlyComparison.forEach((r) => {
        if (!inMonth(r.month)) return;
        if (r.year === year) {
          if (isCurrentYear && r.month && r.month > currentMonth) return;
          total += Number(r.value) || 0;
        } else if (r.year === year - 1) {
          if (month !== null) {
            prevTotal += Number(r.value) || 0;
          } else if (isCurrentYear && r.month && r.month <= currentMonth) {
            // Comparação justa: corta ano anterior em currentMonth.
            prevTotal += Number(r.value) || 0;
          } else if (!isCurrentYear) {
            prevTotal += Number(r.value) || 0;
          }
        }
      });
      if (month !== null) {
        comparisonLabel = `vs ${abbr(month)} ${year - 1}`;
        periodLabel = `${MONTHS[month - 1]} ${year}`;
      } else if (isCurrentYear) {
        comparisonLabel = `vs jan–${abbr(currentMonth)} ${year - 1}`;
        periodLabel = `Jan a ${abbr(currentMonth)} ${year}`;
      } else {
        comparisonLabel = `vs ${year - 1}`;
        periodLabel = `${year} completo`;
      }
    }
    const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
    return { total, prevTotal, delta, comparisonLabel, periodLabel };
  }, [yearlyComparison, year, month, currentYear, currentMonth]);

  const vehicleAnalysis = useMemo(() => {
    const byMonth = new Map<string, number>();
    last3Months.forEach((r) => {
      if (!r.year || !r.month) return;
      const k = `${r.year}-${r.month}`;
      byMonth.set(k, (byMonth.get(k) || 0) + (Number(r.value) || 0));
    });
    const values = Array.from(byMonth.values());
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const totalCost =
      vehicleCosts.locacao +
      vehicleCosts.combustivel +
      vehicleCosts.manutencao +
      vehicleCosts.seguro +
      vehicleCosts.motoristaClt +
      vehicleCosts.outros;
    return { avg, totalCost, worthVehicle: avg > totalCost };
  }, [last3Months, vehicleCosts]);

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

  const persistVehicle = (costs: VehicleCosts, meta: VehicleMeta) => {
    localStorage.setItem(VEHICLE_COSTS_KEY, JSON.stringify({ costs, meta }));
  };

  const handleVehicleField = (key: keyof VehicleCosts, v: string) => {
    const n = Number(v) || 0;
    const next = { ...vehicleCosts, [key]: n };
    const meta: VehicleMeta = { source: 'manual', updatedAt: new Date().toISOString() };
    setVehicleCosts(next);
    setVehicleMeta(meta);
    persistVehicle(next, meta);
  };

  const handleAiRefresh = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('transport-vehicle-market');
      if (error || !data || (data as any).error) throw error || new Error('AI error');
      const d = data as Record<string, number>;
      const next: VehicleCosts = {
        locacao: Number(d.locacao) || vehicleCosts.locacao,
        combustivel: Number(d.combustivel) || vehicleCosts.combustivel,
        manutencao: Number(d.manutencao) || vehicleCosts.manutencao,
        seguro: Number(d.seguro) || vehicleCosts.seguro,
        motoristaClt: Number(d.motorista_clt) || vehicleCosts.motoristaClt,
        outros: Number(d.outros) || vehicleCosts.outros,
      };
      const meta: VehicleMeta = { source: 'ai', updatedAt: new Date().toISOString() };
      setVehicleCosts(next);
      setVehicleMeta(meta);
      persistVehicle(next, meta);
      toast.success('Valores atualizados por IA');
    } catch {
      toast.warning('Não foi possível buscar valores atualizados. Usando últimos valores salvos.');
    } finally {
      setAiLoading(false);
    }
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
            <Select
              value={year === null ? 'all' : String(year)}
              onValueChange={(v) => setYear(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
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

      {/* Total Gasto no Período + evolução anual */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <DollarSign className="w-4 h-4" />
                <span>Total Gasto no Período</span>
              </div>
              <div className="text-xs text-muted-foreground">{periodSummary.periodLabel}</div>
              <div className="text-3xl font-bold">{fmtBRL(periodSummary.total)}</div>
              {periodSummary.prevTotal > 0 && (
                <Badge variant={periodSummary.delta >= 0 ? 'destructive' : 'default'} className="gap-1">
                  {periodSummary.delta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {periodSummary.delta >= 0 ? '+' : ''}
                  {periodSummary.delta.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
          {yearlyTotals.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Variação R$</TableHead>
                    <TableHead className="text-right">Variação %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyTotals.map((row, idx) => {
                    const isLatest = idx === yearlyTotals.length - 1;
                    const deltaClass =
                      row.deltaAbs === null
                        ? ''
                        : row.deltaAbs > 0
                          ? 'text-destructive'
                          : row.deltaAbs < 0
                            ? 'text-emerald-600'
                            : '';
                    return (
                      <TableRow key={row.year} className={isLatest ? 'font-bold' : ''}>
                        <TableCell>{row.year}</TableCell>
                        <TableCell className="text-right">{fmtBRL(row.total)}</TableCell>
                        <TableCell className={`text-right ${deltaClass}`}>
                          {row.deltaAbs === null
                            ? '—'
                            : `${row.deltaAbs >= 0 ? '+' : ''}${fmtBRL(row.deltaAbs)}`}
                        </TableCell>
                        <TableCell className={`text-right ${deltaClass}`}>
                          {row.deltaPct === null
                            ? '—'
                            : `${row.deltaPct >= 0 ? '+' : ''}${row.deltaPct.toFixed(1)}%`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {yearlyTotals.some((r) => r.year === currentYear) && (
                <p className="text-xs text-muted-foreground mt-2">
                  * {currentYear} considera jan–{MONTHS[currentMonth - 1]?.slice(0, 3).toLowerCase()}. Anos anteriores exibem total anual.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
          label="Colaboradores Usuários"
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
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5" /> Vale ter veículo próprio?
              </CardTitle>
              {(() => {
                const dateStr = vehicleMeta.updatedAt
                  ? new Date(vehicleMeta.updatedAt).toLocaleDateString('pt-BR')
                  : '';
                if (vehicleMeta.source === 'ai') {
                  return (
                    <Badge className="bg-blue-600 hover:bg-blue-600">
                      Atualizado por IA em {dateStr}
                    </Badge>
                  );
                }
                if (vehicleMeta.source === 'manual') {
                  return (
                    <Badge className="bg-yellow-500 hover:bg-yellow-500 text-black">
                      Valores inseridos manualmente em {dateStr}
                    </Badge>
                  );
                }
                return (
                  <Badge variant="secondary">Valores padrão (nunca atualizados)</Badge>
                );
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiRefresh}
              disabled={aiLoading}
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Buscando...' : 'Atualizar referências de mercado'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {VEHICLE_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <Input
                  type="number"
                  value={vehicleCosts[f.key]}
                  onChange={(e) => handleVehicleField(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="text-sm space-y-1">
            <p>
              Custo total estimado veículo + motorista:{' '}
              <span className="font-semibold">{fmtBRL(vehicleAnalysis.totalCost)}/mês</span>
            </p>
            <p>
              Média mensal BNP (últimos 3 meses):{' '}
              <span className="font-semibold">{fmtBRL(vehicleAnalysis.avg)}</span>
            </p>
          </div>
          {vehicleAnalysis.worthVehicle ? (
            <Badge variant="destructive">
              Considere ter veículo próprio (economia potencial de{' '}
              {fmtBRL(vehicleAnalysis.avg - vehicleAnalysis.totalCost)}/mês)
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              Transporte por app é mais econômico (economia de{' '}
              {fmtBRL(vehicleAnalysis.totalCost - vehicleAnalysis.avg)}/mês vs veículo)
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">
            * Valores estimados. Motorista CLT inclui salário base + encargos (FGTS, INSS, férias, 13º).
            Ajuste os campos conforme sua realidade.
          </p>
        </CardContent>
      </Card>


      {/* Gastos no período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {year === null ? 'Gastos por ano — Todos' : `Gastos mensais — ${year}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <RTooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {monthlyChart.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      year === null
                        ? YEAR_COLORS[index % YEAR_COLORS.length]
                        : `hsl(${210 + index * 18}, 80%, ${55 - index * 2}%)`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparativo ano a ano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo ano a ano</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={yearlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <RTooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              {comparisonYears.map((y, i) => (
                <Line
                  key={y}
                  type="monotone"
                  dataKey={String(y)}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
