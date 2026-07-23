import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
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
import { formatCurrency } from '@/lib/calculations';

const PJ_MONTHLY_HOURS = 168;
const CLT_MONTHLY_HOURS = 200;
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

type ClientReportGroup = {
  clientName: string;
  hours: number;
  cost: number;
  records: EnrichedSupportCostRecord[];
};

type SupportCostsSyncResponse = {
  success?: boolean;
  count?: number;
  records?: SupportCostRecord[];
  error?: string;
  functionVersion?: string;
  rawShape?: {
    type?: string;
    rowsDetected?: number;
    recordsDetected?: number;
  };
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

function monthToDateRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return null;

  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function dateToMonth(date: string) {
  return date.slice(0, 7);
}

function normalizeText(value: string | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isStrongNameMatch(leftValue: string | undefined, rightValue: string | undefined) {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);
  return Boolean(left && right && left === right);
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
  const functionVersion = payload.functionVersion || 'versão não informada';
  const rawShape = payload.rawShape;

  if (!diagnostics) {
    return [
      '0 registros importados.',
      `Versão da função: ${functionVersion}.`,
      `Retorno bruto: ${rawShape?.type || 'não informado'} / linhas: ${rawShape?.rowsDetected ?? 'n/i'}.`,
      'A função respondeu sem diagnóstico completo; isso indica função antiga ou deploy incompleto da Edge Function.',
    ].join(' ');
  }

  const firstKeys = diagnostics.sampleKeys?.[0]?.join(', ') || 'nenhuma chave detectada';
  return [
    '0 registros importados.',
    `Versão da função: ${functionVersion}.`,
    `Linhas brutas detectadas: ${diagnostics.rowsDetected ?? 0}.`,
    `Linhas sem horas reconhecidas: ${diagnostics.rowsWithoutHours ?? 0}.`,
    `Campos do primeiro item: ${firstKeys}.`,
  ].join(' ');
}

function calculateSupportMonthlyCost(person: { tipoVinculo: string; remuneracaoMensal: number }, settings: { percentualEncargosCLT: number; percentualImpostosPJ: number }) {
  const base = person.remuneracaoMensal || 0;
  const percentual = person.tipoVinculo === 'clt'
    ? settings.percentualEncargosCLT
    : person.tipoVinculo === 'pj'
      ? settings.percentualImpostosPJ
      : 0;
  return base + (base * percentual / 100);
}

function getMonthlyHoursByLinkType(tipoVinculo: string) {
  return tipoVinculo === 'clt' ? CLT_MONTHLY_HOURS : PJ_MONTHLY_HOURS;
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
  groups,
}: {
  records: EnrichedSupportCostRecord[];
  canViewValues: boolean;
  valueText: (value: number) => string;
  groups: ClientReportGroup[];
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="font-medium">Nenhuma hora importada para os filtros atuais.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sincronize o Milvus para visualizar clientes/projetos encontrados, horas atendidas e custo calculado.
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
            <th className="py-2 pr-3">Responsavel</th>
            <th className="py-2 pr-3 text-right">Horas</th>
            <th className="py-2 pr-3 text-right">Custo Calculado</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.clientName}>
              <tr className={groupIndex % 2 === 0 ? 'border-b bg-muted/70' : 'border-b bg-primary/5'}>
                <td className="py-3 pr-3 font-semibold" colSpan={3}>{group.clientName}</td>
                <td className="py-3 pr-3 text-right font-semibold tabular-nums">{formatHours(group.hours)}</td>
                <td className="py-3 pr-3 text-right font-semibold">{canViewValues ? valueText(group.cost) : 'Confidencial'}</td>
              </tr>
              {group.records.map((record, index) => (
                <tr key={group.clientName + '-' + record.id + '-' + index} className={groupIndex % 2 === 0 ? 'border-b bg-background last:border-0' : 'border-b bg-primary/[0.025] last:border-0'}>
                  <td className="py-3 pr-3 text-muted-foreground">{record.clientName}</td>
                  <td className="py-3 pr-3">
                    <span>{record.projectName}</span>
                    {record.reconciliationStatus === 'pendente' && (
                      <Badge variant="secondary" className="ml-2">Pendente</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-3">{record.analystName}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatHours(record.hours)}</td>
                  <td className="py-3 pr-3 text-right font-medium">{canViewValues ? valueText(record.estimatedCost) : 'Confidencial'}</td>
                </tr>
              ))}
            </React.Fragment>
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
  const [analystName, setAnalystName] = useState('all');
  const [records, setRecords] = useState<SupportCostRecord[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncRequestRef = useRef(0);
  const { canModuleAction } = useAuth();
  const { clients, contracts, settings } = useData();
  const { hrPeople } = useHR();
  const canViewSupportCosts = canModuleAction('SUPPORT_COSTS', 'can_view_values');

  const activePeople = useMemo(
    () => hrPeople.filter((person) => person.situacao === 'ativo'),
    [hrPeople],
  );

  const costSummary = useMemo(() => {
    const totalMonthlyCost = activePeople.reduce((sum, person) => sum + calculateSupportMonthlyCost(person, settings), 0);
    const totalMonthlyHours = activePeople.reduce((sum, person) => sum + getMonthlyHoursByLinkType(person.tipoVinculo), 0);
    const averageHourlyCost = totalMonthlyHours > 0
      ? totalMonthlyCost / totalMonthlyHours
      : 0;

    return {
      totalMonthlyCost,
      totalMonthlyHours,
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
  const monthFrom = dateToMonth(dateFrom);
  const monthTo = dateToMonth(dateTo);

  const analystOptions = useMemo(() => {
    const names = new Set(records.map((record) => record.analystName).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [records]);

  const enrichedRecords = useMemo<EnrichedSupportCostRecord[]>(() => {
    return records.map((record) => {
      const matchedClient = clients.find((client) => {
        return isStrongNameMatch(record.clientName, client.nomeFantasia)
          || isStrongNameMatch(record.clientName, client.razaoSocial);
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
      if (clientId !== 'all') {
        const matchesSelectedClient = record.matchedClient?.id === clientId
          || isStrongNameMatch(record.clientName, selectedClient?.nomeFantasia)
          || isStrongNameMatch(record.clientName, selectedClient?.razaoSocial);
        if (!matchesSelectedClient) return false;
      }
      if (contractId !== 'all' && record.matchedContract?.id !== contractId) return false;
      if (analystName !== 'all' && record.analystName !== analystName) return false;
      return true;
    });
  }, [analystName, clientId, contractId, enrichedRecords, selectedClient]);

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
      const name = record.clientName || 'Não informado';
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

  const clientReportGroups = useMemo<ClientReportGroup[]>(() => {
    const grouped = new Map<string, ClientReportGroup>();
    for (const record of [...filteredRecords].sort((a, b) => {
      const clientCompare = a.clientName.localeCompare(b.clientName, 'pt-BR');
      if (clientCompare !== 0) return clientCompare;
      const projectCompare = a.projectName.localeCompare(b.projectName, 'pt-BR');
      if (projectCompare !== 0) return projectCompare;
      return a.analystName.localeCompare(b.analystName, 'pt-BR');
    })) {
      const clientName = record.clientName || 'Nao informado';
      const group = grouped.get(clientName) || { clientName, hours: 0, cost: 0, records: [] };
      group.hours += record.hours;
      group.cost += record.estimatedCost;
      group.records.push(record);
      grouped.set(clientName, group);
    }
    return Array.from(grouped.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'));
  }, [filteredRecords]);

  const periodLabel = dateFrom && dateTo
    ? `${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`
    : 'Período não definido';

  const valueText = (value: number) => canViewSupportCosts ? formatCurrency(value) : 'Confidencial';
  const chartValueKey = canViewSupportCosts ? 'cost' : 'hours';

  function handleMonthFromChange(month: string) {
    const range = monthToDateRange(month);
    if (range) setDateFrom(range.from);
  }

  function handleMonthToChange(month: string) {
    const range = monthToDateRange(month);
    if (range) setDateTo(range.to);
  }

  const syncMilvus = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!dateFrom || !dateTo) {
      if (!silent) toast.error('Informe inicio e fim do periodo.');
      return;
    }
    if (dateFrom > dateTo) {
      if (!silent) toast.error('O mes inicial deve ser anterior ou igual ao mes final.');
      return;
    }

    const requestId = syncRequestRef.current + 1;
    syncRequestRef.current = requestId;
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
      if (requestId !== syncRequestRef.current) return;

      setRecords(payload.records || []);
      setLastSyncAt(new Date().toISOString());
      const importedCount = payload.records?.length || 0;
      if (!silent && importedCount === 0) {
        toast.warning(getZeroImportDiagnosticMessage(payload), { duration: 12000 });
      } else if (!silent) {
        toast.success(importedCount + ' registro(s) de horas importado(s).');
      }
    } catch (error) {
      if (!silent) toast.error(getFunctionErrorMessage(error));
    } finally {
      if (requestId === syncRequestRef.current) setLoadingSync(false);
    }
  }, [dateFrom, dateTo, selectedClient?.nomeFantasia, selectedClient?.razaoSocial, selectedContract?.nome]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void syncMilvus({ silent: true });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [syncMilvus]);

  const renderChart = (title: string, data: { name: string; hours: number; cost: number }[]) => (
    <Card className="border-l-4 border-l-primary/40 bg-muted/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Valores incluem remuneracao bruta dos RHs e encargos/impostos. Beneficios nao sao considerados.
            </p>
          </div>
          <Badge variant="secondary">{canViewSupportCosts ? 'Custo' : 'Horas'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[460px]">
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
                tickFormatter={(value) => canViewSupportCosts ? formatShortCurrency(Number(value)) : String(value)}
              >
                <Label value={canViewSupportCosts ? 'Custo calculado' : 'Horas'} offset={-12} position="insideBottom" className="fill-muted-foreground text-[11px]" />
              </XAxis>
              <YAxis type="category" dataKey="name" width={108} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'cost' ? valueText(value) : formatHours(value),
                  name === 'cost' ? 'Custo calculado' : 'Horas',
                ]}
              />
              <Bar dataKey={chartValueKey} radius={[0, 5, 5, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
                <LabelList
                  dataKey={chartValueKey}
                  position="right"
                  formatter={(value: number) => canViewSupportCosts ? formatShortCurrency(value) : formatHours(value)}
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

      {!canViewSupportCosts && (
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
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Mes inicial</span>
            <input
              type="month"
              value={monthFrom}
              onChange={(event) => handleMonthFromChange(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Mes final</span>
            <input
              type="month"
              value={monthTo}
              onChange={(event) => handleMonthToChange(event.target.value)}
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
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Responsavel</span>
            <select
              value={analystName}
              onChange={(event) => setAnalystName(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os responsaveis</option>
              {analystOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="default" className="w-full" onClick={() => syncMilvus({ silent: false })} disabled={loadingSync}>
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
              description={lastSyncAt ? 'Atualizado em ' + new Date(lastSyncAt).toLocaleString('pt-BR') : 'Aguardando sincronizacao'}
              icon={<Clock3 className="h-5 w-5 text-sky-600" />}
              tone="border-l-sky-500"
            />
            <KpiCard
              title="Custo calculado"
              value={valueText(totals.totalCost)}
              description="Horas conciliadas x custo/hora medio"
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              tone="border-l-emerald-500"
            />
            <KpiCard
              title="Custo medio/hora RH"
              value={valueText(costSummary.averageHourlyCost)}
              description={activePeople.length + ' RHs ativos / ' + Math.round(costSummary.totalMonthlyHours) + 'h base'}
              icon={<UsersRound className="h-5 w-5 text-violet-600" />}
              tone="border-l-violet-500"
            />
            <KpiCard
              title="Clientes atendidos"
              value={String(totals.clientsCount)}
              description={totals.pendingCount + ' registro(s) pendente(s)'}
              icon={<Link2 className="h-5 w-5 text-amber-600" />}
              tone="border-l-amber-500"
            />
          </div>

          <div className="space-y-4">
            {renderChart('Totais por cliente', chartByClient)}
            {renderChart('Totais por projeto', chartByProject)}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Base de calculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Base mensal RH ativo</p>
                  <p className="mt-1 text-lg font-semibold">{valueText(costSummary.totalMonthlyCost)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Carga mensal usada</p>
                  <p className="mt-1 text-lg font-semibold">CLT {CLT_MONTHLY_HOURS}h / PJ {PJ_MONTHLY_HOURS}h</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Formula aplicada</p>
                  <p className="mt-1 text-lg font-semibold">horas x custo/h</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                O custo/hora usa remuneracao bruta mensal mais encargos/impostos, sem beneficios. CLT usa {CLT_MONTHLY_HOURS}h mensais e PJ usa {PJ_MONTHLY_HOURS}h mensais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Conciliação Milvus x Hub
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Valores incluem remuneracao bruta dos RHs e encargos/impostos. Beneficios nao sao considerados.
              </p>
            </CardHeader>
            <CardContent>
              <SupportCostTable records={filteredRecords} groups={clientReportGroups} canViewValues={canViewSupportCosts} valueText={valueText} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
