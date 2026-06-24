import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Download, Settings as SettingsIcon, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReportDevidSync } from '@/hooks/useReportDevidSync';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { SectionEditor } from '@/components/reports/SectionEditor';
import { monthlyReportFromDb, reportSectionFromDb, reportTemplateConfigFromDb } from '@/lib/dbMappers';
import { SECTION_META, SECTION_META_BY_KEY, isSectionComplete, isSectionEmpty, defaultsForSection } from '@/lib/reportSectionSchemas';
import type { MonthlyReport, ReportSection, ReportSectionKey, ReportStatus, ReportTemplateConfig } from '@/types';
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
  const { contracts, getClient, getResourcesByContract } = useData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ReportSectionKey | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resyncKey, setResyncKey] = useState<ReportSectionKey | null>(null);
  const autoSyncTriggered = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { syncDevid } = useReportDevidSync();

  const SIDEBAR_WIDTH_KEY = 'report_edit_sidebar_width';
  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 480;
  const DEFAULT_SIDEBAR_WIDTH = 260;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SIDEBAR_WIDTH_KEY) : null;
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, parsed)) : DEFAULT_SIDEBAR_WIDTH;
  });
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX - rect.left));
    setSidebarWidth(next);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const { data, isLoading } = useQuery({
    queryKey: ['monthly_report', reportId],
    queryFn: async () => {
      const { data: reportRaw, error } = await supabase
        .from('monthly_reports').select('*').eq('id', reportId!).single();
      if (error) throw error;
      const { data: sectionsRaw } = await supabase
        .from('report_sections').select('*').eq('report_id', reportId!).order('created_at');

      // Inserir seções que ainda não existem no banco
      const existingKeys = (sectionsRaw ?? []).map((s: any) => s.section_key);
      const missingKeys = SECTION_META.map((m) => m.key).filter((k) => !existingKeys.includes(k));
      if (missingKeys.length > 0) {
        await Promise.all(
          missingKeys.map((key) =>
            supabase.from('report_sections').insert({
              report_id: reportId,
              section_key: key,
              content: defaultsForSection(key as ReportSectionKey) as any,
              source: 'manual',
            })
          )
        );
        const { data: sectionsRefresh } = await supabase
          .from('report_sections').select('*').eq('report_id', reportId!).order('created_at');
        return {
          report: monthlyReportFromDb(reportRaw),
          sections: (sectionsRefresh ?? []).map(reportSectionFromDb),
        };
      }

      return {
        report: monthlyReportFromDb(reportRaw),
        sections: (sectionsRaw ?? []).map(reportSectionFromDb),
      };
    },
    enabled: !!reportId,
  });

  const report = data?.report;
  const sections = useMemo(() => data?.sections ?? [], [data]);

  // Ordenar seções pela ordem definida no SECTION_META
  const sectionOrder = SECTION_META.map((m) => m.key);
  const sortedSections = useMemo(() =>
    [...sections].sort((a, b) => {
      const ai = sectionOrder.indexOf(a.sectionKey);
      const bi = sectionOrder.indexOf(b.sectionKey);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections]
  );

  useEffect(() => {
    if (!activeSection && sections.length > 0) setActiveSection(sections[0].sectionKey);
  }, [sections, activeSection]);

  const contract = report ? contracts.find((c) => c.id === report.contractId) : undefined;
  const client = contract ? getClient(contract.clientId) : undefined;

  const squadMembers = useMemo(() => {
    if (!contract?.id) return [];
    return getResourcesByContract(contract.id)
      .filter((r) => r.tipo === 'clt' || r.tipo === 'pj')
      .map((r) => ({
        nome: r.nome,
        funcao: r.cargo || '',
        dedicacao: r.percentualDedicacao ? `${r.percentualDedicacao}%` : '',
      }));
  }, [contract?.id, getResourcesByContract]);

  const { data: templateConfig } = useQuery({
    queryKey: ['report_template_config', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return null;
      const { data: configRaw } = await supabase
        .from('report_template_configs').select('*').eq('contract_id', contract.id).maybeSingle();
      return configRaw ? reportTemplateConfigFromDb(configRaw) : null;
    },
    enabled: !!contract?.id,
  });

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
          body: { reportId: report.id, asanaProjectId: report.asanaProjectId, asanaProjectIds: templateConfig?.asanaProjectIds, month: report.month, year: report.year },
        }));
      }
      tasks.push(supabase.functions.invoke('report-sync-fireflies', {
        body: {
          reportId: report.id,
          clientEmailDomain: templateConfig?.clientEmailDomain,
          firefliesKeywords: templateConfig?.firefliesKeywords ?? [],
          month: report.month,
          year: report.year,
        },
      }));
      tasks.push(syncDevid(report.id, templateConfig?.clientEmailDomain, templateConfig?.firefliesKeywords, report.month, report.year, templateConfig?.milvusClientNames, templateConfig?.azureProject, templateConfig?.azureTags));
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
          body: { reportId: report.id, clientEmailDomain: templateConfig?.clientEmailDomain, firefliesKeywords: templateConfig?.firefliesKeywords ?? [], month: report.month, year: report.year },
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

      // Resolve logo to a fetchable URL — prefer contract logo, fallback to client logo
      let clientLogoUrl: string | undefined;
      const effectiveLogo = contract?.logoUrl || client?.logoUrl;
      if (effectiveLogo) {
        if (/^https?:\/\//i.test(effectiveLogo)) {
          clientLogoUrl = effectiveLogo;
        } else {
          const path = effectiveLogo.replace(/^client-logos\//, '');
          const { data: signed } = await supabase.storage
            .from('client-logos')
            .createSignedUrl(path, 60 * 10);
          clientLogoUrl = signed?.signedUrl;
        }
      }

      await generatePptx({
        mesAno: `${MESES[(report.month ?? 1) - 1]}/${report.year}`,
        nomeContrato: contract?.nome ?? "Contrato",
        nomeCliente: client?.nomeFantasia ?? client?.razaoSocial ?? "Cliente",
        numeroContrato: contract?.codigo ?? "",
        sections: sectionMap,
        clientLogoUrl,
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
          <ClientLogo nome={client?.nomeFantasia || client?.razaoSocial || '?'} logoUrl={contract?.logoUrl} fallbackLogoUrl={client?.logoUrl} size="lg" />
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

      {/* Two-column layout with independent scroll */}
      <div ref={containerRef} className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-12rem)]">
        {/* Section menu — own scroll */}
        <Card
          style={{ width: isMobile ? '100%' : sidebarWidth }}
          className="overflow-hidden flex flex-col shrink-0"
        >
          <CardContent className="p-2 overflow-y-auto flex-1">
            <div className="space-y-1">
              {sortedSections.map((s) => {
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
                    <span className="flex-1 truncate">
                      <span className="text-muted-foreground mr-1 text-xs">{String(sortedSections.indexOf(s) + 1).padStart(2, '0')}.</span>
                      {meta?.label ?? s.sectionKey}
                      {meta?.source && meta.source !== 'manual' && meta.source !== 'bnphub' && (
                        <span className="text-[10px] text-muted-foreground italic block leading-tight">
                          {meta.source === 'asana' ? '📋 Asana'
                           : meta.source === 'fireflies' ? '🔥 Fireflies'
                           : meta.source === 'milvus' ? '🎫 Milvus'
                           : meta.source === 'azuredevops' ? '🔷 Azure DevOps'
                           : meta.source}
                        </span>
                      )}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px] uppercase', s.source !== 'manual' && 'border-blue-400 text-blue-600')}>
                      {s.source === 'manual' ? 'Manual' : 'Auto'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Resizer */}
        <div
          onMouseDown={startResizing}
          className="hidden lg:flex w-3 -mx-2 cursor-col-resize z-10 items-center justify-center self-stretch group"
          title="Arraste para redimensionar"
        >
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/60 transition-colors" />
        </div>

        {/* Editor — own scroll */}
        <Card className="overflow-hidden flex flex-col flex-1 min-w-0">
          <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">

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
                {activeSec.sectionKey !== 'capa' && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="hide-slide-switch" className="text-sm font-medium cursor-pointer">
                        Ocultar slide na geração do PPT
                      </Label>
                    </div>
                    <Switch
                      id="hide-slide-switch"
                      checked={Boolean((activeSec.content as Record<string, unknown>)?.__hidden)}
                      onCheckedChange={(checked) =>
                        handleContentChange(activeSec, { ...activeSec.content, __hidden: checked })
                      }
                    />
                  </div>
                )}
                <SectionEditor
                  sectionKey={activeSec.sectionKey}
                  content={activeSec.content}
                  onChange={(next) => handleContentChange(activeSec, next)}
                  meta={{
                    contractName: contract?.nome,
                    clientName: client?.nomeFantasia || client?.razaoSocial,
                    contractNumber: contract?.codigo,
                    month: report?.month,
                    year: report?.year,
                    squadMembers,
                  }}
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
