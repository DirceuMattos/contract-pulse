import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Filter,
  Link2,
  Loader2,
  Shield,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateHRPersonCost, formatCurrency } from '@/lib/calculations';

const DEFAULT_MONTHLY_HOURS = 168;
const chartColors = ['#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

type SupportCostRecord = {
  id: string;
  clientName: string;
  projectName: string;
  analystName: string;
  hours: number;
  date?: string;
  raw?: Record<string, unknown>;
};

type EnrichedSupportCostRecord = SupportCostRecord & {
  matchedClient?: { id: string; nomeFantasia?: string; razaoSocial: string };
  matchedContract?: { id: string; nome: string };
  estimatedCost: number;
  reconciliationStatus: 'conciliado' | 'pendente';
};

type SupportCostsSyncResponse = {
  success?: boolean;
  count?: number;
  records?: SupportCostRecord[];
  error?: string;
  diagnostics?: {
    rowsDetected?: number;
    rowsWithoutHours?: number;
    recordsDetected?: number;
    sampleKeys?: string[][];
    rawShape?: unknown;
  };
};

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function normalizeText(value: string | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

function formatShortCurrency(value: number) {
  if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)} mi`;
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)} mil`;
  return formatCurrency(value);
}

function getFunctionErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (raw.toLowerCase().includes('failed to send a request')) {
    return 'Não foi possível chamar a Edge Function support-costs-sync. Verifique se ela já foi deployada no Supabase/Lovable.';
  }
  return raw || 'Erro ao sincronizar Milvus.';
}

