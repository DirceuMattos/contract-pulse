import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  ArrowRight,
  Link2Off,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/calculations';
import type { ContractReceivableRow, ReceivablesStatus } from '@/types/receivables';

interface InvoiceByContract {
  prevMonthPaidAt?: string;
  prevMonthPaidAmount?: number;
  currMonthPaidAt?: string;
  currMonthAmount?: number;
  currMonthPaid: boolean;
  totalOverdue: number;
}

function getMonthRange(offset: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function ReceivablesDashboardPage() {
  const navigate = useNavigate();
  const { contracts, clients } = useData();

  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_dia' | 'atrasado'>('todos');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Record<string, InvoiceByContract>>({});

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const prev = getMonthRange(-1);
      const curr = getMonthRange(0);

      const [{ data: allInvoices }] = await Promise.all([
        supabase
          .from('receivables_invoices')
          .select('contract_id, status, due_date, amount, paid_amount, paid_at')
          .order('due_date', { ascending: false }),
      ]);

      if (!allInvoices) return;

      const result: Record<string, InvoiceByContract> = {};

      const ensure = (cid: string) => {
        if (!result[cid]) result[cid] = { currMonthPaid: false, totalOverdue: 0 };
      };

      for (const inv of allInvoices) {
        ensure(inv.contract_id);
        const d = inv.due_date;

        // Previous month
        if (d && d >= prev.start && d <= prev.end && inv.status === 'paid') {
          const r = result[inv.contract_id];
          if (!r.prevMonthPaidAt) {
            r.prevMonthPaidAt = inv.paid_at ?? undefined;
            r.prevMonthPaidAmount = inv.paid_amount;
          }
        }

        // Current month
        if (d && d >= curr.start && d <= curr.end) {
          const r = result[inv.contract_id];
          if (!r.currMonthAmount) {
            r.currMonthAmount = inv.status === 'paid' ? inv.paid_amount : inv.amount;
            r.currMonthPaid = inv.status === 'paid';
            r.currMonthPaidAt = inv.status === 'paid' ? (inv.paid_at ?? undefined) : undefined;
          }
        }

        // Overdue
        if (inv.status === 'overdue') {
          result[inv.contract_id].totalOverdue += (inv.amount - (inv.paid_amount || 0));
        }
      }

      setInvoiceData(result);
    };

    fetchInvoiceData();
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('superlogica-sync');
      if (error) throw error;
      toast.success(`Sincronização concluída: ${data?.updatedContracts ?? 0} contratos atualizados. Recarregue a página para ver os dados atualizados.`);
    } catch (err: any) {
      toast.error(`Erro na sincronização: ${err.message || err}`);
    } finally {
      setSyncing(false);
    }
  };

  const rows = useMemo<ContractReceivableRow[]>(() => {
    return contracts
      .filter(c => !!c.superlogicaSubscriptionId)
      .map(c => {
        const client = clients.find(cl => cl.id === c.clientId);
        const inv = invoiceData[c.id];
        const totalOverdue = inv?.totalOverdue ?? (c.receivablesOverdueAmount ?? 0);
        const status: ReceivablesStatus = totalOverdue > 0 ? 'atrasado' : 'em_dia';

        return {
          contractId: c.id,
          clientName: client?.nomeFantasia || client?.razaoSocial || '—',
          contractName: c.nome,
          contractCode: c.codigo || '',
          status,
          prevMonthPaidAt: inv?.prevMonthPaidAt,
          prevMonthPaidAmount: inv?.prevMonthPaidAmount,
          currMonthPaidAt: inv?.currMonthPaidAt,
          currMonthAmount: inv?.currMonthAmount ?? (c.valorMensalReferencia ?? undefined),
          currMonthPaid: inv?.currMonthPaid ?? false,
          totalOverdue,
        };
      });
  }, [contracts, clients, invoiceData]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter === 'em_dia' && r.status !== 'em_dia') return false;
      if (statusFilter === 'atrasado' && r.status !== 'atrasado') return false;
      if (clientFilter !== 'all') {
        const contract = contracts.find(c => c.id === r.contractId);
        if (contract?.clientId !== clientFilter) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (!r.clientName.toLowerCase().includes(s) && !r.contractName.toLowerCase().includes(s) && !r.contractCode.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, clientFilter, search, contracts]);

  const kpis = useMemo(() => {
    const totalPrevisto = rows.reduce((s, r) => s + (r.currMonthAmount ?? 0), 0);
    const totalRecebido = rows.filter(r => r.currMonthPaid).reduce((s, r) => s + (r.currMonthAmount ?? 0), 0);
    const totalEmAtraso = rows.reduce((s, r) => s + r.totalOverdue, 0);
    const totalEmAberto = totalPrevisto - totalRecebido;
    const pctInadimplencia = totalPrevisto > 0 ? (totalEmAtraso / totalPrevisto) * 100 : 0;
    return { totalPrevisto, totalRecebido, totalEmAberto, totalEmAtraso, pctInadimplencia };
  }, [rows]);

  const inadimplentes = rows.filter(r => r.status === 'atrasado').sort((a, b) => b.totalOverdue - a.totalOverdue);

  const unlinkedCount = contracts.filter(c =>
    !c.superlogicaSubscriptionId &&
    ['implantacao', 'operacao'].includes(c.status)
  ).length;

  const uniqueClients = useMemo(() => {
    const ids = new Set(rows.map(r => {
      const c = contracts.find(ct => ct.id === r.contractId);
      return c?.clientId;
    }).filter(Boolean));
    return clients.filter(c => ids.has(c.id));
  }, [rows, contracts, clients]);

  const kpiCards = [
    { label: 'Total Previsto', value: formatCurrency(kpis.totalPrevisto), icon: DollarSign, color: 'text-primary' },
    { label: 'Total Recebido', value: formatCurrency(kpis.totalRecebido), icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Em Aberto', value: formatCurrency(kpis.totalEmAberto), icon: Clock, color: 'text-amber-600' },
    { label: 'Em Atraso', value: formatCurrency(kpis.totalEmAtraso), icon: AlertTriangle, color: 'text-destructive' },
    { label: '% Inadimplência', value: `${kpis.pctInadimplencia.toFixed(1)}%`, icon: TrendingDown, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Recebíveis" description="Posição mensal de pagamentos por contrato" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/receivables/reconcile')}>
            <Link2Off className="mr-2 h-4 w-4" />
            Conciliar assinaturas
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
          </Button>
        </div>
      </div>

      {unlinkedCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Link2Off className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {unlinkedCount} contrato{unlinkedCount !== 1 ? 's' : ''} sem vínculo com Superlógica
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/receivables/reconcile')}>
                Conectar assinaturas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar cliente, contrato ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_dia">Em dia</SelectItem>
            <SelectItem value="atrasado">Em atraso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente / Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pgto Mês Anterior</TableHead>
                <TableHead className="text-right">Valor Pago (mês anterior)</TableHead>
                <TableHead>Data Pgto Mês Atual</TableHead>
                <TableHead className="text-right">Valor Pago / à Pagar</TableHead>
                <TableHead className="text-right">Valores em Atraso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum recebível encontrado
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map(row => (
                <TableRow key={row.contractId} className={row.status === 'atrasado' ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <div>
                      <span className="text-xs text-muted-foreground">{row.clientName}</span>
                      <p className="font-medium text-sm">{row.contractName}</p>
                      {row.contractCode && (
                        <span className="text-xs text-muted-foreground">{row.contractCode}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.status === 'em_dia' ? (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400">Em dia</Badge>
                    ) : (
                      <Badge variant="destructive">Atrasado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.prevMonthPaidAt ? new Date(row.prevMonthPaidAt).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.prevMonthPaidAmount != null ? formatCurrency(row.prevMonthPaidAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.currMonthPaid && row.currMonthPaidAt
                      ? new Date(row.currMonthPaidAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.currMonthAmount != null ? (
                      <span className={row.currMonthPaid ? 'text-emerald-700 dark:text-emerald-400' : ''}>
                        {formatCurrency(row.currMonthAmount)}
                        {!row.currMonthPaid && <span className="text-xs text-muted-foreground ml-1">(à pagar)</span>}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {row.totalOverdue > 0 ? formatCurrency(row.totalOverdue) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${row.contractId}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {inadimplentes.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Inadimplentes ({inadimplentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inadimplentes.slice(0, 10).map(row => (
                <div key={row.contractId} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="font-medium text-sm">{row.contractName}</p>
                    <p className="text-xs text-muted-foreground">{row.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{formatCurrency(row.totalOverdue)}</p>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate(`/contratos/${row.contractId}`)}>
                      Abrir contrato →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
