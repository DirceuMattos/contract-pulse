import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatPhoneInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { HRPerson } from '@/types';
import { useData } from '@/contexts/DataContext';

const hrPersonSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  tipoVinculo: z.enum(['clt', 'pj']),
  cargoId: z.string().optional(),
  teamId: z.string().optional(),
  remuneracaoMensal: z.number().min(0),
  beneficios: z.number().min(0),
  remuneracaoII: z.number().min(0).optional(),
  localAtuacao: z.string().optional(),
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  situacao: z.enum(['ativo', 'inativo']),
  observacoes: z.string().optional(),
  comiteGestor: z.string().optional(),
  // Novos campos
  nivel: z.string().optional(),
  trilha: z.string().optional(),
  projeto: z.string().optional(),
  cargoAntigo: z.string().optional(),
  email: z.string().optional(),
  celular: z.string().optional(),
  idExterno: z.string().optional(),
  centroCusto: z.string().optional(),
  // Desligamento
  dataDesligamento: z.string().optional(),
  motivoDesligamento: z.string().optional(),
  observacoesDesligamento: z.string().optional(),
  tipoDesligamento: z.enum(['dispensado', 'solicitou-dispensa', 'transferido-grupo', 'outro']).optional(),
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

  const form = useForm<HRPersonFormData>({
    resolver: zodResolver(hrPersonSchema),
    defaultValues: {
      nome: person?.nome || '',
      tipoVinculo: person?.tipoVinculo || 'clt',
      cargoId: person?.cargoId || '',
      teamId: person?.teamId || '',
      remuneracaoMensal: person?.remuneracaoMensal || 0,
      beneficios: person?.beneficios || 0,
      remuneracaoII: person?.remuneracaoII || 0,
      localAtuacao: person?.localAtuacao || '',
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
    },
  });

  const situacaoAtual = form.watch('situacao');

  const handleSubmit = (data: HRPersonFormData) => {
    onSubmit({
      nome: data.nome,
      tipoVinculo: data.tipoVinculo,
      cargoId: data.cargoId && data.cargoId !== 'none' ? data.cargoId : undefined,
      teamId: data.teamId && data.teamId !== 'none' ? data.teamId : undefined,
      remuneracaoMensal: data.remuneracaoMensal,
      beneficios: data.beneficios,
      remuneracaoII: data.remuneracaoII || undefined,
      localAtuacao: data.localAtuacao || undefined,
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
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
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
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="situacao" render={({ field }) => (
              <FormItem>
                <FormLabel>Situação *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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
                <FormField control={form.control} name="beneficios" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefícios (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="remuneracaoII" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remuneração II — VA / Ajuste (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </>
        )}

        {/* Atualização mensal */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Atualização Mensal</h3>
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