function getZeroImportDiagnosticMessage(payload: SupportCostsSyncResponse) {
  const diagnostics = payload.diagnostics;
  if (!diagnostics) {
    return '0 registros importados. A função respondeu, mas não retornou diagnóstico. Verifique os logs da Edge Function.';
  }

  const firstKeys = diagnostics.sampleKeys?.[0]?.join(', ') || 'nenhuma chave detectada';
  return [
    '0 registros importados.',
    `Linhas brutas detectadas: ${diagnostics.rowsDetected ?? 0}.`,
    `Linhas sem horas reconhecidas: ${diagnostics.rowsWithoutHours ?? 0}.`,
    `Campos do primeiro item: ${firstKeys}.`,
  ].join(' ');
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

function SupportCostTable({
  records,
  canViewValues,
  valueText,
}: {
  records: EnrichedSupportCostRecord[];
  canViewValues: boolean;
  valueText: (value: number) => string;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="font-medium">Nenhuma hora importada para os filtros atuais.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sincronize o Milvus para visualizar clientes/projetos encontrados, vínculos com cadastros do Hub,
          horas atendidas, custo calculado e itens pendentes de conciliação.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-3">Cliente Milvus</th>
            <th className="py-2 pr-3">Projeto Milvus</th>
            <th className="py-2 pr-3">Responsável</th>
            <th className="py-2 pr-3 text-right">Horas</th>
            <th className="py-2 pr-3 text-right">Custo estimado</th>
            <th className="py-2 pr-3">Conciliação</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b last:border-0">
              <td className="py-3 pr-3">{record.clientName}</td>
              <td className="py-3 pr-3">{record.projectName}</td>
              <td className="py-3 pr-3">{record.analystName}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatHours(record.hours)}</td>
              <td className="py-3 pr-3 text-right font-medium">{canViewValues ? valueText(record.estimatedCost) : 'Confidencial'}</td>
              <td className="py-3 pr-3">
                <Badge variant={record.reconciliationStatus === 'conciliado' ? 'default' : 'secondary'}>
                  {record.reconciliationStatus === 'conciliado' ? 'Conciliado' : 'Pendente'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupportCostsPage() {
  const initialRange = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [clientId, setClientId] = useState('all');
  const [contractId, setContractId] = useState('all');
  const [records, setRecords] = useState<SupportCostRecord[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
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

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial, 'pt-BR')),
    [clients],
  );

  const filteredContracts = useMemo(() => {
    const list = clientId === 'all'
      ? contracts
      : contracts.filter((contract) => contract.clientId === clientId);
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [clientId, contracts]);

  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedContract = contracts.find((contract) => contract.id === contractId);

  const enrichedRecords = useMemo<EnrichedSupportCostRecord[]>(() => {
    return records.map((record) => {
      const matchedClient = clients.find((client) => {
        const milvusClient = normalizeText(record.clientName);
        return milvusClient
          && (
            normalizeText(client.nomeFantasia).includes(milvusClient)
            || milvusClient.includes(normalizeText(client.nomeFantasia))
            || normalizeText(client.razaoSocial).includes(milvusClient)
            || milvusClient.includes(normalizeText(client.razaoSocial))
          );
      });

      const matchedContract = contracts.find((contract) => {
        const milvusProject = normalizeText(record.projectName);
        return milvusProject
          && (
            normalizeText(contract.nome).includes(milvusProject)
            || milvusProject.includes(normalizeText(contract.nome))
          );
      });

      const estimatedCost = record.hours * costSummary.averageHourlyCost;

      return {
        ...record,
        matchedClient,
        matchedContract,
        estimatedCost,
        reconciliationStatus: matchedClient || matchedContract ? 'conciliado' : 'pendente',
      };
    });
  }, [clients, contracts, costSummary.averageHourlyCost, records]);

  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter((record) => {
      if (clientId !== 'all' && record.matchedClient?.id !== clientId) return false;
      if (contractId !== 'all' && record.matchedContract?.id !== contractId) return false;
      return true;
    });
  }, [clientId, contractId, enrichedRecords]);

  const totals = useMemo(() => {
    const totalHours = filteredRecords.reduce((sum, record) => sum + record.hours, 0);
    const totalCost = filteredRecords.reduce((sum, record) => sum + record.estimatedCost, 0);
    const clientsCount = new Set(filteredRecords.map((record) => record.clientName)).size;
    const pendingCount = filteredRecords.filter((record) => record.reconciliationStatus === 'pendente').length;
    return { totalHours, totalCost, clientsCount, pendingCount };
  }, [filteredRecords]);

  const chartByClient = useMemo(() => {
    const grouped = new Map<string, { name: string; hours: number; cost: number }>();
    for (const record of filteredRecords) {
      const name = record.matchedClient?.nomeFantasia || record.matchedClient?.razaoSocial || record.clientName || 'Não informado';
      const current = grouped.get(name) || { name, hours: 0, cost: 0 };
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(name, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.hours - a.hours).slice(0, 10);
  }, [filteredRecords]);

  const chartByProject = useMemo(() => {
    const grouped = new Map<string, { name: string; hours: number; cost: number }>();
    for (const record of filteredRecords) {
      const name = record.matchedContract?.nome || record.projectName || 'Não informado';
      const current = grouped.get(name) || { name, hours: 0, cost: 0 };
      current.hours += record.hours;
      current.cost += record.estimatedCost;
      grouped.set(name, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.hours - a.hours).slice(0, 10);
  }, [filteredRecords]);

  const periodLabel = dateFrom && dateTo
    ? `${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`
    : 'Período não definido';

  const valueText = (value: number) => canViewHRCosts ? formatCurrency(value) : 'Confidencial';
  const chartValueKey = canViewHRCosts ? 'cost' : 'hours';

  async function handleSyncMilvus() {
    if (!dateFrom || !dateTo) {
      toast.error('Informe início e fim do período.');
      return;
    }

    setLoadingSync(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-costs-sync', {
        body: {
          dateFrom,
          dateTo,
          clientName: selectedClient?.nomeFantasia || selectedClient?.razaoSocial,
          projectName: selectedContract?.nome,
        },
      });

      if (error) throw error;
      const payload = data as SupportCostsSyncResponse;
      if (payload?.success === false) throw new Error(payload.error || 'Erro ao sincronizar Milvus.');

      setRecords(payload.records || []);
      setLastSyncAt(new Date().toISOString());
      const importedCount = payload.records?.length || 0;
      if (importedCount === 0) {
        toast.warning(getZeroImportDiagnosticMessage(payload), { duration: 12000 });
      } else {
        toast.success(`${importedCount} registro(s) de horas importado(s).`);
      }
    } catch (error) {
      toast.error(getFunctionErrorMessage(error));
    } finally {
      setLoadingSync(false);
    }
  }

  const renderChart = (title: string, data: { name: string; hours: number; cost: number }[]) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
          <Badge variant="secondary">{canViewHRCosts ? 'Custo' : 'Horas'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[340px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Sincronize o Milvus para carregar os dados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 42, left: 110, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => canViewHRCosts ? formatShortCurrency(Number(value)) : String(value)}
              >
                <Label value={canViewHRCosts ? 'Custo estimado' : 'Horas'} offset={-12} position="insideBottom" className="fill-muted-foreground text-[11px]" />
              </XAxis>
              <YAxis type="category" dataKey="name" width={108} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'cost' ? valueText(value) : formatHours(value),
                  name === 'cost' ? 'Custo estimado' : 'Horas',
                ]}
              />
              <Bar dataKey={chartValueKey} radius={[0, 5, 5, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
                <LabelList
                  dataKey={chartValueKey}
                  position="right"
                  formatter={(value: number) => canViewHRCosts ? formatShortCurrency(value) : formatHours(value)}
                  className="fill-foreground text-[11px]"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custos do Suporte a Sistemas"
        description="Apuração de custo dos atendimentos de suporte a sistemas por período, cliente e projeto."
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
            <Button type="button" variant="default" className="w-full" onClick={handleSyncMilvus} disabled={loadingSync}>
              {loadingSync ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
              Sincronizar Milvus
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="client-report">Relatório por cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              title="Horas Milvus"
              value={formatHours(totals.totalHours)}
              description={lastSyncAt ? `Atualizado em ${new Date(lastSyncAt).toLocaleString('pt-BR')}` : 'Aguardando sincronização'}
              icon={<Clock3 className="h-5 w-5 text-sky-600" />}
              tone="border-l-sky-500"
            />
            <KpiCard
              title="Custo estimado"
              value={valueText(totals.totalCost)}
              description="Horas conciliadas x custo/hora médio"
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
              value={String(totals.clientsCount)}
              description={`${totals.pendingCount} registro(s) pendente(s)`}
              icon={<Link2 className="h-5 w-5 text-amber-600" />}
              tone="border-l-amber-500"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {renderChart('Totais por cliente', chartByClient)}
            {renderChart('Totais por projeto', chartByProject)}
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
                    <p className="text-xs text-muted-foreground">Fórmula aplicada</p>
                    <p className="mt-1 text-lg font-semibold">horas x custo/h</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  O custo/hora usa remuneração mensal, encargos e benefícios do RH. Quando o Milvus trouxer responsável por atendimento,
                  a próxima evolução poderá substituir a média por custo individual do analista.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Integração Milvus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  A sincronização consulta uma Edge Function própria, reutilizando o acesso seguro já usado nos Relatórios Mensais.
                </p>
                <div className="rounded-md bg-muted/60 p-3">
                  Fonte: <span className="font-medium text-foreground">milvus_get_attendance_report</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="client-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Conciliação Milvus x Hub
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SupportCostTable records={filteredRecords} canViewValues={canViewHRCosts} valueText={valueText} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
