import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Filter,
  Link2,
  Shield,
  UsersRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { calculateHRPersonCost, formatCurrency } from '@/lib/calculations';

const DEFAULT_MONTHLY_HOURS = 168;

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
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

export default function SupportCostsPage() {
  const initialRange = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [clientId, setClientId] = useState('all');
  const [contractId, setContractId] = useState('all');
  const { canViewHRCosts } = useAuth();
  const { clients, contracts, settings } = useData();
  const { hrPeople } = useHR();

  const activePeople = useMemo(
    () => hrPeople.filter((person) => person.situacao === 'ativo'),
    [hrPeople],
  );

  const costSummary = useMemo(() => {
    const totalMonthlyCost = activePeople.reduce(
      (sum, person) => sum + calculateHRPersonCost(person, settings),
      0,
    );
    const averageHourlyCost = activePeople.length > 0
      ? totalMonthlyCost / (activePeople.length * DEFAULT_MONTHLY_HOURS)
      : 0;

    return {
      totalMonthlyCost,
      averageHourlyCost,
    };
  }, [activePeople, settings]);

  const filteredContracts = useMemo(() => {
    const list = clientId === 'all'
      ? contracts
      : contracts.filter((contract) => contract.clientId === clientId);
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [clientId, contracts]);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial, 'pt-BR')),
    [clients],
  );

  const periodLabel = dateFrom && dateTo
    ? `${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`
    : 'Período não definido';

  const valueText = (value: number) => canViewHRCosts ? formatCurrency(value) : 'Confidencial';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custos do Suporte"
        description="Apuração de custo dos atendimentos de suporte por período, cliente e projeto."
        animated={false}
      />

      {!canViewHRCosts && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium">Valores financeiros ocultos</p>
              <p className="text-sm text-muted-foreground">
                Seu perfil pode acessar a visão operacional do módulo, mas os custos permanecem protegidos pelas permissões financeiras.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            <Badge variant="outline">{periodLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Início</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Fim</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Cliente</span>
            <select
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setContractId('all');
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os clientes</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nomeFantasia || client.razaoSocial}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Projeto / Contrato</span>
            <select
              value={contractId}
              onChange={(event) => setContractId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os projetos</option>
              {filteredContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full" disabled>
              <DatabaseZap className="mr-2 h-4 w-4" />
              Sincronizar Milvus
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          title="Horas Milvus"
          value="0h"
          description="Aguardando integração operacional"
          icon={<Clock3 className="h-5 w-5 text-sky-600" />}
          tone="border-l-sky-500"
        />
        <KpiCard
          title="Custo estimado"
          value={valueText(0)}
          description="Horas conciliadas x custo/hora"
          icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
          tone="border-l-emerald-500"
        />
        <KpiCard
          title="Custo médio/hora RH"
          value={valueText(costSummary.averageHourlyCost)}
          description={`${activePeople.length} RHs ativos / ${DEFAULT_MONTHLY_HOURS}h mês`}
          icon={<UsersRound className="h-5 w-5 text-violet-600" />}
          tone="border-l-violet-500"
        />
        <KpiCard
          title="Clientes atendidos"
          value="0"
          description="Conciliação Milvus pendente"
          icon={<Link2 className="h-5 w-5 text-amber-600" />}
          tone="border-l-amber-500"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Base de cálculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Custo mensal RH ativo</p>
                <p className="mt-1 text-lg font-semibold">{valueText(costSummary.totalMonthlyCost)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Carga mensal inicial</p>
                <p className="mt-1 text-lg font-semibold">{DEFAULT_MONTHLY_HOURS}h</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Fórmula preparada</p>
                <p className="mt-1 text-lg font-semibold">horas x custo/h</p>
              </div>
            </div>
            <p className="text-muted-foreground">
              O custo/hora usa remuneração mensal, encargos e benefícios do RH. A próxima etapa conecta as horas reais do Milvus,
              separando cliente, projeto e responsável quando esses campos vierem disponíveis.
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Próxima integração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              A chamada deve ocorrer por Edge Function própria, reutilizando o acesso seguro já usado nos Relatórios Mensais.
            </p>
            <div className="rounded-md bg-muted/60 p-3">
              Fonte prevista: <span className="font-medium text-foreground">milvus_get_attendance_report</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Conciliação Milvus x Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="font-medium">Nenhuma hora importada ainda.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Após a integração, esta área mostrará clientes/projetos encontrados no Milvus, vínculos com cadastros do Hub,
              horas atendidas, custo calculado e itens pendentes de conciliação.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
