import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Undo2, ChevronRight, CheckCircle, XCircle, AlertTriangle, Search, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  inconsistency_count: number;
  sync_mode: string;
  error_message: string | null;
}

interface SyncChange {
  id: string;
  run_id: string;
  matricula: string | null;
  hr_people_id: string | null;
  action: string;
  synced_at: string;
  changed_fields: any;
  before_snapshot: any;
  after_snapshot: any;
  payload_hash: string | null;
  reverted_at: string | null;
  reverted_by: string | null;
  created_at: string;
}

interface SyncInconsistency {
  id: string;
  run_id: string;
  matricula: string | null;
  reason_code: string;
  reason_detail: string;
  feedz_payload: any;
  created_at: string;
}

export default function FeedzReconciliationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRunId = searchParams.get('runId');

  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [inconsistencies, setInconsistencies] = useState<SyncInconsistency[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [rollbackItem, setRollbackItem] = useState<SyncChange | null>(null);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
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
    const [changesRes, inconsRes] = await Promise.all([
      (supabase.from as any)('feedz_sync_change').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
      (supabase.from as any)('feedz_sync_inconsistency').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
    ]);
    setChanges((changesRes.data || []) as SyncChange[]);
    setInconsistencies((inconsRes.data || []) as SyncInconsistency[]);
    setLoadingItems(false);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    if (selectedRunId) loadItems(selectedRunId);
    else { setChanges([]); setInconsistencies([]); }
  }, [selectedRunId, loadItems]);

  const openRun = (runId: string) => setSearchParams({ runId });

  const backToList = () => {
    setSearchParams({});
    setChanges([]);
    setInconsistencies([]);
    setSearchQuery('');
    setExpandedItemId(null);
  };

  const handleRollbackItem = async () => {
    if (!rollbackItem) return;
    setRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedz-rollback', {
        body: { itemId: rollbackItem.id, runId: rollbackItem.run_id },
      });
      if (error) throw new Error(typeof error === 'object' && (error as any).message ? (error as any).message : String(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Registro revertido com sucesso.');
      if (selectedRunId) loadItems(selectedRunId);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setRollingBack(false);
      setRollbackItem(null);
      setRollbackConfirmed(false);
    }
  };

  const exportInconsistenciesCSV = () => {
    if (inconsistencies.length === 0) return;
    const headers = ['Matrícula', 'Código', 'Detalhe', 'Data'];
    const rows = inconsistencies.map(i => [
      i.matricula || '',
      i.reason_code,
      `"${(i.reason_detail || '').replace(/"/g, '""')}"`,
      new Date(i.created_at).toLocaleString('pt-BR'),
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inconsistencias-${selectedRunId?.substring(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado.');
  };

  // Filter
  const createdItems = changes.filter(i => i.action === 'created');
  const updatedItems = changes.filter(i => i.action === 'updated');
  const terminatedItems = changes.filter(i => i.action === 'terminated');

  const filterBySearch = <T extends { matricula?: string | null }>(list: T[], nameField?: string): T[] => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i => {
      const m = (i.matricula || '').toLowerCase();
      const extra = nameField ? String((i as any)[nameField] || '').toLowerCase() : '';
      return m.includes(q) || extra.includes(q);
    });
  };

  const filterChanges = (list: SyncChange[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i =>
      (i.matricula || '').toLowerCase().includes(q) ||
      JSON.stringify(i.after_snapshot?.nome || i.before_snapshot?.nome || '').toLowerCase().includes(q)
    );
  };

  const selectedRun = runs.find(r => r.id === selectedRunId);

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'rolled_back') return <Undo2 className="h-4 w-4 text-muted-foreground" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const getNameFromChange = (item: SyncChange) => {
    return item.after_snapshot?.nome || item.before_snapshot?.nome || '—';
  };

  const renderFieldChips = (item: SyncChange) => {
    const ch = (item.changed_fields as any[]) || [];
    if (ch.length === 0) return <span className="text-muted-foreground">—</span>;
    const names = ch.filter((c: any) => c.field).map((c: any) => c.field);
    const display = names.slice(0, 3);
    return (
      <div className="flex flex-wrap gap-1">
        {display.map((f: string) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
        {names.length > 3 && <Badge variant="secondary" className="text-[10px]">+{names.length - 3}</Badge>}
      </div>
    );
  };

  const renderChangeRow = (item: SyncChange, showRollback = true) => {
    const isReverted = !!item.reverted_at;
    const isExpanded = expandedItemId === item.id;

    return (
      <div key={item.id}>
        <TableRow className={isReverted ? 'opacity-60' : ''}>
          <TableCell className="text-xs">{new Date(item.synced_at).toLocaleString('pt-BR')}</TableCell>
          <TableCell className="text-xs font-mono">{item.matricula || '—'}</TableCell>
          <TableCell className="text-sm">{getNameFromChange(item)}</TableCell>
          <TableCell>{renderFieldChips(item)}</TableCell>
          <TableCell>
            {isReverted ? (
              <Badge variant="secondary" className="text-[10px]">Revertido</Badge>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setExpandedItemId(isExpanded ? null : item.id)} title="Ver detalhes">
                  <Eye className="h-3 w-3" />
                </Button>
                {showRollback && (
                  <Button variant="ghost" size="sm" onClick={() => { setRollbackItem(item); setRollbackConfirmed(false); }} title="Reverter">
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

  const reasonCodeLabel: Record<string, string> = {
    MISSING_MATRICULA: 'Matrícula ausente',
    DUPLICATE_MATRICULA_FEEDZ: 'Matrícula duplicada no Feedz',
    TERMINATION_DATE_WITH_ACTIVE_STATUS: 'Ativo com data de desligamento',
    NO_TERMINATION_DATE_WITH_INACTIVE_STATUS: 'Inativo sem data de desligamento',
    INVALID_STATUS_COMBINATION: 'Combinação de status inválida',
    MULTIPLE_MATCHES_IN_SYSTEM: 'Múltiplos registros no sistema',
    PARSE_ERROR: 'Erro de processamento',
  };

  // ─── RUNS LIST ──────────────────────────────────────────────────────────────
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
                      <TableHead className="text-xs">Inconsistências</TableHead>
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
                        <TableCell className="text-xs">{r.inconsistency_count || 0}</TableCell>
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

  // ─── RUN DETAIL ──────────────────────────────────────────────────────────────
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

      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou matrícula..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9" />
      </div>

      {loadingItems ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="created">
          <TabsList>
            <TabsTrigger value="created">Criados ({createdItems.length})</TabsTrigger>
            <TabsTrigger value="updated">Alterados ({updatedItems.length})</TabsTrigger>
            <TabsTrigger value="terminated">Desligados ({terminatedItems.length})</TabsTrigger>
            <TabsTrigger value="inconsistencies">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Inconsistências ({inconsistencies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created">
            <ChangesTable items={filterChanges(createdItems)} renderRow={(i) => renderChangeRow(i)} emptyMessage="Nenhum registro criado neste run." />
          </TabsContent>

          <TabsContent value="updated">
            <ChangesTable items={filterChanges(updatedItems)} renderRow={(i) => renderChangeRow(i)} emptyMessage="Nenhum registro alterado neste run." />
          </TabsContent>

          <TabsContent value="terminated">
            <ChangesTable items={filterChanges(terminatedItems)} renderRow={(i) => renderChangeRow(i)} emptyMessage="Nenhum desligamento neste run." />
          </TabsContent>

          <TabsContent value="inconsistencies">
            <Card>
              <CardContent className="pt-4">
                {inconsistencies.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma inconsistência neste run.</p>
                ) : (
                  <>
                    <div className="flex justify-end mb-3">
                      <Button variant="outline" size="sm" onClick={exportInconsistenciesCSV}>
                        <Download className="h-3 w-3 mr-1" /> Exportar CSV
                      </Button>
                    </div>
                    <div className="border rounded-md overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Matrícula</TableHead>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="text-xs">Detalhe</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterBySearch(inconsistencies).map(inc => (
                            <TableRow key={inc.id}>
                              <TableCell className="text-xs font-mono">{inc.matricula || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="text-[10px]">
                                  {reasonCodeLabel[inc.reason_code] || inc.reason_code}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[300px] break-words">{inc.reason_detail}</TableCell>
                              <TableCell className="text-xs">{new Date(inc.created_at).toLocaleString('pt-BR')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Rollback dialog */}
      <Dialog open={!!rollbackItem} onOpenChange={(open) => { if (!open) { setRollbackItem(null); setRollbackConfirmed(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverter registro</DialogTitle>
            <DialogDescription>
              {rollbackItem?.action === 'created'
                ? `O registro "${getNameFromChange(rollbackItem!)}" (matrícula ${rollbackItem?.matricula}) será inativado ou removido do sistema.`
                : rollbackItem?.action === 'terminated'
                  ? `O registro "${getNameFromChange(rollbackItem!)}" será reativado ao estado anterior ao desligamento.`
                  : `Os campos alterados de "${getNameFromChange(rollbackItem!)}" serão restaurados ao estado anterior à sincronização.`
              }
            </DialogDescription>
          </DialogHeader>

          {(rollbackItem?.action === 'updated' || rollbackItem?.action === 'terminated') && rollbackItem?.changed_fields && (
            <div className="text-xs space-y-1 max-h-40 overflow-auto border rounded p-2 bg-muted/30">
              {((rollbackItem.changed_fields as any[]) || []).map((c: any, i: number) => (
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
            <Checkbox id="confirm-rollback" checked={rollbackConfirmed} onCheckedChange={(v) => setRollbackConfirmed(!!v)} />
            <label htmlFor="confirm-rollback" className="text-sm">Confirmo a reversão deste registro</label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRollbackItem(null); setRollbackConfirmed(false); }}>Cancelar</Button>
            <Button variant="destructive" disabled={!rollbackConfirmed || rollingBack} onClick={handleRollbackItem}>
              {rollingBack ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CHANGES TABLE ──────────────────────────────────────────────────────────
function ChangesTable({ items, renderRow, emptyMessage }: { items: SyncChange[]; renderRow: (item: SyncChange) => React.ReactNode; emptyMessage: string }) {
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
function FieldChangesDetail({ item }: { item: SyncChange }) {
  const changes = (item.changed_fields as any[]) || [];
  if (changes.length === 0) {
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
    </div>
  );
}
