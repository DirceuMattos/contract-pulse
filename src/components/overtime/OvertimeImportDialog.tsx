// Import de planilha de HE (consolidada ou PJ) com matching nome->colaborador.
// Linhas que não casam ficam como pendência para o usuário resolver antes de salvar.
import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { parseOvertimeFile, type ParsedOvertimeRow } from '@/lib/overtimeImport';
import type { HRPerson } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Reproduz a dedup_key gerada no banco (migration 20260730180000):
// coalesce(hr_person_id, lower(nome)) | mes | ano | round(valor,2) | round(horas,2) | origem
function dedupKey(hrPersonId: string | null, nome: string, mes: number, ano: number, valor: number, horas: number, origem: string): string {
  const idPart = hrPersonId ?? nome.toLowerCase();
  return `${idPart}|${mes}|${ano}|${valor.toFixed(2)}|${horas.toFixed(2)}|${origem}`;
}

interface MatchedRow extends ParsedOvertimeRow {
  key: string;
  matchedId: string | null;   // hr_person_id resolvido
  ambiguo: boolean;
  ignorar: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function OvertimeImportDialog({ open, onOpenChange, onSaved }: Props) {
  const { hrPeople } = useHR();
  const { teams } = useData();
  // Inclui inativos: a carga é de dados históricos, com colaboradores já desligados.
  const pessoas = useMemo(() => hrPeople, [hrPeople]);

  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<MatchedRow[]>([]);
  const [formato, setFormato] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  // índice de matching: nome completo normalizado e primeiro nome
  const matchIndex = useMemo(() => {
    const full = new Map<string, HRPerson[]>();
    const first = new Map<string, HRPerson[]>();
    for (const p of pessoas) {
      const n = norm(p.nome);
      (full.get(n) ?? full.set(n, []).get(n)!).push(p);
      const f = n.split(' ')[0];
      (first.get(f) ?? first.set(f, []).get(f)!).push(p);
    }
    return { full, first };
  }, [pessoas]);

  const matchNome = useCallback((nome: string): { id: string | null; ambiguo: boolean } => {
    const n = norm(nome);
    const exact = matchIndex.full.get(n);
    if (exact && exact.length === 1) return { id: exact[0].id, ambiguo: false };
    if (exact && exact.length > 1) return { id: null, ambiguo: true };
    // tenta primeiro nome (caso PJ)
    const byFirst = matchIndex.first.get(n.split(' ')[0]);
    if (byFirst && byFirst.length === 1) return { id: byFirst[0].id, ambiguo: false };
    if (byFirst && byFirst.length > 1) return { id: null, ambiguo: true };
    return { id: null, ambiguo: false };
  }, [matchIndex]);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const { formato: fmt, rows: parsed } = await parseOvertimeFile(file, Number(ano));
      setFormato(fmt);

      // Chaves já existentes no banco (para suprimir o que já foi inserido,
      // inclusive em reuploads do mesmo arquivo). Busca as dedup_key da tabela.
      const existentes = new Set<string>();
      const anos = Array.from(new Set(parsed.map((r) => r.ano)));
      const { data: existRows } = await db
        .from('overtime_entries')
        .select('dedup_key')
        .in('ano', anos.length ? anos : [Number(ano)]);
      for (const e of (existRows ?? []) as { dedup_key: string }[]) existentes.add(e.dedup_key);

      const matched: MatchedRow[] = parsed
        .map((r, i) => {
          const m = matchNome(r.colaborador_nome);
          return { ...r, key: `${i}`, matchedId: m.id, ambiguo: m.ambiguo, ignorar: false };
        })
        // Esconde as que já existem no banco (só dá para saber isso nas que casaram,
        // pois a chave usa hr_person_id; as sem match nunca foram inseridas).
        .filter((r) => {
          if (!r.matchedId) return true;
          const k = dedupKey(r.matchedId, r.colaborador_nome, r.mes, r.ano, r.valor, r.horas, 'import_excel');
          return !existentes.has(k);
        });

      setRows(matched);
      if (parsed.length > 0 && matched.length === 0) {
        toast.success('Tudo desta planilha já está no banco — nada a importar');
      } else if (matched.length === 0) {
        toast.error('Nenhuma linha reconhecida na planilha');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao ler a planilha');
    } finally {
      setParsing(false);
    }
  };

