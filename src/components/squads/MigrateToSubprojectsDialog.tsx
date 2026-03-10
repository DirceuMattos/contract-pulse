import React from 'react';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MigrateToSubprojectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  onComplete: () => void;
}

export function MigrateToSubprojectsDialog({ open, onOpenChange, contractId, onComplete }: MigrateToSubprojectsDialogProps) {
  const { getResourcesByContract } = useData();
  const { addSubproject, addAllocation } = useSubprojects();

  const resources = getResourcesByContract(contractId);
  const hrResources = resources.filter(r => (r.tipo === 'clt' || r.tipo === 'pj') && r.hrPersonId);

  const handleMigrate = () => {
    const sp = addSubproject({ contractId, name: 'Geral', status: 'ativo' });

    for (const r of hrResources) {
      if (r.hrPersonId) {
        addAllocation({
          subprojectId: sp.id,
          hrPersonId: r.hrPersonId,
          dedicationPercent: r.percentualDedicacao,
        });
      }
    }

    toast.success(`Subprojeto "Geral" criado com ${hrResources.length} pessoa(s) migrada(s).`);
    onOpenChange(false);
    onComplete();
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Migrar alocações para subprojeto</DialogTitle>
          <DialogDescription>
            Este contrato possui {hrResources.length} recurso(s) humano(s) alocado(s) diretamente. 
            Deseja criar o subprojeto "Geral" e mover as alocações atuais para ele?
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
          <p><strong>{hrResources.length}</strong> pessoa(s) serão migrada(s)</p>
          <p className="text-muted-foreground">As alocações no nível do contrato (recursos) continuarão existindo. O subprojeto servirá como organizador de squads.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip}>Pular, apenas ativar</Button>
          <Button onClick={handleMigrate}>Criar "Geral" e migrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
