import React, { useState, useMemo } from 'react';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useHR } from '@/contexts/HRContext';
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

interface SubprojectAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subprojectId: string;
  contractId: string;
}

export function SubprojectAllocationDialog({ open, onOpenChange, subprojectId, contractId }: SubprojectAllocationDialogProps) {
  const { addAllocation, getAllocationsBySubproject, getAllocationsByContract } = useSubprojects();
  const { hrPeople } = useHR();
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [dedication, setDedication] = useState(100);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedPersonId('');
      setDedication(100);
      setSearch('');
    }
  }, [open]);

  const existingAllocPersonIds = useMemo(() => {
    const allocs = getAllocationsByContract(contractId);
    return new Set(allocs.map(a => a.hrPersonId));
  }, [getAllocationsByContract, contractId]);

  const availablePeople = useMemo(() => {
    const active = hrPeople.filter(p => p.situacao === 'ativo');
    const searchLower = search.toLowerCase();
    return active
      .filter(p => !existingAllocPersonIds.has(p.id))
      .filter(p => !search || p.nome.toLowerCase().includes(searchLower))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hrPeople, existingAllocPersonIds, search]);

  const handleSubmit = () => {
    if (!selectedPersonId) {
      toast.error('Selecione uma pessoa');
      return;
    }
    if (dedication <= 0 || dedication > 100) {
      toast.error('Dedicação deve ser entre 1% e 100%');
      return;
    }
    addAllocation({ subprojectId, hrPersonId: selectedPersonId, dedicationPercent: dedication });
    toast.success('Pessoa alocada ao subprojeto');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Pessoa ao Subprojeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Buscar pessoa</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por nome..." />
          </div>
          <div>
            <Label>Pessoa *</Label>
            <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {availablePeople.length === 0 ? (
                  <SelectItem value="__none" disabled>Nenhuma pessoa disponível</SelectItem>
                ) : (
                  availablePeople.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
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
          <Button onClick={handleSubmit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