  const setMatch = (key: string, id: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, matchedId: id, ambiguo: false } : r)));
  };
  const toggleIgnore = (key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ignorar: !r.ignorar } : r)));
  };

  const pendentes = rows.filter((r) => !r.ignorar && !r.matchedId).length;
  const aSalvar = rows.filter((r) => !r.ignorar && r.matchedId);

  const salvar = async () => {
    const naoResolvidosCount = rows.filter((r) => !r.ignorar && !r.matchedId).length;
    if (aSalvar.length === 0 && naoResolvidosCount === 0) { toast.error('Nada para salvar'); return; }
    setSaving(true);
    setProgress(0);
    try {
      const payload = aSalvar.map((r) => {
        const p = pessoas.find((x) => x.id === r.matchedId)!;
        const area = p.teamId ? (teams.find((t) => t.id === p.teamId)?.name ?? null) : null;
        return {
          hr_person_id: p.id,
          colaborador_nome: p.nome,
          mes: r.mes,
          ano: r.ano,
          regime: p.tipoVinculo ?? r.regime_hint ?? null,
          area: area ?? r.area_hint ?? null,
          area_team_id: p.teamId ?? null,
          valor: r.valor,
          horas: r.horas,
          ocorrencias: 1,
          origem: 'import_excel',
          status: 'confirmado',
        };
      });
      // insere em lotes de 100 (upsert ignora duplicatas pela dedup_key)
      let inseridas = 0;
      for (let i = 0; i < payload.length; i += 100) {
        const chunk = payload.slice(i, i + 100);
        const { data, error } = await db.from('overtime_entries')
          .upsert(chunk, { onConflict: 'dedup_key', ignoreDuplicates: true })
          .select('id');
        if (error) throw error;
        inseridas += (data?.length ?? 0);
        setProgress(Math.round(((i + chunk.length) / payload.length) * 100));
      }
      const ignoradas = payload.length - inseridas;

      // Não resolvidos (sem match, não ignorados) -> fila de pendências persistente.
      const naoResolvidos = rows.filter((r) => !r.ignorar && !r.matchedId);
      let pendGravadas = 0;
      if (naoResolvidos.length > 0) {
        const pendPayload = naoResolvidos.map((r) => ({
          colaborador_nome: r.colaborador_nome,
          mes: r.mes, ano: r.ano, valor: r.valor, horas: r.horas,
          regime_hint: r.regime_hint, area_hint: r.area_hint,
          origem: 'import_excel', status: 'pendente',
        }));
        for (let i = 0; i < pendPayload.length; i += 100) {
          const chunk = pendPayload.slice(i, i + 100);
          const { data, error } = await db.from('overtime_pending')
            .upsert(chunk, { onConflict: 'dedup_key', ignoreDuplicates: true })
            .select('id');
          if (error) throw error;
          pendGravadas += (data?.length ?? 0);
        }
      }

      toast.success(
        `${inseridas} importado(s)` +
        (ignoradas > 0 ? `, ${ignoradas} já existente(s)` : '') +
        (pendGravadas > 0 ? `, ${pendGravadas} enviado(s) para Pendências` : ''),
      );
      onSaved();
      onOpenChange(false);
      setRows([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar planilha de HE</DialogTitle>
          <DialogDescription>
            Aceita a planilha consolidada ou a planilha de PJ (uma aba por mês). Confirme o vínculo de cada colaborador antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <label className="text-sm">Ano de referência</label>
                <Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} className="w-32" />
              </div>
              <p className="text-xs text-muted-foreground pb-2">
                Usado quando a planilha não traz o ano (ex.: PJ por aba de mês).
              </p>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/40">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{parsing ? 'Lendo…' : 'Clique para escolher o arquivo (.xlsx / .xls)'}</span>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-sm py-2">
              <Badge variant="secondary">Formato: {formato}</Badge>
              <span className="text-muted-foreground">{rows.length} linhas</span>
              <span className="text-emerald-600">{aSalvar.length} prontas</span>
              {pendentes > 0 && <span className="text-amber-600">{pendentes} pendente(s)</span>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRows([])}>Trocar arquivo</Button>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-md">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-2">Nome (planilha)</th>
                    <th className="p-2">Período</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2">Colaborador (Hub)</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className={`border-b last:border-0 ${r.ignorar ? 'opacity-40' : ''}`}>
                      <td className="p-2">{r.colaborador_nome}</td>
                      <td className="p-2">{MESES[r.mes - 1]}/{r.ano}</td>
                      <td className="p-2 text-right">{fmtBRL(r.valor)}</td>
                      <td className="p-2">
                        <Select value={r.matchedId ?? ''} onValueChange={(v) => setMatch(r.key, v)}>
                          <SelectTrigger className={`h-8 ${!r.matchedId && !r.ignorar ? 'border-amber-500' : ''}`}>
                            <SelectValue placeholder={r.ambiguo ? 'Ambíguo — escolha' : 'Selecionar…'} />
                          </SelectTrigger>
                          <SelectContent>
                            {pessoas.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}{p.situacao !== 'ativo' ? ' (inativo)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleIgnore(r.key)}>
                          {r.ignorar ? 'Incluir' : 'Ignorar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {saving && <Progress value={progress} className="mt-2" />}
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving || (aSalvar.length === 0 && pendentes === 0)}>
                {saving ? 'Salvando…' : (aSalvar.length > 0 ? `Salvar ${aSalvar.length}` : 'Enviar') + (pendentes > 0 ? ` (+${pendentes} p/ Pendências)` : '')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
