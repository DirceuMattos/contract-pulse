import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Briefcase } from 'lucide-react';

interface SubstituicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  contractId: string;
  hrPersonId: string;
  currentPercent?: number;
  contractName?: string;
  onCompleted?: () => void;
}

export function SubstituicaoDialog({
  open,
  onOpenChange,
  resourceId,
  contractId,
  hrPersonId,
  currentPercent,
  contractName,
  onCompleted,
}: SubstituicaoDialogProps) {
  const { hrPeople } = useHR();
  const { updateResource, contracts } = useData();
  const { userRole } = useAuth();
  const canUse = userRole === 'superadmin' || userRole === 'c-level' || userRole === 'lider_tribo' || userRole === 'coordenacao_suporte';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keepSame, setKeepSame] = useState(true);
  const [percent, setPercent] = useState<number>(currentPercent ?? 100);
  const [saving, setSaving] = useState(false);

  const outgoing = hrPeople.find(p => p.id === hrPersonId);
  const resolvedContractName = contractName
    || contracts.find(c => c.id === contractId)?.nome
    || contracts.find(c => c.id === contractId)?.codigo
    || '';

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setKeepSame(true);
      setPercent(currentPercent ?? 100);
    }
  }, [open, currentPercent]);

  const candidates = useMemo(() => {
    return hrPeople
      .filter(p => p.situacao === 'ativo' && p.id !== hrPersonId)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [hrPeople, hrPersonId]);

  const candidateOptions = useMemo(() => candidates.map((person) => ({
    value: person.id,
    label: `${person.nome} - ${(person.tipoVinculo || 'sem vínculo').toUpperCase()}`,
    searchText: `${person.nome} ${person.tipoVinculo ?? ''} ${person.cargoAntigo ?? ''}`,
  })), [candidates]);

  const handleConfirm = async () => {
    if (!selectedId) return;
    const person = hrPeople.find(p => p.id === selectedId);
    if (!person) return;
    const finalPercent = keepSame ? (currentPercent ?? percent) : percent;
    setSaving(true);
    try {
      await updateResource(resourceId, {
        hrPersonId: person.id,
        nome: person.nome,
        tipo: person.tipoVinculo === 'clt' ? 'clt' : 'pj',
        percentualDedicacao: finalPercent,
      });
      // O .select() revela quantas linhas mudaram. Sem ele, um UPDATE barrado
      // pela RLS volta sem erro e com zero linhas — e o .update() do supabase-js
      // não lança exceção, então o catch abaixo nunca veria o problema. Era
      // assim que a substituição acontecia pela metade: o recurso trocava de
      // pessoa e a pendência ficava 'pending' para sempre, mantendo o
      // colaborador desligado marcado como "a repor" no quadro de Squads.
      const { data: resolvidas, error: pendErr } = await supabase
        .from('pending_replacements')
        .update({ status: 'replaced', resolved_at: new Date().toISOString() })
        .eq('resource_id', resourceId)
        .eq('contract_id', contractId)
        .eq('status', 'pending')
        .select('id');
      if (pendErr) throw pendErr;
      if (!resolvidas || resolvidas.length === 0) {
        toast.warning(
          'Recurso substituído, mas a pendência de reposição não pôde ser encerrada. ' +
          'Avise o administrador para que ela não fique aberta no quadro.'
        );
      } else {
        toast.success('Substituição realizada com sucesso');
      }
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao realizar substituição.');
    } finally {
      setSaving(false);
    }
  };

  if (!canUse) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso restrito</DialogTitle>
            <DialogDescription>
              Apenas Superadmin, C-Level, Líder de Tribo e Coordenador de Suporte
              podem realizar substituições.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Substituir Colaborador em {resolvedContractName}</DialogTitle>
          <DialogDescription>
            {outgoing ? <>Substituindo <span className="font-medium">{outgoing.nome}</span> nesta alocação.</> : 'Selecione um substituto para esta alocação.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colaborador">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colaborador" className="gap-2"><UserPlus className="w-4 h-4" />Novo Colaborador</TabsTrigger>
            <TabsTrigger value="vaga" className="gap-2"><Briefcase className="w-4 h-4" />Abrir vaga</TabsTrigger>
          </TabsList>

          <TabsContent value="colaborador" className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Colaborador</Label>
              <SearchableSelect
                value={selectedId ?? ''}
                onValueChange={setSelectedId}
                options={candidateOptions}
                placeholder="Selecione um colaborador ativo..."
                searchPlaceholder="Buscar colaborador..."
                emptyMessage="Nenhum colaborador ativo encontrado."
              />
            </div>

            {selectedId && (
              <div className="rounded border p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">Alocações a herdar</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{resolvedContractName || 'Contrato'}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={percent}
                        disabled={keepSame}
                        onChange={e => setPercent(Number(e.target.value))}
                        className="w-24 h-8"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={keepSame}
                      onCheckedChange={c => {
                        const v = !!c;
                        setKeepSame(v);
                        if (v && currentPercent != null) setPercent(currentPercent);
                      }}
                    />
                    Manter mesmo percentual ({currentPercent ?? 0}%)
                  </label>
                </div>
              </div>
            )}

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
