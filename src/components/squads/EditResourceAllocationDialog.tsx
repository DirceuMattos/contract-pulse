import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { toast } from 'sonner';

export interface ResourceAllocationInfo {
  resourceId: string;
  contractId: string;
  contractNome: string;
  clientName: string;
  percentualDedicacao: number;
  hrPersonId: string | null;
  isSubprojectAllocation: boolean;
  subprojectId?: string;
  subprojectName?: string;
}

interface EditResourceAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ResourceAllocationInfo;
  personName: string;
}

export function EditResourceAllocationDialog({ open, onOpenChange, allocation, personName }: EditResourceAllocationDialogProps) {
  const { contracts, updateResource, deleteResource } = useData();
  const { hasSubprojects, getSubprojectsByContract, updateAllocation, deleteAllocation, addAllocation } = useSubprojects();

  const [dedication, setDedication] = useState(allocation.percentualDedicacao);
  const [targetContractId, setTargetContractId] = useState('same');
  const [targetSubprojectId, setTargetSubprojectId] = useState('');

  useEffect(() => {
    setDedication(allocation.percentualDedicacao);
    setTargetContractId('same');
    setTargetSubprojectId('');
  }, [allocation]);

  const activeContracts = useMemo(() =>
    contracts
      .filter(c => (c.status === 'operacao' || c.status === 'implantacao') && c.id !== allocation.contractId)
      .sort((a, b) => (a.nome || a.codigo).localeCompare(b.nome || b.codigo)),
    [contracts, allocation.contractId]
  );

  const targetHasSubprojects = targetContractId !== 'same' && hasSubprojects(targetContractId);
  const targetSubprojects = useMemo(() => {
    if (!targetHasSubprojects || targetContractId === 'same') return [];
    return getSubprojectsByContract(targetContractId).filter(sp => sp.status !== 'encerrado');
  }, [targetContractId, targetHasSubprojects, getSubprojectsByContract]);

  const isMoving = targetContractId !== 'same';

  const handleSave = async () => {
    if (dedication < 1 || dedication > 100) {
      toast.error('A dedicação deve estar entre 1% e 100%');
      return;
    }

    try {
      if (!isMoving) {
        if (allocation.isSubprojectAllocation) {
          await updateAllocation(allocation.resourceId, { dedicationPercent: dedication });
        } else {
          await updateResource(allocation.resourceId, { percentualDedicacao: dedication });
        }
        toast.success('Dedicação atualizada');
      } else {
        if (targetHasSubprojects) {
          if (!targetSubprojectId) {
            toast.error('Selecione o subprojeto de destino');
            return;
          }
          if (!allocation.hrPersonId) {
            toast.error('Não é possível mover recurso sem vínculo de RH para subprojeto');
            return;
          }
          await addAllocation({
            subprojectId: targetSubprojectId,
            hrPersonId: allocation.hrPersonId,
            dedicationPercent: dedication,
            notes: null,
          });
          if (allocation.isSubprojectAllocation) {
            await deleteAllocation(allocation.resourceId);
          } else {
            await updateResource(allocation.resourceId, { contractId: targetContractId, percentualDedicacao: dedication });
          }
        } else {
          if (allocation.isSubprojectAllocation) {
            if (!allocation.hrPersonId) {
              toast.error('Não é possível mover recurso sem vínculo de RH');
              return;
            }
            await deleteAllocation(allocation.resourceId);
            toast.info('Alocação removida do subprojeto de origem. Adicione o recurso manualmente no contrato de destino.');
            onOpenChange(false);
            return;
          } else {
            await updateResource(allocation.resourceId, { contractId: targetContractId, percentualDedicacao: dedication });
          }
        }
        toast.success('Recurso movido com sucesso');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao salvar alteração');
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Alocação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground text-xs">Recurso</Label>
            <p className="font-medium">{personName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Contrato atual</Label>
            <p className="text-sm">
              {allocation.contractNome}
              {allocation.subprojectName && <span className="text-primary"> → {allocation.subprojectName}</span>}
            </p>
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

          <div className="space-y-1.5">
            <Label>Mover para outro projeto</Label>
            <Select value={targetContractId} onValueChange={(v) => { setTargetContractId(v); setTargetSubprojectId(''); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Manter no mesmo contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same">Manter no mesmo contrato</SelectItem>
                {activeContracts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome || c.codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetHasSubprojects && targetSubprojects.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subprojeto de destino</Label>
              <Select value={targetSubprojectId} onValueChange={setTargetSubprojectId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {targetSubprojects.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            className="sm:mr-auto"
            onClick={async () => {
              try {
                if (allocation.isSubprojectAllocation) {
                  deleteAllocation(allocation.resourceId);
                } else {
                  await deleteResource(allocation.resourceId);
                }
                toast.success('Recurso retirado do projeto');
                onOpenChange(false);
              } catch {
                toast.error('Erro ao retirar recurso');
              }
            }}
          >
            Retirar do Projeto
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>
            {isMoving ? 'Mover e Salvar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
