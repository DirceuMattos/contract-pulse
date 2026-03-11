import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { OverheadItem, OverheadCategory, OverheadMode } from '@/types';
import { formatCurrency } from '@/lib/calculations';

const overheadFormSchema = z.object({
  categoria: z.enum(['infraestrutura', 'administrativo', 'governanca']),
  nome: z.string().min(2, 'Nome é obrigatório'),
  modo: z.enum(['percentual', 'fixo']),
  percentual: z.number().min(0).max(100).optional(),
  valorFixoMensal: z.number().min(0).optional(),
});

type OverheadFormData = z.infer<typeof overheadFormSchema>;

interface OverheadFormProps {
  item?: OverheadItem;
  contractId: string;
  baseCalculo: number;
  onSubmit: (data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const categoriaOptions: { value: OverheadCategory; label: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura do Escritório' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'governanca', label: 'Governança / Contábil / Financeiro' },
];

const nomesPadrao: Record<OverheadCategory, string> = {
  infraestrutura: 'Overhead de infraestrutura do escritório',
  administrativo: 'Overhead administrativo',
  governanca: 'Overhead de governança/contábil/financeiro',
};

export function OverheadForm({ item, contractId, baseCalculo, onSubmit, onCancel }: OverheadFormProps) {
  const form = useForm<OverheadFormData>({
    resolver: zodResolver(overheadFormSchema),
    defaultValues: {
      categoria: item?.categoria || 'infraestrutura',
      nome: item?.nome || nomesPadrao['infraestrutura'],
      modo: item?.modo || 'percentual',
      percentual: item?.percentual ?? 8,
      valorFixoMensal: item?.valorFixoMensal ?? 0,
    },
  });

  const modo = form.watch('modo');
  const percentual = form.watch('percentual') || 0;
  const valorFixo = form.watch('valorFixoMensal') || 0;

  const custoPreview = modo === 'percentual'
    ? (percentual / 100) * baseCalculo
    : valorFixo;

  const handleCategoriaChange = (value: OverheadCategory) => {
    form.setValue('categoria', value);
    if (!item) {
      form.setValue('nome', nomesPadrao[value]);
    }
  };

  const handleFormSubmit = (data: OverheadFormData) => {
    onSubmit({
      contractId,
      categoria: data.categoria,
      nome: data.nome,
      modo: data.modo,
      percentual: data.modo === 'percentual' ? data.percentual : undefined,
      valorFixoMensal: data.modo === 'fixo' ? data.valorFixoMensal : undefined,
    });
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select
                  onValueChange={(v) => handleCategoriaChange(v as OverheadCategory)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modo de Cálculo</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentual" id="modo-percentual" />
                      <Label htmlFor="modo-percentual" className="flex items-center gap-1 cursor-pointer">
                        Percentual
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Percentual aplicado sobre o custo base de execução (RH + outros custos diretos).
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixo" id="modo-fixo" />
                      <Label htmlFor="modo-fixo" className="flex items-center gap-1 cursor-pointer">
                        Valor Fixo
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Valor mensal fixo atribuído ao contrato para cobrir custos indiretos.
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {modo === 'percentual' ? (
            <FormField
              control={form.control}
              name="percentual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Percentual
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Base atual: {formatCurrency(baseCalculo)} (Receita mensal do contrato).
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="pr-8"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="valorFixoMensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Fixo Mensal</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-10"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Preview */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                Custo mensal estimado
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {modo === 'percentual'
                      ? `${percentual}% × ${formatCurrency(baseCalculo)} (receita mensal do contrato)`
                      : 'Valor fixo mensal definido'}
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="text-lg font-bold text-primary">{formatCurrency(custoPreview)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {item ? 'Salvar Alterações' : 'Adicionar Overhead'}
            </Button>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}
