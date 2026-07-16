// v3 - Vagas: reposicao "nao repor" reversivel
import { useState } from 'react';
import { Briefcase, Plus, Pencil, Users, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useJobRequests, type JobRequest, type JobRequestStatus,
  STATUS_META, STATUS_FLOW,
} from '@/hooks/useJobRequests';
import { usePendingReplacementsForVaga } from '@/hooks/usePendingReplacementsForVaga';
import { JobRequestDialog } from '@/components/jobrequests/JobRequestDialog';

const STATUS_ORDER: (JobRequestStatus | 'todos')[] = [
  'todos', 'solicitado', 'em_avaliacao', 'aprovado_em_contratacao', 'preenchida', 'suspenso',
];

function StatusBadge({ status }: { status: JobRequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export default function JobRequestsPage() {
  const { canEdit } = useAuth();
  const { requests, loading, error, reload } = useJobRequests();
  const { items: reposicoes, reload: reloadReposicoes } = usePendingReplacementsForVaga();
  const [filter, setFilter] = useState<JobRequestStatus | 'todos'>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRequest | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: JobRequest) => { setEditing(r); setDialogOpen(true); };

  // Cria vaga pré-preenchida a partir de uma reposição pendente (1 clique).
  const abrirVagaDeReposicao = async (rep: typeof reposicoes[number]) => {
    const titulo = rep.cargoLabel
      ? `${rep.cargoLabel}${rep.nivel ? ` (${rep.nivel})` : ''}`
      : `Reposição — ${rep.pessoaNome}`;
    const { error: e } = await supabase.from('job_requests').insert({
      titulo,
      descricao: `Reposição de ${rep.pessoaNome}.`,
      job_title_id: rep.cargoId,
      nivel: rep.nivel,
      quantidade: 1,
      status: 'solicitado',
      pending_replacement_id: rep.id,
      contract_id: rep.contract_id,
      solicitante_id: null,
    });
    if (e) { toast.error('Erro ao abrir vaga'); return; }
    toast.success('Vaga aberta a partir da reposição');
    reload(); reloadReposicoes();
  };

  const marcarNaoRepor = async (repId: string) => {
    const { error: e } = await supabase.from('pending_replacements')
      .update({ status: 'removed', resolved_at: new Date().toISOString() }).eq('id', repId);
    if (e) { toast.error('Erro ao marcar'); return; }
    toast.success('Marcada como não reposta');
    reloadReposicoes();
  };

  const reverterNaoRepor = async (repId: string) => {
    const { error: e } = await supabase.from('pending_replacements')
      .update({ status: 'pending', resolved_at: null }).eq('id', repId);
    if (e) { toast.error('Erro ao reverter'); return; }
    toast.success('Reposição reativada');
    reloadReposicoes();
  };

  const changeStatus = async (r: JobRequest, novo: JobRequestStatus) => {
    const { error: e } = await supabase.from('job_requests').update({ status: novo }).eq('id', r.id);
    if (e) { toast.error('Erro ao mudar status'); return; }
    toast.success(`Vaga movida para "${STATUS_META[novo].label}"`);
    reload();
  };

  const filtered = filter === 'todos' ? requests : requests.filter((r) => r.status === filter);
  const countBy = (s: JobRequestStatus | 'todos') => s === 'todos' ? requests.length : requests.filter((r) => r.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisição de Vagas"
        description="Abertura e acompanhamento de vagas, com fluxo de status."
        animated={false}
        breadcrumbs={[{ label: 'Requisição de Vagas' }]}
        actions={canEdit && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova vaga</Button>
        )}
      />

      {/* Filtro por status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => {
          const active = filter === s;
          const label = s === 'todos' ? 'Todas' : STATUS_META[s].label;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              {label} <span className="opacity-70">({countBy(s)})</span>
            </button>
          );
        })}
      </div>

      {error && <Card><CardContent className="p-4 text-sm text-destructive">Erro ao carregar: {error}</CardContent></Card>}

      {/* Reposições pendentes (desligamentos sem vaga aberta) */}
      {canEdit && reposicoes.filter((r) => r.status === 'pending' && !r.jaTemVaga).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <UserMinus className="h-4 w-4" />
            Reposições pendentes ({reposicoes.filter((r) => r.status === 'pending' && !r.jaTemVaga).length})
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {reposicoes.filter((r) => r.status === 'pending' && !r.jaTemVaga).map((rep) => (
              <div key={rep.id} className="flex items-center gap-2 rounded-md border bg-background p-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{rep.pessoaNome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rep.cargoLabel ?? 'Cargo não informado'}{rep.nivel ? ` · ${rep.nivel}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => abrirVagaDeReposicao(rep)}>
                  Abrir vaga
                </Button>
                <Button size="sm" variant="ghost" className="shrink-0 text-muted-foreground" onClick={() => marcarNaoRepor(rep.id)}>
                  Não repor
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Não repostas (reversível) */}
      {canEdit && reposicoes.filter((r) => r.status === 'removed').length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Não repostas ({reposicoes.filter((r) => r.status === 'removed').length})
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {reposicoes.filter((r) => r.status === 'removed').map((rep) => (
              <div key={rep.id} className="flex items-center gap-2 rounded-md border bg-background p-2.5 text-sm opacity-80">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate line-through decoration-muted-foreground/40">{rep.pessoaNome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rep.cargoLabel ?? 'Cargo não informado'}{rep.nivel ? ` · ${rep.nivel}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => reverterNaoRepor(rep.id)}>
                  Reverter
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={filter === 'todos' ? 'Nenhuma vaga cadastrada' : 'Nenhuma vaga neste status'}
          description={filter === 'todos' ? 'Abra uma requisição de vaga para iniciar um processo de contratação.' : 'Ajuste o filtro para ver outras vagas.'}
          actionLabel={filter === 'todos' && canEdit ? 'Nova vaga' : undefined}
          onAction={filter === 'todos' && canEdit ? openNew : undefined}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const proximos = STATUS_FLOW[r.status];
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{r.titulo}</CardTitle>
                        {r.quantidade > 1 && <Badge variant="secondary">{r.quantidade} vagas</Badge>}
                        {r.nivel && <Badge variant="outline">{r.nivel}</Badge>}
                      </div>
                      {(r.jobTitleLabel || r.descricao) && (
                        <CardDescription className="line-clamp-2">
                          {r.jobTitleLabel ? <span className="font-medium">{r.jobTitleLabel}</span> : null}
                          {r.jobTitleLabel && r.descricao ? ' — ' : ''}
                          {r.descricao}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status} />
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {r.anos_experiencia != null && <span>{r.anos_experiencia} ano(s) de exp.</span>}
                    <span>Aberta em {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {canEdit && proximos.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Mover status</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {proximos.map((s) => (
                          <DropdownMenuItem key={s} onClick={() => changeStatus(r, s)}>
                            {STATUS_META[s].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <JobRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => { setDialogOpen(false); reload(); }}
      />
    </div>
  );
}
