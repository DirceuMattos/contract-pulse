// v3 - replicacao de secoes manuais do mes anterior
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { monthlyReportFromDb, reportTemplateConfigFromDb } from '@/lib/dbMappers';
import { SECTION_META, defaultsForSection } from '@/lib/reportSectionSchemas';
import type { ReportTemplateConfig } from '@/types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  triggerLabel?: string;
}

interface PreviousReport {
  id: string;
  month: number;
  year: number;
  manualSectionsCount: number;
}

export function ReportCreateDialog({ triggerLabel = 'Novo Relatório' }: Props) {
  const { contracts } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contractId, setContractId] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [previousReport, setPreviousReport] = useState<PreviousReport | null>(null);
  const [copyManual, setCopyManual] = useState(true);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const activeContracts = contracts.filter((c) => c.status !== 'encerrado');

  // Busca relatório anterior do mesmo contrato quando contrato ou mês/ano mudam
  useEffect(() => {
    if (!contractId) { setPreviousReport(null); return; }

    const fetchPrevious = async () => {
      setLoadingPrevious(true);
      try {
        // Busca todos os relatórios do contrato e pega o mais recente antes do mês selecionado
        const { data } = await supabase
          .from('monthly_reports')
          .select('id, month, year')
          .eq('contract_id', contractId)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (!data || data.length === 0) { setPreviousReport(null); return; }

        // Pega o relatório mais recente que seja anterior ao mês/ano selecionado
        const prev = data.find((r: any) =>
          r.year < year || (r.year === year && r.month < month)
        );

        if (!prev) { setPreviousReport(null); return; }

        // Conta seções manuais com conteúdo
        const { data: sections } = await supabase
          .from('report_sections')
          .select('source, content')
          .eq('report_id', prev.id)
          .eq('source', 'manual');

        const manualWithContent = (sections ?? []).filter((s: any) => {
          const content = s.content as Record<string, unknown>;
          return content && Object.keys(content).some(k => {
            const v = content[k];
            return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
          });
        });

        setPreviousReport({
          id: prev.id,
          month: prev.month,
          year: prev.year,
          manualSectionsCount: manualWithContent.length,
        });
      } catch {
        setPreviousReport(null);
      } finally {
        setLoadingPrevious(false);
      }
    };

    fetchPrevious();
  }, [contractId, month, year]);

  const handleCreate = async () => {
    if (!contractId) {
      toast({ title: 'Selecione um contrato', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: configRow } = await supabase
        .from('report_template_configs')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();

      const config: ReportTemplateConfig | null = configRow ? reportTemplateConfigFromDb(configRow) : null;

      // Verificar se já existe relatório para este contrato/mês/ano
      const { data: existing } = await supabase
        .from('monthly_reports')
        .select('id, status')
        .eq('contract_id', contractId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Relatório já existe', description: `Redirecionando para ${MONTHS[month - 1]}/${year}` });
        setOpen(false);
        navigate(`/relatorios/${existing.id}`);
        return;
      }

      // Criar o relatório
      const { data: reportRow, error: reportErr } = await supabase
        .from('monthly_reports')
        .insert({
          contract_id: contractId,
          month,
          year,
          status: 'draft',
          asana_project_id: config?.asanaProjectId ?? null,
          client_email_domain: config?.clientEmailDomain ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (reportErr) throw reportErr;
      const report = monthlyReportFromDb(reportRow);

      // Buscar seções manuais do relatório anterior se o usuário optou por copiar
      let previousManualSections: Record<string, Record<string, unknown>> = {};
      if (copyManual && previousReport) {
        const { data: prevSections } = await supabase
          .from('report_sections')
          .select('section_key, content')
          .eq('report_id', previousReport.id)
          .eq('source', 'manual');

        (prevSections ?? []).forEach((s: any) => {
          previousManualSections[s.section_key] = s.content;
        });
      }

      // Criar seções filtrando por config flags
      const activeSections = SECTION_META.filter((m) => {
        if (!m.configurable) return true;
        if (!config) return true;
        return Boolean(config[m.configFlag!] as boolean);
      });

      const sectionRows = activeSections.map((m) => ({
        report_id: report.id,
        section_key: m.key,
        // Se for manual e tiver conteúdo do mês anterior, usa ele; senão usa default
        content: (m.source === 'manual' && previousManualSections[m.key])
          ? previousManualSections[m.key] as any
          : defaultsForSection(m.key) as any,
        source: m.source,
      }));

      if (sectionRows.length > 0) {
        const { error: secErr } = await supabase.from('report_sections').insert(sectionRows as any);
        if (secErr) throw secErr;
      }

      // Disparar syncs em background
      try {
        const asanaIds = config?.asanaProjectIds?.length
          ? config.asanaProjectIds
          : config?.asanaProjectId ? [config.asanaProjectId] : [];
        if (asanaIds.length > 0) {
          supabase.functions.invoke('report-sync-asana', {
            body: { reportId: report.id, asanaProjectIds: asanaIds, month, year },
          }).catch(() => {});
        }
        if (config?.clientEmailDomain || (config?.firefliesKeywords && config.firefliesKeywords.length > 0)) {
          supabase.functions.invoke('report-sync-fireflies', {
            body: {
              reportId: report.id,
              clientEmailDomain: config?.clientEmailDomain,
              firefliesKeywords: config?.firefliesKeywords ?? [],
              month,
              year,
            },
          }).catch(() => {});
        }
      } catch { /* syncs opcionais */ }

      const copiedMsg = copyManual && previousReport && previousReport.manualSectionsCount > 0
        ? ` · ${previousReport.manualSectionsCount} seção(ões) copiada(s) de ${MONTHS[previousReport.month - 1]}/${previousReport.year}`
        : '';
      toast({ title: 'Relatório criado', description: `${MONTHS[month - 1]}/${year}${copiedMsg}` });
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
      setOpen(false);
      navigate(`/relatorios/${report.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : typeof err === 'object' && err !== null && 'message' in err ? String((err as any).message)
        : typeof err === 'string' ? err
        : JSON.stringify(err);
      const isDuplicate = msg.includes('duplicate key') || msg.includes('unique constraint');
      toast({
        title: isDuplicate ? 'Relatório já existe' : 'Erro ao criar relatório',
        description: isDuplicate ? `Já existe um relatório para ${MONTHS[month - 1]}/${year} neste contrato.` : msg || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setContractId(''); setPreviousReport(null); setCopyManual(true); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Relatório Mensal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contrato</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
              <SelectContent>
                {activeContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Painel de replicação do mês anterior */}
          {contractId && !loadingPrevious && previousReport && previousReport.manualSectionsCount > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Copy className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Relatório anterior encontrado — {MONTHS[previousReport.month - 1]}/{previousReport.year}
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {previousReport.manualSectionsCount} seção(ões) com conteúdo manual disponível(is) para cópia.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCopyManual(true)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                    copyManual
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  Sim, copiar seções manuais
                </button>
                <button
                  type="button"
                  onClick={() => setCopyManual(false)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                    !copyManual
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Não, começar do zero
                </button>
              </div>
            </div>
          )}

          {contractId && loadingPrevious && (
            <p className="text-xs text-muted-foreground">Verificando relatório anterior...</p>
          )}

          {contractId && !loadingPrevious && (!previousReport || previousReport.manualSectionsCount === 0) && (
            <p className="text-xs text-muted-foreground">Nenhum relatório anterior com conteúdo manual encontrado.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? 'Criando...' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
