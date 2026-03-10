import React, { useState } from 'react';
import { ContractSubproject, SubprojectStatus } from '@/types';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SubprojectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  subproject?: ContractSubproject | null;
}

export function SubprojectFormDialog({ open, onOpenChange, contractId, subproject }: SubprojectFormDialogProps) {
  const { addSubproject, updateSubproject } = useSubprojects();
  const [name, setName] = useState(subproject?.name || '');
  const [description, setDescription] = useState(subproject?.description || '');
  const [status, setStatus] = useState<SubprojectStatus>(subproject?.status || 'ativo');

  React.useEffect(() => {
    if (open) {
      setName(subproject?.name || '');
      setDescription(subproject?.description || '');
      setStatus(subproject?.status || 'ativo');
    }
  }, [open, subproject]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (subproject) {
      updateSubproject(subproject.id, { name: name.trim(), description: description.trim() || undefined, status });
      toast.success('Subprojeto atualizado');
    } else {
      addSubproject({ contractId, name: name.trim(), description: description.trim() || undefined, status });
      toast.success('Subprojeto criado');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subproject ? 'Editar Subprojeto' : 'Novo Subprojeto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PROAC Direto" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubprojectStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{subproject ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
