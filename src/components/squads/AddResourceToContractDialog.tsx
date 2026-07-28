import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useHR } from '@/contexts/HRContext';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface AddResourceToContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hrPersonId: string;
  personName: string;
}

interface PendingAllocation {
  id: string;
  contractId: string;
  subprojectId: string;
  dedication: number;
}

export function AddResourceToContractDialog({ open, onOpenChange, hrPersonId, personName }: AddResourceToContractDialogProps) {
  const { contracts, clients, resources, addResource } = useData();
  const { hasSubprojects, getSubprojectsByContract, getAllocationsBySubproject, addAllocation } = useSubprojects();
  const { hrPeople } = useHR();

  const [contractId, setContractId] = useState('');
  const [subprojectId, setSubprojectId] = useState('');
  const [dedication, setDedication] = useState(100);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedPerson = useMemo(() => hrPeople.find(p => p.id === hrPersonId), [hrPeople, hrPersonId]);

  useEffect(() => {
    if (open) {
      setContractId('');
      setSubprojectId('');
      setDedication(100);
      setPendingAllocations([]);
    }
  }, [open]);

  const activeContracts = useMemo(
    () => contracts
      .filter(c => c.status === 'operacao' || c.status === 'implantacao')
      .sort((a, b) => (a.nome || a.codigo).localeCompare(b.nome || b.codigo, 'pt-BR', { sensitivity: 'base' })),
    [contracts],
  );

  const selectedHasSubprojects = contractId ? hasSubprojects(contractId) : false;
  const subprojects = useMemo(() => {
    if (!selectedHasSubprojects || !contractId) return [];
    return getSubprojectsByContract(contractId)
      .filter(sp => sp.status !== 'encerrado')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [contractId, selectedHasSubprojects, getSubprojectsByContract]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.razaoSocial || '';

  const getContractLabel = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return 'Projeto';
    const clientName = contract.clientId ? getClientName(contract.clientId) : '';
    return `${contract.nome || contract.codigo}${clientName ? ` - ${clientName}` : ''}`;
  };

  const getSubprojectLabel = (id: string) => {
    if (!id) return '';
    const allSubprojects = contracts.flatMap(contract => getSubprojectsByContract(contract.id));
    return allSubprojects.find(sp => sp.id === id)?.name || 'Subprojeto';
  };

  const allocationKey = (item: Pick<PendingAllocation, 'contractId' | 'subprojectId'>) =>
    item.subprojectId ? `sub:${item.subprojectId}` : `contract:${item.contractId}`;

  const hasExistingAllocation = (item: Pick<PendingAllocation, 'contractId' | 'subprojectId'>) => {
    if (item.subprojectId) {
      return getAllocationsBySubproject(item.subprojectId).some(allocation => allocation.hrPersonId === hrPersonId);
    }
    return resources.some(resource => resource.hrPersonId === hrPersonId && resource.contractId === item.contractId);
  };

  const addPendingAllocation = () => {
    if (!contractId) {
      toast.error('Selecione um contrato');
      return;
    }
    if (dedication < 1 || dedication > 100) {
      toast.error('Dedicacao deve estar entre 1% e 100%');
      return;
    }
    if (selectedHasSubprojects && !subprojectId) {
      toast.error('Selecione o subprojeto');
      return;
    }

    const next: PendingAllocation = {
      id: `${contractId}:${subprojectId || 'contract'}:${Date.now()}`,
      contractId,
      subprojectId,
      dedication,
    };
    const key = allocationKey(next);
    if (pendingAllocations.some(item => allocationKey(item) === key)) {
      toast.error('Este colaborador ja foi incluido para este projeto nesta selecao');
      return;
    }
    if (hasExistingAllocation(next)) {
      toast.error('Este colaborador ja esta alocado neste projeto');
      return;
    }

    setPendingAllocations(prev => [...prev, next]);
    setContractId('');
    setSubprojectId('');
    setDedication(100);
  };

  const saveAllocation = async (item: Pick<PendingAllocation, 'contractId' | 'subprojectId' | 'dedication'>) => {
    if (item.subprojectId) {
      await addAllocation({
        subprojectId: item.subprojectId,
        hrPersonId,
        dedicationPercent: item.dedication,
        notes: null,
      });
      return;
    }

    await addResource({
      contractId: item.contractId,
      nome: personName,
      tipo: selectedPerson?.tipoVinculo === 'pj' ? 'pj' : 'clt',
      cargo: null,
      senioridade: null,
      custoBase: 0,
      percentualDedicacao: item.dedication,
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: null,
      observacoes: null,
      hrPersonId,
      encargosOverride: null,
      impostosOverride: null,
      categoria: null,
      tipoValor: null,
      duracaoMeses: null,
      rateioMeses: null,
      recorrencia: null,
    });
  };

  const handleSave = async () => {
    const itemsToSave = pendingAllocations.length > 0
      ? pendingAllocations
      : [{ id: 'single', contractId, subprojectId, dedication }];

    if (itemsToSave.some(item => !item.contractId || item.dedication < 1 || item.dedication > 100)) {
      toast.error('Revise projeto e dedicacao antes de salvar');
      return;
    }
    if (itemsToSave.some(item => hasSubprojects(item.contractId) && !item.subprojectId)) {
      toast.error('Selecione o subprojeto');
      return;
    }
    if (itemsToSave.some(item => hasExistingAllocation(item))) {
      toast.error('Este colaborador ja esta alocado em um dos projetos selecionados');
      return;
    }

    setSaving(true);
    try {
      for (const item of itemsToSave) {
        await saveAllocation(item);
      }
      toast.success(itemsToSave.length === 1 ? 'Recurso adicionado ao projeto' : 'Recursos adicionados aos projetos');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao adicionar recurso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar a Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground text-xs">Recurso</Label>
            <p className="font-medium">{personName}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_120px_auto] md:items-end">
            <div className="space-y-1.5">
              <Label>Contrato *</Label>
              <Select value={contractId} onValueChange={(v) => { setContractId(v); setSubprojectId(''); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {activeContracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome || c.codigo}
                      <span className="text-muted-foreground ml-1 text-xs">- {getClientName(c.clientId)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subprojeto</Label>
              <Select
                value={subprojectId}
                onValueChange={setSubprojectId}
                disabled={!selectedHasSubprojects || subprojects.length === 0}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={selectedHasSubprojects ? 'Selecione...' : 'Nao se aplica'} />
                </SelectTrigger>
                <SelectContent>
                  {subprojects.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-dedication">Dedicacao (%)</Label>
              <Input
                id="add-dedication"
                type="number"
                min={1}
                max={100}
                value={dedication}
                onChange={(e) => setDedication(Number(e.target.value))}
              />
            </div>

            <Button type="button" variant="outline" onClick={addPendingAllocation} className="gap-2">
              <Plus className="h-4 w-4" />
              Incluir
            </Button>
          </div>

          {pendingAllocations.length > 0 && (
            <div className="rounded-md border bg-muted/20 p-3">
              <Label className="text-xs text-muted-foreground">Projetos selecionados</Label>
              <div className="mt-2 space-y-2">
                {pendingAllocations.map(item => (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{getContractLabel(item.contractId)}</p>
                      {item.subprojectId && <p className="truncate text-xs text-muted-foreground">{getSubprojectLabel(item.subprojectId)}</p>}
                    </div>
                    <span className="tabular-nums font-medium">{item.dedication}%</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingAllocations(prev => prev.filter(current => current.id !== item.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Adicionando...' : pendingAllocations.length > 0 ? 'Adicionar Selecionados' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
