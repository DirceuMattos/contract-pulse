import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { formatPhoneInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { HRPerson, BeneficioItem } from '@/types';
import { handleFormValidationError } from '@/lib/formValidation';
import { useData } from '@/contexts/DataContext';

const BENEFICIO_OPTIONS = [
  'Auxílio Creche',
  'Auxílio Certificação',
  'Auxílio Universidade',
  'Bolsa de Estudos',
  'Convênio Médico',
  'Vale Alimentação',
  'Vale Refeição',
  'Vale Transporte',
  'Plano Odontológico',
  'Outro',
];

const hrPersonSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  matricula: z.string().trim().optional(),
  tipoVinculo: z.enum(['clt', 'pj', 'cooperado', 'socio', 'estagio']),
  cargoId: z.string().optional(),
  teamId: z.string().optional(),
  remuneracaoMensal: z.number().min(0),
  beneficios: z.number().min(0),
  beneficioNome: z.string().optional(),
  beneficioSomaRemuneracao: z.boolean().optional(),
  remuneracaoII: z.number().min(0).optional(),
  localAtuacao: z.string().optional(),
  regimeTrabalho: z.enum(['remoto', 'hibrido', 'presencial']).optional(),
  regimeObservacoes: z.string().optional(),
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  situacao: z.enum(['ativo', 'inativo']),
  observacoes: z.string().optional(),
  comiteGestor: z.string().optional(),
  nivel: z.string().optional(),
  trilha: z.string().optional(),
  projeto: z.string().optional(),
  cargoAntigo: z.string().optional(),
  email: z.string().optional(),
  celular: z.string().optional(),
  idExterno: z.string().optional(),
  centroCusto: z.string().optional(),
  dataDesligamento: z.string().optional(),
  motivoDesligamento: z.string().optional(),
  observacoesDesligamento: z.string().optional(),
  tipoDesligamento: z.enum(['dispensado', 'solicitou-dispensa', 'transferido-grupo', 'outro']).optional(),
  // Endereço
  enderecoCep: z.string().optional(),
  enderecoLogradouro: z.string().optional(),
  enderecoNumero: z.string().optional(),
  enderecoSemNumero: z.boolean().optional(),
  enderecoComplemento: z.string().optional(),
  enderecoBairro: z.string().optional(),
  enderecoMunicipio: z.string().optional(),
  enderecoUf: z.string().optional(),
});

type HRPersonFormData = z.infer<typeof hrPersonSchema>;

