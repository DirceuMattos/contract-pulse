import React, { useMemo } from 'react';
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
} from 'recharts';
import { Activity, BriefcaseBusiness, Building2, DollarSign, Shield, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { buildHRDashboardSummary } from '@/lib/hrDashboard';
import { formatCurrency, formatPercentage } from '@/lib/calculations';

const allocationColors = ['#22c55e', '#f59e0b'];

function formatMaybeCurrency(value: number, canViewValues: boolean): string {
  return canViewValues ? formatCurrency(value) : 'Confidencial';
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

export default function HRDashboardPage() {
  const { canViewHRCosts } = useAuth();
  const { resources, settings } = useData();
  const { hrPeople } = useHR();
  const { subprojects, allocations } = useSubprojects();

  const summary = useMemo(
    () => buildHRDashboardSummary(hrPeople, resources, subprojects, allocations, settings),
    [hrPeople, resources, subprojects, allocations, settings],
  );

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
          value={canViewHRCosts ? formatCurrency(summary.allocatedCost) : `${summary.allocatedPeople + summary.partiallyAllocatedPeople} pessoas`}
          description={`${formatPercentage(summary.allocatedPercent)} do custo total`}
          icon={<BriefcaseBusiness className="h-5 w-5 text-sky-600" />}
          tone="border-l-sky-500"
        />
        <KpiCard
          title="Absorvido pela BNP"
          value={canViewHRCosts ? formatCurrency(summary.bnpCost) : `${summary.unallocatedPeople + summary.partiallyAllocatedPeople} pessoas`}
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
                    name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : `${value} pessoa${value === 1 ? '' : 's'}`,
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
                    name === 'valor' ? formatMaybeCurrency(value, canViewHRCosts) : `${value} pessoa${value === 1 ? '' : 's'}`,
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
                      {metric.allocatedPercent}% alocado · {metric.bnpPercent}% BNP
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

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Esta primeira entrega usa a regra unificada de custo de RH e considera alocacoes diretas em contratos e subprojetos.
            Quando houver subprojeto para a mesma pessoa no mesmo contrato, a alocacao direta desse contrato e ignorada para evitar duplicidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
