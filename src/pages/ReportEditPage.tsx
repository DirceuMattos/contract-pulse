// v5 - sync-debug asana fix

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Download, Settings as SettingsIcon, Plus, Info, Lock, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
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
  // build:v4-flush-saves
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
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const [resyncKey, setResyncKey] = useState<ReportSectionKey | null>(null);
  const [syncResults, setSyncResults] = useState<{
    label: string;
    status: 'success' | 'error' | 'skipped';
    detail?: string;
  }[] | null>(null);
  const autoSyncTriggered = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSyncing = useRef(false);
  // Guarda o conteúdo mais recente de cada seção com save pendente
  const pendingContents = useRef<Record<string, Record<string, unknown>>>({});
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
    staleTime: 5 * 60 * 1000,   // 5 min — não re-fetcha enquanto o usuário edita
    refetchOnWindowFocus: false, // evita sobrescrever edições ao trocar de aba
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

  // Grava imediatamente todos os saves com debounce pendente
  const flushPendingSaves = useCallback(async () => {
    const ids = Object.keys(saveTimers.current);
    if (ids.length === 0) return;
    // Cancela os timers e grava tudo de uma vez
    ids.forEach((id) => clearTimeout(saveTimers.current[id]));
    saveTimers.current = {};
    setPendingSaveCount(0);

    // Captura snapshot dos conteúdos antes de limpar
    const toSave: Record<string, Record<string, unknown>> = {};
    ids.forEach((id) => {
      if (pendingContents.current[id]) {
        toSave[id] = pendingContents.current[id];
        delete pendingContents.current[id];
      }
    });

    // Aguarda todos os PATCHes terminarem
    await Promise.all(
      Object.entries(toSave).map(([id, content]) =>
        supabase
          .from('report_sections')
          .update({ content: content as any, updated_at: new Date().toISOString() })
          .eq('id', id)
      )
    );

    // Após confirmar o save no banco, atualiza o cache local com os valores salvos
    // Isso evita que qualquer re-fetch subsequente sobrescreva com dado antigo
    queryClient.setQueryData(['monthly_report', reportId], (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s: any) =>
          toSave[s.id] ? { ...s, content: toSave[s.id] } : s
        ),
      };
    });
  }, [queryClient, reportId]);

  // Flush no unmount da página (logout, navegação para fora)
  useEffect(() => {
    return () => {
      const ids = Object.keys(saveTimers.current);
      if (ids.length === 0) return;
      ids.forEach((id) => clearTimeout(saveTimers.current[id]));
      saveTimers.current = {};
      setPendingSaveCount(0);
      // Fire-and-forget no cleanup — não pode usar await em cleanup
      ids.forEach((id) => {
        const content = pendingContents.current[id];
        if (!content) return;
        delete pendingContents.current[id];
        supabase
          .from('report_sections')
          .update({ content: content as any, updated_at: new Date().toISOString() })
          .eq('id', id);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContentChange = (section: ReportSection, next: Record<string, unknown>) => {
    // 1. Atualização otimista imediata no cache local
    queryClient.setQueryData(['monthly_report', reportId], (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s: ReportSection) =>
          s.id === section.id ? { ...s, content: next } : s
        ),
      };
    });

    // 2. Guarda o conteúdo mais recente para o flush forçado
    pendingContents.current[section.id] = next;

    // 3. Debounce de 800ms por seção — cancela timer anterior da mesma seção
    if (saveTimers.current[section.id]) {
      clearTimeout(saveTimers.current[section.id]);
    } else {
      setPendingSaveCount((c) => c + 1);
    }
    saveTimers.current[section.id] = setTimeout(async () => {
      delete saveTimers.current[section.id];
      delete pendingContents.current[section.id];
      setPendingSaveCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from('report_sections')
        .update({ content: next as any, updated_at: new Date().toISOString() })
        .eq('id', section.id);
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      }
    }, 800);
  };

  const handleSyncAll = async (silent = false) => {
    if (!report) return;
    setSyncing(true);
    if (!silent) setSyncResults(null);
    try {
      const asanaIds = templateConfig?.asanaProjectIds?.length
        ? templateConfig.asanaProjectIds
        : report.asanaProjectId ? [report.asanaProjectId] : [];

      type SyncTask = { label: string; promise: Promise<any> };
      const tasks: SyncTask[] = [];

      if (asanaIds.length > 0) {
        tasks.push({
          label: `Asana (${asanaIds.length} projeto${asanaIds.length > 1 ? 's' : ''})`,
          promise: supabase.functions.invoke('report-sync-asana', {
            body: { reportId: report.id, asanaProjectIds: asanaIds, month: report.month, year: report.year },
          }),
        });
      } else {
        tasks.push({ label: 'Asana', promise: Promise.resolve({ data: null, error: { message: 'Nenhum ID de projeto configurado' } }) });
      }

      tasks.push({
        label: 'Fireflies',
        promise: supabase.functions.invoke('report-sync-fireflies', {
          body: {
            reportId: report.id,
            clientEmailDomain: templateConfig?.clientEmailDomain,
            firefliesKeywords: templateConfig?.firefliesKeywords ?? [],
            month: report.month,
            year: report.year,
          },
        }),
      });

      tasks.push({
        label: 'MCP — Milvus / DevOps / Devid',
        promise: syncDevid(report.id, templateConfig?.clientEmailDomain, templateConfig?.firefliesKeywords, report.month, report.year, templateConfig?.milvusClientNames, templateConfig?.azureProject, templateConfig?.azureTags),
      });

      const settled = await Promise.allSettled(tasks.map(t => t.promise));

      if (!silent) {
        const results = settled.map((result, i) => {
          const label = tasks[i].label;
          if (result.status === 'rejected') {
            return { label, status: 'error' as const, detail: result.reason?.message ?? 'Erro desconhecido' };
          }
          const val = result.value as any;
          // supabase.functions.invoke retorna { data, error }
          if (val?.error) {
            return { label, status: 'error' as const, detail: typeof val.error === 'string' ? val.error : val.error?.message ?? 'Erro na função' };
          }
          // Asana pode retornar projetos_com_erro
          if (val?.data?.projetos_com_erro?.length > 0) {
            return { label, status: 'error' as const, detail: val.data.projetos_com_erro.join(', ') };
          }
          if (label === 'Asana' && asanaIds.length === 0) {
            return { label, status: 'skipped' as const, detail: 'Nenhum projeto configurado' };
          }
          return { label, status: 'success' as const };
        });
        setSyncResults(results);
      }

      const hasPending = Object.keys(saveTimers.current).length > 0;
      if (!hasPending) {
        await queryClient.invalidateQueries({ queryKey: ['monthly_report', reportId] });
      }
    } catch (err) {
      if (!silent) setSyncResults([{ label: 'Sincronização', status: 'error', detail: err instanceof Error ? err.message : 'Erro inesperado' }]);
    } finally {
      setSyncing(false);
    }
  };

  const handleResyncSection = async (key: ReportSectionKey) => {
    if (!report) return;
    setSyncing(true);
    try {
      const meta = SECTION_META_BY_KEY[key];
      const asanaIdsForSection = templateConfig?.asanaProjectIds?.length
        ? templateConfig.asanaProjectIds
        : report.asanaProjectId ? [report.asanaProjectId] : [];
      if (meta.source === 'asana' && asanaIdsForSection.length > 0) {
        await supabase.functions.invoke('report-sync-asana', {
          body: { reportId: report.id, asanaProjectIds: asanaIdsForSection, month: report.month, year: report.year, sectionKey: key },
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
    if (!allowedStatusTransitions.includes(next)) {
      toast({ title: 'Ação não permitida', description: 'Seu perfil não pode realizar essa transição de status.', variant: 'destructive' });
      return;
    }
    const prev = report.status;
    const patch: Record<string, unknown> = { status: next };
    if (next === 'published') patch.published_at = new Date().toISOString();
    const { error } = await supabase.from('monthly_reports').update(patch).eq('id', report.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['monthly_report', reportId] });
    queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
    const STATUS_LABELS: Record<string, string> = { draft: 'Rascunho', review: 'Em Revisão', approved: 'Aprovado', published: 'Publicado' };
    toast({
      title: 'Status atualizado',
      description: `${STATUS_LABELS[prev]} → ${STATUS_LABELS[next]}`,
    });
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

  // Regras de travamento por status
  const isSuperAdmin = userRole === 'superadmin';
  const isCLevel = userRole === 'c-level';
  const isLiderTribo = userRole === 'lider_tribo';
  const isProjProd = userRole === 'projetos_produtos';

  // Quem pode editar o conteúdo das seções por status
  const canEditContent = (() => {
    if (report.status === 'draft') return isSuperAdmin || isCLevel || isLiderTribo || isProjProd;
    if (report.status === 'review') return isSuperAdmin || isCLevel || isLiderTribo;
    return false; // approved e published: ninguém edita
  })();

  // Quais opções de status cada perfil pode selecionar
  const allowedStatusTransitions = (() => {
    if (isSuperAdmin) return ['draft', 'review', 'approved', 'published']; // superadmin vê tudo
    if (isCLevel) return ['draft', 'review', 'approved', 'published'];
    if (isLiderTribo) {
      if (report.status === 'draft') return ['draft', 'review']; // pode enviar para revisão
      if (report.status === 'review') return ['draft', 'review']; // pode voltar para rascunho
      return [report.status]; // approved/published: não pode mudar
    }
    return [report.status]; // demais perfis: não podem mudar status
  })();

  const isLocked = !canEditContent;

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
          <Select value={report.status} onValueChange={(v) => handleStatusChange(v as ReportStatus)} disabled={allowedStatusTransitions.length <= 1}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS
                .filter(o => allowedStatusTransitions.includes(o.value))
                .map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleSyncAll(false)} disabled={syncing || isLocked}>
            <RefreshCw className={cn('w-4 h-4 mr-2', syncing && 'animate-spin')} />Sincronizar Dados
          </Button>
          {pendingSaveCount > 0 && (
            <span className="text-sm text-muted-foreground animate-pulse">Salvando...</span>
          )}
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

      {/* Painel de resultados de sincronização */}
      {syncResults && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Resultado da Sincronização</span>
            <button onClick={() => setSyncResults(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {syncResults.map((r) => (
              <div key={r.label} className="flex items-start gap-3 px-4 py-3">
                {r.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                {r.status === 'error' && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                {r.status === 'skipped' && <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.label}</p>
                  {r.status === 'success' && <p className="text-xs text-green-600">Sincronizado com sucesso</p>}
                  {r.status === 'error' && <p className="text-xs text-red-600 break-words">{r.detail ?? 'Falha na sincronização'}</p>}
                  {r.status === 'skipped' && <p className="text-xs text-yellow-600">{r.detail ?? 'Ignorado'}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    onClick={async () => {
                      await flushPendingSaves();
                      setActiveSection(s.sectionKey);
                    }}
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
                  {activeSec.source !== 'manual' && !isLocked && (
                    <Button variant="outline" size="sm" onClick={() => setResyncKey(activeSec.sectionKey)} disabled={syncing}>
                      <RefreshCw className="w-3 h-3 mr-2" />Re-sincronizar
                    </Button>
                  )}
                </div>
                {isLocked && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-md p-3 text-sm flex gap-2 items-start">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Relatório bloqueado para edição.</span>
                      {report.status === 'published'
                        ? ' Este relatório foi publicado. Apenas o superadmin pode alterar o status.'
                        : report.status === 'approved'
                        ? ' Este relatório está aprovado. Apenas c-level ou superadmin podem reabri-lo.'
                        : ' Seu perfil não tem permissão para editar neste status.'}
                    </div>
                  </div>
                )}
                {activeSec.source !== 'manual' && !isLocked && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm flex gap-2 items-start">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      Dados sincronizados {activeSec.syncedAt ? `em ${new Date(activeSec.syncedAt).toLocaleString('pt-BR')}` : '(ainda não sincronizado)'}.
                      Você pode editar livremente.
                    </div>
                  </div>
                )}
                {activeSec.sectionKey !== 'capa' && !isLocked && (
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
                  readOnly={isLocked}
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