interface HRPersonFormProps {
  person?: HRPerson;
  onSubmit: (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  canViewFinanceiro: boolean;
}

export function HRPersonForm({ person, onSubmit, onCancel, canViewFinanceiro }: HRPersonFormProps) {
  const { getActiveJobTitles, getActiveTeams } = useData();
  const activeJobTitles = getActiveJobTitles();
  const activeTeams = getActiveTeams();

  // Multi-benefit state
  const [beneficiosLista, setBeneficiosLista] = useState<BeneficioItem[]>(
    person?.beneficiosLista && person.beneficiosLista.length > 0
      ? person.beneficiosLista
      : []
  );

  const form = useForm<HRPersonFormData>({
    resolver: zodResolver(hrPersonSchema),
    defaultValues: {
      nome: person?.nome || '',
      matricula: person?.matricula || '',
      tipoVinculo: person?.tipoVinculo || 'clt',
      cargoId: person?.cargoId || '',
      teamId: person?.teamId || '',
      remuneracaoMensal: person?.remuneracaoMensal || 0,
      beneficios: person?.beneficios || 0,
      beneficioNome: person?.beneficioNome || '',
      beneficioSomaRemuneracao: person?.beneficioSomaRemuneracao || false,
      remuneracaoII: person?.remuneracaoII || 0,
      localAtuacao: person?.localAtuacao || '',
      regimeTrabalho: person?.regimeTrabalho,
      regimeObservacoes: person?.regimeObservacoes || '',
      dataAdmissao: person?.dataAdmissao || new Date().toISOString().split('T')[0],
      situacao: person?.situacao || 'ativo',
      observacoes: person?.observacoes || '',
      comiteGestor: person?.comiteGestor || '',
      nivel: person?.nivel || '',
      trilha: person?.trilha || '',
      projeto: person?.projeto || '',
      cargoAntigo: person?.cargoAntigo || '',
      email: person?.email || '',
      celular: person?.celular || '',
      idExterno: person?.idExterno || '',
      centroCusto: person?.centroCusto || '',
      dataDesligamento: person?.dataDesligamento || '',
      motivoDesligamento: person?.motivoDesligamento || '',
      observacoesDesligamento: person?.observacoesDesligamento || '',
      tipoDesligamento: person?.tipoDesligamento,
      enderecoCep: person?.enderecoCep || '',
      enderecoLogradouro: person?.enderecoLogradouro || '',
      enderecoNumero: person?.enderecoNumero || '',
      enderecoSemNumero: person?.enderecoSemNumero || false,
      enderecoComplemento: person?.enderecoComplemento || '',
      enderecoBairro: person?.enderecoBairro || '',
      enderecoMunicipio: person?.enderecoMunicipio || '',
      enderecoUf: person?.enderecoUf || '',
    },
  });

  const situacaoAtual = form.watch('situacao');
  const remuneracaoMensal = form.watch('remuneracaoMensal');

  // Compute totals from benefits list
  const totalBeneficios = beneficiosLista.reduce((sum, b) => sum + (b.valor || 0), 0);
  const totalBeneficiosSoma = beneficiosLista.filter(b => b.somaRemuneracao).reduce((sum, b) => sum + (b.valor || 0), 0);
  const remuneracaoTotal = (remuneracaoMensal || 0) + totalBeneficiosSoma;

  const addBeneficio = () => {
    setBeneficiosLista(prev => [...prev, { nome: '', valor: 0, somaRemuneracao: false }]);
  };

  const removeBeneficio = (index: number) => {
    setBeneficiosLista(prev => prev.filter((_, i) => i !== index));
  };

  const updateBeneficio = (index: number, field: keyof BeneficioItem, value: any) => {
    setBeneficiosLista(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const handleSubmit = (data: HRPersonFormData) => {
    const hasSoma = beneficiosLista.some(b => b.somaRemuneracao);
    onSubmit({
      nome: data.nome,
      matricula: data.matricula || undefined,
      tipoVinculo: data.tipoVinculo,
      cargoId: data.cargoId && data.cargoId !== 'none' ? data.cargoId : undefined,
      teamId: data.teamId && data.teamId !== 'none' ? data.teamId : undefined,
      remuneracaoMensal: data.remuneracaoMensal,
      beneficios: totalBeneficios,
      beneficioNome: beneficiosLista.map(b => b.nome).filter(Boolean).join(', ') || undefined,
      beneficioSomaRemuneracao: hasSoma,
      beneficiosLista,
      remuneracaoII: hasSoma ? remuneracaoTotal : (data.remuneracaoII || undefined),
      localAtuacao: data.localAtuacao || undefined,
      regimeTrabalho: data.regimeTrabalho || undefined,
      regimeObservacoes: data.regimeObservacoes || undefined,
      dataAdmissao: data.dataAdmissao,
      situacao: data.situacao,
      observacoes: data.observacoes || undefined,
      comiteGestor: data.comiteGestor || undefined,
      nivel: data.nivel || undefined,
      trilha: data.trilha || undefined,
      projeto: data.projeto || undefined,
      cargoAntigo: data.cargoAntigo || undefined,
      email: data.email || undefined,
      celular: data.celular || undefined,
      idExterno: data.idExterno || undefined,
      centroCusto: data.centroCusto || undefined,
      dataDesligamento: data.situacao === 'inativo' ? (data.dataDesligamento || undefined) : undefined,
      motivoDesligamento: data.situacao === 'inativo' ? (data.motivoDesligamento || undefined) : undefined,
      observacoesDesligamento: data.situacao === 'inativo' ? (data.observacoesDesligamento || undefined) : undefined,
      tipoDesligamento: data.situacao === 'inativo' ? data.tipoDesligamento : undefined,
      enderecoCep: data.enderecoCep || undefined,
      enderecoLogradouro: data.enderecoLogradouro || undefined,
      enderecoNumero: data.enderecoNumero || undefined,
      enderecoSemNumero: data.enderecoSemNumero || false,
      enderecoComplemento: data.enderecoComplemento || undefined,
      enderecoBairro: data.enderecoBairro || undefined,
      enderecoMunicipio: data.enderecoMunicipio || undefined,
      enderecoUf: data.enderecoUf || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleFormValidationError)} className="space-y-6">
        {/* Identificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Profissionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="matricula" render={({ field }) => (
              <FormItem>
                <FormLabel>Matrícula Feedz</FormLabel>
                <FormControl><Input placeholder="Ex: 12345" {...field} /></FormControl>
                {!field.value && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Sem matrícula — não será sincronizado automaticamente</p>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tipoVinculo" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Vínculo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                   <SelectContent>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="cooperado">Cooperado</SelectItem>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="estagio">Estagiário</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormItem>
              <FormLabel>Situação</FormLabel>
              <Input value={person?.situacao === 'inativo' ? 'Inativo' : 'Ativo'} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Use o fluxo de Desligamento para inativar.</p>
            </FormItem>
            <FormField control={form.control} name="cargoId" render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sem cargo</SelectItem>
                    {activeJobTitles.map(jt => (
                      <SelectItem key={jt.id} value={jt.id}>{jt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="teamId" render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sem departamento</SelectItem>
                    {activeTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="localAtuacao" render={({ field }) => (
              <FormItem>
                <FormLabel>Local de Atuação</FormLabel>
                <FormControl><Input placeholder="Ex: Remoto, São Paulo..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="regimeTrabalho" render={({ field }) => (
              <FormItem>
                <FormLabel>Regime de Trabalho</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}
                  value={field.value || 'none'}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="remoto">Remoto / Home Office</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="regimeObservacoes" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Observações do Regime</FormLabel>
                <FormControl><Textarea placeholder="Ex: Híbrido com presença no cliente 2x por semana" rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="dataAdmissao" render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Admissão *</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input type="email" placeholder="nome@empresa.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="celular" render={({ field }) => (
              <FormItem>
                <FormLabel>Celular</FormLabel>
                <FormControl><Input placeholder="(11) 99999-0000" {...field} onChange={e => field.onChange(formatPhoneInput(e.target.value))} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="nivel" render={({ field }) => (
              <FormItem>
                <FormLabel>Nível</FormLabel>
                <FormControl><Input placeholder="Ex: N1, N2 - Pleno..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="trilha" render={({ field }) => (
              <FormItem>
                <FormLabel>Trilha</FormLabel>
                <FormControl><Input placeholder="Ex: Técnica, Gestão..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projeto" render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <FormControl><Input placeholder="Projeto de alocação..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cargoAntigo" render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo Anterior</FormLabel>
                <FormControl><Input placeholder="Cargo anterior..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="idExterno" render={({ field }) => (
              <FormItem>
                <FormLabel>ID Externo</FormLabel>
                <FormControl><Input placeholder="Identificador externo..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="centroCusto" render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Custo</FormLabel>
                <FormControl><Input placeholder="Centro de custo..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Financeiro — apenas para quem pode ver */}
        {canViewFinanceiro && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="remuneracaoMensal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remuneração Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Multi-benefit section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Benefícios</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBeneficio}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Benefício
                  </Button>
                </div>

                {beneficiosLista.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">Nenhum benefício cadastrado. Clique em "Adicionar Benefício" para incluir.</p>
                )}

                {beneficiosLista.map((ben, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-lg border bg-muted/30">
                    <div className="md:col-span-4">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ben.valor}
                        onChange={e => updateBeneficio(idx, 'valor', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Label className="text-xs">Tipo de Benefício</Label>
                      <Select value={ben.nome || 'none'} onValueChange={v => updateBeneficio(idx, 'nome', v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {BENEFICIO_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Somar à Rem. Total</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={ben.somaRemuneracao} onCheckedChange={v => updateBeneficio(idx, 'somaRemuneracao', v)} />
                        <span className="text-xs text-muted-foreground">{ben.somaRemuneracao ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeBeneficio(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {beneficiosLista.length > 0 && (
                  <div className="flex items-center gap-4 text-sm pt-1">
                    <span className="text-muted-foreground">Total Benefícios: <strong className="text-foreground">{totalBeneficios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="remuneracaoII" render={({ field }) => {
                  const hasSoma = beneficiosLista.some(b => b.somaRemuneracao);
                  return (
                    <FormItem>
                      <FormLabel>Remuneração Total (Remuneração Mensal + Benefícios)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={hasSoma ? remuneracaoTotal : (field.value || 0)}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={hasSoma}
                          className={hasSoma ? 'bg-muted' : ''}
                        />
                      </FormControl>
                      {hasSoma && (
                        <p className="text-xs text-muted-foreground">Calculado automaticamente: Remuneração + Benefícios marcados para soma</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }} />
              </div>
            </div>
          </>
        )}

        {/* Endereço */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="enderecoCep" render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoLogradouro" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Logradouro</FormLabel>
                <FormControl><Input placeholder="Rua, Avenida..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoNumero" render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl><Input placeholder="Nº" {...field} disabled={form.watch('enderecoSemNumero')} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoSemNumero" render={({ field }) => (
              <FormItem className="flex items-end gap-2 pb-2">
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                    <Label className="text-sm">Sem número</Label>
                  </div>
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoComplemento" render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl><Input placeholder="Apto, Bloco..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoBairro" render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl><Input placeholder="Bairro" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoMunicipio" render={({ field }) => (
              <FormItem>
                <FormLabel>Município</FormLabel>
                <FormControl><Input placeholder="Cidade" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="enderecoUf" render={({ field }) => (
              <FormItem>
                <FormLabel>UF</FormLabel>
                <FormControl><Input placeholder="SP" maxLength={2} {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Destaque para Comitê Gestor em */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Destaque para Comitê Gestor em</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="comiteGestor" render={({ field }) => (
              <FormItem>
                <FormLabel>Comitê Gestor (mês/ano)</FormLabel>
                <FormControl><Input type="month" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Observações sobre o profissional..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Desligamento */}
        {situacaoAtual === 'inativo' && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Desligamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="dataDesligamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Desligamento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipoDesligamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Desligamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="dispensado">Dispensado</SelectItem>
                        <SelectItem value="solicitou-dispensa">Solicitou Dispensa</SelectItem>
                        <SelectItem value="transferido-grupo">Transferido (Grupo)</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="motivoDesligamento" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Motivo</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Detalhes do desligamento..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="observacoesDesligamento" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações de Desligamento</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Observações adicionais sobre o desligamento..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">{person ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </form>
    </Form>
  );
}
