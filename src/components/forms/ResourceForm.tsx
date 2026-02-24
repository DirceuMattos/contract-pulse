import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building, Box, Calculator, Info } from 'lucide-react';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Resource, ResourceType, OtherCostCategory, Seniority, Settings } from '@/types';
import { formatCurrency, calculateResourceCost } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const resourceFormSchemaBase = z.object({
  tipo: z.enum(['clt', 'pj', 'outro']),
  nome: z.string().min(2, 'Nome é obrigatório'),
  cargo: z.string().optional(),
  senioridade: z.enum(['junior', 'pleno', 'senior', 'especialista']).optional(),
  custoBase: z.number().min(0, 'Custo deve ser positivo'),
  percentualDedicacao: z.number().min(0).max(100, 'Máximo 100%'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().optional(),
  observacoes: z.string().optional(),
  encargosOverride: z.number().min(0).max(200).optional(),
  impostosOverride: z.number().min(0).max(100).optional(),
  categoria: z.enum(['cloud', 'licenca', 'equipamento', 'terceiros', 'outros', 'consultoria', 'ia', 'acessibilidade']).optional(),
  recorrencia: z.enum(['mensal', 'anual', 'unico']).optional(),
  rateioMeses: z.number().min(1).optional(),
  tipoValor: z.enum(['mensal', 'totalPeriodo']).optional(),
  duracaoMeses: z.number().min(1).optional(),
});

const resourceFormSchema = resourceFormSchemaBase.refine((data) => {
  if (data.categoria === 'consultoria' && data.tipoValor === 'totalPeriodo') {
    return data.duracaoMeses && data.duracaoMeses > 0;
  }
  return true;
}, {
  message: 'Duração em meses é obrigatória para valor total do período',
  path: ['duracaoMeses'],
});

type ResourceFormData = z.infer<typeof resourceFormSchemaBase>;

interface ResourceFormProps {
  resource?: Resource;
  contractId: string;
  settings: Settings;
  onSubmit: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const senioridadeOptions = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
  { value: 'especialista', label: 'Especialista' },
];

const categoriaOptions = [
  { value: 'cloud', label: 'Cloud / Infraestrutura' },
  { value: 'licenca', label: 'Licenças de Software' },
  { value: 'equipamento', label: 'Equipamentos' },
  { value: 'terceiros', label: 'Serviços Terceiros' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'ia', label: 'Inteligência Artificial' },
  { value: 'acessibilidade', label: 'Extensão de Acessibilidade' },
  { value: 'outros', label: 'Outros' },
];

const recorrenciaOptions = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual (rateado)' },
  { value: 'unico', label: 'Único (rateado)' },
];

