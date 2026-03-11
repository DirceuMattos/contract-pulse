import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Info } from 'lucide-react';

interface MigrateToSubprojectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  onComplete: () => void;
}

export function MigrateToSubprojectsDialog({ open, onOpenChange, contractId, onComplete }: MigrateToSubprojectsDialogProps) {
  const handleConfirm = () => {
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ativar subprojetos</DialogTitle>
          <DialogDescription>
            Ao ativar subprojetos, você poderá criar frentes operacionais e distribuir os recursos entre elas.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 flex gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>Os recursos existentes no contrato continuarão disponíveis.</p>
            <p className="text-muted-foreground">Acesse o módulo <strong>Squads</strong> para criar seus subprojetos e alocar os profissionais em cada um deles.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm}>Entendi, ativar subprojetos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
