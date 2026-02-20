import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersRound, Plus, Search, Download, Upload, Eye, Pencil, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { HRPersonForm } from '@/components/hr/HRPersonForm';
import { HRImportDialog } from '@/components/hr/HRImportDialog';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { HRPerson } from '@/types';
import { toast } from 'sonner';
import { differenceInMonths } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { exportHRPeople } from '@/lib/importExport';

function calcularTempoDeCasa(dataAdmissao: string): { texto: string; meses: number } {
  const meses = differenceInMonths(new Date(), new Date(dataAdmissao));
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  let texto = '';
  if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
  if (mesesRest > 0) texto += `${texto ? ' e ' : ''}${mesesRest} mês${mesesRest !== 1 ? 'es' : ''}`;
  if (!texto) texto = 'Menos de 1 mês';
  return { texto, meses };
}

export default function HRPeoplePage() {
  const navigate = useNavigate();
  const { hrPeople, addPerson, updatePerson } = useHR();
  const { teams, jobTitles } = useData();
  const { canEdit, canViewHRCosts } = useAuth();

  const [search, setSearch] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<'todos' | 'ativo' | 'inativo'>('ativo');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterVinculo, setFilterVinculo] = useState('');
  const [filterComite, setFilterComite] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<HRPerson | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const activeTeams = teams.filter(t => t.isActive);
  const activeJobTitles = jobTitles.filter(jt => jt.isActive);

  const filtered = useMemo(() => {
    return hrPeople.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || (p.observacoes || '').toLowerCase().includes(q);
      const matchSituacao = filterSituacao === 'todos' || p.situacao === filterSituacao;
      const matchTeam = !filterTeam || p.teamId === filterTeam;
      const matchCargo = !filterCargo || p.cargoId === filterCargo;
      const matchVinculo = !filterVinculo || p.tipoVinculo === filterVinculo;
      const matchComite = !filterComite || (p.comiteGestor || '') === filterComite;
      return matchSearch && matchSituacao && matchTeam && matchCargo && matchVinculo && matchComite;
    });
  }, [hrPeople, search, filterSituacao, filterTeam, filterCargo, filterVinculo, filterComite]);

  const handleAdd = async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addPerson(data);
      toast.success('Pessoa adicionada com sucesso!');
      setDialogOpen(false);
      setEditingPerson(undefined);
    } catch { /* error already toasted */ }
  };

  const handleEdit = async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingPerson) return;
    try {
      await updatePerson(editingPerson.id, data);
      toast.success('Dados atualizados!');
      setDialogOpen(false);
      setEditingPerson(undefined);
    } catch { /* error already toasted */ }
  };

  const handleToggleStatus = async (person: HRPerson) => {
    const novaSituacao = person.situacao === 'ativo' ? 'inativo' : 'ativo';
    await updatePerson(person.id, { situacao: novaSituacao });
    toast.success(`${person.nome} ${novaSituacao === 'ativo' ? 'reativado' : 'inativado'}.`);
  };

  const handleExport = () => {
    exportHRPeople(filtered, teams, jobTitles, canViewHRCosts, 'xlsx');
  };

  const getTeamName = (teamId?: string) => teams.find(t => t.id === teamId)?.name;
  const getCargoLabel = (cargoId?: string) => jobTitles.find(jt => jt.id === cargoId)?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos Humanos"
        description="Cadastro mestre de pessoas CLT e PJ."
        animated={false}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                <Button onClick={() => { setEditingPerson(undefined); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pessoa
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou observação..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterSituacao} onValueChange={(v: any) => setFilterSituacao(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTeam || 'all'} onValueChange={v => setFilterTeam(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos dept.</SelectItem>
                {activeTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterVinculo || 'all'} onValueChange={v => setFilterVinculo(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Vínculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="clt">CLT</SelectItem>
                <SelectItem value="pj">PJ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCargo || 'all'} onValueChange={v => setFilterCargo(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos cargos</SelectItem>
                {activeJobTitles.map(jt => <SelectItem key={jt.id} value={jt.id}>{jt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nenhuma pessoa encontrada"
          description="Cadastre pessoas ou ajuste os filtros."
          actionLabel={canEdit ? 'Adicionar pessoa' : undefined}
          onAction={canEdit ? () => { setEditingPerson(undefined); setDialogOpen(true); } : undefined}
          actionIcon={Plus}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              {filtered.length} pessoa{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Tempo de Casa</TableHead>
                    {canViewHRCosts && <TableHead>Remuneração</TableHead>}
                    {canViewHRCosts && <TableHead>Benefícios</TableHead>}
                    <TableHead>Situação</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const { texto: tempoCasa, meses } = calcularTempoDeCasa(p.dataAdmissao);
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/rh/pessoas/${p.id}`)}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>
                          <Badge variant={p.tipoVinculo === 'clt' ? 'default' : 'secondary'}>
                            {p.tipoVinculo.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getCargoLabel(p.cargoId) || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getTeamName(p.teamId) || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.localAtuacao || '—'}</TableCell>
                        <TableCell className="text-sm">{new Date(p.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{tempoCasa}</span>
                            <Badge variant="outline" className="text-xs">{meses}m</Badge>
                          </div>
                        </TableCell>
                        {canViewHRCosts && <TableCell className="text-sm font-medium">{formatCurrency(p.remuneracaoMensal)}</TableCell>}
                        {canViewHRCosts && <TableCell className="text-sm">{formatCurrency(p.beneficios)}</TableCell>}
                        <TableCell>
                          <Badge variant={p.situacao === 'ativo' ? 'default' : 'secondary'}>
                            {p.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/rh/pessoas/${p.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => { setEditingPerson(p); setDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(p)}>
                                  {p.situacao === 'ativo' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingPerson(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}</DialogTitle>
          </DialogHeader>
          <HRPersonForm
            person={editingPerson}
            canViewFinanceiro={canViewHRCosts}
            onSubmit={editingPerson ? handleEdit : handleAdd}
            onCancel={() => { setDialogOpen(false); setEditingPerson(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <HRImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        canViewFinanceiro={canViewHRCosts}
      />
    </div>
  );
}
