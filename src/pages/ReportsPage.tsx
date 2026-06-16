import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MoreHorizontal, Copy, Trash2, Eye, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { ReportCreateDialog } from '@/components/reports/ReportCreateDialog';
import { monthlyReportFromDb } from '@/lib/dbMappers';
import { isSectionEmpty, SECTION_META } from '@/lib/reportSectionSchemas';
import type { MonthlyReport, ReportStatus } from '@/types';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface ReportWithCount extends MonthlyReport {
  totalSections: number;
  filledSections: number;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { contracts, clients, getClient } = useData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contractFilter, setContractFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      // batch fetch sections
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

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (contractFilter !== 'all' && r.contractId !== contractFilter) return false;
      if (yearFilter !== 'all' && String(r.year) !== yearFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, contractFilter, yearFilter, statusFilter]);

  const years = useMemo(() => {
    const s = new Set(reports.map((r) => r.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [reports]);

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

      // Copy sections (without content; create empty sections with same structure)
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('monthly_reports').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Relatório excluído' });
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
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
          <div className="min-w-[220px]">
            <label className="text-xs text-muted-foreground">Contrato</label>
            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {contracts.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          Nenhum relatório encontrado. Clique em "Novo Relatório" para criar o primeiro.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((report, idx) => {
            const contract = contracts.find((c) => c.id === report.contractId);
            const client = contract ? getClient(contract.clientId) : undefined;
            const progress = report.totalSections > 0
              ? Math.round((report.filledSections / report.totalSections) * 100)
              : 0;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/relatorios/${report.id}`)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ClientLogo nome={client?.nomeFantasia || client?.razaoSocial || '?'} logoUrl={client?.logoUrl} size="md" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate" title={contract?.nome}>{contract?.nome ?? 'Contrato'}</h3>
                          <p className="text-xs text-muted-foreground truncate">{client?.nomeFantasia || client?.razaoSocial}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => navigate(`/relatorios/${report.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />Abrir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(report)}>
                            <Copy className="w-4 h-4 mr-2" />Duplicar
                          </DropdownMenuItem>
                          {contract && (
                            <DropdownMenuItem onClick={() => navigate(`/relatorios/config/${contract.id}`)}>
                              <SettingsIcon className="w-4 h-4 mr-2" />Configurar template
                            </DropdownMenuItem>
                          )}
                          {canDelete && <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteId(report.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Excluir
                            </DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {MONTHS_SHORT[report.month - 1]}/{report.year}
                      </div>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
