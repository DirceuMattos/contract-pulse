import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
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

  const activeContracts = contracts.filter((c) => c.status !== 'encerrado');

  const handleCreate = async () => {
    if (!contractId) {
      toast({ title: 'Selecione um contrato', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Fetch config (if exists) to know which sections to create
      const { data: configRow } = await supabase
        .from('report_template_configs')
        .select('*')
        .eq('contract_id', contractId)
        .maybeSingle();

      const config: ReportTemplateConfig | null = configRow ? reportTemplateConfigFromDb(configRow) : null;

      // Create the report
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

      // Create empty sections (filtering by config flags)
      const activeSections = SECTION_META.filter((m) => {
        if (!m.configurable) return true;
        if (!config) return true; // defaults: all active
        return Boolean(config[m.configFlag!] as boolean);
      });

      const sectionRows = activeSections.map((m) => ({
        report_id: report.id,
        section_key: m.key,
        content: defaultsForSection(m.key) as any,
        source: m.source,
      }));

      if (sectionRows.length > 0) {
        const { error: secErr } = await supabase.from('report_sections').insert(sectionRows as any);
        if (secErr) throw secErr;
      }

      // Fire background syncs (do not await)
      if (config?.asanaProjectId) {
        supabase.functions.invoke('report-sync-asana', {
          body: { reportId: report.id, asanaProjectId: config.asanaProjectId, month, year },
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

      toast({ title: 'Relatório criado', description: `${MONTHS[month - 1]}/${year}` });
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
      setOpen(false);
      navigate(`/relatorios/${report.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar relatório';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? 'Criando...' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
