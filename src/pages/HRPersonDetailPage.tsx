import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, Clock, DollarSign, Briefcase, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { HRPersonForm } from '@/components/hr/HRPersonForm';
import { HRTimelineEventForm } from '@/components/hr/HRTimelineEventForm';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { HRPerson, HRTimelineEvent } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { differenceInMonths } from 'date-fns';
import { toast } from 'sonner';

function calcularTempoDeCasa(dataAdmissao: string): string {
  const meses = differenceInMonths(new Date(), new Date(dataAdmissao));
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  let texto = '';
  if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
  if (mesesRest > 0) texto += `${texto ? ' e ' : ''}${mesesRest} mês${mesesRest !== 1 ? 'es' : ''}`;
  return texto || 'Menos de 1 mês';
}

const ocorrenciaLabels: Record<string, string> = {
  reajuste: 'Reajuste',
  bonificacao: 'Bonificação',
  beneficio: 'Benefício',
  'mudanca-cargo': 'Mudança de Cargo',
  observacao: 'Observação',
  outro: 'Outro',
};

export default function HRPersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPerson, updatePerson, deletePerson, getTimelineByPerson, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent } = useHR();
  const { teams, jobTitles, resources } = useData();
  const { canEdit, canViewHRCosts } = useAuth();

  const person = getPerson(id!);
  const timeline = getTimelineByPerson(id!);

  const [editPersonOpen, setEditPersonOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HRTimelineEvent | undefined>();
  const [deletePersonOpen, setDeletePersonOpen] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

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
  const tempoCasa = calcularTempoDeCasa(person.dataAdmissao);
  
  // Alocações: contratos onde este profissional está alocado (por nome)
  const alocacoes = resources.filter(r => r.nome.trim().toLowerCase() === person.nome.trim().toLowerCase());

  const handleSavePerson = async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    await updatePerson(person.id, data);
    toast.success('Dados atualizados!');
    setEditPersonOpen(false);
  };

  const handleDeletePerson = async () => {
    await deletePerson(person.id);
    toast.success('Pessoa removida.');
    navigate('/rh');
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
                <Button variant="destructive" onClick={() => setDeletePersonOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
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
                <Row label="Situação" value={<Badge variant={person.situacao === 'ativo' ? 'default' : 'secondary'}>{person.situacao === 'ativo' ? 'Ativo' : 'Inativo'}</Badge>} />
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
                <Row label="Tempo de Casa" value={
                  <div className="flex items-center gap-2">
                    <span>{tempoCasa}</span>
                    <Badge variant="outline" className="text-xs">{differenceInMonths(new Date(), new Date(person.dataAdmissao))}m</Badge>
                  </div>
                } />
                {person.situacao === 'inativo' && person.dataDesligamento && (
                  <Row label="Data de Desligamento" value={new Date(person.dataDesligamento + 'T12:00:00').toLocaleDateString('pt-BR')} />
                )}
                {person.tipoDesligamento && (
                  <Row label="Tipo de Desligamento" value={person.tipoDesligamento} />
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
            <CardHeader><CardTitle className="text-base text-amber-700 dark:text-amber-400">📋 Atualização Mensal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Comitê Gestor" value={person.comiteGestor ? new Date(person.comiteGestor + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'} />
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
                    <p className="text-sm text-muted-foreground mb-1">Benefícios</p>
                    <p className="text-2xl font-bold">{formatCurrency(person.beneficios)}</p>
                  </div>
                  {person.remuneracaoII !== undefined && person.remuneracaoII > 0 && (
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Remuneração II (VA/Ajuste)</p>
                      <p className="text-2xl font-bold">{formatCurrency(person.remuneracaoII)}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Mensal (Rem. + Benef. + Rem. II)</p>
                  <p className="text-3xl font-bold">{formatCurrency(person.remuneracaoMensal + person.beneficios + (person.remuneracaoII || 0))}</p>
                </div>
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
                        <TableCell className="text-sm max-w-xs truncate">{ev.descricao}</TableCell>
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
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alocacoes.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{r.contractId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cargo || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.percentualDedicacao}%</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(r.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-sm">{r.dataFim ? new Date(r.dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Em aberto'}</TableCell>
                      </TableRow>
                    ))}
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

      {/* Delete Person */}
      <ConfirmDeleteDialog
        open={deletePersonOpen}
        onOpenChange={setDeletePersonOpen}
        onConfirm={handleDeletePerson}
        title={`Excluir ${person.nome}?`}
        description="Esta ação é irreversível. Todos os eventos da linha do tempo também serão excluídos."
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
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
