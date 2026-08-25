// v7 - Vagas: busca unificada (vagas + reposicoes) e novos metadados no card
import { useMemo, useState } from 'react';
import {
  AlertTriangle, Briefcase, Check, Copy, FileSignature, Gift, Laptop, MapPin, Pencil, Plane,
  Plus, Search, Target, Trash2, UserMinus, Wallet, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useJobRequests, type JobRequest, type JobRequestFillSource, type JobRequestStatus,
  STATUS_META, STATUS_FLOW, PRAZO_META, MOTIVO_META, REGIME_META,
} from '@/hooks/useJobRequests';
import { usePendingReplacementsForVaga, type ReplacementForVaga } from '@/hooks/usePendingReplacementsForVaga';
import { formatCurrency } from '@/lib/calculations';
import { JobRequestDialog } from '@/components/jobrequests/JobRequestDialog';
import { NaoReporDialog } from '@/components/jobrequests/NaoReporDialog';
import { notifyVagaAberta, notifyVagaStatus } from '@/lib/notifyVagas';
import { ExportJobRequestDialog } from '@/components/jobrequests/ExportJobRequestDialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';

const STATUS_ORDER: (JobRequestStatus | 'todos')[] = [
  'todos', 'solicitado', 'em_avaliacao', 'aprovado_em_contratacao', 'preenchida', 'suspenso',
];

const MOVABLE_STATUS_ORDER = STATUS_ORDER.filter((s): s is JobRequestStatus => s !== 'todos');

const FILL_SOURCE_LABELS: Record<JobRequestFillSource, string> = {
  hunting: 'Empresa de Hunting',
  bnp: 'BNP',
  indicacao: 'BNP Indicação',
};

const CARD_STATUS_ORDER: Record<JobRequestStatus, number> = {
  solicitado: 1,
  em_avaliacao: 2,
  aprovado_em_contratacao: 3,
  suspenso: 4,
  preenchida: 5,
};

const MODALIDADE_LABELS: Record<NonNullable<JobRequest['modalidade_trabalho']>, string> = {
  remoto: 'Home office',
  presencial: 'Presencial',
  hibrido: 'Híbrida',
};

type SkillSnapshot = {
  id?: unknown;
  nome?: unknown;
  tipo?: unknown;
};

// Busca sem acentos e sem diferenciar maiúsculas/minúsculas ("Joao" acha "João").
function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

// Todos os termos digitados precisam aparecer em algum dos campos considerados.
function matchesTerms(terms: string[], fields: (string | null | undefined)[]): boolean {
  if (terms.length === 0) return true;
  const haystack = normalizeSearch(fields.filter(Boolean).join(' '));
  return terms.every((term) => haystack.includes(term));
}

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
    borderColor: `${color}80`,
  };
}

