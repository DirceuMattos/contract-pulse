import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Database, ChevronDown, RefreshCw, FileText, Loader2, Download,
  RotateCcw, CheckCircle2, XCircle, Eye, Copy, Sparkles,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface AIRun {
  id: string;
  run_type: string;
  template_type: string | null;
  user_id: string;
  input_json: any;
  redaction_level: string;
  internal_docs_used: any[];
  external_sources_used: any[];
  output_text: string | null;
  output_structured: any;
  status: string;
  error_message: string | null;
  model: string | null;
  template_version: string | null;
  prompt_hash: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  approved_status: string;
  approved_by: string | null;
  approved_at: string | null;
  approved_reason: string | null;
  replay_of_run_id: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

const runTypeLabels: Record<string, string> = {
  draft_contract: 'Minuta de Contrato',
  draft_tr: 'Termo de Referência',
  contracts_analysis: 'Análise de Contratos',
  resources_analysis: 'Análise de Recursos',
};

const approvedLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const approvedVariant: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function AILogsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [runs, setRuns] = useState<AIRun[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterApproved, setFilterApproved] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [reindexing, setReindexing] = useState(false);

  // Detail sheet
  const [selectedRun, setSelectedRun] = useState<AIRun | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRunId, setRejectRunId] = useState<string | null>(null);

  // Replay/export loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user?.role === 'c-level';

  const fetchData = async () => {
    setLoading(true);
    const [runsRes, profilesRes] = await Promise.all([
      supabase
        .from('ai_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('id, name, email'),
    ]);

    if (runsRes.data) setRuns(runsRes.data as unknown as AIRun[]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach(p => m.set(p.id, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => runs.filter(r => {
    if (filterType !== 'all' && r.run_type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterApproved !== 'all' && r.approved_status !== filterApproved) return false;
    if (filterUser !== 'all' && r.user_id !== filterUser) return false;
    return true;
  }), [runs, filterType, filterStatus, filterApproved, filterUser]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { data: docs } = await supabase
        .from('document_attachments').select('id').limit(100);
      if (!docs || docs.length === 0) {
        toast({ title: 'Nenhum documento para reindexar' });
        setReindexing(false);
        return;
      }
      const { data: extractions } = await supabase
        .from('doc_text_extractions')
        .select('document_id')
        .in('status', ['done', 'no_text']);
      const extractedIds = new Set((extractions || []).map((e: any) => e.document_id));
      const pending = docs.filter((d: any) => !extractedIds.has(d.id));
      if (pending.length === 0) {
        toast({ title: 'Todos os documentos já estão indexados' });
        setReindexing(false);
        return;
      }
      let processed = 0;
      for (const doc of pending.slice(0, 20)) {
        try {
          await supabase.functions.invoke('doc-extract', { body: { document_id: doc.id } });
          processed++;
        } catch { /* continue */ }
      }
      toast({ title: `${processed} documento(s) processado(s)` });
    } catch {
      toast({ title: 'Erro ao reindexar', variant: 'destructive' });
    }
    setReindexing(false);
  };

  // Approve run
  const handleApprove = async (runId: string) => {
    const { error } = await supabase
      .from('ai_runs')
      .update({
        approved_status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      } as any)
      .eq('id', runId);
    if (!error) {
      toast({ title: 'Run aprovado' });
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, approved_status: 'approved', approved_by: user?.id || null, approved_at: new Date().toISOString() } : r));
      if (selectedRun?.id === runId) setSelectedRun(prev => prev ? { ...prev, approved_status: 'approved' } : null);
    } else {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' });
    }
  };

  // Reject run
  const openRejectDialog = (runId: string) => {
    setRejectRunId(runId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectRunId) return;
    const { error } = await supabase
      .from('ai_runs')
      .update({
        approved_status: 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        approved_reason: rejectReason || null,
      } as any)
      .eq('id', rejectRunId);
    if (!error) {
      toast({ title: 'Run rejeitado' });
      setRuns(prev => prev.map(r => r.id === rejectRunId ? { ...r, approved_status: 'rejected', approved_by: user?.id || null, approved_at: new Date().toISOString(), approved_reason: rejectReason } : r));
      if (selectedRun?.id === rejectRunId) setSelectedRun(prev => prev ? { ...prev, approved_status: 'rejected', approved_reason: rejectReason } : null);
    } else {
      toast({ title: 'Erro ao rejeitar', variant: 'destructive' });
    }
    setRejectDialogOpen(false);
  };

  // Export
  const handleExport = async (runId: string) => {
    setActionLoading(`export-${runId}`);
    try {
      const { data, error } = await supabase.functions.invoke('ai-export-run', {
        body: { run_id: runId },
      });
      if (error) throw error;
      if (data?.json_url) {
        window.open(data.json_url, '_blank');
        toast({ title: 'Pacote exportado com sucesso' });
      }
      if (data?.csv_url) {
        // Auto-download CSV too
        const link = document.createElement('a');
        link.href = data.csv_url;
        link.download = `evidencias-${runId}.csv`;
        link.click();
      }
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  // Replay
  const handleReplay = async (run: AIRun) => {
    setActionLoading(`replay-${run.id}`);
    try {
      const input = run.input_json;
      const { data, error } = await supabase.functions.invoke('ai-draft-generate', {
        body: {
          type: input.type,
          variant: input.variant,
          answers: input.answers,
          doc_ids: input.doc_ids,
          user_id: user?.id,
          user_role: user?.role,
          replay_of_run_id: run.id,
        },
      });
      if (error) throw error;
      toast({ title: 'Replay concluído', description: `Novo run criado: ${data?.run_id?.slice(0, 8)}...` });
      fetchData();
    } catch {
      toast({ title: 'Erro no replay', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  const openDetail = (run: AIRun) => {
    setSelectedRun(run);
    setDetailOpen(true);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Fontes e Logs"
        description="Auditoria completa das execuções de IA — evidências, replay e governança"
        actions={
          isAdmin && (
            <Button variant="outline" onClick={handleReindex} disabled={reindexing} className="gap-2">
              {reindexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reindexar documentos
            </Button>
          )
        }
      />

      <AIPageLayout>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="draft_contract">Minuta de Contrato</SelectItem>
              <SelectItem value="draft_tr">Termo de Referência</SelectItem>
              <SelectItem value="contracts_analysis">Análise Contratos</SelectItem>
              <SelectItem value="resources_analysis">Análise Recursos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterApproved} onValueChange={setFilterApproved}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Aprovação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Usuário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Nenhum log encontrado"
            description="Os logs aparecerão aqui quando você gerar minutas ou análises com IA."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead className="text-center">Docs</TableHead>
                    <TableHead className="text-center">Ext.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(run => {
                    const profile = profileMap.get(run.user_id);
                    const internalCount = (run.internal_docs_used as any[])?.length || 0;
                    const externalCount = (run.external_sources_used as any[])?.length || 0;
                    return (
                      <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(run)}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(run.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {runTypeLabels[run.run_type] || run.run_type}
                          </Badge>
                          {run.replay_of_run_id && (
                            <Badge variant="secondary" className="text-[10px] ml-1">replay</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{profile?.name || run.user_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={approvedVariant[run.approved_status] || 'secondary'} className="text-xs">
                            {approvedLabels[run.approved_status] || run.approved_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">{internalCount || '—'}</TableCell>
                        <TableCell className="text-center text-xs">{externalCount || '—'}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(run)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  disabled={actionLoading === `export-${run.id}`}
                                  onClick={() => handleExport(run.id)}
                                >
                                  {actionLoading === `export-${run.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                </Button>
                                {(run.run_type === 'draft_contract' || run.run_type === 'draft_tr') && (
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    disabled={!!actionLoading}
                                    onClick={() => handleReplay(run)}
                                  >
                                    {actionLoading === `replay-${run.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </AIPageLayout>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRun && (
            <RunDetail
              run={selectedRun}
              profileMap={profileMap}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onReject={openRejectDialog}
              onExport={handleExport}
              onReplay={handleReplay}
              onCopy={copyToClipboard}
              actionLoading={actionLoading}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Justificativa (opcional)</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Confirmar Rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ---------- Detail Component ----------

interface RunDetailProps {
  run: AIRun;
  profileMap: Map<string, Profile>;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExport: (id: string) => void;
  onReplay: (run: AIRun) => void;
  onCopy: (text: string, label: string) => void;
  actionLoading: string | null;
}

function RunDetail({ run, profileMap, isAdmin, onApprove, onReject, onExport, onReplay, onCopy, actionLoading }: RunDetailProps) {
  const profile = profileMap.get(run.user_id);
  const internalDocs = (run.internal_docs_used as any[]) || [];
  const externalSources = (run.external_sources_used as any[]) || [];
  const evidences = run.output_structured?.evidences || [];
  const gaps = run.output_structured?.gaps || [];

  return (
    <div className="space-y-6 pt-4">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {runTypeLabels[run.run_type] || run.run_type}
        </SheetTitle>
      </SheetHeader>

      {/* Summary */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Resumo</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Usuário:</span> {profile?.name || run.user_id.slice(0, 8)}</div>
          <div><span className="text-muted-foreground">Data:</span> {new Date(run.created_at).toLocaleString('pt-BR')}</div>
          <div><span className="text-muted-foreground">Status:</span> <Badge variant={run.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">{run.status}</Badge></div>
          <div><span className="text-muted-foreground">Aprovação:</span> <Badge variant={approvedVariant[run.approved_status]} className="text-[10px]">{approvedLabels[run.approved_status]}</Badge></div>
          <div><span className="text-muted-foreground">Modelo:</span> {run.model || '—'}</div>
          <div><span className="text-muted-foreground">Redação:</span> {run.redaction_level}</div>
          {run.template_version && <div><span className="text-muted-foreground">Template:</span> {run.template_version}</div>}
          {run.template_type && <div><span className="text-muted-foreground">Tipo template:</span> {run.template_type}</div>}
          {run.tokens_in && <div><span className="text-muted-foreground">Tokens in:</span> {run.tokens_in}</div>}
          {run.tokens_out && <div><span className="text-muted-foreground">Tokens out:</span> {run.tokens_out}</div>}
          {run.replay_of_run_id && <div className="col-span-2"><span className="text-muted-foreground">Replay de:</span> {run.replay_of_run_id.slice(0, 12)}...</div>}
          {run.approved_reason && <div className="col-span-2"><span className="text-muted-foreground">Motivo:</span> {run.approved_reason}</div>}
        </div>
        <p className="text-[10px] text-muted-foreground">ID: {run.id}</p>
      </section>

      <Separator />

      {/* Input */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground w-full">
          <ChevronDown className="w-4 h-4" /> Entrada (Input)
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
            {JSON.stringify(run.input_json, null, 2)}
          </pre>
          <Button variant="ghost" size="sm" className="mt-1 text-xs gap-1" onClick={() => onCopy(JSON.stringify(run.input_json, null, 2), 'Input')}>
            <Copy className="w-3 h-3" /> Copiar input
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Internal Evidences */}
      {(internalDocs.length > 0 || evidences.length > 0) && (
        <>
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground w-full">
              <ChevronDown className="w-4 h-4" /> Evidências Internas ({internalDocs.length} doc(s), {evidences.length} ref(s))
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {internalDocs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Documentos usados:</p>
                  {internalDocs.map((d: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      📄 {d.file_name || d.document_id} {d.page_start ? `(p. ${d.page_start})` : ''}
                    </p>
                  ))}
                </div>
              )}
              {evidences.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Referências citadas:</p>
                  {evidences.map((ev: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      [{ev.ref_index}] {ev.document_name}{ev.page ? ` p.${ev.page}` : ''}: {ev.excerpt?.slice(0, 120)}...
                    </p>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          <Separator />
        </>
      )}

      {/* External Sources */}
      {externalSources.length > 0 && (
        <>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground w-full">
              <ChevronDown className="w-4 h-4" /> Fontes Externas ({externalSources.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {externalSources.map((s: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                  🔗 {s.title || s.url} {s.query ? `(query: "${s.query}")` : ''}
                </p>
              ))}
              <p className="text-[10px] text-muted-foreground italic mt-2">
                Fontes externas são referências e não substituem análise jurídica.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Separator />
        </>
      )}

      {/* Output */}
      {run.output_text && (
        <>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground w-full">
              <ChevronDown className="w-4 h-4" /> Saída (Output)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60 whitespace-pre-wrap">
                {run.output_text}
              </pre>
              <Button variant="ghost" size="sm" className="mt-1 text-xs gap-1" onClick={() => onCopy(run.output_text || '', 'Output')}>
                <Copy className="w-3 h-3" /> Copiar output
              </Button>
              {run.output_structured && (
                <Collapsible>
                  <CollapsibleTrigger className="text-xs text-muted-foreground underline mt-2 block">
                    Ver JSON estruturado
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-40 mt-1">
                      {JSON.stringify(run.output_structured, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CollapsibleContent>
          </Collapsible>
          <Separator />
        </>
      )}

      {/* Error */}
      {run.error_message && (
        <>
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
            <p className="text-xs font-medium text-destructive mb-1">Erro</p>
            <p className="text-xs text-destructive">{run.error_message}</p>
          </div>
          <Separator />
        </>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Pendências ({gaps.length})</p>
            {gaps.map((g: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">⚠ {g.field}: {g.description}</p>
            ))}
          </div>
          <Separator />
        </>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 pt-2">
          {run.approved_status === 'pending' && (
            <>
              <Button size="sm" className="gap-1" onClick={() => onApprove(run.id)}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => onReject(run.id)}>
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </Button>
            </>
          )}
          <Button
            size="sm" variant="outline" className="gap-1"
            disabled={actionLoading === `export-${run.id}`}
            onClick={() => onExport(run.id)}
          >
            {actionLoading === `export-${run.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar pacote
          </Button>
          {(run.run_type === 'draft_contract' || run.run_type === 'draft_tr') && (
            <Button
              size="sm" variant="outline" className="gap-1"
              disabled={!!actionLoading}
              onClick={() => onReplay(run)}
            >
              {actionLoading === `replay-${run.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Replay
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
