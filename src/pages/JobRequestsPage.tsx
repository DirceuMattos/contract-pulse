// v6 - Vagas: subtela "Nao repostas / Contratacoes avulsas" + reposto por
import { useState } from 'react';
import { Briefcase, Copy, Gift, MapPin, Pencil, Plane, Plus, UserMinus } from 'lucide-react';
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
import { NaoReporDialog } from '@/components/jobrequests/NaoReporDialog';
import { ExportJobRequestDialog } from '@/components/jobrequests/ExportJobRequestDialog';

const STATUS_ORDER: (JobRequestStatus | 'todos')[] = [
  'todos', 'solicitado', 'em_avaliacao', 'aprovado_em_contratacao', 'preenchida', 'suspenso',
];

const MODALIDADE_LABELS: Record<NonNullable<JobRequest['modalidade_trabalho']>, string> = {
  remoto: 'Home office',
  presencial: 'Presencial',
  hibrido: 'Híbrida',
};

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

function getStatusCardStyle(status: JobRequestStatus) {
  const color = STATUS_META[status].color;
  return {
    borderLeftColor: color,
    background: `linear-gradient(90deg, ${color}14 0%, ${color}08 42%, transparent 100%)`,
  };
}

export default function JobRequestsPage() {
  const { canEdit } = useAuth();
  const { requests, loading, error, reload } = useJobRequests();
  const { items: reposicoes, reload: reloadReposicoes } = usePendingReplacementsForVaga();
  const [filter, setFilter] = useState<JobRequestStatus | 'todos'>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRequest | null>(null);
  const [exporting, setExporting] = useState<JobRequest | null>(null);

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
    // marca as demais reposições da mesma pessoa como resolvidas (replaced)
    const outras = rep.allIds.filter((id) => id !== rep.id);
    if (outras.length > 0) {
      await supabase.from('pending_replacements')
        .update({ status: 'replaced', resolved_at: new Date().toISOString() }).in('id', outras);
    }
    toast.success('Vaga aberta a partir da reposição');
    reload(); reloadReposicoes();
  };

  const [naoReporRep, setNaoReporRep] = useState<import('@/hooks/usePendingReplacementsForVaga').ReplacementForVaga | null>(null);

  // Confirma "não repor". Se foi preenchida por alguém, cria uma job_request
  // já como 'preenchida' (registro histórico: ex-colab -> vaga -> quem assumiu).
  const confirmarNaoRepor = async (
    rep: import('@/hooks/usePendingReplacementsForVaga').ReplacementForVaga,
    preenchidaPor: string | null,
  ) => {
    if (preenchidaPor) {
      const titulo = rep.cargoLabel ? `${rep.cargoLabel}${rep.nivel ? ` (${rep.nivel})` : ''}` : `Reposição — ${rep.pessoaNome}`;
      await supabase.from('job_requests').insert({
        titulo,
        descricao: `Reposição de ${rep.pessoaNome} (registrada retroativamente).`,
        job_title_id: rep.cargoId,
        nivel: rep.nivel,
        quantidade: 1,
        status: 'preenchida',
        pending_replacement_id: rep.id,
        contract_id: rep.contract_id,
        preenchida_por_hr_person_id: preenchidaPor,
        preenchida_em: new Date().toISOString(),
      });
    }
    const { error: e } = await supabase.from('pending_replacements')
      .update({ status: 'removed', resolved_at: new Date().toISOString() }).in('id', rep.allIds);
    if (e) { toast.error('Erro ao marcar'); return; }
    toast.success(preenchidaPor ? 'Vaga registrada como preenchida' : 'Marcada como não reposta');
    reload(); reloadReposicoes();
  };

  const reverterNaoRepor = async (ids: string[]) => {
    const { error: e } = await supabase.from('pending_replacements')
      .update({ status: 'pending', resolved_at: null }).in('id', ids);
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
                <Button size="sm" variant="ghost" className="shrink-0 text-muted-foreground" onClick={() => setNaoReporRep(rep)}>
                  Não repor
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Não repostas / Contratações avulsas (reversível) */}
      {canEdit && reposicoes.filter((r) => r.status === 'removed').length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Não repostas / Contratações avulsas ({reposicoes.filter((r) => r.status === 'removed').length})
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {reposicoes.filter((r) => r.status === 'removed').map((rep) => (
              <div key={rep.id} className="flex items-center gap-2 rounded-md border bg-background p-2.5 text-sm opacity-90">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate line-through decoration-muted-foreground/40">{rep.pessoaNome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rep.cargoLabel ?? 'Cargo não informado'}{rep.nivel ? ` · ${rep.nivel}` : ''}
                  </p>
                  {rep.preenchidoPor && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                      Reposto por {rep.preenchidoPor}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => reverterNaoRepor(rep.allIds)}>
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
              <Card
                key={r.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer border-l-4 hover:shadow-md hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={getStatusCardStyle(r.status)}
                onClick={() => openEdit(r)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openEdit(r);
                  }
                }}
              >
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
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Exportar texto para redes"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExporting(r);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar vaga"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(r);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.anos_experiencia != null && <span>{r.anos_experiencia} ano(s) de exp.</span>}
                    <span>Aberta em {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    {r.modalidade_trabalho && (
                      <Badge variant="outline" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        {MODALIDADE_LABELS[r.modalidade_trabalho]}
                      </Badge>
                    )}
                    {r.presenca_cliente_requerida && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        Cliente: {r.dias_presenca_cliente || 'dias a combinar'}
                      </Badge>
                    )}
                    {r.viagens_requeridas && (
                      <Badge variant="outline" className="gap-1">
                        <Plane className="h-3 w-3" />
                        Viagens
                      </Badge>
                    )}
                    {r.beneficios && (
                      <Badge variant="secondary" className="gap-1 max-w-full">
                        <Gift className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.beneficios}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-end">
                    {canEdit && proximos.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" onClick={(event) => event.stopPropagation()}>Mover status</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {proximos.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={(event) => {
                                event.stopPropagation();
                                changeStatus(r, s);
                              }}
                            >
                              {STATUS_META[s].label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
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

      <NaoReporDialog
        open={naoReporRep !== null}
        onOpenChange={(v) => { if (!v) setNaoReporRep(null); }}
        rep={naoReporRep}
        onConfirm={confirmarNaoRepor}
      />

      <ExportJobRequestDialog
        open={exporting !== null}
        onOpenChange={(v) => { if (!v) setExporting(null); }}
        request={exporting}
      />
    </div>
  );
}
