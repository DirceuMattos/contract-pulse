// Aba de Pendências: inconsistências de import que não casaram, resolvidas
// assincronamente (sem re-upload). Só RH/administrativo/superadmin resolvem.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Pending {
  id: string;
  colaborador_nome: string;
  mes: number;
  ano: number;
  valor: number;
  horas: number;
  regime_hint: string | null;
  area_hint: string | null;
  status: string;
}

export function OvertimePendingTab({ onResolved }: { onResolved: () => void }) {
  const { hrPeople } = useHR();
  const { teams } = useData();
  const pessoas = useMemo(() => hrPeople.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [hrPeople]);

  const [items, setItems] = useState<Pending[]>([]);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('overtime_pending').select('*').eq('status', 'pendente').order('created_at', { ascending: true });
    setItems((data ?? []) as Pending[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolver = async (p: Pending) => {
    const pid = sel[p.id];
    if (!pid) { toast.error('Selecione o colaborador'); return; }
    setBusy(p.id);
    try {
      const pessoa = pessoas.find((x) => x.id === pid)!;
      const area = pessoa.teamId ? (teams.find((t) => t.id === pessoa.teamId)?.name ?? null) : null;
      // cria o lançamento (upsert respeita a trava anti-duplicação)
      const { data: entry, error: e1 } = await db.from('overtime_entries').upsert({
        hr_person_id: pessoa.id,
        colaborador_nome: pessoa.nome,
        mes: p.mes, ano: p.ano,
        regime: pessoa.tipoVinculo ?? p.regime_hint ?? null,
        area: area ?? p.area_hint ?? null,
        area_team_id: pessoa.teamId ?? null,
        valor: p.valor, horas: p.horas, ocorrencias: 1,
        origem: 'import_excel', status: 'confirmado',
      }, { onConflict: 'dedup_key', ignoreDuplicates: true }).select('id');
      if (e1) throw e1;
      // marca a pendência como resolvida
      const { error: e2 } = await db.from('overtime_pending')
        .update({ status: 'resolvida', resolved_entry_id: entry?.[0]?.id ?? null, resolved_at: new Date().toISOString() })
        .eq('id', p.id);
      if (e2) throw e2;
      toast.success('Pendência resolvida');
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      onResolved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resolver');
    } finally {
      setBusy(null);
    }
  };

  const ignorar = async (p: Pending) => {
    setBusy(p.id);
    try {
      const { error } = await db.from('overtime_pending').update({ status: 'ignorada', resolved_at: new Date().toISOString() }).eq('id', p.id);
      if (error) throw error;
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Pendência ignorada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma pendência. 🎉</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Nome (origem)</th>
            <th className="py-2 pr-4">Período</th>
            <th className="py-2 pr-4 text-right">Valor</th>
            <th className="py-2 pr-4 w-64">Colaborador (Hub)</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{p.colaborador_nome}</td>
              <td className="py-2 pr-4">{MESES[p.mes - 1]}/{p.ano}</td>
              <td className="py-2 pr-4 text-right">{fmtBRL(Number(p.valor))}</td>
              <td className="py-2 pr-4">
                <Select value={sel[p.id] ?? ''} onValueChange={(v) => setSel((s) => ({ ...s, [p.id]: v }))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent>
                    {pessoas.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}{x.situacao !== 'ativo' ? ' (inativo)' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2 pr-4">
                <div className="flex gap-1 justify-end">
                  <Button size="sm" className="h-7 text-xs" disabled={busy === p.id || !sel[p.id]} onClick={() => resolver(p)}>Resolver</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={busy === p.id} onClick={() => ignorar(p)}>Ignorar</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
