/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * I10 Fase 4 §3 — diálogo de resolução do desfecho.
 *
 * As validações aqui espelham resolve_equipment_return_pending(): a regra
 * continua imposta no banco, a tela só evita mandar o que vai voltar com erro.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Paperclip } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  EquipmentReturnPending, EquipmentReturnOutcome, RETURN_OUTCOMES, RETURN_OUTCOME_RULES,
  STATUS_LABELS, STATUS_COLORS, identificacoesAceitas, identificacaoConfere, itemLabel,
} from '@/types/equipment';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  pending: EquipmentReturnPending | null;
  onResolve: (args: {
    pendingId: string;
    outcome: EquipmentReturnOutcome;
    notes?: string | null;
    evidenceKey?: string | null;
    occurredAt?: string | null;
    identification?: string | null;
  }) => Promise<void>;
  uploadEvidence: (pendingId: string, file: File) => Promise<string>;
}

export function EquipmentReturnResolveDialog({
  open, onClose, pending, onResolve, uploadEvidence,
}: Props) {
  const [outcome, setOutcome] = useState<EquipmentReturnOutcome | ''>('');
  const [identification, setIdentification] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome(''); setIdentification(''); setNotes(''); setOccurredAt(''); setFile(null);
  }, [open, pending?.id]);

  const rule = outcome ? RETURN_OUTCOME_RULES[outcome] : null;
  const aceitas = useMemo(() => (pending ? identificacoesAceitas(pending) : []), [pending]);
  const semIdentificacao = aceitas.length === 0;

  // Item sem SN e sem patrimônio: o banco troca a conferência por observação.
  const exigeObservacao = !!rule && (rule.exigeObservacao || (rule.exigeIdentificacao && semIdentificacao));
  const exigeIdentificacao = !!rule && rule.exigeIdentificacao && !semIdentificacao;

  const identificacaoOk = !exigeIdentificacao
    || (identification.trim() !== '' && pending !== null && identificacaoConfere(pending, identification));

  const podeSalvar = !!outcome
    && identificacaoOk
    && (!exigeObservacao || notes.trim() !== '')
    && !saving;

  async function handleResolve() {
    if (!pending || !outcome) return;
    setSaving(true);
    try {
      let evidenceKey: string | null = null;
      if (file) {
        try {
          evidenceKey = await uploadEvidence(pending.id, file);
        } catch (e: any) {
          toast.error('Não foi possível anexar a evidência: ' + String(e?.message || e));
          setSaving(false);
          return;
        }
      }
      await onResolve({
        pendingId: pending.id,
        outcome,
        notes: notes.trim() || null,
        evidenceKey,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
        identification: identification.trim() || null,
      });
      toast.success(`Devolução resolvida: ${RETURN_OUTCOME_RULES[outcome].label}`);
      onClose();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (!pending) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolver devolução</DialogTitle>
          <DialogDescription>
            {pending.person_name}
            {pending.termination_date
              ? ` · desligamento em ${new Date(pending.termination_date + 'T00:00:00').toLocaleDateString('pt-BR')}`
              : ''}
            {` · ${pending.dias_em_aberto} dia${pending.dias_em_aberto === 1 ? '' : 's'} em aberto`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="font-medium">{itemLabel(pending)}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {`SN: ${pending.serial_number || '—'} · Patrimônio: ${pending.asset_tag || '—'} · Host: ${pending.hostname || '—'}`}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Estado atual do item:</span>
            <Badge variant="outline" className={STATUS_COLORS[pending.item_status]}>
              {STATUS_LABELS[pending.item_status]}
            </Badge>
            {pending.alerta_locado && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                Locado — custo mensal correndo
              </Badge>
            )}
          </div>
        </div>

        {pending.alerta_item_movimentado_por_fora && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Este item <strong>já foi movimentado por fora desta aba</strong> — hoje não está
              mais com {pending.person_name}. Confira o histórico do item antes de escolher o desfecho.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Desfecho</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as EquipmentReturnOutcome)}>
              <SelectTrigger><SelectValue placeholder="O que aconteceu com o equipamento?" /></SelectTrigger>
              <SelectContent>
                {RETURN_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{RETURN_OUTCOME_RULES[o].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rule && (
              <p className="text-[11px] text-muted-foreground">
                {rule.descricao} O item passa a <strong>{STATUS_LABELS[rule.destino]}</strong>.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              O cancelamento não aparece aqui: acontece sozinho se o colaborador voltar a ativo.
            </p>
          </div>

          {exigeIdentificacao && (
            <div className="space-y-1.5">
              <Label htmlFor="conf">Conferência — número de série ou patrimônio</Label>
              <Input
                id="conf"
                className="font-mono"
                placeholder={aceitas[0]}
                value={identification}
                onChange={(e) => setIdentification(e.target.value)}
              />
              {identification.trim() !== '' && !identificacaoOk && (
                <p className="text-[11px] text-red-600">
                  Não corresponde ao cadastro deste item. Confira o que está escrito no equipamento.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Digite o que está no equipamento devolvido. Serve o SN ou o patrimônio.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="obs">
              Observação{exigeObservacao ? '' : ' (opcional)'}
            </Label>
            <Textarea
              id="obs"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                outcome === 'returned_damaged' ? 'Descreva a avaria'
                : outcome === 'lost' ? 'O que foi apurado sobre o extravio'
                : outcome === 'not_applicable' ? 'O que estava errado no cadastro'
                : semIdentificacao ? 'Item sem série e sem patrimônio: descreva como conferiu a identificação'
                : 'Opcional'
              }
            />
            {exigeObservacao && notes.trim() === '' && (
              <p className="text-[11px] text-muted-foreground">Obrigatória neste desfecho.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quando">Data do desfecho</Label>
              <Input
                id="quando" type="datetime-local"
                value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Vazio = agora.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evid">Evidência</Label>
              <Input
                id="evid" type="file" accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {outcome === 'returned_damaged' ? 'Recomendada: foto da avaria.' : 'Opcional.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleResolve} disabled={!podeSalvar}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar desfecho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
