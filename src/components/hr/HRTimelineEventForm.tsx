import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { HRTimelineEvent } from '@/types';
import { handleFormValidationError } from '@/lib/formValidation';

const schema = z.object({
  eventDate: z.string().min(1, 'Data é obrigatória'),
  ocorrencia: z.enum(['reajuste', 'bonificacao', 'beneficio', 'mudanca-cargo', 'observacao', 'desligamento', 'outro']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().optional(),
  remuneracaoApos: z.number().optional(),
  beneficiosApos: z.number().optional(),
  atualizarRemuneracao: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface HRTimelineEventFormProps {
  event?: HRTimelineEvent;
  personId: string;
  canViewFinanceiro: boolean;
  onSubmit: (data: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ocorrenciaOptions = [
  { value: 'reajuste', label: 'Reajuste' },
  { value: 'bonificacao', label: 'Bonificação' },
  { value: 'beneficio', label: 'Benefício' },
  { value: 'mudanca-cargo', label: 'Mudança de Cargo' },
  { value: 'desligamento', label: 'Desligamento' },
  { value: 'observacao', label: 'Observação' },
  { value: 'outro', label: 'Outro' },
];

export function HRTimelineEventForm({ event, personId, canViewFinanceiro, onSubmit, onCancel }: HRTimelineEventFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventDate: event?.eventDate || new Date().toISOString().split('T')[0],
      ocorrencia: event?.ocorrencia || 'observacao',
      descricao: event?.descricao || '',
      valor: event?.valor,
      remuneracaoApos: event?.remuneracaoApos,
      beneficiosApos: event?.beneficiosApos,
      atualizarRemuneracao: event?.atualizarRemuneracao || false,
    },
  });

  const atualizarRemuneracao = form.watch('atualizarRemuneracao');

  const handleSubmit = (data: FormData) => {
    onSubmit({
      personId,
      eventDate: data.eventDate,
      ocorrencia: data.ocorrencia,
      descricao: data.descricao,
      valor: data.valor,
      remuneracaoApos: data.remuneracaoApos,
      beneficiosApos: data.beneficiosApos,
      atualizarRemuneracao: data.atualizarRemuneracao,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleFormValidationError)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="eventDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Data *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ocorrencia" render={({ field }) => (
            <FormItem>
              <FormLabel>Ocorrência *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {ocorrenciaOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="descricao" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição *</FormLabel>
            <FormControl><Textarea rows={3} placeholder="Descreva o evento..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {canViewFinanceiro && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Opcional" {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="remuneracaoApos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remuneração Após (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Opcional" {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="beneficiosApos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefícios Após (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Opcional" {...field}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="atualizarRemuneracao" render={({ field }) => (
              <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="mb-0 cursor-pointer">Atualizar remuneração atual com este evento</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Aplica os valores de "Remuneração Após" como valor atual da pessoa.
                  </p>
                </div>
              </FormItem>
            )} />
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">{event ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </form>
    </Form>
  );
}
