import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContractSimulation } from '@/types';

interface Props {
  data: ContractSimulation;
  onChange: (updates: Partial<ContractSimulation>) => void;
}

export function Step1Identification({ data, onChange }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Identificação e Contexto</h3>
        <p className="text-sm text-muted-foreground">Informações básicas da simulação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Nome da simulação *</Label>
          <Input value={data.name} onChange={e => onChange({ name: e.target.value })} placeholder="Ex.: Prefeitura XPTO — Sistema de Iluminação" />
        </div>

        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Input value={data.clientName} onChange={e => onChange({ clientName: e.target.value })} placeholder="Nome do cliente" />
        </div>

        <div className="space-y-2">
          <Label>Tipo de contrato *</Label>
          <Select value={data.contractType} onValueChange={v => onChange({ contractType: v as ContractSimulation['contractType'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gov">Governo</SelectItem>
              <SelectItem value="private">Privado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.contractType === 'gov' && (
          <div className="space-y-2">
            <Label>Esfera</Label>
            <Select value={data.govSphere || ''} onValueChange={v => onChange({ govSphere: v as ContractSimulation['govSphere'] })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="municipal">Municipal</SelectItem>
                <SelectItem value="estadual">Estadual</SelectItem>
                <SelectItem value="federal">Federal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Prazo (meses) *</Label>
          <Input type="number" min={1} value={data.termMonths || ''} onChange={e => onChange({ termMonths: parseInt(e.target.value) || 0 })} />
        </div>

        <div className="space-y-2">
          <Label>Data estimada de início</Label>
          <Input type="date" value={data.expectedStartDate || ''} onChange={e => onChange({ expectedStartDate: e.target.value })} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Descrição do escopo *</Label>
          <Textarea rows={3} value={data.description} onChange={e => onChange({ description: e.target.value })} placeholder="Descreva brevemente o escopo do projeto..." />
        </div>
      </div>
    </div>
  );
}
