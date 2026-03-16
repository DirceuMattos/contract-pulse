import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Package, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { ContractSubproject, SubprojectAllocation } from '@/types';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';
import { SubprojectFormDialog } from './SubprojectFormDialog';
import { SubprojectAllocationDialog, AllocationType } from './SubprojectAllocationDialog';
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
  const { resources } = useData();
  const { canEdit } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSp, setEditingSp] = useState<ContractSubproject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [allocDialog, setAllocDialog] = useState<{ spId: string; type: AllocationType } | null>(null);
  const [deletingAllocId, setDeletingAllocId] = useState<string | null>(null);
  const [editingAlloc, setEditingAlloc] = useState<{ alloc: SubprojectAllocation; name: string; typeLabel: string } | null>(null);
  const [expandedSubprojects, setExpandedSubprojects] = useState<Set<string>>(new Set());

  const subprojects = getSubprojectsByContract(contractId);
  const hrMap = useMemo(() => new Map(hrPeople.map(p => [p.id, p])), [hrPeople]);
  const resourceMap = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);

  const toggleExpanded = (spId: string) => {
    setExpandedSubprojects(prev => {
      const next = new Set(prev);
      if (next.has(spId)) next.delete(spId);
      else next.add(spId);
      return next;
    });
  };

  const handleDeleteSp = async () => {
    if (deletingId) {
      try {
        await deleteSubproject(deletingId);
        toast.success('Subprojeto removido');
      } catch { toast.error('Erro ao remover subprojeto'); }
      setDeletingId(null);
    }
  };

  const handleDeleteAlloc = async () => {
    if (deletingAllocId) {
      try {
        await deleteAllocation(deletingAllocId);
        toast.success('Alocação removida');
      } catch { toast.error('Erro ao remover alocação'); }
      setDeletingAllocId(null);
    }
  };

  const renderAllocRow = (alloc: SubprojectAllocation, name: string, typeLabel: string) => (
    <div key={alloc.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
      <span className="font-medium truncate">{name}</span>
      {alloc.costValue != null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          R$ {alloc.costValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </span>
      )}
      <span className="ml-auto tabular-nums font-medium">{alloc.dedicationPercent}%</span>
      {canEdit && (
        <>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingAlloc({ alloc, name, typeLabel })}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingAllocId(alloc.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );

  const renderSection = (
    allocations: SubprojectAllocation[],
    emptyMsg: string,
    type: AllocationType,
    spId: string,
    getName: (alloc: SubprojectAllocation) => string,
    typeLabel: string,
    icon: React.ReactNode,
    count: number,
  ) => (
    <div className="space-y-1">
      {allocations.length > 0 ? (
        allocations.map(alloc => renderAllocRow(alloc, getName(alloc), typeLabel))
      ) : (
        <p className="text-sm text-muted-foreground py-2">{emptyMsg}</p>
      )}
      <div className="flex items-center justify-between mt-2 pt-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {icon} {count} item{count !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAllocDialog({ spId, type })}>
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        )}
      </div>
    </div>
  );

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
        <div className="space-y-3">
          {subprojects.map(sp => {
            const allocations = getAllocationsBySubproject(sp.id);
            const hrAllocs = allocations.filter(a => a.hrPersonId);
            const resAllocs = allocations.filter(a => a.resourceId);
            const totalFTE = hrAllocs.reduce((s, a) => s + a.dedicationPercent / 100, 0);
            const isExpanded = expandedSubprojects.has(sp.id);

            return (
              <Card key={sp.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(sp.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <CardTitle className="text-base">{sp.name}</CardTitle>
                          <Badge className={statusBadgeClass[sp.status] || ''}>
                            {statusLabels[sp.status] || sp.status}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
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
                    {sp.description && <p className="text-sm text-muted-foreground ml-6">{sp.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1 ml-6 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {hrAllocs.length} pessoa{hrAllocs.length !== 1 ? 's' : ''}</span>
                      <span>FTE: {totalFTE.toFixed(2)}</span>
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {resAllocs.length} recurso{resAllocs.length !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Overhead Central (rateio automático)</span>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Pessoas</h4>
                        {renderSection(
                          hrAllocs,
                          'Nenhuma pessoa alocada.',
                          'hr',
                          sp.id,
                          (a) => hrMap.get(a.hrPersonId!)?.nome || 'Pessoa não encontrada',
                          'Pessoa',
                          <Users className="w-3 h-3" />,
                          hrAllocs.length,
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Recursos</h4>
                        {renderSection(
                          resAllocs,
                          'Nenhum recurso alocado.',
                          'resource',
                          sp.id,
                          (a) => {
                            const r = resourceMap.get(a.resourceId!);
                            return r ? `${r.nome}${r.categoria ? ` (${r.categoria})` : ''}` : 'Recurso não encontrado';
                          },
                          'Recurso',
                          <Package className="w-3 h-3" />,
                          resAllocs.length,
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
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

      {allocDialog && (
        <SubprojectAllocationDialog
          open={!!allocDialog}
          onOpenChange={(open) => { if (!open) setAllocDialog(null); }}
          subprojectId={allocDialog.spId}
          contractId={contractId}
          allocationType={allocDialog.type}
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
        description="O item será removido deste subprojeto."
      />

      {editingAlloc && (
        <EditAllocationDialog
          open={!!editingAlloc}
          onOpenChange={(open) => { if (!open) setEditingAlloc(null); }}
          allocation={editingAlloc.alloc}
          itemName={editingAlloc.name}
          itemTypeLabel={editingAlloc.typeLabel}
        />
      )}
    </div>
  );
}
