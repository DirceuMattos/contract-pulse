import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Undo2, ChevronRight, CheckCircle, XCircle, AlertTriangle, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncRun {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_terminated: number;
  records_pending: number | null;
  records_conflicts: number | null;
  sync_mode: string;
  error_message: string | null;
}

interface SyncItem {
  id: string;
  sync_run_id: string;
  feedz_id: string | null;
  feedz_email: string | null;
  feedz_name: string | null;
  match_strategy: string;
  matched_hr_person_id: string | null;
  action: string;
  reason_code: string | null;
  fields_changed_json: any;
  snapshot_before: any;
  payload_hash: string | null;
  reverted_at: string | null;
  reverted_by: string | null;
  created_at: string;
}

export default function FeedzReconciliationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRunId = searchParams.get('runId');

  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  // Detail view state
  const [items, setItems] = useState<SyncItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rollback dialog
  const [rollbackItem, setRollbackItem] = useState<SyncItem | null>(null);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Detail expand
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    const { data } = await (supabase.from as any)('feedz_sync_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRuns((data || []) as SyncRun[]);
    setLoadingRuns(false);
  }, []);

  const loadItems = useCallback(async (runId: string) => {
    setLoadingItems(true);
    const { data } = await supabase
      .from('feedz_sync_items')
      .select('*')
      .eq('sync_run_id', runId)
      .order('created_at', { ascending: true });
    setItems((data || []) as unknown as SyncItem[]);
    setLoadingItems(false);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    if (selectedRunId) {
      loadItems(selectedRunId);
    } else {
      setItems([]);
    }
  }, [selectedRunId, loadItems]);

  const openRun = (runId: string) => {
    setSearchParams({ runId });
  };

  const backToList = () => {
    setSearchParams({});
    setItems([]);
    setSearchQuery('');
    setExpandedItemId(null);
  };

  const handleRollbackItem = async () => {
    if (!rollbackItem) return;
    setRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-rollback', {
        body: { itemId: rollbackItem.id },
      });
      if (error) throw new Error(typeof error === 'object' && (error as any).message ? (error as any).message : String(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Registro revertido com sucesso.');
      // Refresh items
      if (selectedRunId) loadItems(selectedRunId);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setRollingBack(false);
      setRollbackItem(null);
      setRollbackConfirmed(false);
    }
  };

  // Filter items
  const createdItems = items.filter(i => i.action === 'INSERT');
  const updatedItems = items.filter(i => i.action === 'UPDATE');
  const blockedItems = items.filter(i => i.action === 'PENDING' || i.action === 'CONFLICT' || i.action === 'BLOCKED');

  const filterBySearch = (list: SyncItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i =>
      (i.feedz_name || '').toLowerCase().includes(q) ||
      (i.feedz_id || '').toLowerCase().includes(q) ||
      (i.feedz_email || '').toLowerCase().includes(q)
    );
  };

  const selectedRun = runs.find(r => r.id === selectedRunId);

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rolled_back') return <Undo2 className="h-4 w-4 text-muted-foreground" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const renderFieldChips = (item: SyncItem) => {
    const changes = item.fields_changed_json as any[];
    if (!changes || changes.length === 0) return <span className="text-muted-foreground">—</span>;
    const fieldNames = changes.filter((c: any) => c.field).map((c: any) => c.field);
    const display = fieldNames.slice(0, 3);
    return (
      <div className="flex flex-wrap gap-1">
        {display.map((f: string) => (
          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
        ))}
        {fieldNames.length > 3 && (
          <Badge variant="secondary" className="text-[10px]">+{fieldNames.length - 3}</Badge>
        )}
      </div>
    );
  };

  const renderItemRow = (item: SyncItem) => {
    const isReverted = !!item.reverted_at;
    const isExpanded = expandedItemId === item.id;

    return (
      <div key={item.id}>
        <TableRow className={isReverted ? 'opacity-60' : ''}>
          <TableCell className="text-xs">{new Date(item.created_at).toLocaleString('pt-BR')}</TableCell>
          <TableCell className="text-xs font-mono">{item.feedz_id || '—'}</TableCell>
          <TableCell className="text-sm">{item.feedz_name || '—'}</TableCell>
          <TableCell>{renderFieldChips(item)}</TableCell>
          <TableCell>
            {isReverted ? (
              <Badge variant="secondary" className="text-[10px]">Revertido</Badge>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  title="Ver detalhes"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {(item.action === 'INSERT' || item.action === 'UPDATE') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRollbackItem(item); setRollbackConfirmed(false); }}
                    title="Reverter"
                  >
                    <Undo2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </TableCell>
        </TableRow>
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={5} className="bg-muted/30 p-4">
              <FieldChangesDetail item={item} />
            </TableCell>
          </TableRow>
        )}
      </div>
    );
  };

  // ─── RUNS LIST VIEW ──────────────────────────────────────────────────────
  if (!selectedRunId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conciliação Feedz"
          description="Visualize e gerencie os resultados de cada sincronização com o Feedz."
          animated={false}
          actions={
            <Button variant="outline" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          }
        />
        {loadingRuns ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Nenhuma sincronização realizada.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Sincronizações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Processados</TableHead>
                      <TableHead className="text-xs">Criados</TableHead>
                      <TableHead className="text-xs">Alterados</TableHead>
                      <TableHead className="text-xs">Desligados</TableHead>
                      <TableHead className="text-xs">Pendências</TableHead>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="flex items-center gap-1.5">
                          {statusIcon(r.status)}
                          <span className="text-xs">{r.status === 'rolled_back' ? 'Revertido' : r.status}</span>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(r.started_at).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-xs">{r.records_processed}</TableCell>
                        <TableCell className="text-xs">{r.records_created}</TableCell>
                        <TableCell className="text-xs">{r.records_updated}</TableCell>
                        <TableCell className="text-xs">{r.records_terminated}</TableCell>
                        <TableCell className="text-xs">{(r.records_pending || 0) + (r.records_conflicts || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{r.sync_mode || 'legacy'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openRun(r.id)}>
                            <FileText className="h-3 w-3 mr-1" /> Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── RUN DETAIL VIEW ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Conciliação — Run ${selectedRunId.substring(0, 8)}…`}
        description={selectedRun ? `${new Date(selectedRun.started_at).toLocaleString('pt-BR')} • ${selectedRun.records_processed} processados • Status: ${selectedRun.status}` : ''}
        animated={false}
        actions={
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à lista
          </Button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou matrícula..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-9"
        />
      </div>

      {loadingItems ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="created">
          <TabsList>
            <TabsTrigger value="created">
              Criados ({createdItems.length})
            </TabsTrigger>
            <TabsTrigger value="updated">
              Alterados ({updatedItems.length})
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Bloqueados ({blockedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created">
            <ItemsTable items={filterBySearch(createdItems)} renderRow={renderItemRow} emptyMessage="Nenhum registro criado neste run." />
          </TabsContent>

          <TabsContent value="updated">
            <ItemsTable items={filterBySearch(updatedItems)} renderRow={renderItemRow} emptyMessage="Nenhum registro alterado neste run." />
          </TabsContent>

          <TabsContent value="blocked">
            <ItemsTable items={filterBySearch(blockedItems)} renderRow={renderItemRow} emptyMessage="Nenhum registro bloqueado neste run." />
          </TabsContent>
        </Tabs>
      )}

      {/* Rollback confirmation dialog */}
      <Dialog open={!!rollbackItem} onOpenChange={(open) => { if (!open) { setRollbackItem(null); setRollbackConfirmed(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverter registro</DialogTitle>
            <DialogDescription>
              {rollbackItem?.action === 'INSERT'
                ? `O registro "${rollbackItem?.feedz_name}" (matrícula ${rollbackItem?.feedz_id}) será inativado ou removido do sistema.`
                : `Os campos alterados de "${rollbackItem?.feedz_name}" serão restaurados ao estado anterior à sincronização.`
              }
            </DialogDescription>
          </DialogHeader>

          {rollbackItem?.action === 'UPDATE' && rollbackItem?.fields_changed_json && (
            <div className="text-xs space-y-1 max-h-40 overflow-auto border rounded p-2 bg-muted/30">
              {(rollbackItem.fields_changed_json as any[]).map((c: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="font-medium">{c.field}:</span>
                  <span className="text-destructive line-through">{String(c.after ?? '—')}</span>
                  <span>→</span>
                  <span className="text-emerald-600">{String(c.before ?? '—')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="confirm-rollback"
              checked={rollbackConfirmed}
              onCheckedChange={(v) => setRollbackConfirmed(!!v)}
            />
            <label htmlFor="confirm-rollback" className="text-sm">Confirmo a reversão deste registro</label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRollbackItem(null); setRollbackConfirmed(false); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rollbackConfirmed || rollingBack}
              onClick={handleRollbackItem}
            >
              {rollingBack ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ITEMS TABLE COMPONENT ──────────────────────────────────────────────────
function ItemsTable({ items, renderRow, emptyMessage }: { items: SyncItem[]; renderRow: (item: SyncItem) => React.ReactNode; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data/Hora</TableHead>
                <TableHead className="text-xs">Matrícula</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Campos</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(renderRow)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── FIELD CHANGES DETAIL ───────────────────────────────────────────────────
function FieldChangesDetail({ item }: { item: SyncItem }) {
  const changes = item.fields_changed_json as any[];
  if (!changes || changes.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem detalhes de alteração.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Campos alterados:</p>
      <div className="grid gap-1">
        {changes.map((c: any, i: number) => (
          <div key={i} className="text-xs flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">{c.field}</Badge>
            <span className="text-muted-foreground">{String(c.before ?? '(vazio)')}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{String(c.after ?? '(vazio)')}</span>
          </div>
        ))}
      </div>
      {item.reason_code && (
        <p className="text-xs text-muted-foreground mt-2">Razão: <Badge variant="secondary" className="text-[10px]">{item.reason_code}</Badge></p>
      )}
    </div>
  );
}
