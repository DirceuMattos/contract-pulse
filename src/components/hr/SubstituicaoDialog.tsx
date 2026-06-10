import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, UserPlus, Briefcase } from 'lucide-react';

interface SubstituicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  contractId: string;
  hrPersonId: string;
  onCompleted?: () => void;
}

export function SubstituicaoDialog({
  open,
  onOpenChange,
  resourceId,
  contractId,
  hrPersonId,
  onCompleted,
}: SubstituicaoDialogProps) {
  const { hrPeople } = useHR();
  const { updateResource } = useData();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const outgoing = hrPeople.find(p => p.id === hrPersonId);
  const targetVinculo = outgoing?.tipoVinculo;

  const candidates = useMemo(() => {
    return hrPeople
      .filter(p => p.situacao === 'ativo' && p.id !== hrPersonId)
      .filter(p => !targetVinculo || p.tipoVinculo === targetVinculo)
      .filter(p => !search || p.nome.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hrPeople, hrPersonId, targetVinculo, search]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    const person = hrPeople.find(p => p.id === selectedId);
    if (!person) return;
    setSaving(true);
    try {
      await updateResource(resourceId, {
        hrPersonId: person.id,
        nome: person.nome,
        tipo: person.tipoVinculo === 'clt' ? 'clt' : 'pj',
      });
      await supabase
        .from('pending_replacements')
        .update({ status: 'replaced', resolved_at: new Date().toISOString() })
        .eq('resource_id', resourceId)
        .eq('contract_id', contractId)
        .eq('status', 'pending');
      toast.success('Substituição realizada com sucesso.');
      onCompleted?.();
      onOpenChange(false);
      setSelectedId(null);
      setSearch('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao realizar substituição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Substituir alocação</DialogTitle>
          <DialogDescription>
            {outgoing ? <>Substituindo <span className="font-medium">{outgoing.nome}</span> nesta alocação.</> : 'Selecione um substituto para esta alocação.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colaborador">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colaborador" className="gap-2"><UserPlus className="w-4 h-4" />Selecionar colaborador</TabsTrigger>
            <TabsTrigger value="vaga" className="gap-2"><Briefcase className="w-4 h-4" />Abrir vaga</TabsTrigger>
          </TabsList>

          <TabsContent value="colaborador" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador ativo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-64 rounded border">
              {candidates.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum colaborador disponível.</p>
              ) : (
                <ul className="divide-y">
                  {candidates.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2 ${selectedId === p.id ? 'bg-accent' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.cargoAntigo || ''}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">{p.tipoVinculo}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={!selectedId || saving}>
                {saving ? 'Salvando...' : 'Confirmar substituição'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="vaga" className="space-y-4">
            <div className="rounded border border-dashed p-6 text-center space-y-3">
              <Briefcase className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Módulo de Vagas em desenvolvimento</p>
              <Button disabled>Abrir vaga</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
