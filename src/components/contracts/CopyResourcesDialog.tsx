import React, { useState, useMemo } from 'react';
import { Copy, Users, User, Building, Box } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { buildLookups, resolveResource } from '@/lib/resourceResolver';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = { clt: 'CLT', pj: 'PJ', outro: 'Outros' };
const typeIcons: Record<string, React.ElementType> = { clt: User, pj: Building, outro: Box };

interface CopyResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContractId: string;
  onImport: (sourceContractId: string) => void;
  importing?: boolean;
}

export function CopyResourcesDialog({
  open, onOpenChange, currentContractId, onImport, importing,
}: CopyResourcesDialogProps) {
  const { contracts, getResourcesByContract, jobTitles, teams } = useData();
  const { hrPeople } = useHR();
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const { peopleMap, jobMap, teamMap } = useMemo(
    () => buildLookups(hrPeople, jobTitles, teams),
    [hrPeople, jobTitles, teams],
  );

  const contractOptions = useMemo(() =>
    contracts
      .filter(c => c.id !== currentContractId)
      .sort((a, b) => (a.nome || a.codigo).localeCompare(b.nome || b.codigo)),
    [contracts, currentContractId],
  );

  const sourceResources = useMemo(() => {
    if (!selectedContractId) return [];
    return getResourcesByContract(selectedContractId);
  }, [selectedContractId, getResourcesByContract]);

  const resolvedPreview = useMemo(() =>
    sourceResources.map(r => ({
      id: r.id,
      ...resolveResource(r, peopleMap, jobMap, teamMap),
      tipo: r.tipo,
    })),
    [sourceResources, peopleMap, jobMap, teamMap],
  );

  const handleClose = (v: boolean) => {
    if (!v) setSelectedContractId('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Importar Recursos de Outro Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Contrato de Origem</label>
            <Select value={selectedContractId} onValueChange={setSelectedContractId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contrato..." />
              </SelectTrigger>
              <SelectContent>
                {contractOptions.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome || c.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedContractId && (
            <div className="flex-1 overflow-auto space-y-2">
              <p className="text-sm text-muted-foreground">
                {resolvedPreview.length} recurso{resolvedPreview.length !== 1 ? 's' : ''} encontrado{resolvedPreview.length !== 1 ? 's' : ''}
              </p>
              {resolvedPreview.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Este contrato não possui recursos.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {resolvedPreview.map(r => {
                    const Icon = typeIcons[r.tipo] || Box;
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                        <Icon className={cn(
                          'w-4 h-4 shrink-0',
                          r.tipo === 'clt' && 'text-primary',
                          r.tipo === 'pj' && 'text-chart-4',
                          r.tipo === 'outro' && 'text-muted-foreground',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.nome}</p>
                          {r.cargo && <p className="text-xs text-muted-foreground truncate">{r.cargo}</p>}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {typeLabels[r.tipo]}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button
            onClick={() => onImport(selectedContractId)}
            disabled={!selectedContractId || resolvedPreview.length === 0 || importing}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
