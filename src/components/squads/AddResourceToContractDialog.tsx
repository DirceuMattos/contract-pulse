import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { toast } from 'sonner';

interface AddResourceToContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hrPersonId: string;
  personName: string;
}

export function AddResourceToContractDialog({ open, onOpenChange, hrPersonId, personName }: AddResourceToContractDialogProps) {
  const { contracts, clients, addResource } = useData();
  const { hasSubprojects, getSubprojectsByContract, addAllocation } = useSubprojects();

  const [contractId, setContractId] = useState('');
  const [subprojectId, setSubprojectId] = useState('');
  const [dedication, setDedication] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setContractId('');
      setSubprojectId('');
      setDedication(100);
    }
  }, [open]);

  const activeContracts = useMemo(() =>
    contracts
      .filter(c => c.status === 'operacao' || c.status === 'implantacao')
      .sort((a, b) => (a.nome || a.codigo).localeCompare(b.nome || b.codigo)),
    [contracts]
  );

  const selectedHasSubprojects = contractId ? hasSubprojects(contractId) : false;
  const subprojects = useMemo(() => {
    if (!selectedHasSubprojects || !contractId) return [];
    return getSubprojectsByContract(contractId).filter(sp => sp.status !== 'encerrado');
  }, [contractId, selectedHasSubprojects, getSubprojectsByContract]);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.razaoSocial || '';
  };

  const handleSave = async () => {
    if (!contractId) {
      toast.error('Selecione um contrato');
      return;
    }
    if (dedication < 1 || dedication > 100) {
      toast.error('Dedicação deve estar entre 1% e 100%');
      return;
    }

    setSaving(true);
    try {
      if (selectedHasSubprojects) {
        if (!subprojectId) {
          toast.error('Selecione o subprojeto');
          setSaving(false);
          return;
        }
        await addAllocation({
          subprojectId,
          hrPersonId,
          dedicationPercent: dedication,
          notes: null,
        });
      } else {
        await addResource({
          contractId,
          nome: personName,
          tipo: 'clt',
          cargo: null,
          senioridade: null,
          custoBase: 0,
          percentualDedicacao: dedication,
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
      }
      toast.success('Recurso adicionado ao projeto');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao adicionar recurso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar a Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground text-xs">Recurso</Label>
            <p className="font-medium">{personName}</p>
          </div>

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
                    <span className="text-muted-foreground ml-1 text-xs">— {getClientName(c.clientId)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHasSubprojects && subprojects.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subprojeto *</Label>
              <Select value={subprojectId} onValueChange={setSubprojectId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subprojects.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="add-dedication">Dedicação (%)</Label>
            <Input
              id="add-dedication"
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
          <Button onClick={handleSave} disabled={saving}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
