import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, RotateCcw, Percent, DollarSign, AlertTriangle, Calendar, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { settings, updateSettings, resetToDemo } = useData();
  const { canEdit } = useAuth();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings(data);
    toast.success('Configurações salvas com sucesso!');
  };

  const handleReset = () => {
    if (confirm('Isso restaurará todos os dados de demonstração. Deseja continuar?')) {
      resetToDemo();
      form.reset(settings);
      toast.success('Dados restaurados para demonstração.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Parâmetros globais do sistema para cálculos e alertas.
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Demo
          </Button>
        )}
      </div>

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
    </div>
  );
}
