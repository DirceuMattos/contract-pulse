import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, RotateCcw, Percent, DollarSign, AlertTriangle, Calendar, Activity, Database, Briefcase, ChevronRight, Users, RefreshCw, CheckCircle, XCircle, Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

    </div>
  );
}


function FeedzSyncSection() {
  const [syncing, setSyncing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const loadRuns = async () => {
    setLoadingRuns(true);
    const { data } = await supabase
      .from('feedz_sync_runs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRuns(data || []);
    setLoadingRuns(false);
  };

  useEffect(() => { loadRuns(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-sync');
      if (error) {
        const detail = typeof error === 'object' && error.message ? error.message : String(error);
        throw new Error(detail);
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      toast.success(`Sincronização concluída: ${data?.created || 0} criados, ${data?.updated || 0} atualizados, ${data?.terminated || 0} desligados.`);
      loadRuns();
    } catch (err: any) {
      toast.error(`Erro na sincronização: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Find the latest run with status 'success' (only first one is rollbackable)
  const latestSuccessRun = runs.length > 0 && runs[0].status === 'success' ? runs[0] : null;

  const handleRollback = async () => {
    if (!latestSuccessRun) return;
    setRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-rollback', {
        body: { runId: latestSuccessRun.id },
      });
      if (error) {
        const detail = typeof error === 'object' && error.message ? error.message : String(error);
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`Rollback concluído: ${data?.removed || 0} registros removidos.`);
      loadRuns();
    } catch (err: any) {
      toast.error(`Erro no rollback: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setRollingBack(false);
      setRollbackConfirmOpen(false);
    }
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

  return (
    <>
      <ConfirmDeleteDialog
        open={rollbackConfirmOpen}
        onOpenChange={setRollbackConfirmOpen}
        onConfirm={handleRollback}
        title="Reverter última sincronização?"
        description={
          latestSuccessRun
            ? `Isso irá excluir os ${latestSuccessRun.records_created} registros criados nesta sincronização.${
                (latestSuccessRun.records_updated > 0 || latestSuccessRun.records_terminated > 0)
                  ? ` Atenção: ${latestSuccessRun.records_updated} atualizações e ${latestSuccessRun.records_terminated} desligamentos NÃO serão revertidos (sem versionamento).`
                  : ''
              } Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel={rollingBack ? 'Revertendo...' : 'Reverter'}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle>Integração Feedz (TOTVS)</CardTitle>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          </div>
          <CardDescription>
            Sincroniza colaboradores do Feedz com o cadastro de RH. Cargos e equipes são criados automaticamente quando não existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    <TableHead className="text-xs">Processados</TableHead>
                    <TableHead className="text-xs">Criados</TableHead>
                    <TableHead className="text-xs">Atualizados</TableHead>
                    <TableHead className="text-xs">Desligados</TableHead>
                    <TableHead className="text-xs">Erro</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r: any, idx: number) => (
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
                      <TableCell className="text-xs text-destructive truncate max-w-[200px]">{r.error_message || '—'}</TableCell>
                      <TableCell>
                        {idx === 0 && r.status === 'success' && r.records_created > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRollbackConfirmOpen(true)}
                            disabled={rollingBack}
                          >
                            {rollingBack ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Undo2 className="h-3 w-3 mr-1" />}
                            Rollback
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
