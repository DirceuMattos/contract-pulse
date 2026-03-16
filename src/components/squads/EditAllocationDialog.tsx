import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { SubprojectAllocation } from '@/types';
import { toast } from 'sonner';

interface EditAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: SubprojectAllocation;
  itemName: string;
  itemTypeLabel?: string;
}

export function EditAllocationDialog({ open, onOpenChange, allocation, itemName, itemTypeLabel = 'Recurso' }: EditAllocationDialogProps) {
  const { updateAllocation } = useSubprojects();
  const [dedication, setDedication] = useState(allocation.dedicationPercent);
  const [costValue, setCostValue] = useState<number | ''>(allocation.costValue ?? '');
  const [saving, setSaving] = useState(false);

  const isResource = !!allocation.resourceId;

  useEffect(() => {
    setDedication(allocation.dedicationPercent);
    setCostValue(allocation.costValue ?? '');
  }, [allocation]);

  const handleSave = async () => {
    if (dedication < 1 || dedication > 100) {
      toast.error('A dedicação deve estar entre 1% e 100%');
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<SubprojectAllocation> = { dedicationPercent: dedication };
      if (isResource) {
        updates.costValue = costValue === '' ? null : Number(costValue);
      }
      await updateAllocation(allocation.id, updates);
      toast.success('Alocação atualizada');
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao atualizar alocação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Alocação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground text-xs">{itemTypeLabel}</Label>
            <p className="font-medium">{itemName}</p>
          </div>
          {isResource && (
            <div className="space-y-1.5">
              <Label htmlFor="costValue">Valor mensal (R$)</Label>
              <Input
                id="costValue"
                type="number"
                min={0}
                step={0.01}
                value={costValue}
                onChange={(e) => setCostValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Valor a ser computado para este recurso neste subprojeto
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dedication">Dedicação (%)</Label>
            <Input
              id="dedication"
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
          <Button onClick={handleSave} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
