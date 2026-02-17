import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, RotateCcw, Percent, DollarSign, AlertTriangle, Calendar, Activity, Database, Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';

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
  const { settings, updateSettings, resetToDemo, jobTitles, addJobTitle, updateJobTitle, deleteJobTitle } = useData();
  const { canEdit } = useAuth();

  // Job title management state
  const [jobTitleDialogOpen, setJobTitleDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<{ id: string; label: string } | null>(null);
  const [jobTitleLabel, setJobTitleLabel] = useState('');
  const [deleteJobTitleId, setDeleteJobTitleId] = useState<string | null>(null);

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
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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

      {/* Data Source Selector (Etapa 2 prep) */}
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

      {/* Tabela de Cargos */}
      {canEdit && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle>Tabela de Cargos</CardTitle>
              </div>
              <Button size="sm" onClick={() => {
                setEditingJobTitle(null);
                setJobTitleLabel('');
                setJobTitleDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cargo
              </Button>
            </div>
            <CardDescription>
              Cargos disponíveis para seleção no formulário de recursos. Cargos inativos não aparecem na lista.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobTitles.map(jt => (
                <div key={jt.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <span className={jt.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}>{jt.label}</span>
                    {!jt.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={jt.isActive}
                      onCheckedChange={(checked) => updateJobTitle(jt.id, { isActive: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingJobTitle({ id: jt.id, label: jt.label });
                      setJobTitleLabel(jt.label);
                      setJobTitleDialogOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteJobTitleId(jt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {jobTitles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum cargo cadastrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Title Dialog */}
      <Dialog open={jobTitleDialogOpen} onOpenChange={setJobTitleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingJobTitle ? 'Editar Cargo' : 'Adicionar Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cargo</Label>
              <Input
                value={jobTitleLabel}
                onChange={e => setJobTitleLabel(e.target.value)}
                placeholder="Ex: Desenvolvedor Backend"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobTitleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!jobTitleLabel.trim()) {
                toast.error('Nome do cargo é obrigatório');
                return;
              }
              if (editingJobTitle) {
                updateJobTitle(editingJobTitle.id, { label: jobTitleLabel.trim() });
                toast.success('Cargo atualizado');
              } else {
                addJobTitle(jobTitleLabel.trim());
                toast.success('Cargo adicionado');
              }
              setJobTitleDialogOpen(false);
            }}>
              {editingJobTitle ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job Title Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteJobTitleId}
        onOpenChange={(open) => !open && setDeleteJobTitleId(null)}
        onConfirm={() => {
          if (deleteJobTitleId) {
            deleteJobTitle(deleteJobTitleId);
            toast.success('Cargo removido');
            setDeleteJobTitleId(null);
          }
        }}
        title="Excluir cargo?"
        description="O cargo será removido da lista. Recursos existentes que usam este cargo não serão afetados."
      />
    </div>
  );
}
