// Entrada manual de lançamentos de HE (multi-linha: vários de uma vez).
// Ano/mês únicos no topo; regime e área são snapshot do cadastro de cada colab.
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// "26:30" ou "26:30:00" -> 26.5 (horas decimais)
function parseHoras(v: string): number {
  const s = v.trim();
  if (!s) return 0;
  if (s.includes(':')) {
    const [h, m] = s.split(':');
    return (parseInt(h, 10) || 0) + (parseInt(m, 10) || 0) / 60;
  }
  return parseFloat(s.replace(',', '.')) || 0;
}

interface Linha {
  key: string;
  pessoaId: string;
  valor: string;
  horas: string;
  ocorrencias: string;
  historico: string;
}

const novaLinha = (): Linha => ({ key: crypto.randomUUID(), pessoaId: '', valor: '', horas: '', ocorrencias: '1', historico: '' });
const linhasIniciais = () => [novaLinha(), novaLinha(), novaLinha()];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function OvertimeManualDialog({ open, onOpenChange, onSaved }: Props) {
  const { hrPeople } = useHR();
  const { teams } = useData();
  const pessoas = useMemo(() => hrPeople.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [hrPeople]);

  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [linhas, setLinhas] = useState<Linha[]>(linhasIniciais);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const d = new Date();
      setMes(String(d.getMonth() + 1));
      setAno(String(d.getFullYear()));
      setLinhas(linhasIniciais());
    }
  }, [open]);

  const setLinha = (key: string, patch: Partial<Linha>) =>
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLinha = () => setLinhas((prev) => [...prev, novaLinha()]);
  const removeLinha = (key: string) => setLinhas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const salvar = async () => {
    // considera só as linhas com colaborador selecionado
    const preenchidas = linhas.filter((l) => l.pessoaId);
    if (preenchidas.length === 0) { toast.error('Selecione ao menos um colaborador'); return; }
    setSaving(true);
    try {
      const payload = preenchidas.map((l) => {
        const p = pessoas.find((x) => x.id === l.pessoaId)!;
        const area = p.teamId ? (teams.find((t) => t.id === p.teamId)?.name ?? null) : null;
        return {
          hr_person_id: p.id,
          colaborador_nome: p.nome,
          mes: Number(mes),
          ano: Number(ano),
          regime: p.tipoVinculo ?? null,
          area,
          area_team_id: p.teamId ?? null,
          valor: parseFloat(l.valor.replace('.', '').replace(',', '.')) || 0,
          horas: parseHoras(l.horas),
          ocorrencias: parseInt(l.ocorrencias, 10) || 1,
          historico: l.historico || null,
          origem: 'manual',
          status: 'confirmado',
        };
      });
      const { data, error } = await db.from('overtime_entries')
        .upsert(payload, { onConflict: 'dedup_key', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      const inseridas = data?.length ?? 0;
      const ignoradas = payload.length - inseridas;
      toast.success(
        `${inseridas} lançamento(s) registrado(s)` + (ignoradas > 0 ? `, ${ignoradas} já existente(s) ignorado(s)` : ''),
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const preenchidasCount = linhas.filter((l) => l.pessoaId).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo lançamento de HE</DialogTitle>
          <DialogDescription>
            Lance vários movimentos do mesmo período de uma vez. Regime e área seguem o cadastro de cada colaborador.
          </DialogDescription>
        </DialogHeader>

        {/* Período único do lote */}
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} />
          </div>
        </div>

        {/* Grade de lançamentos */}
        <div className="overflow-y-auto flex-1 border rounded-md mt-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-2 w-[38%]">Colaborador</th>
                <th className="p-2">Valor (R$)</th>
                <th className="p-2">Horas</th>
                <th className="p-2">Ocorr.</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.key} className="border-b last:border-0">
                  <td className="p-1.5">
                    <Select value={l.pessoaId} onValueChange={(v) => setLinha(l.key, { pessoaId: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                      <SelectContent>
                        {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}{p.situacao !== 'ativo' ? ' (inativo)' : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1.5"><Input className="h-8" value={l.valor} onChange={(e) => setLinha(l.key, { valor: e.target.value })} placeholder="0,00" /></td>
                  <td className="p-1.5"><Input className="h-8" value={l.horas} onChange={(e) => setLinha(l.key, { horas: e.target.value })} placeholder="26:30" /></td>
                  <td className="p-1.5"><Input className="h-8 w-16" type="number" value={l.ocorrencias} onChange={(e) => setLinha(l.key, { ocorrencias: e.target.value })} /></td>
                  <td className="p-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLinha(l.key)} disabled={linhas.length === 1}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addLinha}><Plus className="h-4 w-4 mr-1" />Adicionar linha</Button>
          <span className="text-xs text-muted-foreground">{preenchidasCount} preenchida(s)</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || preenchidasCount === 0}>
            {saving ? 'Salvando…' : `Salvar ${preenchidasCount} lançamento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
