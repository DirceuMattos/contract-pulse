/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, Loader2, MoveRight, Pencil, Plus, Search, Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEquipment } from '@/hooks/useEquipment';
import { useEquipmentReturns } from '@/hooks/useEquipmentReturns';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { EquipmentFormDialog } from '@/components/equipment/EquipmentFormDialog';
import { EquipmentMovementDialog } from '@/components/equipment/EquipmentMovementDialog';
import { EquipmentReturnsTab } from '@/components/equipment/EquipmentReturnsTab';
import {
  EquipmentItem, EQUIPMENT_STATUSES, EQUIPMENT_TYPES,
  STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, TERMINAL_STATUSES,
} from '@/types/equipment';
import { toast } from 'sonner';

/** Busca genérica: qualquer campo da linha, sem acento e sem caixa. */
function normalize(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function EquipmentPage() {
  const { canModuleAction, canViewValues } = useAuth();
  const {
    items, companies, suppliers, people, loading,
    createItem, updateItem, registerMovement, softDelete, loadMovements,
  } = useEquipment();

  // I10 Fase 4 — devoluções abertas por desligamento
  const {
    pendings, countAbertas, countAtrasadas, diasAlerta,
    loading: loadingReturns, resolve: resolveReturn, uploadEvidence, evidenceUrl,
  } = useEquipmentReturns();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('todos');
  const [alertFilter, setAlertFilter] = useState<string>('todos');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [movingItem, setMovingItem] = useState<EquipmentItem | null>(null);

  const canCreate = canModuleAction('EQUIPMENT', 'can_create');
  const canEdit = canModuleAction('EQUIPMENT', 'can_edit');
  const canDelete = canModuleAction('EQUIPMENT', 'can_delete');
  const showValues = canViewValues || canModuleAction('EQUIPMENT', 'can_view_values');

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return items.filter((i) => {
      if (statusFilter !== 'todos' && i.status !== statusFilter) return false;
      if (typeFilter !== 'todos' && i.equipment_type !== typeFilter) return false;
      if (ownershipFilter !== 'todos' && i.ownership !== ownershipFilter) return false;
      if (alertFilter === 'inativo' && !i.alerta_colaborador_inativo) return false;
      if (alertFilter === 'grupo' && !i.alerta_fora_da_bnp) return false;
      if (!q) return true;
      const blob = normalize([
        i.serial_number, i.asset_tag, i.hostname, i.manufacturer, i.model,
        i.cpu_model, i.location, i.notes, i.holder_person_name, i.holder_company_name,
        i.supplier_name, STATUS_LABELS[i.status], TYPE_LABELS[i.equipment_type],
      ].filter(Boolean).join(' '));
      return blob.includes(q);
    });
  }, [items, search, statusFilter, typeFilter, ownershipFilter, alertFilter]);

  const resumo = useMemo(() => ({
    total: items.filter((i) => !TERMINAL_STATUSES.includes(i.status)).length,
    estoque: items.filter((i) => i.status === 'em_estoque').length,
    cedidos: items.filter((i) => i.status === 'cedido').length,
    inativos: items.filter((i) => i.alerta_colaborador_inativo).length,
    grupo: items.filter((i) => i.alerta_fora_da_bnp).length,
    manutencao: items.filter((i) => i.status === 'em_manutencao').length,
  }), [items]);

  async function handleDelete(item: EquipmentItem) {
    const motivo = window.prompt(
      `Excluir "${item.hostname || item.serial_number || 'item'}"?\n\n` +
      'A exclusão só vale para cadastro errado. Item com movimentação registrada não pode ser excluído — nesse caso use uma baixa.\n\n' +
      'Informe o motivo:',
    );
    if (motivo === null) return;
    try {
      await softDelete(item.id, motivo);
      toast.success('Cadastro excluído');
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageHeader
            title="Controle de Equipamentos"
            description="Inventário, cessões e devoluções."
          />
          {canCreate && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Novo equipamento
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          {[
            { label: 'Ativos', value: resumo.total },
            { label: 'Em estoque', value: resumo.estoque },
            { label: 'Cedidos', value: resumo.cedidos },
            { label: 'Em manutenção', value: resumo.manutencao },
            { label: 'Com inativos', value: resumo.inativos, alerta: resumo.inativos > 0 },
            {
              label: countAtrasadas > 0
                ? `Devoluções pendentes (${countAtrasadas} acima de ${diasAlerta}d)`
                : 'Devoluções pendentes',
              value: countAbertas,
              alerta: countAtrasadas > 0,
            },
            { label: 'No grupo', value: resumo.grupo },
          ].map((c) => (
            <Card key={c.label} className={c.alerta ? 'border-red-500/40' : undefined}>
              <CardContent className="p-4">
                <p className={`text-2xl font-semibold ${c.alerta ? 'text-red-600' : ''}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="inventario">
          <TabsList>
            <TabsTrigger value="inventario">Inventário</TabsTrigger>
            <TabsTrigger value="devolucoes">
              Devoluções Pendentes{countAbertas > 0 ? ` (${countAbertas})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventario" className="space-y-4 mt-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por qualquer informação — série, hostname, modelo, pessoa, local…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {EQUIPMENT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {EQUIPMENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
            <SelectTrigger className="w-full lg:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Próprio e locado</SelectItem>
              <SelectItem value="proprio">Próprio</SelectItem>
              <SelectItem value="locado">Locado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={alertFilter} onValueChange={setAlertFilter}>
            <SelectTrigger className="w-full lg:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Sem filtro de alerta</SelectItem>
              <SelectItem value="inativo">Com colaborador inativo</SelectItem>
              <SelectItem value="grupo">Cedido ao grupo</SelectItem>
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
                  <TableHead className="text-xs">Equipamento</TableHead>
                  <TableHead className="text-xs">Série / Hostname</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs">Com quem está</TableHead>
                  <TableHead className="text-xs">Origem</TableHead>
                  {showValues && <TableHead className="text-xs text-right">Valor</TableHead>}
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showValues ? 7 : 6} className="text-center text-sm text-muted-foreground py-10">
                      {items.length === 0
                        ? 'Nenhum equipamento cadastrado ainda.'
                        : 'Nenhum equipamento encontrado com esses filtros.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow
                    key={i.id}
                    className={
                      i.alerta_colaborador_inativo ? 'bg-red-500/5'
                      : i.alerta_fora_da_bnp ? 'bg-amber-500/5'
                      : undefined
                    }
                  >
                    <TableCell className="py-2">
                      <div className="text-sm font-medium">{TYPE_LABELS[i.equipment_type]}</div>
                      <div className="text-xs text-muted-foreground">
                        {[i.manufacturer, i.model].filter(Boolean).join(' ') || '—'}
                        {i.ram_gb ? ` · ${i.ram_gb} GB` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-sm font-mono">{i.serial_number || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{i.hostname || '—'}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={STATUS_COLORS[i.status]}>
                        {STATUS_LABELS[i.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        {i.alerta_colaborador_inativo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Colaborador inativo — equipamento não devolvido</TooltipContent>
                          </Tooltip>
                        )}
                        {i.alerta_fora_da_bnp && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Building2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Cedido a empresa do grupo</TooltipContent>
                          </Tooltip>
                        )}
                        <span>
                          {i.holder_person_name || i.holder_company_name
                            || (i.holder_type === 'estoque' ? 'Estoque' : '—')}
                        </span>
                      </div>
                      {i.location && <div className="text-xs text-muted-foreground">{i.location}</div>}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{i.ownership === 'locado' ? 'Locado' : 'Próprio'}</span>
                      {i.supplier_name && <div className="text-xs text-muted-foreground">{i.supplier_name}</div>}
                    </TableCell>
                    {showValues && (
                      <TableCell className="py-2 text-right text-sm">
                        {i.ownership === 'locado'
                          ? (i.rental_monthly_value != null
                              ? `${Number(i.rental_monthly_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês`
                              : '—')
                          : (i.purchase_value != null
                              ? Number(i.purchase_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : '—')}
                      </TableCell>
                    )}
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMovingItem(i)}>
                                <MoveRight className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Movimentar / ver histórico</TooltipContent>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(i); setFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar cadastro</TooltipContent>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(i)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir cadastro errado</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

          </TabsContent>

          <TabsContent value="devolucoes" className="mt-4">
            <EquipmentReturnsTab
              pendings={pendings}
              loading={loadingReturns}
              diasAlerta={diasAlerta}
              canEdit={canEdit}
              onResolve={resolveReturn}
              uploadEvidence={uploadEvidence}
              evidenceUrl={evidenceUrl}
            />
          </TabsContent>
        </Tabs>

        <EquipmentFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          item={editing}
          suppliers={suppliers}
          canViewValues={showValues}
          onSave={async (payload) => {
            if (editing) await updateItem(editing.id, payload);
            else await createItem(payload);
          }}
        />

        <EquipmentMovementDialog
          open={!!movingItem}
          onClose={() => setMovingItem(null)}
          item={movingItem}
          people={people}
          companies={companies}
          onRegister={registerMovement}
          loadMovements={loadMovements}
        />
      </div>
    </TooltipProvider>
  );
}
