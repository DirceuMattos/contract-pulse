import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Label,
  LabelList,
} from 'recharts';
import { Activity, BriefcaseBusiness, Building2, DollarSign, Shield, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { buildHRDashboardSummary, HRAllocationMetric } from '@/lib/hrDashboard';
import { formatCurrency, formatPercentage } from '@/lib/calculations';

type MetricMode = 'quantity' | 'cost';

const allocationColors = ['#16a34a', '#f59e0b'];
const statusColors = ['#22c55e', '#3b82f6', '#f97316'];
const distributionPalettes = {
  team: ['#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#06b6d4', '#64748b'],
  job: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'],
  vinculo: ['#14b8a6', '#f97316', '#6366f1', '#eab308', '#ec4899', '#64748b'],
  level: ['#22c55e', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#64748b'],
  local: ['#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444', '#64748b'],
  tenure: ['#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#f97316'],
};
const chartCardClass = 'bg-slate-50/90 dark:bg-slate-900/55 border-slate-200 dark:border-slate-800 shadow-sm';
const tabPanelClass = 'rounded-lg bg-slate-100/75 dark:bg-slate-950/45 p-4 space-y-4';

const vinculoLabels: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  cooperado: 'Cooperado',
  socio: 'Socio',
  estagio: 'Estagio',
};

function formatMaybeCurrency(value: number, canViewValues: boolean): string {
  return canViewValues ? formatCurrency(value) : 'Confidencial';
}

function formatPeople(value: number): string {
  return `${value} pessoa${value === 1 ? '' : 's'}`;
}

function formatShortCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)} mi`;
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)} mil`;
  return formatCurrency(value);
}

