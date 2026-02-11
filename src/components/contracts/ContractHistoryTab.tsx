import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Search, ArrowUpDown, Clock, FileText, AlertTriangle, AlertCircle, Info,
  Pencil, Trash2, ChevronDown, Sparkles, DollarSign, Scale, Gavel, Settings2, Shield
} from 'lucide-react';
import { HistoryEvent, HistoryEventType, HistoryImpactArea, AlertSeverity } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/calculations';
import HistoryEventForm from '@/components/forms/HistoryEventForm';

const eventTypeLabels: Record<HistoryEventType, string> = {
  'assinatura': 'Assinatura',
  'inicio-vigencia': 'Início de Vigência',
  'aditivo': 'Aditivo',
  'reajuste-aplicado': 'Reajuste Aplicado',
  'notificacao-recebida': 'Notif. Recebida',
  'notificacao-enviada': 'Notif. Enviada',
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

const impactIcons: Record<HistoryImpactArea, React.ReactNode> = {
  financeiro: <DollarSign className="w-3 h-3" />,
  prazo: <Clock className="w-3 h-3" />,
  reajuste: <Settings2 className="w-3 h-3" />,
  juridico: <Gavel className="w-3 h-3" />,
  operacional: <Scale className="w-3 h-3" />,
  governanca: <Shield className="w-3 h-3" />,
};

const severityConfig: Record<AlertSeverity, { icon: React.ReactNode; color: string; dotColor: string }> = {
  info: { icon: <Info className="w-4 h-4" />, color: 'text-blue-500', dotColor: 'bg-blue-500' },
  atencao: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-health-attention', dotColor: 'bg-health-attention' },
  critico: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-health-critical', dotColor: 'bg-health-critical' },
};

const filterChips: { key: string; types: HistoryEventType[]; label: string }[] = [
  { key: 'aditivo', types: ['aditivo'], label: 'Aditivo' },
  { key: 'reajuste', types: ['reajuste-aplicado'], label: 'Reajuste' },
  { key: 'notificacao', types: ['notificacao-recebida', 'notificacao-enviada'], label: 'Notificação' },
  { key: 'multa', types: ['multa-penalidade'], label: 'Multa' },
  { key: 'marco', types: ['marco-operacional'], label: 'Marco' },
  { key: 'ocorrencia', types: ['ocorrencia'], label: 'Ocorrência' },
];

interface ContractHistoryTabProps {
  contractId: string;
}

export default function ContractHistoryTab({ contractId }: ContractHistoryTabProps) {
  const { getHistoryEventsByContract, addHistoryEvent, updateHistoryEvent, deleteHistoryEvent } = useData();
  const { canEdit, canViewValues } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HistoryEvent | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [ascending, setAscending] = useState(false);

  const events = getHistoryEventsByContract(contractId);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by type chips
    if (activeFilters.size > 0) {
      const allowedTypes = new Set<HistoryEventType>();
      filterChips.forEach(chip => {
        if (activeFilters.has(chip.key)) {
          chip.types.forEach(t => allowedTypes.add(t));
        }
      });
      result = result.filter(e => allowedTypes.has(e.eventType));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const diff = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      return ascending ? diff : -diff;
    });

    return result;
  }, [events, activeFilters, searchQuery, ascending]);

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = (data: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingEvent) {
      updateHistoryEvent(editingEvent.id, data);
    } else {
      addHistoryEvent(data);
    }
    setEditingEvent(undefined);
  };

  const handleEdit = (event: HistoryEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteHistoryEvent(id);
    toast({ title: 'Evento excluído' });
  };

  const handleAdd = () => {
    setEditingEvent(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Histórico do contrato</h3>
        <p className="text-sm text-muted-foreground">
          Registre acontecimentos relevantes do contrato: aditivos, reajustes, notificações, multas, marcos de execução e decisões.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <Button onClick={handleAdd} className="gap-2" size="sm">
            <Plus className="w-4 h-4" />
            Adicionar evento
          </Button>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="gap-2">
                Exportar histórico (Em breve)
              </Button>
            </TooltipTrigger>
            <TooltipContent>Disponível na próxima versão</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map(chip => (
          <Badge
            key={chip.key}
            variant={activeFilters.has(chip.key) ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggleFilter(chip.key)}
          >
            {chip.label}
          </Badge>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-[200px]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAscending(!ascending)} className="gap-1">
          <ArrowUpDown className="w-4 h-4" />
          {ascending ? 'Antigo primeiro' : 'Recente primeiro'}
        </Button>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum evento registrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registre acontecimentos relevantes do contrato: aditivos, reajustes, notificações, marcos.
            </p>
            {canEdit && (
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar primeiro evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const sev = severityConfig[event.severity];
              const isLongDesc = event.description.length > 150;

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Dot */}
                  <div className={cn('absolute left-[10px] top-3 w-3 h-3 rounded-full ring-2 ring-background z-10', sev.dotColor)} />

                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Date + Type + Severity */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">
                              {format(new Date(event.eventDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            <Badge variant="secondary" className="text-xs">{eventTypeLabels[event.eventType]}</Badge>
                            <span className={cn('flex items-center gap-1', sev.color)}>
                              {sev.icon}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-foreground">{event.title}</h4>

                          {/* Description */}
                          {isLongDesc ? (
                            <Collapsible>
                              <p className="text-sm text-muted-foreground">{event.description.slice(0, 150)}...</p>
                              <CollapsibleTrigger asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs gap-1">
                                  Ver mais <ChevronDown className="w-3 h-3" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <p className="text-sm text-muted-foreground mt-1">{event.description.slice(150)}</p>
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}

                          {/* Chips row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="gap-1 text-xs">
                              {impactIcons[event.impactArea]}
                              {impactLabels[event.impactArea]}
                            </Badge>
                            {event.relatedValue != null && canViewValues && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(event.relatedValue)}
                              </Badge>
                            )}
                            {event.relatedClause && (
                              <Badge variant="outline" className="text-xs">
                                {event.relatedClause}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(event)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir evento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir "{event.title}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(event.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Future suggestion section */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="opacity-50 cursor-default">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eventos sugeridos (Em breve)</p>
                  <p className="text-xs text-muted-foreground">
                    Na etapa com backend, o sistema poderá sugerir eventos a partir de reajustes, vencimentos, documentos e integrações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            Na etapa com backend, o sistema poderá sugerir eventos a partir de reajustes, vencimentos, documentos e integrações.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Form dialog */}
      <HistoryEventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contractId={contractId}
        event={editingEvent}
        onSave={handleSave}
      />
    </div>
  );
}
