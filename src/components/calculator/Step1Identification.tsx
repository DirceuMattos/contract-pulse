import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Separator } from '@/components/ui/separator';
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
          <DatePickerInput value={data.expectedStartDate || ''} onChange={v => onChange({ expectedStartDate: v })} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Descrição do escopo *</Label>
          <Textarea rows={3} value={data.description} onChange={e => onChange({ description: e.target.value })} placeholder="Descreva brevemente o escopo do projeto..." />
        </div>
      </div>

      {/* Responsável no Cliente */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Responsável no Cliente</span>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={data.responsavelCliente ?? ''}
              onChange={e => onChange({ responsavelCliente: e.target.value || undefined })}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              type="email"
              value={data.responsavelClienteEmail ?? ''}
              onChange={e => onChange({ responsavelClienteEmail: e.target.value || undefined })}
              placeholder="email@cliente.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              value={data.responsavelClienteTelefone ?? ''}
              onChange={e => onChange({ responsavelClienteTelefone: e.target.value || undefined })}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </div>

      {/* Custo de consultoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Custo de consultoria previsto (mensal)</Label>
          <Input type="number" min={0} step={500} value={data.consultancyCost ?? ''} onChange={e => onChange({ consultancyCost: e.target.value === '' ? undefined : parseFloat(e.target.value) })} placeholder="R$ 0,00 — incluso automaticamente em Outros Custos" />
          <p className="text-xs text-muted-foreground">Se informado, será adicionado automaticamente à composição de custos.</p>
        </div>
      </div>
    </div>
  );
}
