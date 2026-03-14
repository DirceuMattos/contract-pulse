import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, RotateCcw, Percent, DollarSign, AlertTriangle, Calendar, Activity, Database, Briefcase, ChevronRight, Users, RefreshCw, CheckCircle, XCircle, Loader2, Undo2, FileSpreadsheet, Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildFeedzSyncReport, buildFeedzSyncReportV2 } from '@/lib/importExport';

const settingsSchema = z.object({
  percentualEncargosCLT: z.number().min(0).max(200),
  percentualImpostosPJ: z.number().min(0).max(100),
  percentualImpostosFaturamento: z.number().min(0).max(100),
  valorDolar: z.number().min(0.01),
  limiarSaudavel: z.number().min(0).max(100),
  limiarAtencao: z.number().min(-100).max(100),
  diasAlertaReajuste: z.number().min(1).max(365),
  diasAlertaVigencia: z.number().min(1).max(365),
  diasAlertaDesatualizacao: z.number().min(1).max(365),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { settings, updateSettings, resetToDemo, jobTitles, teams } = useData();
  const { canEdit, user } = useAuth();
  const navigate = useNavigate();
  const isCLevel = user?.role === 'c-level';

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings(data);
    toast.success('Configurações salvas com sucesso!');
  };

  const [resetOpen, setResetOpen] = useState(false);

  const handleReset = () => {
    resetToDemo();
    form.reset(settings);
    toast.success('Dados restaurados para demonstração.');
    setResetOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Parâmetros globais do sistema para cálculos e alertas."
        animated={false}
        actions={canEdit ? (
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Demo
          </Button>
        ) : undefined}
      />

      <ConfirmDeleteDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={handleReset}
        title="Restaurar dados de demonstração?"
        description="Isso restaurará todos os dados de demonstração, incluindo contratos, clientes, recursos e configurações. Esta ação não pode ser desfeita."
        confirmLabel="Restaurar"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Encargos e Impostos */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                <CardTitle>Encargos e Impostos</CardTitle>
              </div>
              <CardDescription>
                Percentuais padrão aplicados aos custos de recursos humanos e faturamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="percentualEncargosCLT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encargos CLT (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      INSS, FGTS, férias, 13º, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="percentualImpostosPJ"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impostos PJ (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      Percentual sobre contratos PJ.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="percentualImpostosFaturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impostos s/ Faturamento (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      ISS, PIS, COFINS, CSLL, IR.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Câmbio */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Câmbio</CardTitle>
              </div>
              <CardDescription>
                Cotação de referência para conversão de valores em moeda estrangeira.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="valorDolar"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Valor do Dólar (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      Cotação usada para contratos em USD.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Limiares de Saúde */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Limiares de Saúde</CardTitle>
              </div>
              <CardDescription>
                Definem os critérios de margem para classificação de saúde dos contratos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="limiarSaudavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        Margem Saudável (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        Contratos com margem ≥ este valor são saudáveis.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="limiarAtencao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500 dark:bg-amber-400" />
                        Margem Atenção (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        Contratos com margem entre este valor e saudável ficam em atenção.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Critérios de Classificação</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    <strong>Saudável:</strong> Margem ≥ {form.watch('limiarSaudavel')}%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                    <strong>Atenção:</strong> Margem entre {form.watch('limiarAtencao')}% e {form.watch('limiarSaudavel')}%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                    <strong>Crítico:</strong> Margem &lt; {form.watch('limiarAtencao')}%
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle>Configuração de Alertas</CardTitle>
              </div>
              <CardDescription>
                Antecedência para geração de alertas automáticos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="diasAlertaReajuste"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Alerta de Reajuste
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      Dias antes da data-base de reajuste.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="diasAlertaVigencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Alerta de Vigência
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      Dias antes do fim do contrato.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="diasAlertaDesatualizacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Alerta de Desatualização
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>
                      Dias sem atualização de recursos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" size="lg">
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Data Source Selector */}
      {canEdit && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Fonte de Dados</CardTitle>
            </div>
            <CardDescription>
              Selecione a origem dos dados do sistema. A integração com API será disponibilizada na Etapa 2.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Select
                value="local"
                onValueChange={(value) => {
                  if (value === 'api') {
                    toast.error('Modo API ainda não disponível nesta etapa.');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (padrão)</SelectItem>
                  <SelectItem value="api">API (Em breve)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedz Integration */}
      {isCLevel && <FeedzSyncSection />}

      {/* Overhead Central */}
      {canEdit && <OverheadCentralSection />}
    </div>
  );
}


function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Delay revoke to ensure download starts
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function FeedzSyncSection() {
  const navigate = useNavigate();
  const { jobTitles, teams } = useData();
  const [syncing, setSyncing] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [rollbackConfirmRun, setRollbackConfirmRun] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [syncMode, setSyncMode] = useState<'strict' | 'permissive'>('strict');
  const [exportingRun, setExportingRun] = useState<string | null>(null);
  const [updatingDates, setUpdatingDates] = useState(false);

  // Alias management
  const [aliases, setAliases] = useState<any[]>([]);
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState<any>(null);
  const [aliasForm, setAliasForm] = useState({ alias_type: 'cargo', feedz_value: '', internal_id: '', internal_label: '' });
  const [aliasFilter, setAliasFilter] = useState<'all' | 'cargo' | 'departamento'>('all');

  const loadRuns = async () => {
    setLoadingRuns(true);
    const { data } = await supabase
      .from('feedz_sync_runs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRuns(data || []);
    // Infer sync mode from latest run
    if (data && data.length > 0 && (data[0] as any).sync_mode) {
      setSyncMode((data[0] as any).sync_mode === 'permissive' ? 'permissive' : 'strict');
    }
    setLoadingRuns(false);
  };

  const loadAliases = async () => {
    const { data } = await supabase.from('feedz_alias_mappings' as any).select('*').order('created_at', { ascending: false });
    setAliases(data || []);
  };

  useEffect(() => { loadRuns(); loadAliases(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-sync', {
        body: { sync_mode: syncMode },
      });
      if (error) throw new Error(typeof error === 'object' && error.message ? error.message : String(error));
      if (data?.error) throw new Error(data.error);
      toast.success(`Sincronização concluída: ${data?.created || 0} criados, ${data?.updated || 0} atualizados, ${data?.terminated || 0} desligados, ${data?.inconsistencies || 0} inconsistências.`);
      loadRuns();
    } catch (err: any) {
      toast.error(`Erro na sincronização: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateTerminationDates = async () => {
    setUpdatingDates(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-update-termination-dates');
      if (error) throw new Error(typeof error === 'object' && error.message ? error.message : String(error));
      if (data?.error) throw new Error(data.error);
      const updated = data?.totalUpdated || 0;
      const processed = data?.totalProcessed || 0;
      if (updated === 0) {
        toast.info(`Nenhuma data de desligamento precisou ser atualizada (${processed} inativos verificados).`);
      } else {
        toast.success(`${updated} data(s) de desligamento atualizada(s) de ${processed} inativos verificados.`);
        // Log details
        if (data?.details?.length) {
          console.table(data.details);
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao atualizar datas: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUpdatingDates(false);
    }
  };

  const handleRollback = async (run: any) => {
    setRollingBack(run.id);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-rollback', {
        body: { runId: run.id },
      });
      if (error) throw new Error(typeof error === 'object' && error.message ? error.message : String(error));
      if (data?.error) throw new Error(data.error);
      const msg = `Rollback concluído: ${data?.removed || 0} removidos, ${data?.restored || 0} restaurados.`;
      toast.success(msg);
      loadRuns();
    } catch (err: any) {
      toast.error(`Erro no rollback: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setRollingBack(null);
      setRollbackConfirmRun(null);
    }
  };

  const handleExportReport = async (run: any) => {
    setExportingRun(run.id);
    try {
      // Try V2 tables first (feedz_sync_change + feedz_sync_inconsistency)
      const [changesRes, inconsRes] = await Promise.all([
        (supabase.from as any)('feedz_sync_change').select('*').eq('run_id', run.id).order('created_at', { ascending: true }),
        (supabase.from as any)('feedz_sync_inconsistency').select('*').eq('run_id', run.id).order('created_at', { ascending: true }),
      ]);

      const changes = (changesRes.data || []) as any[];
      const inconsistencies = (inconsRes.data || []) as any[];

      const filename = `feedz-sync-${new Date(run.created_at).toISOString().split('T')[0]}-${run.id.substring(0, 8)}.xlsx`;

      if (changes.length > 0 || inconsistencies.length > 0) {
        // V2 report
        const blob = buildFeedzSyncReportV2(run, changes, inconsistencies);
        downloadBlob(blob, filename);
        toast.success('Relatório exportado com sucesso!');
        return;
      }

      // Fallback to legacy V1 tables
      const { data: items, error } = await supabase
        .from('feedz_sync_items')
        .select('*')
        .eq('sync_run_id', run.id);
      if (error) throw error;
      if (!items || items.length === 0) {
        toast.error('Nenhum item de auditoria encontrado para este run.');
        return;
      }
      const blob = buildFeedzSyncReport(run, items);
      downloadBlob(blob, filename);
      toast.success('Relatório exportado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    } finally {
      setExportingRun(null);
    }
  };

  // Alias CRUD
  const openNewAlias = () => {
    setEditingAlias(null);
    setAliasForm({ alias_type: 'cargo', feedz_value: '', internal_id: '', internal_label: '' });
    setAliasDialogOpen(true);
  };

  const openEditAlias = (a: any) => {
    setEditingAlias(a);
    setAliasForm({ alias_type: a.alias_type, feedz_value: a.feedz_value, internal_id: a.internal_id || '', internal_label: a.internal_label });
    setAliasDialogOpen(true);
  };

  const saveAlias = async () => {
    const payload: any = {
      alias_type: aliasForm.alias_type,
      feedz_value: aliasForm.feedz_value,
      internal_id: aliasForm.internal_id || null,
      internal_label: aliasForm.internal_label,
      is_active: true,
    };
    if (editingAlias) {
      await supabase.from('feedz_alias_mappings' as any).update(payload).eq('id', editingAlias.id);
    } else {
      await supabase.from('feedz_alias_mappings' as any).insert(payload);
    }
    toast.success(editingAlias ? 'Alias atualizado.' : 'Alias criado.');
    setAliasDialogOpen(false);
    loadAliases();
  };

  const deleteAlias = async (id: string) => {
    await supabase.from('feedz_alias_mappings' as any).delete().eq('id', id);
    toast.success('Alias removido.');
    loadAliases();
  };

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rolled_back') return <Undo2 className="h-4 w-4 text-muted-foreground" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'rolled_back') return 'Revertido';
    return status;
  };

  const filteredAliases = aliasFilter === 'all' ? aliases : aliases.filter((a: any) => a.alias_type === aliasFilter);

  // Resolve internal label for alias based on type
  const getInternalOptions = (type: string) => {
    if (type === 'cargo') return (jobTitles || []).map((j: any) => ({ id: j.id, label: j.label }));
    return (teams || []).map((t: any) => ({ id: t.id, label: t.name }));
  };

  return (
    <>
      {/* Rollback confirm dialog */}
      <ConfirmDeleteDialog
        open={!!rollbackConfirmRun}
        onOpenChange={(open) => { if (!open) setRollbackConfirmRun(null); }}
        onConfirm={() => rollbackConfirmRun && handleRollback(rollbackConfirmRun)}
        title="Reverter sincronização?"
        description={
          rollbackConfirmRun
            ? `Isso irá reverter o run de ${new Date(rollbackConfirmRun.created_at).toLocaleString('pt-BR')}:\n• ${rollbackConfirmRun.records_created || 0} inserções serão removidas\n• ${rollbackConfirmRun.records_updated || 0} atualizações serão restauradas ao estado anterior.\nEsta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel={rollingBack ? 'Revertendo...' : 'Reverter'}
      />

      {/* Alias dialog */}
      <Dialog open={aliasDialogOpen} onOpenChange={setAliasDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAlias ? 'Editar Alias' : 'Novo Alias'}</DialogTitle>
            <DialogDescription>Mapeie um valor do Feedz para um registro interno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={aliasForm.alias_type} onValueChange={(v) => setAliasForm(f => ({ ...f, alias_type: v, internal_id: '', internal_label: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cargo">Cargo</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Feedz (texto exato)</Label>
              <Input value={aliasForm.feedz_value} onChange={e => setAliasForm(f => ({ ...f, feedz_value: e.target.value }))} placeholder="Ex: Desenvolvedor Full Stack" />
            </div>
            <div>
              <Label>Registro Interno</Label>
              <Select value={aliasForm.internal_id} onValueChange={(v) => {
                const opts = getInternalOptions(aliasForm.alias_type);
                const opt = opts.find(o => o.id === v);
                setAliasForm(f => ({ ...f, internal_id: v, internal_label: opt?.label || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {getInternalOptions(aliasForm.alias_type).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAliasDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveAlias} disabled={!aliasForm.feedz_value || !aliasForm.internal_id}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle>Integração Feedz (TOTVS)</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Modo:</Label>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${syncMode === 'strict' ? 'font-semibold' : 'text-muted-foreground'}`}>Estrito</span>
                  <Switch
                    checked={syncMode === 'permissive'}
                    onCheckedChange={(checked) => setSyncMode(checked ? 'permissive' : 'strict')}
                  />
                  <span className={`text-xs ${syncMode === 'permissive' ? 'font-semibold' : 'text-muted-foreground'}`}>Permissivo</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleUpdateTerminationDates} disabled={updatingDates || syncing}>
                {updatingDates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                {updatingDates ? 'Atualizando...' : 'Atualizar Datas Deslig.'}
              </Button>
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Sincroniza colaboradores do Feedz com o cadastro de RH.
            {syncMode === 'strict' ? ' Modo Estrito: cargos/departamentos sem mapeamento geram pendência.' : ' Modo Permissivo: cargos/departamentos são criados automaticamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Runs table */}
          <div>
            <h4 className="text-sm font-medium mb-3">Últimas sincronizações</h4>
            {loadingRuns ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
            ) : runs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Nenhuma sincronização realizada.</div>
            ) : (
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Proc.</TableHead>
                      <TableHead className="text-xs">Criados</TableHead>
                      <TableHead className="text-xs">Atual.</TableHead>
                      <TableHead className="text-xs">Desl.</TableHead>
                      <TableHead className="text-xs">Incons.</TableHead>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="flex items-center gap-1.5">
                          {statusIcon(r.status)}
                          <span className="text-xs">{statusLabel(r.status)}</span>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-xs">{r.records_processed}</TableCell>
                        <TableCell className="text-xs">{r.records_created}</TableCell>
                        <TableCell className="text-xs">{r.records_updated}</TableCell>
                        <TableCell className="text-xs">{r.records_terminated}</TableCell>
                        <TableCell className="text-xs">{r.inconsistency_count || 0}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{r.sync_mode || 'legacy'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/configuracoes/feedz-reconciliacao?runId=${r.id}`)}
                              title="Abrir detalhes"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportReport(r)}
                              disabled={exportingRun === r.id}
                              title="Exportar relatório"
                            >
                              {exportingRun === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                            </Button>
                            {r.status === 'success' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRollbackConfirmRun(r)}
                                disabled={!!rollingBack}
                                title="Rollback"
                              >
                                {rollingBack === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes/feedz-reconciliacao')}>
                <Users className="h-4 w-4 mr-2" />
                Reconciliação Feedz
              </Button>
            </div>
          </div>

          <Separator />

          {/* Alias Management */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Mapeamento de Aliases (Cargo / Departamento)</h4>
              </div>
              <div className="flex items-center gap-2">
                <Select value={aliasFilter} onValueChange={(v: any) => setAliasFilter(v)}>
                  <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cargo">Cargo</SelectItem>
                    <SelectItem value="departamento">Departamento</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={openNewAlias}>
                  <Plus className="h-3 w-3 mr-1" /> Novo Alias
                </Button>
              </div>
            </div>
            {filteredAliases.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground text-xs">Nenhum alias cadastrado.</div>
            ) : (
              <div className="border rounded-md overflow-auto max-h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Valor Feedz</TableHead>
                      <TableHead className="text-xs">Interno</TableHead>
                      <TableHead className="text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAliases.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-[10px]">{a.alias_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{a.feedz_value}</TableCell>
                        <TableCell className="text-xs">{a.internal_label}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditAlias(a)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteAlias(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
