import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { HistoryEvent, HistoryEventType, HistoryImpactArea, AlertSeverity } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const eventTypeLabels: Record<HistoryEventType, string> = {
  'assinatura': 'Assinatura',
  'inicio-vigencia': 'Início de Vigência',
  'aditivo': 'Aditivo',
  'reajuste-aplicado': 'Reajuste Aplicado',
  'notificacao-recebida': 'Notificação Recebida',
  'notificacao-enviada': 'Notificação Enviada',
  'multa-penalidade': 'Multa / Penalidade',
  'marco-operacional': 'Marco Operacional',
  'reuniao-ata': 'Reunião / Ata',
  'ocorrencia': 'Ocorrência',
  'renegociacao': 'Renegociação',
  'renovacao': 'Renovação',
  'encerramento': 'Encerramento',
  'outro': 'Outro',
};

const impactLabels: Record<HistoryImpactArea, string> = {
  financeiro: 'Financeiro',
  prazo: 'Prazo',
  reajuste: 'Reajuste',
  juridico: 'Jurídico',
  operacional: 'Operacional',
  governanca: 'Governança',
};

const severityLabels: Record<AlertSeverity, string> = {
  info: 'Info',
  atencao: 'Atenção',
  critico: 'Crítico',
};

interface HistoryEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  event?: HistoryEvent;
  onSave: (data: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function HistoryEventForm({ open, onOpenChange, contractId, event, onSave }: HistoryEventFormProps) {
  const [eventDate, setEventDate] = useState<Date | undefined>(event ? new Date(event.eventDate) : undefined);
  const [eventType, setEventType] = useState<HistoryEventType>(event?.eventType || 'outro');
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [impactArea, setImpactArea] = useState<HistoryImpactArea>(event?.impactArea || 'operacional');
  const [severity, setSeverity] = useState<AlertSeverity>(event?.severity || 'info');
  const [relatedValue, setRelatedValue] = useState(event?.relatedValue?.toString() || '');
  const [relatedClause, setRelatedClause] = useState(event?.relatedClause || '');

  useEffect(() => {
    if (open) {
      setEventDate(event ? new Date(event.eventDate) : undefined);
      setEventType(event?.eventType || 'outro');
      setTitle(event?.title || '');
      setDescription(event?.description || '');
      setImpactArea(event?.impactArea || 'operacional');
      setSeverity(event?.severity || 'info');
      setRelatedValue(event?.relatedValue?.toString() || '');
      setRelatedClause(event?.relatedClause || '');
    }
  }, [open, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !title.trim() || !description.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha data, título e descrição.', variant: 'destructive' });
      return;
    }

    onSave({
      contractId,
      eventDate: eventDate.toISOString().split('T')[0],
      eventType,
      title: title.trim().slice(0, 120),
      description: description.trim(),
      impactArea,
      severity,
      relatedValue: relatedValue ? parseFloat(relatedValue.replace(/[^\d.,]/g, '').replace(',', '.')) : undefined,
      relatedClause: relatedClause.trim() || undefined,
      createdByUserId: undefined,
    });

    toast({ title: event ? 'Evento atualizado' : 'Evento criado', description: title.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Adicionar Evento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Data do evento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "dd/MM/yyyy") : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo do evento *</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as HistoryEventType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex: Aditivo de 25% no valor" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o evento..." rows={3} />
          </div>

          {/* Impact + Severity row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área de impacto *</Label>
              <Select value={impactArea} onValueChange={(v) => setImpactArea(v as HistoryImpactArea)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(impactLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as AlertSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(severityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor relacionado (R$)</Label>
              <Input value={relatedValue} onChange={(e) => setRelatedValue(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Cláusula relacionada</Label>
              <Input value={relatedClause} onChange={(e) => setRelatedClause(e.target.value)} placeholder="Ex: Cláusula 5.2" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{event ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
