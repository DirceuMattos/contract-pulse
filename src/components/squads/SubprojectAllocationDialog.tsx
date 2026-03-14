import React, { useState, useMemo } from 'react';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export type AllocationType = 'hr' | 'resource' | 'overhead';

interface SubprojectAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subprojectId: string;
  contractId: string;
  allocationType: AllocationType;
}

const typeLabels: Record<AllocationType, string> = {
  hr: 'Pessoa ao Subprojeto',
  resource: 'Recurso ao Subprojeto',
  overhead: 'Overhead ao Subprojeto',
};

export function SubprojectAllocationDialog({ open, onOpenChange, subprojectId, contractId, allocationType }: SubprojectAllocationDialogProps) {
  const { addAllocation, getAllocationsBySubproject } = useSubprojects();
  const { hrPeople } = useHR();
  const { resources, overheadItems } = useData();
  const [selectedId, setSelectedId] = useState('');
  const [dedication, setDedication] = useState(100);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedId('');
      setDedication(100);
      setSearch('');
    }
  }, [open]);

  const { getAllocationsBySubproject } = useSubprojects();

  const existingIds = useMemo(() => {
    // Filter by subproject (not entire contract) so same person can be in multiple subprojects
    const allocs = getAllocationsBySubproject(subprojectId);
    if (allocationType === 'hr') {
      return new Set(allocs.filter(a => a.hrPersonId).map(a => a.hrPersonId!));
    } else if (allocationType === 'resource') {
      return new Set(allocs.filter(a => a.resourceId).map(a => a.resourceId!));
    } else {
      return new Set(allocs.filter(a => a.overheadItemId).map(a => a.overheadItemId!));
    }
  }, [getAllocationsBySubproject, subprojectId, allocationType]);

  const availableItems = useMemo(() => {
    const searchLower = search.toLowerCase();

    if (allocationType === 'hr') {
      return hrPeople
        .filter(p => p.situacao === 'ativo')
        .filter(p => !existingIds.has(p.id))
        .filter(p => !search || p.nome.toLowerCase().includes(searchLower))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(p => ({ id: p.id, label: p.nome }));
    }

    if (allocationType === 'resource') {
      return resources
        .filter(r => r.contractId === contractId && r.tipo === 'outro')
        .filter(r => !existingIds.has(r.id))
        .filter(r => !search || r.nome.toLowerCase().includes(searchLower))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(r => ({ id: r.id, label: `${r.nome}${r.categoria ? ` (${r.categoria})` : ''}` }));
    }

    // overhead
    return overheadItems
      .filter(o => o.contractId === contractId)
      .filter(o => !existingIds.has(o.id))
      .filter(o => !search || o.nome.toLowerCase().includes(searchLower))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(o => ({ id: o.id, label: `${o.nome} (${o.categoria})` }));
  }, [hrPeople, resources, overheadItems, existingIds, search, allocationType, contractId]);

  const handleSubmit = async () => {
    if (!selectedId) {
      toast.error('Selecione um item');
      return;
    }
    if (dedication <= 0 || dedication > 100) {
      toast.error('Dedicação deve ser entre 1% e 100%');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { subprojectId, dedicationPercent: dedication };
      if (allocationType === 'hr') payload.hrPersonId = selectedId;
      else if (allocationType === 'resource') payload.resourceId = selectedId;
      else payload.overheadItemId = selectedId;

      await addAllocation(payload);
      toast.success('Item alocado ao subprojeto');
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao alocar item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar {typeLabels[allocationType]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por nome..." />
          </div>
          <div>
            <Label>{allocationType === 'hr' ? 'Pessoa' : allocationType === 'resource' ? 'Recurso' : 'Overhead'} *</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {availableItems.length === 0 ? (
                  <SelectItem value="__none" disabled>Nenhum item disponível</SelectItem>
                ) : (
                  availableItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dedicação (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={dedication}
              onChange={(e) => setDedication(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
