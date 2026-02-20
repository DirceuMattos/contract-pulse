import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Plus, X, Building2 } from 'lucide-react';
import { contractFormSchema, ContractFormData } from '@/lib/validators';
import { useData } from '@/contexts/DataContext';
import { Contract } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ContractFormProps {
  contract?: Contract;
  onSubmit: (data: ContractFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const indicesReajuste = ['IPCA', 'IGPM', 'INPC', 'IPCA-E', 'Outro'];
const periodicidades = ['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Bienal'];

export function ContractForm({ contract, onSubmit, onCancel, isLoading }: ContractFormProps) {
  const { clients } = useData();
  const [tagInput, setTagInput] = useState('');
  
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      codigo: contract?.codigo || '',
      nome: contract?.nome || '',
      clientId: contract?.clientId || '',
      tipo: contract?.tipo || undefined,
      segmento: contract?.segmento || undefined,
      status: contract?.status || 'implantacao',
      unidade: contract?.unidade || '',
      centroCusto: contract?.centroCusto || '',
      tags: contract?.tags || [],
      govSphere: contract?.govSphere || undefined,
      dataInicio: contract?.dataInicio || '',
      dataFim: contract?.dataFim || '',
      renovacaoAutomatica: contract?.renovacaoAutomatica || false,
      periodicidadeRenovacao: contract?.periodicidadeRenovacao || '',
      statusRenovacao: contract?.statusRenovacao || 'sem-tratativa',
      renewalTermMonths: contract?.renewalTermMonths,
      renewalBaseDate: contract?.renewalBaseDate || '',
      indiceReajuste: contract?.indiceReajuste || 'IPCA',
      dataBaseReajuste: contract?.dataBaseReajuste || '',
      percentualFixo: contract?.percentualFixo,
      alertaReajusteDias: contract?.alertaReajusteDias || 60,
      modeloReceita: contract?.modeloReceita || undefined,
      valorMensalReferencia: contract?.valorMensalReferencia,
      valorTotalContrato: contract?.valorTotalContrato,
      moeda: contract?.moeda || 'BRL',
      observacoesFinanceiras: contract?.observacoesFinanceiras || '',
      objeto: contract?.objeto || '',
      escopoOperacional: contract?.escopoOperacional || '',
      slas: contract?.slas || '',
      riscosPendencias: contract?.riscosPendencias || '',
      responsavelInterno: contract?.responsavelInterno || '',
      responsavelCS: contract?.responsavelCS || '',
      responsavelComercial: contract?.responsavelComercial || '',
      responsavelCliente: contract?.responsavelCliente || '',
      responsavelClienteEmail: contract?.responsavelClienteEmail || '',
      responsavelClienteTelefone: contract?.responsavelClienteTelefone || '',
    },
  });

  const watchModeloReceita = form.watch('modeloReceita');
  const watchClientId = form.watch('clientId');
  const watchTags = form.watch('tags');
  const watchSegmento = form.watch('segmento');

  // Auto-fill segmento based on selected client
  useEffect(() => {
    if (watchClientId) {
      const selectedClient = clients.find(c => c.id === watchClientId);
      if (selectedClient && !contract) {
        form.setValue('segmento', selectedClient.segmento);
      }
    }
  }, [watchClientId, clients, form, contract]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !watchTags.includes(trimmedTag)) {
      form.setValue('tags', [...watchTags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tags', watchTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Accordion type="multiple" defaultValue={['identificacao', 'vigencia', 'receita', 'escopo', 'responsaveis']} className="space-y-4">
          {/* Identificação */}
          <AccordionItem value="identificacao" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Identificação</p>
                  <p className="text-xs text-muted-foreground font-normal">Dados básicos do contrato</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Contrato *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SEFAZ-SP-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contrato *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome descritivo do contrato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.nomeFantasia || client.razaoSocial}
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
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sistema">Sistema</SelectItem>
                          <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segmento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o segmento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="govtech">Govtech / Governo</SelectItem>
                          <SelectItem value="privado">Iniciativa Privada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Operacional *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="implantacao">Em Implantação</SelectItem>
                          <SelectItem value="operacao">Em Operação</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                          <SelectItem value="encerrado">Encerrado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade/Área no Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Diretoria de TI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="centroCusto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Custo Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CC-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      placeholder="Adicionar tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {watchTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {watchTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Vigência e Renovação */}
          <AccordionItem value="vigencia" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-chart-2" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Vigência e Renovação</p>
                  <p className="text-xs text-muted-foreground font-normal">Datas e regras de renovação</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataInicio"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Término *</FormLabel>
                      <FormControl>
                        <DatePickerInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renovacaoAutomatica"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Renovação Automática</FormLabel>
                        <FormDescription>
                          O contrato renova automaticamente ao término
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodicidadeRenovacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade de Renovação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodicidades.map(p => (
                            <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="statusRenovacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status de Renovação *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="negociacao">Em Negociação</SelectItem>
                          <SelectItem value="renovado">Renovado</SelectItem>
                          <SelectItem value="sem-tratativa">Sem Tratativa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Esfera (condicional a govtech) */}
                {watchSegmento === 'govtech' && (
                  <FormField
                    control={form.control}
                    name="govSphere"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Esfera</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a esfera" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="municipal">Municipal</SelectItem>
                            <SelectItem value="estadual">Estadual</SelectItem>
                            <SelectItem value="federal">Federal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Aplicável apenas para contratos GovTech/Governo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Prazo de renovação (meses) */}
                <FormField
                  control={form.control}
                  name="renewalTermMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de renovação (meses)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          step={1}
                          placeholder="Ex: 12"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseInt(val, 10));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Usado para calcular a data prevista de renovação. Ex.: 12.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data base para renovação */}
                <FormField
                  control={form.control}
                  name="renewalBaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data base para renovação</FormLabel>
                      <FormControl>
                        <DatePickerInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription>
                        Se não preenchido, usaremos a data final do contrato para calcular a renovação.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Reajuste */}
          <AccordionItem value="reajuste" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold">Reajuste</p>
                  <p className="text-xs text-muted-foreground font-normal">Índices e datas de reajuste</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="indiceReajuste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Índice de Reajuste *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {indicesReajuste.map(i => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataBaseReajuste"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Base de Reajuste *</FormLabel>
                      <FormControl>
                        <DatePickerInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="percentualFixo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentual Fixo (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 5.5"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Usado quando o índice é "Outro"</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alertaReajusteDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerta de Reajuste (dias antes) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormDescription>Antecedência para gerar alerta</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Receita */}
          <AccordionItem value="receita" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-health-healthy/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-health-healthy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold">Receita</p>
                  <p className="text-xs text-muted-foreground font-normal">Modelo e valores de referência</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="modeloReceita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo de Receita *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mrr">Receita Recorrente Mensal (MRR)</SelectItem>
                          <SelectItem value="media-mensal">Receita Média Mensal (Total / Duração)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moeda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moeda *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BRL">Real (BRL)</SelectItem>
                          <SelectItem value="USD">Dólar (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchModeloReceita === 'mrr' && (
                  <FormField
                    control={form.control}
                    name="valorMensalReferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mensal de Referência *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 50000"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchModeloReceita === 'media-mensal' && (
                  <FormField
                    control={form.control}
                    name="valorTotalContrato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total do Contrato *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 1200000"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Será dividido pela duração em meses</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="observacoesFinanceiras"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Financeiras</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas sobre faturamento, condições especiais, etc."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Escopo */}
          <AccordionItem value="escopo" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold">Escopo e Observações</p>
                  <p className="text-xs text-muted-foreground font-normal">Detalhes do objeto contratual</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="objeto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objeto do Contrato *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição completa do objeto do contrato..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="escopoOperacional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escopo Operacional</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes operacionais, sustentação, suporte..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SLAs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Acordos de nível de serviço..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="riscosPendencias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Riscos e Pendências</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Riscos identificados, pendências..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Responsáveis */}
          <AccordionItem value="responsaveis" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-chart-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold">Responsáveis</p>
                  <p className="text-xs text-muted-foreground font-normal">Gestores e pontos focais</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="responsavelInterno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável Interno *</FormLabel>
                      <FormControl>
                        <Input placeholder="Gestor do contrato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavelCS"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>P.O. / CS</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer Success" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavelComercial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável Comercial</FormLabel>
                      <FormControl>
                        <Input placeholder="Executivo de conta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Responsável no Cliente */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-semibold text-foreground mb-4">Responsável no Cliente</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="responsavelCliente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável no cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsavelClienteEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@cliente.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsavelClienteTelefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : contract ? 'Salvar Alterações' : 'Criar Contrato'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