function metricValueLabel(value: number, mode: MetricMode, canViewValues: boolean): string {
  if (mode === 'cost' && canViewValues) return formatShortCurrency(value);
  return String(value);
}

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className={`border-l-4 ${tone}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function groupMetrics(
  metrics: HRAllocationMetric[],
  getLabel: (metric: HRAllocationMetric) => string,
) {
  const grouped = new Map<string, { name: string; pessoas: number; valor: number }>();

  for (const metric of metrics) {
    const name = getLabel(metric) || 'Não informado';
    const current = grouped.get(name) || { name, pessoas: 0, valor: 0 };
    current.pessoas += 1;
    current.valor += metric.totalCost;
    grouped.set(name, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.valor - a.valor || b.pessoas - a.pessoas || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 12);
}

function groupBnpMetrics(
  metrics: HRAllocationMetric[],
  getLabel: (metric: HRAllocationMetric) => string,
) {
  const grouped = new Map<string, { name: string; pessoas: number; valor: number }>();

  for (const metric of metrics) {
    if (metric.bnpCost <= 0) continue;
    const name = getLabel(metric) || 'Não informado';
    const current = grouped.get(name) || { name, pessoas: 0, valor: 0 };
    current.pessoas += 1;
    current.valor += metric.bnpCost;
    grouped.set(name, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.valor - a.valor || b.pessoas - a.pessoas || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 8);
}

function getTenureBucket(admissionDate: string): string {
  const admission = new Date(`${admissionDate}T12:00:00`);
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - admission.getFullYear()) * 12 + now.getMonth() - admission.getMonth());

  if (months < 6) return 'Até 6 meses';
  if (months < 12) return '6 a 12 meses';
  if (months < 24) return '1 a 2 anos';
  if (months < 36) return '2 a 3 anos';
  if (months < 60) return '3 a 5 anos';
  return '5+ anos';
}

function getLastTwelveMonths() {
  const months: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();

  for (let offset = 11; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const month = start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const label = `${month.charAt(0).toUpperCase()}${month.slice(1)}/${String(start.getFullYear()).slice(2)}`;
    months.push({ label, start, end });
  }

  return months;
}

function DistributionChart({
  title,
  data,
  mode,
  canViewValues,
  palette,
  axisLabel,
  className = '',
  contentClassName = 'h-[320px]',
}: {
  title: string;
  data: { name: string; pessoas: number; valor: number }[];
  mode: MetricMode;
  canViewValues: boolean;
  palette: string[];
  axisLabel: string;
  className?: string;
  contentClassName?: string;
}) {
  const dataKey = mode === 'cost' && canViewValues ? 'valor' : 'pessoas';
  const valueLabel = dataKey === 'valor' ? 'Custo' : 'Pessoas';

  return (
    <Card className={`${chartCardClass} ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary">{valueLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 96, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => dataKey === 'valor' ? formatShortCurrency(Number(value)) : String(value)}
            >
              <Label value={valueLabel} offset={-10} position="insideBottom" className="fill-muted-foreground text-[11px]" />
            </XAxis>
            <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'valor' ? formatMaybeCurrency(value, canViewValues) : formatPeople(value),
                name === 'valor' ? 'Custo' : 'Pessoas',
              ]}
              labelFormatter={(label) => `${axisLabel}: ${label}`}
            />
            <Bar dataKey={dataKey} name={valueLabel} radius={[0, 5, 5, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
              <LabelList
                dataKey={dataKey}
                position="right"
                formatter={(value: number) => metricValueLabel(value, mode, canViewValues)}
                className="fill-foreground text-[11px]"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function HRDashboardPage() {
  const [metricMode, setMetricMode] = useState<MetricMode>('quantity');
  const { canViewHRCosts } = useAuth();
  const { resources, settings, teams, jobTitles } = useData();
  const { hrPeople } = useHR();
  const { subprojects, allocations } = useSubprojects();

  const summary = useMemo(
    () => buildHRDashboardSummary(hrPeople, resources, subprojects, allocations, settings),
    [hrPeople, resources, subprojects, allocations, settings],
  );

  const teamNameById = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const jobTitleById = useMemo(() => new Map(jobTitles.map((jobTitle) => [jobTitle.id, jobTitle.label])), [jobTitles]);

  const allocationChartData = [
    {
      name: 'Pago por contratos',
      pessoas: summary.allocatedPeople + summary.partiallyAllocatedPeople,
      valor: summary.allocatedCost,
      percentual: summary.allocatedPercent,
    },
    {
      name: 'Absorvido pela BNP',
      pessoas: summary.unallocatedPeople + summary.partiallyAllocatedPeople,
      valor: summary.bnpCost,
      percentual: summary.bnpPercent,
    },
  ];

  const statusData = [
    { name: '100% alocados', pessoas: summary.allocatedPeople, valor: summary.metrics.filter((m) => m.allocatedPercent >= 100).reduce((sum, m) => sum + m.totalCost, 0) },
    { name: 'Parciais', pessoas: summary.partiallyAllocatedPeople, valor: summary.metrics.filter((m) => m.allocatedPercent > 0 && m.allocatedPercent < 100).reduce((sum, m) => sum + m.totalCost, 0) },
    { name: 'Sem alocação', pessoas: summary.unallocatedPeople, valor: summary.metrics.filter((m) => m.allocatedPercent === 0).reduce((sum, m) => sum + m.totalCost, 0) },
  ];

  const distributionData = useMemo(() => ({
    byTeam: groupMetrics(summary.metrics, (metric) => teamNameById.get(metric.person.teamId || '') || 'Sem área'),
    byJobTitle: groupMetrics(summary.metrics, (metric) => jobTitleById.get(metric.person.cargoId || '') || metric.person.cargoAntigo || 'Sem cargo'),
    byVinculo: groupMetrics(summary.metrics, (metric) => vinculoLabels[metric.person.tipoVinculo] || metric.person.tipoVinculo),
    byNivel: groupMetrics(summary.metrics, (metric) => metric.person.nivel || 'Não informado'),
    byLocal: groupMetrics(summary.metrics, (metric) => metric.person.localAtuacao || 'Não informado'),
    byTenure: groupMetrics(summary.metrics, (metric) => getTenureBucket(metric.person.dataAdmissao)),
  }), [summary.metrics, teamNameById, jobTitleById]);

  const bnpExposureByTeam = useMemo(
    () => groupBnpMetrics(summary.metrics, (metric) => teamNameById.get(metric.person.teamId || '') || 'Sem área'),
    [summary.metrics, teamNameById],
  );

  const turnoverData = useMemo(() => {
    return getLastTwelveMonths().map((month) => {
      const entradas = hrPeople.filter((person) => {
        const admission = new Date(`${person.dataAdmissao}T12:00:00`);
        return admission >= month.start && admission <= month.end;
      }).length;

      const saidas = hrPeople.filter((person) => {
        if (!person.dataDesligamento) return false;
        const departure = new Date(`${person.dataDesligamento}T12:00:00`);
        return departure >= month.start && departure <= month.end;
      }).length;

      const headcount = hrPeople.filter((person) => {
        const admission = new Date(`${person.dataAdmissao}T12:00:00`);
        const departure = person.dataDesligamento ? new Date(`${person.dataDesligamento}T12:00:00`) : null;
        return admission <= month.end && (!departure || departure > month.end);
      }).length;

      return {
        mes: month.label,
        entradas,
        saidas,
        turnover: headcount > 0 ? (saidas / headcount) * 100 : 0,
      };
    });
  }, [hrPeople]);

  const metricModeLabel = metricMode === 'cost' && canViewHRCosts ? 'Valores' : 'Quantidades';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard RH"
        description="Visão gerencial de custos, alocação e exposição BNP dos recursos humanos."
        animated={false}
      />

      {!canViewHRCosts && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium">Valores financeiros ocultos</p>
              <p className="text-sm text-muted-foreground">
                Seu perfil pode acessar a visão quantitativa do Dashboard RH, mas os custos permanecem confidenciais.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="distributions">Distribuições</TabsTrigger>
            <TabsTrigger value="lifecycle">Ciclo de pessoas</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{metricModeLabel}</Badge>
            <Button
              type="button"
              variant={metricMode === 'quantity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetricMode('quantity')}
            >
              Quantidades
            </Button>
            {canViewHRCosts && (
              <Button
                type="button"
                variant={metricMode === 'cost' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetricMode('cost')}
              >
                Valores
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="overview" className={tabPanelClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              title="RHs ativos"
              value={String(summary.activePeople)}
              description="Pessoas ativas no cadastro mestre"
              icon={<UsersRound className="h-5 w-5 text-primary" />}
              tone="border-l-primary"
            />
            <KpiCard
              title="Custo total com RH"
              value={formatMaybeCurrency(summary.totalCost, canViewHRCosts)}
              description="Remuneração + encargos + benefícios"
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              tone="border-l-emerald-500"
            />
            <KpiCard
              title="Pago por contratos"
              value={canViewHRCosts ? formatCurrency(summary.allocatedCost) : formatPeople(summary.allocatedPeople + summary.partiallyAllocatedPeople)}
              description={`${formatPercentage(summary.allocatedPercent)} do custo total`}
              icon={<BriefcaseBusiness className="h-5 w-5 text-sky-600" />}
              tone="border-l-sky-500"
            />
            <KpiCard
              title="Absorvido pela BNP"
              value={canViewHRCosts ? formatCurrency(summary.bnpCost) : formatPeople(summary.unallocatedPeople + summary.partiallyAllocatedPeople)}
              description={`${formatPercentage(summary.bnpPercent)} do custo total`}
              icon={<Building2 className="h-5 w-5 text-amber-600" />}
              tone="border-l-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            <Card className={`xl:col-span-2 ${chartCardClass}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Alocação financeira</CardTitle>
                  <Badge variant="secondary">{canViewHRCosts ? 'Custo' : 'Pessoas'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationChartData} dataKey={canViewHRCosts ? 'valor' : 'pessoas'} nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={4} strokeWidth={3}>
                        {allocationChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={allocationColors[index % allocationColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : formatPeople(value),
                          name === 'valor' ? 'Custo' : 'Pessoas',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs uppercase text-muted-foreground">Total RH</span>
                    <span className="text-xl font-bold">{formatMaybeCurrency(summary.totalCost, canViewHRCosts)}</span>
                    <span className="text-xs text-muted-foreground">{summary.activePeople} ativos</span>
                  </div>
                </div>
                <div className="space-y-3 self-center">
                  {allocationChartData.map((entry, index) => (
                    <div key={entry.name} className="rounded-md border bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: allocationColors[index] }} />
                          <span className="text-sm font-medium">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatPercentage(entry.percentual)}</span>
                      </div>
                      <p className="mt-2 text-lg font-bold">
                        {canViewHRCosts ? formatCurrency(entry.valor) : formatPeople(entry.pessoas)}
                      </p>
                      <Progress value={entry.percentual} className="mt-2 h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={`xl:col-span-3 ${chartCardClass}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Situação de alocação</CardTitle>
                  <Badge variant="secondary">{metricMode === 'cost' && canViewHRCosts ? 'Custo total' : 'Pessoas'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 10, right: 52, left: 104, bottom: 26 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => metricMode === 'cost' && canViewHRCosts ? formatShortCurrency(Number(value)) : String(value)}
                    >
                      <Label value={metricMode === 'cost' && canViewHRCosts ? 'Custo total' : 'Pessoas'} offset={-12} position="insideBottom" className="fill-muted-foreground text-[11px]" />
                    </XAxis>
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={102} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : formatPeople(value),
                        name === 'valor' ? 'Custo' : 'Pessoas',
                      ]}
                    />
                    <Bar dataKey={metricMode === 'cost' && canViewHRCosts ? 'valor' : 'pessoas'} radius={[0, 6, 6, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                      ))}
                      <LabelList
                        dataKey={metricMode === 'cost' && canViewHRCosts ? 'valor' : 'pessoas'}
                        position="right"
                        formatter={(value: number) => metricValueLabel(value, metricMode, canViewHRCosts)}
                        className="fill-foreground text-[11px]"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={chartCardClass}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Custo BNP por área</CardTitle>
                <Badge variant="outline">{bnpExposureByTeam.length} áreas</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bnpExposureByTeam.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma área com custo BNP no momento.
                </div>
              ) : (
                <>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bnpExposureByTeam} layout="vertical" margin={{ top: 8, right: 48, left: 112, bottom: 26 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => canViewHRCosts ? formatShortCurrency(Number(value)) : String(value)}
                        >
                          <Label value={canViewHRCosts ? 'Custo BNP' : 'Pessoas'} offset={-12} position="insideBottom" className="fill-muted-foreground text-[11px]" />
                        </XAxis>
                        <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : formatPeople(value),
                            name === 'valor' ? 'Custo BNP' : 'Pessoas',
                          ]}
                          labelFormatter={(label) => `Área: ${label}`}
                        />
                        <Bar dataKey={canViewHRCosts ? 'valor' : 'pessoas'} radius={[0, 6, 6, 0]}>
                          {bnpExposureByTeam.map((entry, index) => (
                            <Cell key={entry.name} fill={distributionPalettes.team[index % distributionPalettes.team.length]} />
                          ))}
                          <LabelList
                            dataKey={canViewHRCosts ? 'valor' : 'pessoas'}
                            position="right"
                            formatter={(value: number) => canViewHRCosts ? formatShortCurrency(value) : String(value)}
                            className="fill-foreground text-[11px]"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="rounded-md border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                    Composição: soma da parcela do custo de RH ainda absorvida pela BNP em cada área,
                    considerando recursos sem alocação ou com dedicação parcial em contratos/subprojetos.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className={tabPanelClass}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DistributionChart title="Por área" data={distributionData.byTeam} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.team} axisLabel="Área" className="xl:col-span-2" contentClassName="h-[400px]" />
            <DistributionChart title="Por cargo / função" data={distributionData.byJobTitle} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.job} axisLabel="Cargo" className="xl:col-span-2" contentClassName="h-[400px]" />
            <DistributionChart title="Por forma de contratação" data={distributionData.byVinculo} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.vinculo} axisLabel="Contratação" />
            <DistributionChart title="Por nível" data={distributionData.byNivel} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.level} axisLabel="Nível" />
            <DistributionChart title="Por local de atuação" data={distributionData.byLocal} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.local} axisLabel="Local" />
            <DistributionChart title="Por tempo de casa" data={distributionData.byTenure} mode={metricMode} canViewValues={canViewHRCosts} palette={distributionPalettes.tenure} axisLabel="Tempo de casa" />
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className={tabPanelClass}>
          <Card className={chartCardClass}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Curva de turnover - últimos 12 meses</CardTitle>
                <Badge variant="secondary">Pessoas x Turnover</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={turnoverData} margin={{ top: 18, right: 34, left: 18, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }}>
                    <Label value="Mês" offset={-16} position="insideBottom" className="fill-muted-foreground text-[11px]" />
                  </XAxis>
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false}>
                    <Label value="Pessoas" angle={-90} position="insideLeft" className="fill-muted-foreground text-[11px]" />
                  </YAxis>
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`}>
                    <Label value="Turnover %" angle={90} position="insideRight" className="fill-muted-foreground text-[11px]" />
                  </YAxis>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'turnover' ? `${value.toFixed(1)}%` : formatPeople(value),
                      name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saidas' : 'Turnover',
                    ]}
                  />
                  <Legend verticalAlign="top" align="center" height={36} wrapperStyle={{ paddingBottom: 8 }} />
                  <Line yAxisId="left" type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="left" type="monotone" dataKey="saidas" name="Saidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="turnover" name="Turnover" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DistributionChart title="Concentracao por tempo de casa" data={distributionData.byTenure} mode="quantity" canViewValues={canViewHRCosts} palette={distributionPalettes.tenure} axisLabel="Tempo de casa" />
            <DistributionChart title="Custo por tempo de casa" data={distributionData.byTenure} mode={canViewHRCosts ? 'cost' : 'quantity'} canViewValues={canViewHRCosts} palette={distributionPalettes.tenure} axisLabel="Tempo de casa" />
          </div>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Esta versao usa a regra unificada de custo de RH e considera alocacoes diretas em contratos e subprojetos.
            Quando houver subprojeto para a mesma pessoa no mesmo contrato, a alocação direta desse contrato é ignorada para evitar duplicidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
