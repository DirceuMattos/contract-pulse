import React, { useState, useMemo, useCallback } from 'react';
import { Link2, AlertTriangle, Check, X, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MatchCandidate {
  resourceId: string;
  resourceName: string;
  resourceCargo: string | undefined;
  contractName: string;
  suggestedPersonId: string | null;
  suggestedPersonName: string | null;
  confidence: 'exato' | 'parcial' | 'nenhum';
  selectedPersonId: string | null;
}

function normalizeStr(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function HRAutoLinkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { resources, contracts, updateResource } = useData();
  const { hrPeople } = useHR();
  const [filter, setFilter] = useState('');
  const [linking, setLinking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Build matches for unlinked resources (clt/pj only)
  const matches = useMemo<MatchCandidate[]>(() => {
    const unlinked = resources.filter(r => !r.hrPersonId && (r.tipo === 'clt' || r.tipo === 'pj'));
    const activePeople = hrPeople.filter(p => p.situacao === 'ativo');

    return unlinked.map(r => {
      const normName = normalizeStr(r.nome);
      // Exact match
      const exact = activePeople.find(p => normalizeStr(p.nome) === normName);
      if (exact) {
        return {
          resourceId: r.id,
          resourceName: r.nome,
          resourceCargo: r.cargo ?? undefined,
          contractName: contracts.find(c => c.id === r.contractId)?.nome ?? '—',
          suggestedPersonId: exact.id,
          suggestedPersonName: exact.nome,
          confidence: 'exato' as const,
          selectedPersonId: exact.id,
        };
      }
      // Partial match (contains)
      const partial = activePeople.find(p => {
        const normP = normalizeStr(p.nome);
        return normP.includes(normName) || normName.includes(normP);
      });
      if (partial) {
        return {
          resourceId: r.id,
          resourceName: r.nome,
          resourceCargo: r.cargo ?? undefined,
          contractName: contracts.find(c => c.id === r.contractId)?.nome ?? '—',
          suggestedPersonId: partial.id,
          suggestedPersonName: partial.nome,
          confidence: 'parcial' as const,
          selectedPersonId: partial.id,
        };
      }
      return {
        resourceId: r.id,
        resourceName: r.nome,
        resourceCargo: r.cargo ?? undefined,
        contractName: contracts.find(c => c.id === r.contractId)?.nome ?? '—',
        suggestedPersonId: null,
        suggestedPersonName: null,
        confidence: 'nenhum' as const,
        selectedPersonId: null,
      };
    });
  }, [resources, hrPeople, contracts]);

  const [overrides, setOverrides] = useState<Record<string, string | null>>({});

  const getSelectedPerson = (m: MatchCandidate) => overrides[m.resourceId] ?? m.selectedPersonId;

  const filtered = useMemo(() => {
    if (!filter) return matches;
    const norm = normalizeStr(filter);
    return matches.filter(m =>
      normalizeStr(m.resourceName).includes(norm) ||
      normalizeStr(m.contractName).includes(norm)
    );
  }, [matches, filter]);

  const linkableCount = filtered.filter(m => getSelectedPerson(m) && selected.has(m.resourceId)).length;

  const toggleAll = useCallback(() => {
    const linkable = filtered.filter(m => getSelectedPerson(m));
    if (linkable.every(m => selected.has(m.resourceId))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(linkable.map(m => m.resourceId)));
    }
  }, [filtered, selected, overrides]);

  const handleLink = async () => {
    const toLink = filtered.filter(m => selected.has(m.resourceId) && getSelectedPerson(m));
    if (toLink.length === 0) return;

    setLinking(true);
    let ok = 0;
    let fail = 0;
    for (const m of toLink) {
      const personId = getSelectedPerson(m)!;
      const person = hrPeople.find(p => p.id === personId);
      if (!person) { fail++; continue; }
      try {
        await updateResource(m.resourceId, {
          hrPersonId: personId,
          nome: person.nome,
          tipo: person.tipoVinculo === 'clt' ? 'clt' : 'pj',
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setLinking(false);
    if (ok > 0) toast.success(`${ok} recurso(s) vinculado(s) ao RH Mestre.`);
    if (fail > 0) toast.error(`${fail} recurso(s) falharam.`);
    if (ok > 0 && fail === 0) onOpenChange(false);
  };

  const activePeople = hrPeople.filter(p => p.situacao === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));

  if (hrPeople.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              RH Mestre Vazio
            </DialogTitle>
            <DialogDescription>
              Não há registros no cadastro de Recursos Humanos. Importe os dados de RH primeiro para poder vincular os recursos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const unlinkedTotal = resources.filter(r => !r.hrPersonId && (r.tipo === 'clt' || r.tipo === 'pj')).length;

  if (unlinkedTotal === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Todos Vinculados
            </DialogTitle>
            <DialogDescription>
              Todos os recursos CLT/PJ já estão vinculados ao RH Mestre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vincular Recursos ao RH Mestre
          </DialogTitle>
          <DialogDescription>
            {unlinkedTotal} recurso(s) sem vínculo encontrado(s). Selecione e confirme a vinculação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome ou contrato..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-1"
          />
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.filter(m => getSelectedPerson(m)).length > 0 && filtered.filter(m => getSelectedPerson(m)).every(m => selected.has(m.resourceId))}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Recurso (Legado)</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Pessoa RH Sugerida</TableHead>
                <TableHead className="w-24">Confiança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const personId = getSelectedPerson(m);
                return (
                  <TableRow key={m.resourceId}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(m.resourceId)}
                        disabled={!personId}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          v ? next.add(m.resourceId) : next.delete(m.resourceId);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{m.resourceName}</div>
                      {m.resourceCargo && <div className="text-xs text-muted-foreground">{m.resourceCargo}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{m.contractName}</TableCell>
                    <TableCell>
                      <Select
                        value={personId ?? '__none__'}
                        onValueChange={v => setOverrides(prev => ({ ...prev, [m.resourceId]: v === '__none__' ? null : v }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhum —</SelectItem>
                          {activePeople.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        m.confidence === 'exato' && 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
                        m.confidence === 'parcial' && 'bg-amber-500/10 text-amber-600 border-amber-300',
                        m.confidence === 'nenhum' && 'bg-muted text-muted-foreground',
                      )}>
                        {m.confidence === 'exato' ? 'Exato' : m.confidence === 'parcial' ? 'Parcial' : 'Manual'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum recurso encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {linkableCount} selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={linking}>Cancelar</Button>
            <Button onClick={handleLink} disabled={linking || linkableCount === 0}>
              {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Vincular {linkableCount > 0 ? `(${linkableCount})` : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
