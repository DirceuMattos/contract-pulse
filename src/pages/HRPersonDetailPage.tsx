import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, Clock, DollarSign, Briefcase, GitBranch, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/PageHeader';
import { HRPersonForm } from '@/components/hr/HRPersonForm';
import { HRTimelineEventForm } from '@/components/hr/HRTimelineEventForm';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useHR } from '@/contexts/HRContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { HRPerson, HRTimelineEvent, Contract } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { differenceInMonths } from 'date-fns';
import { toast } from 'sonner';

function calcularTempoDeCasa(dataAdmissao: string, dataDesligamento?: string): string {
  const endDate = dataDesligamento ? new Date(dataDesligamento + 'T12:00:00') : new Date();
  const meses = differenceInMonths(endDate, new Date(dataAdmissao + 'T12:00:00'));
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  let texto = '';
  if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
  if (mesesRest > 0) texto += `${texto ? ' e ' : ''}${mesesRest} mês${mesesRest !== 1 ? 'es' : ''}`;
  return texto || 'Menos de 1 mês';
}

function calcularTempoDeCasaMeses(dataAdmissao: string, dataDesligamento?: string): number {
  const endDate = dataDesligamento ? new Date(dataDesligamento + 'T12:00:00') : new Date();
  return differenceInMonths(endDate, new Date(dataAdmissao + 'T12:00:00'));
}

const ocorrenciaLabels: Record<string, string> = {
  reajuste: 'Reajuste',
  bonificacao: 'Bonificação',
  beneficio: 'Benefício',
  'mudanca-cargo': 'Mudança de Cargo',
  desligamento: 'Desligamento',
  observacao: 'Observação',
  outro: 'Outro',
};

const tipoDesligamentoLabels: Record<string, string> = {
  'dispensado': 'Dispensado',
  'solicitou-dispensa': 'Solicitou Dispensa',
  'transferido-grupo': 'Transferido (Grupo)',
  'outro': 'Outro',
};

