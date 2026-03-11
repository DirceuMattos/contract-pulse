import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { ContractSubproject, SubprojectAllocation, HRPerson } from '@/types';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useHR } from '@/contexts/HRContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';
import { SubprojectFormDialog } from './SubprojectFormDialog';
import { SubprojectAllocationDialog } from './SubprojectAllocationDialog';
import { EditAllocationDialog } from './EditAllocationDialog';

interface SubprojectManagementPanelProps {
  contractId: string;
}

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

const statusBadgeClass: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspenso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  encerrado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SubprojectManagementPanel({ contractId }: SubprojectManagementPanelProps) {
  const { getSubprojectsByContract, deleteSubproject, getAllocationsBySubproject, deleteAllocation } = useSubprojects();
  const { hrPeople } = useHR();
  const { canEdit } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSp, setEditingSp] = useState<ContractSubproject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [allocDialogSpId, setAllocDialogSpId] = useState<string | null>(null);
  const [deletingAllocId, setDeletingAllocId] = useState<string | null>(null);
  const [editingAlloc, setEditingAlloc] = useState<{ alloc: SubprojectAllocation; personName: string } | null>(null);

  const subprojects = getSubprojectsByContract(contractId);
  const hrMap = new Map(hrPeople.map(p => [p.id, p]));

  const handleDeleteSp = () => {
    if (deletingId) {
      deleteSubproject(deletingId);
      setDeletingId(null);
      toast.success('Subprojeto removido');
    }
  };

  const handleDeleteAlloc = () => {
    if (deletingAllocId) {
      deleteAllocation(deletingAllocId);
      setDeletingAllocId(null);
      toast.success('Alocação removida');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subprojetos</h3>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditingSp(null); setFormOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Adicionar Subprojeto
          </Button>
        )}
      </div>

      {subprojects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum subprojeto cadastrado.</p>
            <p className="text-sm">Crie subprojetos para organizar as squads deste contrato.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subprojects.map(sp => {
            const allocations = getAllocationsBySubproject(sp.id);
            const totalFTE = allocations.reduce((s, a) => s + a.dedicationPercent / 100, 0);

            return (
              <Card key={sp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{sp.name}</CardTitle>
                      <Badge className={statusBadgeClass[sp.status] || ''}>
                        {statusLabels[sp.status] || sp.status}
                      </Badge>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSp(sp); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(sp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {sp.description && <p className="text-sm text-muted-foreground">{sp.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {allocations.length > 0 ? (
                      allocations.map(alloc => {
                        const person = hrMap.get(alloc.hrPersonId);
                        return (
                          <div key={alloc.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                            <span className="font-medium">{person?.nome || 'Pessoa não encontrada'}</span>
                            <span className="text-muted-foreground">—</span>
                            <span className="text-muted-foreground">{person ? (person.cargoId ? 'Cargo vinculado' : 'Sem cargo') : ''}</span>
                            <span className="ml-auto tabular-nums font-medium">{alloc.dedicationPercent}%</span>
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingAllocId(alloc.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Nenhuma pessoa alocada neste subprojeto.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {allocations.length} pessoa{allocations.length !== 1 ? 's' : ''} • FTE: {totalFTE.toFixed(2)}
                    </span>
                    {canEdit && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAllocDialogSpId(sp.id)}>
                        <Plus className="w-3 h-3" />
                        Adicionar Recurso
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SubprojectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contractId={contractId}
        subproject={editingSp}
      />

      {allocDialogSpId && (
        <SubprojectAllocationDialog
          open={!!allocDialogSpId}
          onOpenChange={(open) => { if (!open) setAllocDialogSpId(null); }}
          subprojectId={allocDialogSpId}
          contractId={contractId}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        onConfirm={handleDeleteSp}
        title="Excluir Subprojeto"
        description="Todas as alocações deste subprojeto serão removidas. Deseja continuar?"
      />

      <ConfirmDeleteDialog
        open={!!deletingAllocId}
        onOpenChange={(open) => { if (!open) setDeletingAllocId(null); }}
        onConfirm={handleDeleteAlloc}
        title="Remover Alocação"
        description="A pessoa será removida deste subprojeto."
      />
    </div>
  );
}
