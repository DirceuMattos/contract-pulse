/**
 * I10 Fase 4 §3 — aba "Devoluções Pendentes".
 *
 * Padrão da aba de Pendências do Adm de Horas Extras: persistente, resolvível
 * de forma assíncrona, sem reprocessar nada. Mais antigas primeiro.
 */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, CheckCircle2, Loader2, Paperclip, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EquipmentReturnResolveDialog } from '@/components/equipment/EquipmentReturnResolveDialog';
import {
  EquipmentReturnPending, EquipmentReturnOutcome, EQUIPMENT_TYPES, TYPE_LABELS,
  RETURN_STATUSES, RETURN_STATUS_LABELS, RETURN_STATUS_COLORS, DIAS_BUCKETS, itemLabel,
} from '@/types/equipment';

function normalize(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

interface Props {
  pendings: EquipmentReturnPending[];
  loading: boolean;
  diasAlerta: number;
  canEdit: boolean;
  onResolve: (args: {
    pendingId: string;
    outcome: EquipmentReturnOutcome;
    notes?: string | null;
    evidenceKey?: string | null;
    occurredAt?: string | null;
    identification?: string | null;
  }) => Promise<void>;
  uploadEvidence: (pendingId: string, file: File) => Promise<string>;
  evidenceUrl: (key: string) => Promise<string | null>;
}

export function EquipmentReturnsTab({
  pendings, loading, diasAlerta, canEdit, onResolve, uploadEvidence, evidenceUrl,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [teamFilter, setTeamFilter] = useState<string>('todas');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [diasFilter, setDiasFilter] = useState<string>('todos');
  const [resolving, setResolving] = useState<EquipmentReturnPending | null>(null);

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    pendings.forEach((p) => { if (p.team_id && p.team_name) map.set(p.team_id, p.team_name); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [pendings]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    const bucket = DIAS_BUCKETS.find((b) => b.value === diasFilter) ?? DIAS_BUCKETS[0];
    return pendings.filter((p) => {
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
      if (teamFilter !== 'todas' && p.team_id !== teamFilter) return false;
      if (typeFilter !== 'todos' && p.equipment_type !== typeFilter) return false;
      if (p.dias_em_aberto < bucket.min || p.dias_em_aberto > bucket.max) return false;
      if (!q) return true;
      const blob = normalize([
        p.person_name, p.team_name, p.serial_number, p.asset_tag, p.hostname,
        p.manufacturer, p.model, p.notes, TYPE_LABELS[p.equipment_type],
        RETURN_STATUS_LABELS[p.status],
      ].filter(Boolean).join(' '));
      return blob.includes(q);
    });
  }, [pendings, search, statusFilter, teamFilter, typeFilter, diasFilter]);

  async function abrirEvidencia(key: string) {
    const url = await evidenceUrl(key);
    if (url) window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por pessoa, série, hostname, modelo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Só as pendentes</SelectItem>
            <SelectItem value="todos">Todos os desfechos</SelectItem>
            {RETURN_STATUSES.filter((s) => s !== 'pending').map((s) => (
              <SelectItem key={s} value={s}>{RETURN_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as equipes</SelectItem>
            {teams.map(([id, name]) => (<SelectItem key={id} value={id}>{name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full lg:w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {EQUIPMENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={diasFilter} onValueChange={setDiasFilter}>
          <SelectTrigger className="w-full lg:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIAS_BUCKETS.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Pessoa</TableHead>
                <TableHead className="text-xs">Desligamento</TableHead>
                <TableHead className="text-xs text-right">Dias em aberto</TableHead>
                <TableHead className="text-xs">Equipamento</TableHead>
                <TableHead className="text-xs">Série / Hostname</TableHead>
                <TableHead className="text-xs">Situação</TableHead>
                <TableHead className="text-xs text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    {pendings.length === 0
                      ? 'Nenhuma devolução registrada. Elas aparecem sozinhas quando um colaborador com equipamento é desligado.'
                      : 'Nenhuma devolução com esses filtros.'}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => {
                const atrasada = p.status === 'pending' && p.dias_em_aberto > diasAlerta;
                return (
                  <TableRow key={p.id} className={atrasada ? 'bg-red-500/5' : undefined}>
                    <TableCell className="py-2">
                      <div className="text-sm font-medium">{p.person_name}</div>
                      <div className="text-xs text-muted-foreground">{p.team_name || '—'}</div>
                    </TableCell>
                    <TableCell className="py-2 text-sm whitespace-nowrap">
                      {fmtDate(p.termination_date)}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className={`text-sm font-semibold ${atrasada ? 'text-red-600' : ''}`}>
                        {p.dias_em_aberto}
                      </span>
                      {atrasada && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 inline ml-1.5 align-text-top" />
                          </TooltipTrigger>
                          <TooltipContent>Acima do prazo de {diasAlerta} dias</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{itemLabel(p)}</span>
                        {p.alerta_locado && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] px-1.5 py-0">
                                Locado
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Item locado: o custo mensal segue correndo enquanto não volta
                              {p.rental_monthly_value != null
                                ? ` (${Number(p.rental_monthly_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês)`
                                : ''}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {p.alerta_item_movimentado_por_fora && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Building2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              O item já foi movimentado por fora desta aba — confira o histórico
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-sm font-mono">{p.serial_number || p.asset_tag || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.hostname || '—'}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={RETURN_STATUS_COLORS[p.status]}>
                        {RETURN_STATUS_LABELS[p.status]}
                      </Badge>
                      {p.notes && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-[240px] truncate" title={p.notes}>
                          {p.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        {p.evidence_url && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => abrirEvidencia(p.evidence_url!)}>
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver evidência</TooltipContent>
                          </Tooltip>
                        )}
                        {p.status === 'pending' ? (
                          canEdit && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => setResolving(p)}>
                              Resolver
                            </Button>
                          )
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {`Resolvida${p.resolved_at ? ' em ' + new Date(p.resolved_at).toLocaleString('pt-BR') : ''}`}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <EquipmentReturnResolveDialog
        open={!!resolving}
        onClose={() => setResolving(null)}
        pending={resolving}
        onResolve={onResolve}
        uploadEvidence={uploadEvidence}
      />
    </div>
  );
}
