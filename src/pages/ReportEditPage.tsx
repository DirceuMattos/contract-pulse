import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { ReportCreateDialog } from '@/components/reports/ReportCreateDialog';
import { monthlyReportFromDb } from '@/lib/dbMappers';
import { isSectionEmpty } from '@/lib/reportSectionSchemas';
import type { MonthlyReport } from '@/types';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface ReportWithCount extends MonthlyReport {
  totalSections: number;
  filledSections: number;
}

interface Integrations {
  asana: boolean;
  fireflies: boolean;
  milvus: boolean;
  azure: boolean;
}

function ReportsPageInner() {
  const navigate = useNavigate();
  const { contracts, getClient } = useData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const canDelete = userRole === 'c-level' || userRole === 'superadmin';

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly_reports'],
    queryFn: async (): Promise<ReportWithCount[]> => {
      const { data: reportsRaw, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      const reportList = (reportsRaw ?? []).map(monthlyReportFromDb);
      const { data: sectionsRaw } = await supabase
        .from('report_sections')
        .select('report_id, content')
        .in('report_id', reportList.map((r) => r.id));
      const counts = new Map<string, { total: number; filled: number }>();
      (sectionsRaw ?? []).forEach((s: any) => {
        const c = counts.get(s.report_id) ?? { total: 0, filled: 0 };
        c.total += 1;
        if (!isSectionEmpty(s.content ?? {})) c.filled += 1;
        counts.set(s.report_id, c);
      });
      return reportList.map((r) => {
        const c = counts.get(r.id) ?? { total: 0, filled: 0 };
        return { ...r, totalSections: c.total, filledSections: c.filled };
      });
    },
  });

  const { data: integrationsMap = new Map<string, Integrations>() } = useQuery({
    queryKey: ['report_template_configs_integrations'],
    queryFn: async (): Promise<Map<string, Integrations>> => {
      const { data, error } = await supabase
        .from('report_template_configs')
        .select('contract_id, asana_project_id, asana_project_ids, client_email_domain, milvus_client_names, azure_project');
      if (error) throw error;
      const map = new Map<string, Integrations>();
      (data ?? []).forEach((c: any) => {
        map.set(c.contract_id, {
          asana: !!c.asana_project_id || (Array.isArray(c.asana_project_ids) && c.asana_project_ids.length > 0),
          fireflies: !!c.client_email_domain,
          milvus: Array.isArray(c.milvus_client_names) && c.milvus_client_names.length > 0,
          azure: !!c.azure_project,
        });
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (yearFilter !== 'all' && String(r.year) !== yearFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, yearFilter, statusFilter]);

  const years = useMemo(() => {
    const s = new Set(reports.map((r) => r.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [reports]);

  const groups = useMemo(() => {
    const byContract = new Map<string, ReportWithCount[]>();
    filtered.forEach((r) => {
      const arr = byContract.get(r.contractId) ?? [];
      arr.push(r);
      byContract.set(r.contractId, arr);
    });
    const out = Array.from(byContract.entries()).map(([contractId, reps]) => {
      const contract = contracts.find((c) => c.id === contractId);
      const client = contract ? getClient(contract.clientId) : undefined;
      const integrations = integrationsMap.get(contractId) ?? {
        asana: false,
        fireflies: false,
        milvus: false,
        azure: false,
      };
      return { contractId, contract, client, reports: reps.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month), integrations };
    });
    out.sort((a, b) => (a.contract?.nome ?? '').localeCompare(b.contract?.nome ?? ''));
    return out;
  }, [filtered, contracts, getClient, integrationsMap]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDuplicate = async (report: MonthlyReport) => {
    try {
      const nextMonth = report.month === 12 ? 1 : report.month + 1;
      const nextYear = report.month === 12 ? report.year + 1 : report.year;
      const { data: newReport, error } = await supabase.from('monthly_reports').insert({
        contract_id: report.contractId,
        month: nextMonth,
        year: nextYear,
        status: 'draft',
        asana_project_id: report.asanaProjectId ?? null,
        client_email_domain: report.clientEmailDomain ?? null,
      }).select().single();
      if (error) throw error;

      const { data: prevSections } = await supabase
        .from('report_sections')
        .select('section_key, source')
        .eq('report_id', report.id);
      if (prevSections && prevSections.length > 0) {
        await supabase.from('report_sections').insert(
          prevSections.map((s: any) => ({
            report_id: newReport.id,
            section_key: s.section_key,
            source: s.source,
            content: {} as any,
          })) as any,
        );
      }
      toast({ title: 'Relatório duplicado', description: `${MONTHS_SHORT[nextMonth - 1]}/${nextYear}` });
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
    } catch (err) {
      toast({ title: 'Erro ao duplicar', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    }
  };

  const handleDelete = async (id?: string) => {
    const targetId = id || deleteId;
    if (!targetId) return;
    try {
      const { error } = await supabase.from('monthly_reports').delete().eq('id', targetId);
      if (error) throw error;
      toast({ title: 'Relatório excluído' });
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const settingsColor = (i: Integrations) => {
    const n = (i.asana ? 1 : 0) + (i.fireflies ? 1 : 0) + (i.milvus ? 1 : 0);
    if (n === 4) return 'text-green-500 hover:text-green-600';
    if (n === 3) return 'text-yellow-500 hover:text-yellow-600';
    if (n >= 1) return 'text-yellow-500 hover:text-yellow-600';
    return 'text-muted-foreground hover:text-foreground';
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Relatórios Mensais</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento e elaboração colaborativa por contrato.</p>
          </div>
          <ReportCreateDialog triggerLabel="Novo Relatório" />
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-end">
            <div className="w-[120px]">
              <label className="text-xs text-muted-foreground">Ano</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : groups.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            Nenhum relatório encontrado. Clique em "Novo Relatório" para criar o primeiro.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {groups.map((group, gIdx) => {
              const isOpen = expanded.has(group.contractId);
              const { contract, client, reports: reps, integrations } = group;
              return (
                <motion.div
                  key={group.contractId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gIdx * 0.02 }}
                >
                  <Card>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.contractId)}
                      className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors rounded-t-lg"
                    >
                      <ClientLogo
                        nome={client?.nomeFantasia || client?.razaoSocial || '?'}
                        logoUrl={contract?.logoUrl}
                        fallbackLogoUrl={client?.logoUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate" title={contract?.nome}>
                          {contract?.nome ?? 'Contrato'}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {client?.nomeFantasia || client?.razaoSocial}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 px-2">
                        {(['asana', 'fireflies', 'milvus', 'azure'] as const).map((key) => {
                          const on = integrations[key];
                          const label = key === 'asana' ? 'Asana' : key === 'fireflies' ? 'Fireflies' : key === 'milvus' ? 'Milvus' : 'Azure DevOps';
                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${on ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                {label}: {on ? 'Configurado' : 'Não configurado'}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      <Badge variant="secondary">{reps.length}</Badge>

                      {contract && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${settingsColor(integrations)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/relatorios/config/${contract.id}`);
                              }}
                            >
                              <SettingsIcon className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configurar template</TooltipContent>
                        </Tooltip>
                      )}

                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <CardContent className="border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {reps.map((report) => {
                            const progress = report.totalSections > 0
                              ? Math.round((report.filledSections / report.totalSections) * 100)
                              : 0;
                            return (
                              <Card
                                key={report.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => navigate(`/relatorios/${report.id}`)}
                              >
                                <CardContent className="p-3 space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                      {MONTHS_SHORT[report.month - 1]}/{report.year}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuItem onClick={() => navigate(`/relatorios/${report.id}`)}>
                                          <Eye className="w-4 h-4 mr-2" />Abrir
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicate(report)}>
                                          <Copy className="w-4 h-4 mr-2" />Duplicar
                                        </DropdownMenuItem>
                                        {canDelete && report.status === 'draft' && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (
                                                  confirm(
                                                    `Deletar relatório ${MONTHS_SHORT[report.month - 1]}/${report.year}? Esta ação não pode ser desfeita.`,
                                                  )
                                                ) {
                                                  handleDelete(report.id);
                                                }
                                              }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />Excluir
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="flex justify-end">
                                    <ReportStatusBadge status={report.status} />
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Preenchimento</span>
                                      <span className="font-medium">{report.filledSections}/{report.totalSections}</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as seções serão removidas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete()} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

import { AccessGuard as __AccessGuard } from '@/components/layout/AccessGuard';
export default function ReportsPage() {
  return (
    <__AccessGuard moduleKey="REPORTS">
      <ReportsPageInner />
    </__AccessGuard>
  );
}
