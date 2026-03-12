import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Link2, Plus, Eye, EyeOff, AlertTriangle, CheckCircle, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingMatch {
  id: string;
  sync_run_id: string;
  external_id: string;
  feedz_name: string;
  feedz_email: string | null;
  feedz_department: string | null;
  feedz_job_title: string | null;
  feedz_admission_date: string | null;
  feedz_status: string | null;
  feedz_remuneration: number;
  match_type: string;
  suggested_person_ids: string[];
  suggested_scores: number[];
  resolved_person_id: string | null;
  created_at: string;
}

interface HRPersonSimple {
  id: string;
  nome: string;
  email: string | null;
  id_externo: string | null;
  matricula: string | null;
  situacao: string;
  data_admissao: string;
}

export default function FeedzReconciliationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterRunId = searchParams.get('runId');

  const [pendingItems, setPendingItems] = useState<PendingMatch[]>([]);
  const [conflictItems, setConflictItems] = useState<PendingMatch[]>([]);
  const [unlinkPeople, setUnlinkPeople] = useState<HRPersonSimple[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<Map<string, HRPersonSimple>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PendingMatch | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [allPeople, setAllPeople] = useState<HRPersonSimple[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load pending matches
    let pendingQuery = (supabase.from as any)('feedz_pending_matches').select('*').eq('match_type', 'pending').order('created_at', { ascending: false });
    let conflictQuery = (supabase.from as any)('feedz_pending_matches').select('*').eq('match_type', 'conflict').order('created_at', { ascending: false });

    if (filterRunId) {
      pendingQuery = pendingQuery.eq('sync_run_id', filterRunId);
      conflictQuery = conflictQuery.eq('sync_run_id', filterRunId);
    }

    const [pendingRes, conflictRes, peopleRes] = await Promise.all([
      pendingQuery,
      conflictQuery,
      supabase.from('hr_people').select('id, nome, email, id_externo, situacao, data_admissao'),
    ]);

    const allP = (peopleRes.data || []) as unknown as HRPersonSimple[];
    setAllPeople(allP);
    setPendingItems((pendingRes.data || []) as unknown as PendingMatch[]);
    setConflictItems((conflictRes.data || []) as unknown as PendingMatch[]);
    setUnlinkPeople(allP.filter(p => !p.id_externo));

    // Build suggested people map
    const sugMap = new Map<string, HRPersonSimple>();
    for (const p of allP) sugMap.set(p.id, p);
    setSuggestedPeople(sugMap);

    setLoading(false);
  }, [filterRunId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLink = async (match: PendingMatch, personId: string) => {
    setActionLoading(match.id);
    try {
      // Update hr_people with id_externo
      await (supabase.from as any)('hr_people').update({
        id_externo: match.external_id,
        source: 'feedz',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }).eq('id', personId);

      await (supabase.from as any)('feedz_pending_matches').update({
        match_type: 'resolved',
        resolved_person_id: personId,
        resolved_at: new Date().toISOString(),
      }).eq('id', match.id);

      toast.success(`Vinculado: ${match.feedz_name}`);
      loadData();
    } catch (err: any) {
      toast.error(`Erro ao vincular: ${err.message}`);
    } finally {
      setActionLoading(null);
      setLinkDialogOpen(false);
    }
  };

  const handleCreateNew = async (match: PendingMatch) => {
    setActionLoading(match.id);
    try {
      await (supabase.from as any)('hr_people').insert({
        nome: match.feedz_name,
        email: match.feedz_email,
        id_externo: match.external_id,
        tipo_vinculo: 'clt',
        situacao: match.feedz_status?.toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
        data_admissao: match.feedz_admission_date || new Date().toISOString().split('T')[0],
        remuneracao_mensal: match.feedz_remuneration || 0,
        beneficios: 0,
        source: 'feedz',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      });

      await (supabase.from as any)('feedz_pending_matches').update({
        match_type: 'created',
        resolved_at: new Date().toISOString(),
      }).eq('id', match.id);

      toast.success(`Criado: ${match.feedz_name}`);
      loadData();
    } catch (err: any) {
      toast.error(`Erro ao criar: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async (match: PendingMatch) => {
    setActionLoading(match.id);
    try {
      await (supabase.from as any)('feedz_pending_matches').update({
        match_type: 'ignored',
        resolved_at: new Date().toISOString(),
      }).eq('id', match.id);
      toast.success(`Ignorado: ${match.feedz_name}`);
      loadData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkLinkByEmail = async () => {
    setActionLoading('bulk');
    let linked = 0;
    try {
      // For people without id_externo, find pending matches with same email
      for (const person of unlinkPeople) {
        if (!person.email) continue;
        const match = pendingItems.find(m => m.feedz_email?.toLowerCase() === person.email?.toLowerCase());
        if (match) {
          await (supabase.from as any)('hr_people').update({
            id_externo: match.external_id,
            source: 'feedz',
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }).eq('id', person.id);

          await (supabase.from as any)('feedz_pending_matches').update({
            match_type: 'resolved',
            resolved_person_id: person.id,
            resolved_at: new Date().toISOString(),
          }).eq('id', match.id);
          linked++;
        }
      }
      toast.success(`${linked} registros vinculados por email.`);
      loadData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openLinkDialog = (match: PendingMatch) => {
    setLinkTarget(match);
    setSelectedPersonId(match.suggested_person_ids?.[0] || '');
    setLinkDialogOpen(true);
  };

  const renderMatchCard = (match: PendingMatch, isConflict = false) => (
    <TableRow key={match.id}>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{match.feedz_name}</p>
          <p className="text-xs text-muted-foreground">{match.feedz_email || '—'}</p>
        </div>
      </TableCell>
      <TableCell className="text-xs">{match.feedz_job_title || '—'}</TableCell>
      <TableCell className="text-xs">{match.feedz_department || '—'}</TableCell>
      <TableCell className="text-xs">{match.feedz_admission_date?.substring(0, 10) || '—'}</TableCell>
      <TableCell className="text-xs">
        <Badge variant={match.feedz_status === 'Ativo' ? 'default' : 'secondary'}>{match.feedz_status || '—'}</Badge>
      </TableCell>
      <TableCell>
        {match.suggested_person_ids?.length > 0 ? (
          <div className="space-y-1">
            {match.suggested_person_ids.map((pid, i) => {
              const person = suggestedPeople.get(pid);
              return (
                <div key={pid} className="text-xs">
                  <span className="font-medium">{person?.nome || pid}</span>
                  {match.suggested_scores?.[i] != null && (
                    <Badge variant="outline" className="ml-1 text-[10px]">{match.suggested_scores[i]}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => openLinkDialog(match)} disabled={actionLoading === match.id}>
            <Link2 className="h-3 w-3 mr-1" /> Vincular
          </Button>
          {!isConflict && (
            <Button size="sm" variant="outline" onClick={() => handleCreateNew(match)} disabled={actionLoading === match.id}>
              <Plus className="h-3 w-3 mr-1" /> Criar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => handleIgnore(match)} disabled={actionLoading === match.id}>
            <EyeOff className="h-3 w-3 mr-1" /> Ignorar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliação Feedz"
        description="Resolva pendências de matching entre registros do Feedz e cadastro local de RH."
        animated={false}
        actions={
          <Button variant="outline" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pendências ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflitos ({conflictItems.length})
            </TabsTrigger>
            <TabsTrigger value="prelink">
              Pré-vincular ({unlinkPeople.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Pendências de Match
                </CardTitle>
                <CardDescription>
                  Registros do Feedz sem match automático confiável. Revise e vincule manualmente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pendência.</p>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Feedz</TableHead>
                          <TableHead className="text-xs">Cargo</TableHead>
                          <TableHead className="text-xs">Depto</TableHead>
                          <TableHead className="text-xs">Admissão</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Sugestões</TableHead>
                          <TableHead className="text-xs">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingItems.map(m => renderMatchCard(m))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Conflitos
                </CardTitle>
                <CardDescription>
                  Email bate mas id_externo diverge. Escolha o registro correto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conflictItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum conflito.</p>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Feedz</TableHead>
                          <TableHead className="text-xs">Cargo</TableHead>
                          <TableHead className="text-xs">Depto</TableHead>
                          <TableHead className="text-xs">Admissão</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Registro Local</TableHead>
                          <TableHead className="text-xs">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conflictItems.map(m => renderMatchCard(m, true))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prelink">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Pré-vincular Registros Manuais
                    </CardTitle>
                    <CardDescription>
                      Registros de RH sem id_externo. Vincule por email antes da próxima sincronização.
                    </CardDescription>
                  </div>
                  {pendingItems.length > 0 && unlinkPeople.some(p => p.email) && (
                    <Button onClick={handleBulkLinkByEmail} disabled={actionLoading === 'bulk'}>
                      {actionLoading === 'bulk' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                      Vincular em lote por email
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {unlinkPeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Todos os registros já possuem id_externo.</p>
                ) : (
                  <div className="border rounded-md overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Situação</TableHead>
                          <TableHead className="text-xs">Admissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unlinkPeople.slice(0, 50).map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{p.nome}</TableCell>
                            <TableCell className="text-xs">{p.email || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={p.situacao === 'ativo' ? 'default' : 'secondary'} className="text-xs">{p.situacao}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{p.data_admissao?.substring(0, 10) || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular registro</DialogTitle>
            <DialogDescription>
              Vincular <strong>{linkTarget?.feedz_name}</strong> ({linkTarget?.feedz_email}) a um registro local.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma pessoa" />
            </SelectTrigger>
            <SelectContent>
              {allPeople.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} {p.email ? `(${p.email})` : ''} {p.id_externo ? `[${p.id_externo}]` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => linkTarget && selectedPersonId && handleLink(linkTarget, selectedPersonId)}
              disabled={!selectedPersonId || actionLoading === linkTarget?.id}
            >
              {actionLoading === linkTarget?.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
