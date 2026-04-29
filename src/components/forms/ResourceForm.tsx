import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building, Box, Calculator, Info, Link2, AlertTriangle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Resource, ResourceType, OtherCostCategory, Seniority, Settings } from '@/types';
import { formatCurrency, calculateResourceCost } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { handleFormValidationError } from '@/lib/formValidation';
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
  hrPersonId: z.string().optional(),
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
  existingHrPersonIds?: string[];
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

export function ResourceForm({ resource, contractId, settings, existingHrPersonIds = [], onSubmit, onCancel }: ResourceFormProps) {
  const { getActiveJobTitles, teams } = useData();
  const { hrPeople } = useHR();
  const { canViewHRCosts } = useAuth();
  const activeJobTitles = getActiveJobTitles();
  
  const [selectedHrPersonId, setSelectedHrPersonId] = useState<string | undefined>(resource?.hrPersonId);

  // Active HR people for selection
  const activeHrPeople = useMemo(() => {
    const editingPersonId = resource?.hrPersonId;
    return hrPeople
      .filter(p => p.situacao === 'ativo')
      .filter(p => !existingHrPersonIds.includes(p.id) || p.id === editingPersonId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hrPeople, existingHrPersonIds, resource?.hrPersonId]);

  // Resolve linked person info
  const linkedPerson = useMemo(() => {
    if (!selectedHrPersonId) return null;
    return hrPeople.find(p => p.id === selectedHrPersonId) ?? null;
  }, [selectedHrPersonId, hrPeople]);

  const linkedJob = useMemo(() => {
    if (!linkedPerson?.cargoId) return null;
    return activeJobTitles.find(jt => jt.id === linkedPerson.cargoId) ?? null;
  }, [linkedPerson, activeJobTitles]);

  const linkedTeam = useMemo(() => {
    if (!linkedPerson?.teamId) return null;
    return teams.find(t => t.id === linkedPerson.teamId) ?? null;
  }, [linkedPerson, teams]);


  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      tipo: resource?.tipo || 'clt',
      nome: resource?.nome || '',
      hrPersonId: resource?.hrPersonId || '',
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

  const mapNivelToSenioridade = (nivel?: string): Seniority | undefined => {
    if (!nivel) return undefined;
    const lower = nivel.toLowerCase();
    if (lower.includes('junior') || lower.includes('júnior') || lower.startsWith('n1')) return 'junior';
    if (lower.includes('pleno') || lower.startsWith('n2')) return 'pleno';
    if (lower.includes('senior') || lower.includes('sênior') || lower.startsWith('n3')) return 'senior';
    if (lower.includes('especialista') || lower.startsWith('n4') || lower.startsWith('n5')) return 'especialista';
    return undefined;
  };

  const handleSelectHrPerson = (personId: string) => {

    const person = hrPeople.find(p => p.id === personId);
    if (!person) return;

    setSelectedHrPersonId(personId);
    
    form.setValue('hrPersonId', personId);
    form.setValue('nome', person.nome);
    
    // Auto-fill tipo based on vinculo
    form.setValue('tipo', person.tipoVinculo === 'clt' ? 'clt' : 'pj');
    
    // Auto-fill cargo from job title
    const job = person.cargoId ? activeJobTitles.find(jt => jt.id === person.cargoId) : null;
    if (job) form.setValue('cargo', job.label);
    
    // Auto-fill senioridade from nivel
    const senioridade = mapNivelToSenioridade(person.nivel);
    if (senioridade) form.setValue('senioridade', senioridade);
    
    // Auto-fill custo from remuneracao (only if allowed)
    if (canViewHRCosts) {
      form.setValue('custoBase', person.remuneracaoMensal);
    }
  };

  const handleFormSubmit = (data: ResourceFormData) => {
    onSubmit({
      contractId,
      tipo: data.tipo,
      hrPersonId: data.hrPersonId || undefined,
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
      <form onSubmit={form.handleSubmit(handleFormSubmit, handleFormValidationError)} className="space-y-6">
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
                    onClick={() => {
                      field.onChange(tipo.value);
                      // If switching to "outro", clear HR link
                      if (tipo.value === 'outro') {
                        setSelectedHrPersonId(undefined);
                        form.setValue('hrPersonId', '');
                      }
                    }}
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
          /* Layout para CLT e PJ — com seleção do RH Mestre */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identificação */}
            <div className="space-y-4">
              {/* Pessoa (RH Mestre) */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Nome / Pessoa *
                      {selectedHrPersonId && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                          <Link2 className="w-3 h-3" /> RH Mestre
                        </Badge>
                      )}
                    </FormLabel>
                    {activeHrPeople.length > 0 ? (
                      <Select
                        onValueChange={handleSelectHrPerson}
                        value={selectedHrPersonId || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a pessoa do RH *" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeHrPeople.map(p => {
                            const job = p.cargoId ? activeJobTitles.find(jt => jt.id === p.cargoId) : null;
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}{job ? ` — ${job.label}` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 rounded-md border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                        Nenhuma pessoa cadastrada no RH Mestre. Importe a planilha de RH primeiro.
                      </div>
                    )}
                    <FormMessage />
                    
                    {/* Read-only info from HR Master */}
                    {linkedPerson && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {linkedJob && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            Cargo: {linkedJob.label}
                          </span>
                        )}
                        {linkedTeam && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                            Equipe: {linkedTeam.name}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          {linkedPerson.tipoVinculo === 'clt' ? 'CLT' : 'PJ'}
                        </span>
                      </div>
                    )}
                    {linkedPerson?.situacao === 'inativo' && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Este colaborador está inativo no RH. Considere atualizar ou remover esta alocação.</span>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Cargo - only editable when not linked */}
              {!selectedHrPersonId && (
                <FormField
                  control={form.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo / Papel</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          if (val === '__other__') {
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                          disabled={!!selectedHrPersonId && !canViewHRCosts}
                        />
                      </div>
                    </FormControl>
                    {selectedHrPersonId && canViewHRCosts && (
                      <FormDescription>Valor preenchido do RH Mestre</FormDescription>
                    )}
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
