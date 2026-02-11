import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ContractSimulation, SimulationQuestionnaire } from '@/types';

interface Props {
  data: ContractSimulation;
  onChange: (updates: Partial<ContractSimulation>) => void;
}

export function Step3Questionnaire({ data, onChange }: Props) {
  const updateQ = (key: keyof SimulationQuestionnaire, value: unknown) => {
    onChange({ questionnaire: { ...data.questionnaire, [key]: value } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Complexidade e Questionário</h3>
        <p className="text-sm text-muted-foreground">Estas respostas orientam a sugestão automática de recursos.</p>
      </div>

      <div className="space-y-2">
        <Label>Nível de complexidade *</Label>
        <RadioGroup value={data.complexityLevel} onValueChange={v => onChange({ complexityLevel: v as ContractSimulation['complexityLevel'] })} className="flex gap-4">
          <div className="flex items-center space-x-2"><RadioGroupItem value="baixa" id="cx-b" /><Label htmlFor="cx-b" className="cursor-pointer">Baixa</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="media" id="cx-m" /><Label htmlFor="cx-m" className="cursor-pointer">Média</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="alta" id="cx-a" /><Label htmlFor="cx-a" className="cursor-pointer">Alta</Label></div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de demanda</Label>
          <Select value={data.questionnaire.demandType} onValueChange={v => updateQ('demandType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sustentacao">Sustentação / Manutenção</SelectItem>
              <SelectItem value="evolucao">Evolução incremental</SelectItem>
              <SelectItem value="novo-sistema">Novo sistema</SelectItem>
              <SelectItem value="implantacao">Implantação + customização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Criticidade</Label>
          <Select value={data.questionnaire.criticality} onValueChange={v => updateQ('criticality', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Integrações</Label>
          <Select value={data.questionnaire.integrations} onValueChange={v => updateQ('integrations', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Nenhuma</SelectItem>
              <SelectItem value="1-2">1–2</SelectItem>
              <SelectItem value="3-5">3–5</SelectItem>
              <SelectItem value="mais-5">&gt;5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Número de módulos</Label>
          <Select value={data.questionnaire.modules} onValueChange={v => updateQ('modules', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1-2">1–2</SelectItem>
              <SelectItem value="3-5">3–5</SelectItem>
              <SelectItem value="6-10">6–10</SelectItem>
              <SelectItem value="mais-10">&gt;10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Volume de usuários</Label>
          <Select value={data.questionnaire.userVolume} onValueChange={v => updateQ('userVolume', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="menos-200">&lt;200</SelectItem>
              <SelectItem value="200-2k">200–2.000</SelectItem>
              <SelectItem value="2k-20k">2.000–20.000</SelectItem>
              <SelectItem value="mais-20k">&gt;20.000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>SLA / Suporte</Label>
          <Select value={data.questionnaire.slaLevel} onValueChange={v => updateQ('slaLevel', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comercial">Horário comercial</SelectItem>
              <SelectItem value="12x5">12×5</SelectItem>
              <SelectItem value="24x7">24×7</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Prazo de entrega</Label>
          <Select value={data.questionnaire.deliveryPace} onValueChange={v => updateQ('deliveryPace', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flexivel">Flexível</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="agressivo">Agressivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch checked={data.questionnaire.fieldDependency} onCheckedChange={v => updateQ('fieldDependency', v)} />
          <Label>Dependência de campo (implantação presencial)</Label>
        </div>
      </div>
    </div>
  );
}