function getRequestSkills(request: JobRequest, tipo: 'hard' | 'soft') {
  const skills = Array.isArray(request.skills_avulsas)
    ? request.skills_avulsas as SkillSnapshot[]
    : [];

  return skills
    .filter((skill) => skill.tipo === tipo && typeof skill.nome === 'string')
    .map((skill) => String(skill.nome))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

export default function JobRequestsPage() {
  const { canEdit, userRole, user } = useAuth();
  const { requests, loading, error, reload } = useJobRequests();
  const { items: reposicoes, error: reposicoesError, reload: reloadReposicoes } = usePendingReplacementsForVaga();
  const [filter, setFilter] = useState<JobRequestStatus | 'todos'>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRequest | null>(null);
  const [exporting, setExporting] = useState<JobRequest | null>(null);
  const [notReplacing, setNotReplacing] = useState<JobRequest | null>(null);
  const [deleting, setDeleting] = useState<JobRequest | null>(null);
  const [fillingRequest, setFillingRequest] = useState<JobRequest | null>(null);
  const [fillSource, setFillSource] = useState<JobRequestFillSource>('bnp');
  const [search, setSearch] = useState('');
  const canDeleteJobRequests = userRole === 'superadmin' || userRole === 'rh' || userRole === 'administrativo';
  const canViewValorPrevisto = userRole === 'c-level' || userRole === 'administrativo'
    || userRole === 'rh' || userRole === 'superadmin';

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: JobRequest) => { setEditing(r); setDialogOpen(true); };
  const getStatusOptions = (status: JobRequestStatus) => (
    userRole === 'rh'
      ? MOVABLE_STATUS_ORDER.filter((s) => s !== status)
      : STATUS_FLOW[status]
  );

  // Cria vaga pré-preenchida a partir de uma reposição pendente (1 clique).
  const abrirVagaDeReposicao = async (rep: typeof reposicoes[number]) => {
    const titulo = rep.cargoLabel
      ? `${rep.cargoLabel}${rep.nivel ? ` (${rep.nivel})` : ''}`
      : `Reposição — ${rep.pessoaNome}`;
    const { data: nova, error: e } = await supabase.from('job_requests').insert({
      titulo,
      descricao: `Reposição de ${rep.pessoaNome}.`,
      job_title_id: rep.cargoId,
      nivel: rep.nivel,
      quantidade: 1,
      status: 'solicitado',
      pending_replacement_id: rep.id,
      contract_id: rep.contract_id,
      solicitante_id: user?.id ?? null,
      solicitante_nome: user?.name ?? null,
    }).select('id').single();
    if (e) { toast.error('Erro ao abrir vaga'); return; }
    notifyVagaAberta(titulo, nova?.id ?? null, user?.name ?? null, user?.id);
    // marca as demais reposições da mesma pessoa como resolvidas (replaced)
    const outras = rep.allIds.filter((id) => id !== rep.id);
    if (outras.length > 0) {
      await supabase.from('pending_replacements')
        .update({ status: 'replaced', resolved_at: new Date().toISOString() }).in('id', outras);
    }
    toast.success('Vaga aberta a partir da reposição');
    reload(); reloadReposicoes();
  };

  const [naoReporRep, setNaoReporRep] = useState<ReplacementForVaga | null>(null);

  // Confirma "não repor". Se foi preenchida por alguém, cria uma job_request
  // já como 'preenchida' (registro histórico: ex-colab -> vaga -> quem assumiu).
  const confirmarNaoRepor = async (
    rep: ReplacementForVaga,
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
        motivo_abertura: 'reposicao',
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
    reload();
    reloadReposicoes();
  };

  const changeStatus = async (r: JobRequest, novo: JobRequestStatus) => {
    if (novo === 'preenchida') {
      setFillingRequest(r);
      setFillSource(r.origem_preenchimento ?? 'bnp');
      return;
    }

    const { error: e } = await supabase.from('job_requests').update({ status: novo }).eq('id', r.id);
    if (e) { toast.error('Erro ao mudar status'); return; }
    notifyVagaStatus(r.titulo, r.id, novo, r.solicitante_id);
    toast.success(`Vaga movida para "${STATUS_META[novo].label}"`);
    reload();
  };

  const confirmFilledStatus = async () => {
    if (!fillingRequest) return;

    const { error: e } = await supabase
      .from('job_requests')
      .update({
        status: 'preenchida',
        origem_preenchimento: fillSource,
        preenchida_em: new Date().toISOString(),
      })
      .eq('id', fillingRequest.id);

    if (e) {
      toast.error('Erro ao mudar status');
      return;
    }

    notifyVagaStatus(fillingRequest.titulo, fillingRequest.id, 'preenchida', fillingRequest.solicitante_id);
    toast.success(`Vaga preenchida por ${FILL_SOURCE_LABELS[fillSource]}`);
    setFillingRequest(null);
    reload();
  };

  const devolverParaNaoRepostas = async (r: JobRequest) => {
    if (!r.pending_replacement_id) return;

    const { error: repError } = await supabase
      .from('pending_replacements')
      .update({ status: 'removed', resolved_at: new Date().toISOString() })
      .eq('id', r.pending_replacement_id);
    if (repError) { toast.error('Erro ao marcar como não reposta'); return; }

    toast.success('Vaga movida para Não repostas');
    setNotReplacing(null);
    reload();
    reloadReposicoes();
  };

  const deleteJobRequest = async () => {
    if (!deleting || !canDeleteJobRequests) return;

    const { error: deleteError } = await supabase
      .from('job_requests')
      .delete()
      .eq('id', deleting.id);

    if (deleteError) {
      toast.error('Erro ao excluir vaga');
      return;
    }

    toast.success('Vaga excluída');
    setDeleting(null);
    reload();
    reloadReposicoes();
  };

  const removedReplacementIds = new Set(
    reposicoes
      .filter((r) => r.status === 'removed')
      .flatMap((r) => r.allIds),
  );
  const activeRequests = requests.filter((r) => !r.pending_replacement_id || !removedReplacementIds.has(r.pending_replacement_id));

  // Busca única: atende "já abrimos vaga para esse cargo?" e "essa pessoa já
  // tem reposição?" — filtra vagas, reposições pendentes e não repostas juntas.
  const searchTerms = useMemo(() => {
    const normalized = normalizeSearch(search);
    return normalized ? normalized.split(' ') : [];
  }, [search]);
  const isSearching = searchTerms.length > 0;

  const searchedRequests = activeRequests.filter((r) => matchesTerms(searchTerms, [
    r.titulo, r.jobTitleLabel, r.nivel, r.area_atuacao, r.descricao, r.solicitanteNome,
  ]));

  const matchesReposicao = (rep: ReplacementForVaga, linked?: JobRequest) => matchesTerms(searchTerms, [
    rep.pessoaNome, rep.cargoLabel, rep.nivel, rep.preenchidoPor,
    linked?.titulo, linked?.jobTitleLabel, linked?.descricao,
  ]);

  const findLinkedRequest = (rep: ReplacementForVaga) => requests.find(
    (request) => request.pending_replacement_id && rep.allIds.includes(request.pending_replacement_id),
  );

  const reposicoesPendentes = reposicoes
    .filter((r) => r.status === 'pending' && !r.jaTemVaga)
    .filter((r) => matchesReposicao(r));
  const reposicoesNaoRepostas = reposicoes
    .filter((r) => r.status === 'removed')
    .filter((r) => matchesReposicao(r, findLinkedRequest(r)));

  // Vaga preenchida sai da visão padrão: o painel é de acompanhamento do que
  // está em aberto. Continua acessível escolhendo "Preenchida" no filtro.
  const filtered = (filter === 'todos'
      ? searchedRequests.filter((r) => r.status !== 'preenchida')
      : searchedRequests.filter((r) => r.status === filter))
    .sort((a, b) => {
      const byStatus = CARD_STATUS_ORDER[a.status] - CARD_STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  // O contador de "todos" acompanha a visão padrão, senão o número na aba não
  // corresponde à quantidade de cards na tela.
  const countBy = (s: JobRequestStatus | 'todos') => s === 'todos'
    ? searchedRequests.filter((r) => r.status !== 'preenchida').length
    : searchedRequests.filter((r) => r.status === s).length;

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

      {/* Busca unificada + filtro por status */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => {
            const active = filter === s;
            const label = s === 'todos' ? 'Em aberto' : STATUS_META[s].label;
            return (
              <button key={s} type="button" onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {label} <span className="opacity-70">({countBy(s)})</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:w-[26rem]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cargo, função ou nome da pessoa..."
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Limpar busca"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-sm text-destructive">Erro ao carregar: {error}</CardContent></Card>}

      {/* Falha ao carregar reposições: mostrar em vez de exibir lista vazia */}
      {reposicoesError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {reposicoesError}
        </div>
      )}

      {/* Reposições pendentes (desligamentos sem vaga aberta) */}
      {canEdit && reposicoesPendentes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <UserMinus className="h-4 w-4" />
            Reposições pendentes ({reposicoesPendentes.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {reposicoesPendentes.map((rep) => (
              <div key={rep.id} className="flex min-w-0 items-center gap-2 rounded-md border bg-background p-2.5 text-sm" style={{ flex: '1 1 28rem' }}>
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
      {canEdit && reposicoesNaoRepostas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <UserMinus className="h-4 w-4" />
            Não repostas / Contratações avulsas ({reposicoesNaoRepostas.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {reposicoesNaoRepostas.map((rep) => {
              const linkedRequest = findLinkedRequest(rep);
              return (
                <div key={rep.id} className="flex min-w-0 items-center gap-2 rounded-md border bg-background p-2.5 text-sm opacity-90" style={{ flex: '1 1 28rem' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate line-through decoration-muted-foreground/40">
                      {linkedRequest?.titulo ?? rep.pessoaNome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {linkedRequest?.jobTitleLabel ?? rep.cargoLabel ?? 'Cargo não informado'}{(linkedRequest?.nivel ?? rep.nivel) ? ` · ${linkedRequest?.nivel ?? rep.nivel}` : ''}
                    </p>
                    {linkedRequest?.descricao && (
                      <p className="text-xs text-muted-foreground truncate">
                        {linkedRequest.descricao}
                      </p>
                    )}
                    {rep.preenchidoPor && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                        Reposto por {rep.preenchidoPor}
                      </p>
                    )}
                  </div>
                  {linkedRequest && (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={() => openEdit(linkedRequest)}>
                      Ver vaga
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => reverterNaoRepor(rep.allIds)}>
                    Reverter
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={isSearching
            ? 'Nenhuma vaga encontrada para esta busca'
            : filter === 'todos' ? 'Nenhuma vaga em aberto' : 'Nenhuma vaga neste status'}
          description={isSearching
            ? 'Tente outro cargo, função ou nome, ou limpe a busca para ver todas as vagas.'
            : filter === 'todos' ? 'Abra uma requisição de vaga para iniciar um processo de contratação, ou use o filtro Preenchida para ver as vagas já fechadas.' : 'Ajuste o filtro para ver outras vagas.'}
          actionLabel={isSearching ? 'Limpar busca' : filter === 'todos' && canEdit ? 'Nova vaga' : undefined}
          onAction={isSearching ? () => setSearch('') : filter === 'todos' && canEdit ? openNew : undefined}
          actionIcon={isSearching ? X : Plus}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map((r) => {
            const proximos = getStatusOptions(r.status);
            const hardSkills = getRequestSkills(r, 'hard');
            const softSkills = getRequestSkills(r, 'soft');
            return (
              <Card
                key={r.id}
                role="button"
                tabIndex={0}
                className={`min-w-0 border-2 bg-card hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${canEdit ? 'cursor-pointer' : ''}`}
                style={{
                  ...getStatusCardStyle(r.status),
                }}
                onClick={() => { if (canEdit) openEdit(r); }}
                onKeyDown={(event) => {
                  if (!canEdit) return;
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
                          {canDeleteJobRequests && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir vaga"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleting(r);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.anos_experiencia != null && <span>{r.anos_experiencia} ano(s) de exp.</span>}
                    <span>Aberta em {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    {r.solicitanteNome && <span>Solicitada por {r.solicitanteNome}</span>}
                    {r.prazo_contratacao === 'urgente' && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {PRAZO_META.urgente}
                      </Badge>
                    )}
                    {r.motivo_abertura && MOTIVO_META[r.motivo_abertura] && (
                      <Badge variant="outline" className="gap-1 max-w-full">
                        <UserMinus className="h-3 w-3 shrink-0" />
                        <span className="truncate">{MOTIVO_META[r.motivo_abertura]}</span>
                      </Badge>
                    )}
                    {r.regime_contratacao && REGIME_META[r.regime_contratacao] && (
                      <Badge variant="outline" className="gap-1">
                        <FileSignature className="h-3 w-3" />
                        {REGIME_META[r.regime_contratacao]}
                      </Badge>
                    )}
                    {r.area_atuacao && (
                      <Badge variant="outline" className="gap-1 max-w-full">
                        <Target className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.area_atuacao}</span>
                      </Badge>
                    )}
                    {canViewValorPrevisto && r.valor_previsto != null && (
                      <Badge variant="secondary" className="gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatCurrency(r.valor_previsto)}
                      </Badge>
                    )}
                    {r.equipamento_bnp === true && (
                      <Badge variant="outline" className="gap-1">
                        <Laptop className="h-3 w-3" />
                        Equipamento BNP
                      </Badge>
                    )}
                    {r.status === 'preenchida' && r.origem_preenchimento && (
                      <Badge variant="outline">
                        Preenchida: {FILL_SOURCE_LABELS[r.origem_preenchimento]}
                      </Badge>
                    )}
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
                  {(hardSkills.length > 0 || softSkills.length > 0) && (
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {hardSkills.length > 0 && (
                        <div className="min-w-0 rounded-md border bg-blue-50/60 p-2 dark:bg-blue-950/20">
                          <p className="mb-1 font-medium text-blue-700 dark:text-blue-300">Hard skills</p>
                          <div className="flex flex-wrap gap-1">
                            {hardSkills.slice(0, 4).map((skill) => (
                              <span key={skill} className="rounded-full border border-blue-300 bg-background/70 px-2 py-0.5 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                                {skill}
                              </span>
                            ))}
                            {hardSkills.length > 4 && <span className="text-muted-foreground">+{hardSkills.length - 4}</span>}
                          </div>
                        </div>
                      )}
                      {softSkills.length > 0 && (
                        <div className="min-w-0 rounded-md border bg-emerald-50/60 p-2 dark:bg-emerald-950/20">
                          <p className="mb-1 font-medium text-emerald-700 dark:text-emerald-300">Soft skills</p>
                          <div className="flex flex-wrap gap-1">
                            {softSkills.slice(0, 4).map((skill) => (
                              <span key={skill} className="rounded-full border border-emerald-300 bg-background/70 px-2 py-0.5 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                                {skill}
                              </span>
                            ))}
                            {softSkills.length > 4 && <span className="text-muted-foreground">+{softSkills.length - 4}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    {canEdit && r.pending_replacement_id && r.status !== 'preenchida' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setNotReplacing(r);
                        }}
                      >
                        Não reposta
                      </Button>
                    )}
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

      <ConfirmDeleteDialog
        open={notReplacing !== null}
        onOpenChange={(open) => { if (!open) setNotReplacing(null); }}
        onConfirm={() => { if (notReplacing) void devolverParaNaoRepostas(notReplacing); }}
        title="Mover para não repostas?"
        description="Os dados da vaga serão preservados. Ela sairá da lista ativa e ficará disponível na área de Não repostas / Contratações avulsas."
        confirmLabel="Mover"
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        onConfirm={() => { void deleteJobRequest(); }}
        title="Excluir vaga?"
        description={`A vaga "${deleting?.titulo ?? ''}" será removida permanentemente, incluindo seu histórico de status. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
      <Dialog open={fillingRequest !== null} onOpenChange={(open) => { if (!open) setFillingRequest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como a vaga foi preenchida?</DialogTitle>
            <DialogDescription>
              Selecione a origem da contratação para registrar o fechamento da vaga.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            {(Object.keys(FILL_SOURCE_LABELS) as JobRequestFillSource[]).map((source) => {
              const active = fillSource === source;
              return (
                <button
                  key={source}
                  type="button"
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFillSource(source)}
                >
                  <span>{FILL_SOURCE_LABELS[source]}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFillingRequest(null)}>Cancelar</Button>
            <Button onClick={() => { void confirmFilledStatus(); }}>Confirmar preenchimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
