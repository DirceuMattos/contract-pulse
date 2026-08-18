/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  EquipmentItem, EquipmentMovement, EquipmentStatus, GroupCompany,
  STATUS_LABELS, STATUS_COLORS, allowedTransitionsFor, holderTypeForStatus,
} from '@/types/equipment';
import { toast } from 'sonner';

interface HrPersonOption { id: string; nome: string; situacao: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  item: EquipmentItem | null;
  people: HrPersonOption[];
  companies: GroupCompany[];
  onRegister: (args: {
    itemId: string; toStatus: EquipmentStatus; toHolderType: any;
    personId?: string | null; companyId?: string | null;
    reason?: string | null; occurredAt?: string | null; justification?: string | null;
  }) => Promise<void>;
  loadMovements: (itemId: string) => Promise<EquipmentMovement[]>;
}

export function EquipmentMovementDialog({
  open, onClose, item, people, companies, onRegister, loadMovements,
}: Props) {
  const [toStatus, setToStatus] = useState<EquipmentStatus | ''>('');
  const [personId, setPersonId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EquipmentMovement[]>([]);

  useEffect(() => {
    if (!open || !item) return;
    setToStatus(''); setPersonId(''); setCompanyId(''); setReason(''); setOccurredAt('');
    loadMovements(item.id).then(setHistory);
  }, [open, item, loadMovements]);

  const options = useMemo(
    () => (item ? allowedTransitionsFor(item.status, item.ownership) : []),
    [item],
  );

  const holderType = toStatus ? holderTypeForStatus(toStatus) : null;
  const precisaPessoa = holderType === 'pessoa';
  const precisaEmpresa = holderType === 'empresa_grupo';

  const activePeople = people.filter((p) => p.situacao === 'ativo');
  const inactiveWithItem = item?.alerta_colaborador_inativo;

  async function handleRegister() {
    if (!item || !toStatus) return;
    if (precisaPessoa && !personId) { toast.error('Escolha o colaborador'); return; }
    if (precisaEmpresa && !companyId) { toast.error('Escolha a empresa do grupo'); return; }

    setSaving(true);
    try {
      await onRegister({
        itemId: item.id,
        toStatus,
        toHolderType: holderTypeForStatus(toStatus),
        personId: precisaPessoa ? personId : null,
        companyId: precisaEmpresa ? companyId : null,
        reason: reason.trim() || null,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
      });
      toast.success(`Movimentação registrada: ${STATUS_LABELS[toStatus]}`);
      onClose();
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  const semSaida = options.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movimentar equipamento</DialogTitle>
          <DialogDescription>
            {item.hostname || item.serial_number || 'Sem identificação'}
            {item.model ? ` · ${item.model}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Estado atual:</span>
          <Badge variant="outline" className={STATUS_COLORS[item.status]}>
            {STATUS_LABELS[item.status]}
          </Badge>
          {item.holder_person_name && <span className="text-muted-foreground">· com {item.holder_person_name}</span>}
          {item.holder_company_name && <span className="text-muted-foreground">· com {item.holder_company_name}</span>}
        </div>

        {inactiveWithItem && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
            <span>Este equipamento está com um colaborador <strong>inativo</strong>. Registre a devolução ou o desfecho.</span>
          </div>
        )}

        {semSaida ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">{STATUS_LABELS[item.status]}</strong> é um estado final —
            este equipamento não se movimenta mais. O histórico abaixo fica preservado.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Novo estado</Label>
              <Select value={toStatus} onValueChange={(v) => setToStatus(v as EquipmentStatus)}>
                <SelectTrigger><SelectValue placeholder="Escolha o destino" /></SelectTrigger>
                <SelectContent>
                  {options.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {item.ownership === 'locado' && (
                <p className="text-[11px] text-muted-foreground">
                  Item locado: venda, doação, descarte e transferência não aparecem — não é patrimônio da BNP.
                </p>
              )}
            </div>

            {precisaPessoa && (
              <div className="space-y-1.5">
                <Label>Colaborador</Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger><SelectValue placeholder="Escolha o colaborador" /></SelectTrigger>
                  <SelectContent>
                    {activePeople.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Só colaboradores ativos podem receber equipamento.</p>
              </div>
            )}

            {precisaEmpresa && (
              <div className="space-y-1.5">
                <Label>Empresa do grupo</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quando">Data da movimentação</Label>
                <Input id="quando" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Vazio = agora.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo</Label>
                <Textarea id="motivo" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: entrega no onboarding" />
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico</h4>
            <div className="rounded-md border overflow-hidden max-h-56 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Quando</TableHead>
                    <TableHead className="text-xs">Mudança</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="py-2 text-xs whitespace-nowrap">
                        {new Date(m.occurred_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          {m.from_status ? STATUS_LABELS[m.from_status] : '—'}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {STATUS_LABELS[m.to_status]}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">{m.reason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Fechar</Button>
          {!semSaida && (
            <Button onClick={handleRegister} disabled={!toStatus || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar movimentação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
