// Entrada manual de lançamento de HE. Regime e área são snapshot do cadastro.
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const REGIME_LABEL: Record<string, string> = { clt: 'CLT', pj: 'PJ', cooperado: 'Cooperado', socio: 'Sócio', estagio: 'Estágio' };

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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function OvertimeManualDialog({ open, onOpenChange, onSaved }: Props) {
  const { getActivePersons } = useHR();
  const { teams } = useData();
  const pessoas = useMemo(() => getActivePersons().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [getActivePersons]);

  const now = new Date();
  const [pessoaId, setPessoaId] = useState('');
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [valor, setValor] = useState('');
  const [horas, setHoras] = useState('');
  const [ocorrencias, setOcorrencias] = useState('1');
  const [historico, setHistorico] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const d = new Date();
      setPessoaId(''); setMes(String(d.getMonth() + 1)); setAno(String(d.getFullYear()));
      setValor(''); setHoras(''); setOcorrencias('1'); setHistorico('');
    }
  }, [open]);

  const pessoa = pessoas.find((p) => p.id === pessoaId);
  const regime = pessoa?.tipoVinculo ?? null;
  const area = pessoa?.teamId ? (teams.find((t) => t.id === pessoa.teamId)?.name ?? null) : null;

  const salvar = async () => {
    if (!pessoa) { toast.error('Selecione o colaborador'); return; }
    setSaving(true);
    try {
      const { data, error } = await db.from('overtime_entries').upsert({
        hr_person_id: pessoa.id,
        colaborador_nome: pessoa.nome,
        mes: Number(mes),
        ano: Number(ano),
        regime,
        area,
        area_team_id: pessoa.teamId ?? null,
        valor: parseFloat(valor.replace('.', '').replace(',', '.')) || 0,
        horas: parseHoras(horas),
        ocorrencias: parseInt(ocorrencias, 10) || 1,
        historico: historico || null,
        origem: 'manual',
        status: 'confirmado',
      }, { onConflict: 'dedup_key', ignoreDuplicates: true }).select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.warning('Lançamento idêntico já existe — não foi duplicado');
      } else {
        toast.success('Lançamento registrado');
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lançamento de HE</DialogTitle>
          <DialogDescription>Regime e área são registrados conforme o cadastro atual do colaborador.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Select value={pessoaId} onValueChange={setPessoaId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {pessoa && (
              <p className="text-xs text-muted-foreground">
                {REGIME_LABEL[regime ?? ''] ?? regime ?? '—'}{area ? ` · ${area}` : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Horas</Label>
              <Input value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="26:30" />
            </div>
            <div className="space-y-1.5">
              <Label>Ocorrências</Label>
              <Input type="number" value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Histórico (opcional)</Label>
            <Input value={historico} onChange={(e) => setHistorico(e.target.value)} placeholder="Observação" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !pessoa}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
