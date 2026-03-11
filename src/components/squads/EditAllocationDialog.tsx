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
  personName: string;
}

export function EditAllocationDialog({ open, onOpenChange, allocation, personName }: EditAllocationDialogProps) {
  const { updateAllocation } = useSubprojects();
  const [dedication, setDedication] = useState(allocation.dedicationPercent);

  useEffect(() => {
    setDedication(allocation.dedicationPercent);
  }, [allocation]);

  const handleSave = () => {
    if (dedication < 1 || dedication > 100) {
      toast.error('A dedicação deve estar entre 1% e 100%');
      return;
    }
    updateAllocation(allocation.id, { dedicationPercent: dedication });
    toast.success('Dedicação atualizada');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Dedicação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground text-xs">Recurso</Label>
            <p className="font-medium">{personName}</p>
          </div>
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
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
