import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import type { ContractSimulation } from '@/types';

interface Props {
  data: ContractSimulation;
  onChange: (updates: Partial<ContractSimulation>) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function Step2Pricing({ data, onChange }: Props) {
  const receitaMensal = data.pricingModel === 'mensal'
    ? (data.proposedMonthlyValue || 0)
    : (data.proposedTotalValue || 0) / Math.max(data.termMonths, 1);

  const receitaTotal = data.pricingModel === 'mensal'
    ? (data.proposedMonthlyValue || 0) * data.termMonths
    : (data.proposedTotalValue || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Precificação Pretendida</h3>
        <p className="text-sm text-muted-foreground">Defina o valor proposto para o contrato.</p>
      </div>

      <div className="space-y-4">
        <Label>Modelo de precificação *</Label>
        <RadioGroup value={data.pricingModel} onValueChange={v => onChange({ pricingModel: v as ContractSimulation['pricingModel'] })} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mensal" id="mensal" />
            <Label htmlFor="mensal" className="cursor-pointer">Valor mensal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="total" id="total" />
            <Label htmlFor="total" className="cursor-pointer">Valor total do período</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="max-w-md">
        {data.pricingModel === 'mensal' ? (
          <div className="space-y-2">
            <Label>Valor mensal proposto (R$) *</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={data.proposedMonthlyValue || ''}
              onChange={e => onChange({ proposedMonthlyValue: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Valor total proposto (R$) *</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={data.proposedTotalValue || ''}
              onChange={e => onChange({ proposedTotalValue: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita mensal projetada</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(receitaMensal)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita total projetada</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(receitaTotal)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