export function ResourceForm({ resource, contractId, settings, onSubmit, onCancel }: ResourceFormProps) {
  const { getActiveJobTitles, teams, distinctHRNames } = useData();
  const { hrPeople } = useHR();
  const { canViewHRCosts } = useAuth();
  const activeJobTitles = getActiveJobTitles();
  const [customCargo, setCustomCargo] = useState(false);
  const [customNome, setCustomNome] = useState(false);

  // Check if existing cargo is not in the list
  const existingCargoInList = resource?.cargo ? activeJobTitles.some(jt => jt.label === resource.cargo) : true;

  // Merge HR master list (preferred) with legacy names from resources
  const hrMasterNames = hrPeople.map(p => ({
    nome: p.nome,
    custoBase: canViewHRCosts ? p.remuneracaoMensal : 0,
    cargo: undefined as string | undefined,
    senioridade: undefined as string | undefined,
  }));
  const legacyNames = distinctHRNames.filter(d => !hrMasterNames.some(h => h.nome.toLowerCase() === d.nome.toLowerCase()));
  const allHRNames = [...hrMasterNames, ...legacyNames];

  // Check if existing nome is in the HR names list
  const existingNomeInList = resource?.nome ? allHRNames.some(h => h.nome === resource.nome) : true;

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      tipo: resource?.tipo || 'clt',
      nome: resource?.nome || '',
      cargo: resource?.cargo || '',
      senioridade: resource?.senioridade,
      custoBase: resource?.custoBase || 0,
      percentualDedicacao: resource?.percentualDedicacao || 100,
      dataInicio: resource?.dataInicio || new Date().toISOString().split('T')[0],
      dataFim: resource?.dataFim || '',
      observacoes: resource?.observacoes || '',
      encargosOverride: resource?.encargosOverride,
      impostosOverride: resource?.impostosOverride,
      categoria: resource?.categoria,
      recorrencia: resource?.recorrencia || 'mensal',
      rateioMeses: resource?.rateioMeses || 12,
      tipoValor: resource?.tipoValor || 'mensal',
      duracaoMeses: resource?.duracaoMeses || 12,
    },
  });

  const tipoAtual = form.watch('tipo');
  const custoBase = form.watch('custoBase') || 0;
  const percentualDedicacao = form.watch('percentualDedicacao') || 100;
  const encargosOverride = form.watch('encargosOverride');
  const impostosOverride = form.watch('impostosOverride');
  const categoriaAtual = form.watch('categoria');
  const tipoValorAtual = form.watch('tipoValor');
  const duracaoMesesAtual = form.watch('duracaoMeses') || 1;

  // Calculate preview cost
  const previewResource: Resource = {
    id: 'preview',
    contractId,
    tipo: tipoAtual,
    nome: '',
    custoBase,
    percentualDedicacao,
    dataInicio: '',
    encargosOverride,
    impostosOverride,
    categoria: categoriaAtual as any,
    tipoValor: tipoValorAtual as any,
    duracaoMeses: duracaoMesesAtual,
    createdAt: '',
    updatedAt: '',
  };
  
  const custoCalculado = calculateResourceCost(previewResource, settings);

  const handleFormSubmit = (data: ResourceFormData) => {
    onSubmit({
      contractId,
      tipo: data.tipo,
      nome: data.nome,
      cargo: data.cargo,
      senioridade: data.senioridade,
      custoBase: data.custoBase,
      percentualDedicacao: data.percentualDedicacao,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim || undefined,
      observacoes: data.observacoes || undefined,
      encargosOverride: data.encargosOverride,
      impostosOverride: data.impostosOverride,
      categoria: data.categoria,
      recorrencia: data.recorrencia,
      rateioMeses: data.rateioMeses,
      tipoValor: data.categoria === 'consultoria' ? data.tipoValor : undefined,
      duracaoMeses: data.categoria === 'consultoria' && data.tipoValor === 'totalPeriodo' ? data.duracaoMeses : undefined,
    });
  };

  return (
    <TooltipProvider>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Tipo de Recurso */}
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Recurso *</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'clt', label: 'RH - CLT', icon: User, desc: 'Colaborador CLT' },
                  { value: 'pj', label: 'RH - PJ', icon: Building, desc: 'Pessoa Jurídica' },
                  { value: 'outro', label: 'Outros', icon: Box, desc: 'Cloud, licenças, etc.' },
                ].map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => field.onChange(tipo.value)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      field.value === tipo.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <tipo.icon className={cn(
                      'w-6 h-6 mb-2',
                      field.value === tipo.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <p className="font-medium text-sm">{tipo.label}</p>
                    <p className="text-xs text-muted-foreground">{tipo.desc}</p>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipoAtual === 'outro' ? (
          /* Layout específico para Outros */
          <div className="space-y-4">
            {/* Linha 1: Categoria + Recorrência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriaOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recorrencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recorrência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recorrenciaOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 2: Descrição */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: AWS Cloud" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linha 3: Valor mensal + Percentual de dedicação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="custoBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mensal *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-10"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percentualDedicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Dedicação *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="pr-8"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Quanto deste recurso é dedicado ao contrato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ) : (
          /* Layout para CLT e PJ */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identificação */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome / Pessoa *</FormLabel>
                    {allHRNames.length > 0 && !customNome && (existingNomeInList || !field.value) ? (
                      <Select
                        onValueChange={(val) => {
                          if (val === '__other__') {
                            setCustomNome(true);
                            field.onChange('');
                          } else {
                            field.onChange(val);
                            const match = allHRNames.find(h => h.nome === val);
                            if (match) {
                              form.setValue('custoBase', match.custoBase);
                              if (match.cargo) {
                                form.setValue('cargo', match.cargo);
                                const cargoInList = activeJobTitles.some(jt => jt.label === match.cargo);
                                setCustomCargo(!cargoInList);
                              }
                              if (match.senioridade) {
                                form.setValue('senioridade', match.senioridade as any);
                              }
                            }
                          }
                        }}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a pessoa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allHRNames.map(h => (
                            <SelectItem key={h.nome} value={h.nome}>
                              {h.nome}
                            </SelectItem>
                          ))}
                          <SelectItem value="__other__">Outro...</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="Ex: João Silva" {...field} />
                        </FormControl>
                        {allHRNames.length > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            setCustomNome(false);
                            field.onChange('');
                          }}>
                            Lista
                          </Button>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo / Papel</FormLabel>
                    {customCargo || (!existingCargoInList && !customCargo) ? (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="Digite o cargo" {...field} />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setCustomCargo(false);
                          field.onChange('');
                        }}>
                          Lista
                        </Button>
                      </div>
                    ) : (
                      <Select
                        onValueChange={(val) => {
                          if (val === '__other__') {
                            setCustomCargo(true);
                            field.onChange('');
                          } else {
                            field.onChange(val);
                          }
                        }}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeJobTitles.map(jt => (
                            <SelectItem key={jt.id} value={jt.label}>
                              {jt.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="__other__">Outro...</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                    {/* Read-only team chip */}
                    {(() => {
                      const selectedJt = activeJobTitles.find(jt => jt.label === field.value);
                      if (selectedJt?.teamId) {
                        const team = teams.find(t => t.id === selectedJt.teamId);
                        if (team) {
                          return (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                Equipe: {team.name}
                              </span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="senioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {senioridadeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custos */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="custoBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {tipoAtual === 'clt' ? 'Salário Bruto Mensal *' : 'Valor Mensal Contratado *'}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-10"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percentualDedicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Dedicação *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="pr-8"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Quanto deste recurso é dedicado ao contrato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Override de encargos/impostos */}
              {tipoAtual === 'clt' && (
                <FormField
                  control={form.control}
                  name="encargosOverride"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encargos CLT (override)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="200"
                            step="0.1"
                            placeholder={`Padrão: ${settings.percentualEncargosCLT}%`}
                            className="pr-8"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Deixe vazio para usar o padrão ({settings.percentualEncargosCLT}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {tipoAtual === 'pj' && (
                <FormField
                  control={form.control}
                  name="impostosOverride"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impostos PJ (override)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder={`Padrão: ${settings.percentualImpostosPJ}%`}
                            className="pr-8"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Deixe vazio para usar o padrão ({settings.percentualImpostosPJ}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        )}

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dataInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início *</FormLabel>
                <FormControl>
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataFim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Fim (opcional)</FormLabel>
                <FormControl>
                  <DatePickerInput value={field.value || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais sobre este recurso..."
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview de Custo */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Cálculo de Custo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo base:</span>
                <span>{formatCurrency(custoBase)}</span>
              </div>
              {tipoAtual === 'clt' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    + Encargos ({encargosOverride ?? settings.percentualEncargosCLT}%):
                  </span>
                  <span>{formatCurrency(custoBase * ((encargosOverride ?? settings.percentualEncargosCLT) / 100))}</span>
                </div>
              )}
              {tipoAtual === 'pj' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    + Impostos ({impostosOverride ?? settings.percentualImpostosPJ}%):
                  </span>
                  <span>{formatCurrency(custoBase * ((impostosOverride ?? settings.percentualImpostosPJ) / 100))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">× Dedicação ({percentualDedicacao}%):</span>
                <span>×{(percentualDedicacao / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Custo final mensal:</span>
                <span className="text-primary text-lg">{formatCurrency(custoCalculado)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {resource ? 'Salvar Alterações' : 'Adicionar Recurso'}
          </Button>
        </div>
      </form>
    </Form>
    </TooltipProvider>
  );
}
