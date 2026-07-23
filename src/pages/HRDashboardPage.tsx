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

const allocationColors = ['#22c55e', '#f59e0b'];

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
    const name = getLabel(metric) || 'Nao informado';
    const current = grouped.get(name) || { name, pessoas: 0, valor: 0 };
    current.pessoas += 1;
    current.valor += metric.totalCost;
    grouped.set(name, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.valor - a.valor || b.pessoas - a.pessoas || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 12);
}

function getTenureBucket(admissionDate: string): string {
  const admission = new Date(`${admissionDate}T12:00:00`);
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - admission.getFullYear()) * 12 + now.getMonth() - admission.getMonth());

  if (months < 6) return 'Ate 6 meses';
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
    const label = start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months.push({ label, start, end });
  }

  return months;
}

function DistributionChart({
  title,
  data,
  mode,
  canViewValues,
}: {
  title: string;
  data: { name: string; pessoas: number; valor: number }[];
  mode: MetricMode;
  canViewValues: boolean;
}) {
  const dataKey = mode === 'cost' && canViewValues ? 'valor' : 'pessoas';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 90, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === 'valor' ? formatMaybeCurrency(value, canViewValues) : formatPeople(value),
                name === 'valor' ? 'Valor' : 'Pessoas',
              ]}
            />
            <Bar dataKey={dataKey} name={dataKey === 'valor' ? 'Valor' : 'Pessoas'} fill={dataKey === 'valor' ? '#14b8a6' : '#3b82f6'} radius={[0, 4, 4, 0]} />
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
    { name: 'Sem alocacao', pessoas: summary.unallocatedPeople, valor: summary.metrics.filter((m) => m.allocatedPercent === 0).reduce((sum, m) => sum + m.totalCost, 0) },
  ];

  const topBnpExposure = [...summary.metrics]
    .filter((metric) => metric.bnpPercent > 0)
    .sort((a, b) => b.bnpCost - a.bnpCost)
    .slice(0, 8);

  const distributionData = useMemo(() => ({
    byTeam: groupMetrics(summary.metrics, (metric) => teamNameById.get(metric.person.teamId || '') || 'Sem area'),
    byJobTitle: groupMetrics(summary.metrics, (metric) => jobTitleById.get(metric.person.cargoId || '') || metric.person.cargoAntigo || 'Sem cargo'),
    byVinculo: groupMetrics(summary.metrics, (metric) => vinculoLabels[metric.person.tipoVinculo] || metric.person.tipoVinculo),
    byNivel: groupMetrics(summary.metrics, (metric) => metric.person.nivel || 'Nao informado'),
    byLocal: groupMetrics(summary.metrics, (metric) => metric.person.localAtuacao || 'Nao informado'),
    byTenure: groupMetrics(summary.metrics, (metric) => getTenureBucket(metric.person.dataAdmissao)),
  }), [summary.metrics, teamNameById, jobTitleById]);

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
        description="Visao gerencial de custos, alocacao e exposicao BNP dos recursos humanos."
        animated={false}
      />

      {!canViewHRCosts && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium">Valores financeiros ocultos</p>
              <p className="text-sm text-muted-foreground">
                Seu perfil pode acessar a visao quantitativa do Dashboard RH, mas os custos permanecem confidenciais.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">Visao geral</TabsTrigger>
            <TabsTrigger value="distributions">Distribuicoes</TabsTrigger>
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

        <TabsContent value="overview" className="space-y-4">
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
              description="Remuneracao + encargos + beneficios"
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
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Alocacao financeira</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocationChartData} dataKey={canViewHRCosts ? 'valor' : 'pessoas'} nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
                      {allocationChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={allocationColors[index % allocationColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : formatPeople(value),
                        name === 'valor' ? 'Valor' : 'Pessoas',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Situacao de alocacao</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : formatPeople(value),
                        name === 'valor' ? 'Valor' : 'Pessoas',
                      ]}
                    />
                    <Bar dataKey="pessoas" name="Pessoas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    {canViewHRCosts && <Bar dataKey="valor" name="Valor" fill="#14b8a6" radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Maior exposicao BNP</CardTitle>
                <Badge variant="outline">{topBnpExposure.length} principais</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topBnpExposure.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum RH ativo com custo BNP no momento.
                </div>
              ) : (
                topBnpExposure.map((metric) => (
                  <div key={metric.person.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{metric.person.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {metric.allocatedPercent}% alocado - {metric.bnpPercent}% BNP
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMaybeCurrency(metric.bnpCost, canViewHRCosts)}</p>
                        <p className="text-xs text-muted-foreground">exposicao BNP</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={metric.allocatedPercent} className="h-2" />
                      <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">{metric.allocatedPercent}%</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DistributionChart title="Por area" data={distributionData.byTeam} mode={metricMode} canViewValues={canViewHRCosts} />
            <DistributionChart title="Por cargo / funcao" data={distributionData.byJobTitle} mode={metricMode} canViewValues={canViewHRCosts} />
            <DistributionChart title="Por forma de contratacao" data={distributionData.byVinculo} mode={metricMode} canViewValues={canViewHRCosts} />
            <DistributionChart title="Por nivel" data={distributionData.byNivel} mode={metricMode} canViewValues={canViewHRCosts} />
            <DistributionChart title="Por local de atuacao" data={distributionData.byLocal} mode={metricMode} canViewValues={canViewHRCosts} />
            <DistributionChart title="Por tempo de casa" data={distributionData.byTenure} mode={metricMode} canViewValues={canViewHRCosts} />
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Curva de turnover - ultimos 12 meses</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={turnoverData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'turnover' ? `${value.toFixed(1)}%` : formatPeople(value),
                      name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saidas' : 'Turnover',
                    ]}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="saidas" name="Saidas" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="turnover" name="Turnover" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DistributionChart title="Concentracao por tempo de casa" data={distributionData.byTenure} mode="quantity" canViewValues={canViewHRCosts} />
            <DistributionChart title="Custo por tempo de casa" data={distributionData.byTenure} mode={canViewHRCosts ? 'cost' : 'quantity'} canViewValues={canViewHRCosts} />
          </div>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Esta versao usa a regra unificada de custo de RH e considera alocacoes diretas em contratos e subprojetos.
            Quando houver subprojeto para a mesma pessoa no mesmo contrato, a alocacao direta desse contrato e ignorada para evitar duplicidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