export default function HRPersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPerson, updatePerson, getTimelineByPerson, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent } = useHR();
  const { teams, jobTitles, resources, contracts, updateResource } = useData();
  const { canEdit, canViewHRCosts, user } = useAuth();

  const person = getPerson(id!);
  const timeline = getTimelineByPerson(id!);

  const [editPersonOpen, setEditPersonOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HRTimelineEvent | undefined>();
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // Desligamento state
  const [desligamentoOpen, setDesligamentoOpen] = useState(false);
  const [desligamentoData, setDesligamentoData] = useState('');
  const [desligamentoTipo, setDesligamentoTipo] = useState('');
  const [desligamentoMotivo, setDesligamentoMotivo] = useState('');
  const [desligamentoObs, setDesligamentoObs] = useState('');
  const [desligamentoLoading, setDesligamentoLoading] = useState(false);
  // Replacement mapping: resourceId -> hrPersonId of replacement (empty = keep vacant)
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // Reativar state
  const [reativarOpen, setReativarOpen] = useState(false);

  if (!person) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pessoa não encontrada" breadcrumbs={[{ label: 'Recursos Humanos', href: '/rh' }, { label: 'Não encontrado' }]} />
        <Button onClick={() => navigate('/rh')}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      </div>
    );
  }

  const cargoLabel = jobTitles.find(jt => jt.id === person.cargoId)?.label;
  const teamName = teams.find(t => t.id === person.teamId)?.name;
  const isFrozen = person.situacao === 'inativo' && !!person.dataDesligamento;
  const tempoCasa = calcularTempoDeCasa(person.dataAdmissao, isFrozen ? person.dataDesligamento : undefined);
  const tempoCasaMeses = calcularTempoDeCasaMeses(person.dataAdmissao, isFrozen ? person.dataDesligamento : undefined);
  
  const alocacoes = resources.filter(r => r.hrPersonId === person.id);
  const activeHrPeople = useHR().hrPeople.filter(p => p.situacao === 'ativo' && p.id !== person.id).sort((a, b) => a.nome.localeCompare(b.nome));

  const handleSavePerson = async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Auto-detect changes and log to timeline
    const changes: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    const vinculoLabels: Record<string, string> = { clt: 'CLT', pj: 'PJ', cooperado: 'Cooperado', socio: 'Sócio', estagio: 'Estagiário' };
    const situacaoLabels: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo' };

    if (person.tipoVinculo !== data.tipoVinculo) {
      changes.push(`Tipo de vínculo alterado de ${vinculoLabels[person.tipoVinculo] || person.tipoVinculo} para ${vinculoLabels[data.tipoVinculo] || data.tipoVinculo}`);
    }
    if (person.situacao !== data.situacao) {
      changes.push(`Situação alterada de ${situacaoLabels[person.situacao] || person.situacao} para ${situacaoLabels[data.situacao] || data.situacao}`);
    }

    const oldCargoId = person.cargoId || '';
    const newCargoId = data.cargoId || '';
    if (oldCargoId !== newCargoId) {
      const oldCargoLabel = jobTitles.find(jt => jt.id === oldCargoId)?.label || 'Sem cargo';
      const newCargoLabel = jobTitles.find(jt => jt.id === newCargoId)?.label || 'Sem cargo';
      changes.push(`Cargo alterado de ${oldCargoLabel} para ${newCargoLabel}`);
      // Auto-fill cargoAntigo with previous cargo label
      if (oldCargoId && oldCargoId !== 'none') {
        data = { ...data, cargoAntigo: oldCargoLabel };
      }
    }

    const oldTeamId = person.teamId || '';
    const newTeamId = data.teamId || '';
    if (oldTeamId !== newTeamId) {
      const oldTeamName = teams.find(t => t.id === oldTeamId)?.name || 'Sem departamento';
      const newTeamName = teams.find(t => t.id === newTeamId)?.name || 'Sem departamento';
      changes.push(`Departamento alterado de ${oldTeamName} para ${newTeamName}`);
    }

    if ((person.localAtuacao || '') !== (data.localAtuacao || '')) {
      changes.push(`Local de atuação alterado de "${person.localAtuacao || '—'}" para "${data.localAtuacao || '—'}"`);
    }
    if ((person.nivel || '') !== (data.nivel || '')) {
      changes.push(`Nível alterado de "${person.nivel || '—'}" para "${data.nivel || '—'}"`);
    }
    if ((person.trilha || '') !== (data.trilha || '')) {
      changes.push(`Trilha alterada de "${person.trilha || '—'}" para "${data.trilha || '—'}"`);
    }
    if (person.remuneracaoMensal !== data.remuneracaoMensal) {
      changes.push(`Remuneração mensal alterada de ${formatCurrency(person.remuneracaoMensal)} para ${formatCurrency(data.remuneracaoMensal)}`);
    }
    if (person.beneficios !== data.beneficios) {
      changes.push(`Benefícios alterado de ${formatCurrency(person.beneficios)} para ${formatCurrency(data.beneficios)}`);
    }

    // Save person first
    await updatePerson(person.id, data);

    // Create one timeline event per change
    for (const change of changes) {
      await addTimelineEvent({
        personId: person.id,
        eventDate: today,
        ocorrencia: 'observacao',
        descricao: change,
        atualizarRemuneracao: false,
      });
    }

    toast.success('Dados atualizados!');
    setEditPersonOpen(false);
  };

  const handleDesligamento = async () => {
    if (!desligamentoData || !desligamentoTipo || !desligamentoMotivo) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setDesligamentoLoading(true);
    try {
      // Apply replacements before termination
      for (const alloc of alocacoes) {
        const replacementId = replacements[alloc.id];
        if (replacementId) {
          const replacementPerson = activeHrPeople.find(p => p.id === replacementId);
          if (replacementPerson) {
            await updateResource(alloc.id, {
              hrPersonId: replacementPerson.id,
              nome: replacementPerson.nome,
              tipo: replacementPerson.tipoVinculo === 'clt' ? 'clt' : 'pj',
            });
          }
        }
        // If no replacement chosen, resource stays linked to this person -> becomes "Vago"
      }

      await updatePerson(person.id, {
        situacao: 'inativo',
        dataDesligamento: desligamentoData,
        tipoDesligamento: desligamentoTipo as any,
        motivoDesligamento: desligamentoMotivo,
        observacoesDesligamento: desligamentoObs || undefined,
      });
      await addTimelineEvent({
        personId: person.id,
        eventDate: desligamentoData,
        ocorrencia: 'desligamento',
        descricao: `${tipoDesligamentoLabels[desligamentoTipo] || desligamentoTipo}: ${desligamentoMotivo}`,
        atualizarRemuneracao: false,
      });
      toast.success('Desligamento registrado com sucesso.');
      setDesligamentoOpen(false);
      setReplacements({});
    } catch {
      // error already toasted
    } finally {
      setDesligamentoLoading(false);
    }
  };

  const handleReativar = async () => {
    await updatePerson(person.id, {
      situacao: 'ativo',
      dataDesligamento: undefined,
      tipoDesligamento: undefined,
      motivoDesligamento: undefined,
      observacoesDesligamento: undefined,
    });
    await addTimelineEvent({
      personId: person.id,
      eventDate: new Date().toISOString().split('T')[0],
      ocorrencia: 'outro',
      descricao: 'Reativação do profissional.',
      atualizarRemuneracao: false,
    });
    toast.success('Profissional reativado.');
    setReativarOpen(false);
  };

  const handleSaveEvent = async (data: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingEvent) {
      await updateTimelineEvent(editingEvent.id, data);
      toast.success('Evento atualizado!');
    } else {
      await addTimelineEvent(data);
      toast.success('Evento adicionado!');
    }
    setTimelineDialogOpen(false);
    setEditingEvent(undefined);
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    await deleteTimelineEvent(deleteEventId);
    toast.success('Evento removido.');
    setDeleteEventId(null);
  };

  const isCLevel = user?.role === 'c-level';

  return (
    <div className="space-y-6">
      <PageHeader
        title={person.nome}
        description={[cargoLabel, teamName].filter(Boolean).join(' · ') || 'Sem cargo definido'}
        breadcrumbs={[{ label: 'Recursos Humanos', href: '/rh' }, { label: person.nome }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/rh')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setEditPersonOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                {person.situacao === 'ativo' && (
                  <Button variant="destructive" onClick={() => {
                    setDesligamentoData('');
                    setDesligamentoTipo('');
                    setDesligamentoMotivo('');
                    setDesligamentoObs('');
                    setReplacements({});
                    setDesligamentoOpen(true);
                  }}>
                    <UserX className="h-4 w-4 mr-2" />
                    Desligamento
                  </Button>
                )}
                {person.situacao === 'inativo' && isCLevel && (
                  <Button variant="outline" onClick={() => setReativarOpen(true)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Reativar
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo"><Briefcase className="h-4 w-4 mr-2" />Resumo</TabsTrigger>
          {canViewHRCosts && <TabsTrigger value="financeiro"><DollarSign className="h-4 w-4 mr-2" />Financeiro</TabsTrigger>}
          <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-2" />Linha do Tempo</TabsTrigger>
          <TabsTrigger value="alocacoes"><GitBranch className="h-4 w-4 mr-2" />Alocações</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Row label="Nome" value={person.nome} />
                <Row label="Vínculo" value={<Badge variant={person.tipoVinculo === 'clt' ? 'default' : 'secondary'}>{person.tipoVinculo.toUpperCase()}</Badge>} />
                <Row label="Situação" value={<Badge className={person.situacao === 'ativo' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-red-500 text-white hover:bg-red-600'}>{person.situacao === 'ativo' ? 'Ativo' : 'Inativo'}</Badge>} />
                <Row label="Cargo" value={cargoLabel || '—'} />
                {person.cargoAntigo && <Row label="Cargo Anterior" value={person.cargoAntigo} />}
                <Row label="Departamento" value={teamName || '—'} />
                <Row label="Local de Atuação" value={person.localAtuacao || '—'} />
                {person.nivel && <Row label="Nível" value={person.nivel} />}
                {person.trilha && <Row label="Trilha" value={person.trilha} />}
                {person.projeto && <Row label="Projeto" value={person.projeto} />}
                {person.centroCusto && <Row label="Centro de Custo" value={person.centroCusto} />}
                {person.idExterno && <Row label="ID Externo" value={person.idExterno} />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Contato & Vínculos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {person.email && <Row label="E-mail" value={person.email} />}
                {person.celular && <Row label="Celular" value={person.celular} />}
                <Row label="Data de Admissão" value={new Date(person.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')} />
                <Row label={isFrozen ? "Tempo de Casa (final)" : "Tempo de Casa"} value={
                  <div className="flex items-center gap-2">
                    <span>{tempoCasa}</span>
                    <Badge variant="outline" className="text-xs">{tempoCasaMeses}m</Badge>
                    {isFrozen && <Badge variant="secondary" className="text-xs">Congelado</Badge>}
                  </div>
                } />
                {person.situacao === 'inativo' && person.dataDesligamento && (
                  <Row label="Data de Desligamento" value={new Date(person.dataDesligamento + 'T12:00:00').toLocaleDateString('pt-BR')} />
                )}
                {person.tipoDesligamento && (
                  <Row label="Tipo de Desligamento" value={tipoDesligamentoLabels[person.tipoDesligamento] || person.tipoDesligamento} />
                )}
                {person.motivoDesligamento && (
                  <Row label="Motivo" value={person.motivoDesligamento} />
                )}
                {person.observacoesDesligamento && (
                  <Row label="Obs. Desligamento" value={person.observacoesDesligamento} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Atualização mensal */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader><CardTitle className="text-base text-amber-700 dark:text-amber-400">📋 Destaque para Comitê Gestor em</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Comitê Gestor" value={person.comiteGestor ? new Date(person.comiteGestor + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'} />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{person.observacoes || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        {canViewHRCosts && (
          <TabsContent value="financeiro">
          <Card>
              <CardHeader><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Remuneração Mensal</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(person.remuneracaoMensal)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Benefícios</p>
                    <p className="text-2xl font-bold">{formatCurrency(person.beneficios)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Remuneração Total (Remuneração Mensal + Benefícios)</p>
                    <p className="text-2xl font-bold">{formatCurrency(person.remuneracaoMensal + person.beneficios)}</p>
                  </div>
                </div>

                {/* Benefits list */}
                {person.beneficiosLista && person.beneficiosLista.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Benefícios Detalhados</p>
                    <div className="rounded-lg border divide-y">
                      {person.beneficiosLista.map((ben, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span>{ben.nome || 'Sem nome'}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{formatCurrency(ben.valor)}</span>
                            {ben.somaRemuneracao && (
                              <Badge variant="outline" className="text-xs">Soma na Rem. Total</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Linha do Tempo */}
        <TabsContent value="timeline" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => { setEditingEvent(undefined); setTimelineDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </div>
          )}
          {timeline.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum evento registrado na linha do tempo.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ocorrência</TableHead>
                      <TableHead>Descrição</TableHead>
                      {canViewHRCosts && <TableHead>Valor</TableHead>}
                      {canViewHRCosts && <TableHead>Rem. Após</TableHead>}
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeline.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm">{new Date(ev.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell><Badge variant="outline">{ocorrenciaLabels[ev.ocorrencia] || ev.ocorrencia}</Badge></TableCell>
                        <TableCell className="text-xs max-w-xs whitespace-normal break-words leading-snug">{ev.descricao}</TableCell>
                        {canViewHRCosts && <TableCell className="text-sm">{ev.valor !== undefined ? formatCurrency(ev.valor) : '—'}</TableCell>}
                        {canViewHRCosts && <TableCell className="text-sm">{ev.remuneracaoApos !== undefined ? formatCurrency(ev.remuneracaoApos) : '—'}</TableCell>}
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingEvent(ev); setTimelineDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteEventId(ev.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alocações */}
        <TabsContent value="alocacoes">
          {alocacoes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma alocação ativa encontrada em contratos.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">{alocacoes.length} alocação{alocacoes.length !== 1 ? 'ões' : ''} em contratos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cargo no contrato</TableHead>
                      <TableHead>Dedicação (%)</TableHead>
                      <TableHead>Local de Atuação</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alocacoes.map(r => {
                      const contract = contracts.find(c => c.id === r.contractId);
                      return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{contract?.nome || contract?.codigo || r.contractId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cargo || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.percentualDedicacao}%</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{person.localAtuacao || '—'}</TableCell>
                        <TableCell className="text-sm">{new Date(r.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-sm">{r.dataFim ? new Date(r.dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Em aberto'}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Person Dialog */}
      <Dialog open={editPersonOpen} onOpenChange={setEditPersonOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Pessoa</DialogTitle></DialogHeader>
          <HRPersonForm person={person} canViewFinanceiro={canViewHRCosts} onSubmit={handleSavePerson} onCancel={() => setEditPersonOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Timeline Event Dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={open => { setTimelineDialogOpen(open); if (!open) setEditingEvent(undefined); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <HRTimelineEventForm
            event={editingEvent}
            personId={person.id}
            canViewFinanceiro={canViewHRCosts}
            onSubmit={handleSaveEvent}
            onCancel={() => { setTimelineDialogOpen(false); setEditingEvent(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* Desligamento Dialog */}
      <Dialog open={desligamentoOpen} onOpenChange={setDesligamentoOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Desligamento — {person.nome}
            </DialogTitle>
            <DialogDescription>
              Registre o desligamento do profissional. O tempo de casa será congelado na data informada.
            </DialogDescription>
          </DialogHeader>

          {/* Allocation warning */}
          {alocacoes.length > 0 && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: {alocacoes.length} alocação{alocacoes.length !== 1 ? 'ões' : ''} ativa{alocacoes.length !== 1 ? 's' : ''}</AlertTitle>
              <AlertDescription>
                Este profissional está alocado nos contratos abaixo. Escolha um substituto ou mantenha a posição como "Vago".
              </AlertDescription>
            </Alert>
          )}

          {alocacoes.length > 0 && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              {alocacoes.map(alloc => {
                const contract = contracts.find(c => c.id === alloc.contractId);
                return (
                  <div key={alloc.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{contract?.nome || contract?.codigo || alloc.contractId}</span>
                      <Badge variant="outline" className="text-xs">{alloc.percentualDedicacao}%</Badge>
                    </div>
                    <Select
                      value={replacements[alloc.id] || '__vacant__'}
                      onValueChange={(v) => setReplacements(prev => ({
                        ...prev,
                        [alloc.id]: v === '__vacant__' ? '' : v,
                      }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Substituição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__vacant__">Nenhum (manter vago)</SelectItem>
                        {activeHrPeople.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Data de Desligamento *</Label>
              <Input type="date" value={desligamentoData} onChange={e => setDesligamentoData(e.target.value)} />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={desligamentoTipo} onValueChange={setDesligamentoTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitou-dispensa">Solicitou Dispensa</SelectItem>
                  <SelectItem value="dispensado">Desligado / Dispensado</SelectItem>
                  <SelectItem value="transferido-grupo">Transferido</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea rows={3} placeholder="Descreva o motivo do desligamento..." value={desligamentoMotivo} onChange={e => setDesligamentoMotivo(e.target.value)} />
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea rows={2} placeholder="Observações adicionais..." value={desligamentoObs} onChange={e => setDesligamentoObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesligamentoOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDesligamento} disabled={desligamentoLoading}>
              {desligamentoLoading ? 'Processando...' : 'Confirmar Desligamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reativar Dialog */}
      <ConfirmDeleteDialog
        open={reativarOpen}
        onOpenChange={setReativarOpen}
        onConfirm={handleReativar}
        title={`Reativar ${person.nome}?`}
        description="O profissional será marcado como ativo novamente e os dados de desligamento serão limpos."
        confirmLabel="Reativar"
      />

      {/* Delete Event */}
      <ConfirmDeleteDialog
        open={!!deleteEventId}
        onOpenChange={open => !open && setDeleteEventId(null)}
        onConfirm={handleDeleteEvent}
        title="Excluir evento?"
        description="O evento será removido permanentemente."
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
