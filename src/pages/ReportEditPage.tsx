import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Download, Settings as SettingsIcon, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { SectionEditor } from '@/components/reports/SectionEditor';
import { monthlyReportFromDb, reportSectionFromDb } from '@/lib/dbMappers';
import { SECTION_META, SECTION_META_BY_KEY, isSectionComplete, isSectionEmpty } from '@/lib/reportSectionSchemas';
import type { MonthlyReport, ReportSection, ReportSectionKey, ReportStatus } from '@/types';
import { generatePptx } from '@/lib/generatePptx';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Em Revisão' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'published', label: 'Publicado' },
];

function sectionStatusIcon(content: Record<string, unknown>, key: ReportSectionKey): string {
  if (isSectionEmpty(content)) return '⬜';
  return isSectionComplete(key, content) ? '✅' : '🟡';
}

export default function ReportEditPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { contracts, getClient } = useData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ReportSectionKey | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resyncKey, setResyncKey] = useState<ReportSectionKey | null>(null);
  const autoSyncTriggered = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['monthly_report', reportId],
    queryFn: async () => {
      const { data: reportRaw, error } = await supabase
        .from('monthly_reports').select('*').eq('id', reportId!).single();
      if (error) throw error;
      const { data: sectionsRaw } = await supabase
        .from('report_sections').select('*').eq('report_id', reportId!).order('created_at');
      return {
        report: monthlyReportFromDb(reportRaw),
        sections: (sectionsRaw ?? []).map(reportSectionFromDb),
      };
    },
    enabled: !!reportId,
  });

  const report = data?.report;
  const sections = useMemo(() => data?.sections ?? [], [data]);

  useEffect(() => {
    if (!activeSection && sections.length > 0) setActiveSection(sections[0].sectionKey);
  }, [sections, activeSection]);

  const contract = report ? contracts.find((c) => c.id === report.contractId) : undefined;
  const client = contract ? getClient(contract.clientId) : undefined;

  // Auto-sync if draft and last sync > 24h ago
  useEffect(() => {
    if (!report || autoSyncTriggered.current) return;
    if (report.status !== 'draft') return;
    const oldestSync = sections
      .filter((s) => s.source === 'asana' || s.source === 'fireflies')
      .reduce<number | null>((acc, s) => {
        if (!s.syncedAt) return 0;
        const t = new Date(s.syncedAt).getTime();
        return acc === null ? t : Math.min(acc, t);
      }, null);
    const should = oldestSync === null || oldestSync === 0 || Date.now() - (oldestSync ?? 0) > 24 * 60 * 60 * 1000;
    if (should) {
      autoSyncTriggered.current = true;
      handleSyncAll(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  const handleContentChange = async (section: ReportSection, next: Record<string, unknown>) => {
    // Optimistic local update
    queryClient.setQueryData(['monthly_report', reportId], (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s: ReportSection) => s.id === section.id ? { ...s, content: next } : s),
      };
    });
    // Debounced save: just write immediately (debouncing handled visually by react)
    const { error } = await supabase
      .from('report_sections')
      .update({ content: next as any, updated_at: new Date().toISOString() })
      .eq('id', section.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleSyncAll = async (silent = false) => {
    if (!report) return;
    setSyncing(true);
    if (!silent) toast({ title: 'Sincronizando...', description: 'Buscando dados do Asana e Fireflies.' });
    else toast({ title: 'Sincronizando dados em segundo plano...', description: 'Atualizando Asana e Fireflies.' });
    try {
      const tasks: Promise<any>[] = [];
      if (report.asanaProjectId) {
        tasks.push(supabase.functions.invoke('report-sync-asana', {
          body: { reportId: report.id, asanaProjectId: report.asanaProjectId, month: report.month, year: report.year },
        }));
      }
      tasks.push(supabase.functions.invoke('report-sync-fireflies', {
        body: {
          reportId: report.id,
          clientEmailDomain: report.clientEmailDomain,
          firefliesKeywords: [],
          month: report.month,
          year: report.year,
        },
      }));
      await Promise.allSettled(tasks);
      await queryClient.invalidateQueries({ queryKey: ['monthly_report', reportId] });
      if (!silent) toast({ title: 'Sincronização concluída' });
    } catch (err) {
      toast({ title: 'Erro na sincronização', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleResyncSection = async (key: ReportSectionKey) => {
    if (!report) return;
    setSyncing(true);
    try {
      const meta = SECTION_META_BY_KEY[key];
      if (meta.source === 'asana' && report.asanaProjectId) {
        await supabase.functions.invoke('report-sync-asana', {
          body: { reportId: report.id, asanaProjectId: report.asanaProjectId, month: report.month, year: report.year, sectionKey: key },
        });
      } else if (meta.source === 'fireflies') {
        await supabase.functions.invoke('report-sync-fireflies', {
          body: { reportId: report.id, clientEmailDomain: report.clientEmailDomain, firefliesKeywords: [], month: report.month, year: report.year },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['monthly_report', reportId] });
      toast({ title: 'Seção re-sincronizada' });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally {
      setSyncing(false);
      setResyncKey(null);
    }
  };

  const handleStatusChange = async (next: ReportStatus) => {
    if (!report) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === 'published') patch.published_at = new Date().toISOString();
    const { error } = await supabase.from('monthly_reports').update(patch).eq('id', report.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['monthly_report', reportId] });
    queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
    toast({ title: 'Status atualizado' });
  };

  const handleGeneratePPTX = async () => {
    try {
      setGenerating(true);

      const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                     "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

      const sectionMap: Record<string, Record<string, unknown>> = {};
      for (const s of sections) {
        sectionMap[s.sectionKey] = s.content ?? {};
      }

      await generatePptx({
        mesAno: `${MESES[(report.month ?? 1) - 1]}/${report.year}`,
        nomeContrato: contract?.nome ?? "Contrato",
        nomeCliente: client?.nomeFantasia ?? client?.razaoSocial ?? "Cliente",
        numeroContrato: contract?.codigo ?? "",
        sections: sectionMap,
      });

      toast({ title: "PPTX gerado com sucesso!", variant: "default" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar PPTX", description: message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };


  if (isLoading || !report) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  const activeSec = sections.find((s) => s.sectionKey === activeSection);
  const activeMeta = activeSection ? SECTION_META_BY_KEY[activeSection] : null;
  const canConfig = userRole === 'c-level' || userRole === 'superadmin';

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/relatorios')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <ClientLogo nome={client?.nomeFantasia || client?.razaoSocial || '?'} logoUrl={client?.logoUrl} size="lg" />
          <div>
            <h1 className="text-xl font-bold">{contract?.nome}</h1>
            <p className="text-sm text-muted-foreground">{client?.nomeFantasia || client?.razaoSocial} · {MONTHS[report.month - 1]}/{report.year}</p>
          </div>
          <ReportStatusBadge status={report.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={report.status} onValueChange={(v) => handleStatusChange(v as ReportStatus)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleSyncAll(false)} disabled={syncing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', syncing && 'animate-spin')} />Sincronizar Dados
          </Button>
          <Button onClick={handleGeneratePPTX} disabled={generating}>
            <Download className="w-4 h-4 mr-2" />{generating ? 'Gerando...' : 'Gerar PPTX'}
          </Button>
          {canConfig && contract && (
            <Button variant="outline" size="icon" onClick={() => navigate(`/relatorios/config/${contract.id}`)} title="Configurar template">
              <SettingsIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Section menu */}
        <Card className="h-fit sticky top-4">
          <CardContent className="p-2">
            <div className="space-y-1">
              {sections.map((s) => {
                const meta = SECTION_META_BY_KEY[s.sectionKey];
                const active = s.sectionKey === activeSection;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.sectionKey)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2',
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    <span>{sectionStatusIcon(s.content, s.sectionKey)}</span>
                    <span className="flex-1 truncate">{meta?.label ?? s.sectionKey}</span>
                    <Badge variant="outline" className={cn('text-[10px] uppercase', s.source !== 'manual' && 'border-blue-400 text-blue-600')}>
                      {s.source === 'manual' ? 'Manual' : 'Auto'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {activeSec && activeMeta ? (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{activeMeta.label}</h2>
                  {activeSec.source !== 'manual' && (
                    <Button variant="outline" size="sm" onClick={() => setResyncKey(activeSec.sectionKey)} disabled={syncing}>
                      <RefreshCw className="w-3 h-3 mr-2" />Re-sincronizar
                    </Button>
                  )}
                </div>
                {activeSec.source !== 'manual' && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm flex gap-2 items-start">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      Dados sincronizados {activeSec.syncedAt ? `em ${new Date(activeSec.syncedAt).toLocaleString('pt-BR')}` : '(ainda não sincronizado)'}.
                      Você pode editar livremente.
                    </div>
                  </div>
                )}
                <SectionEditor
                  sectionKey={activeSec.sectionKey}
                  content={activeSec.content}
                  onChange={(next) => handleContentChange(activeSec, next)}
                />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Selecione uma seção.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!resyncKey} onOpenChange={(o) => !o && setResyncKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-sincronizar seção?</AlertDialogTitle>
            <AlertDialogDescription>Os dados atuais serão substituídos pelos dados mais recentes da fonte.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resyncKey && handleResyncSection(resyncKey)}>Re-sincronizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
