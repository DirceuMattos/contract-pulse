import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersRound, Plus, Search, Download, Upload, Eye, Pencil, UserX, UserCheck, X, ArrowUp, ArrowDown, FileCheck, Clock, MapPin, AlertTriangle } from 'lucide-react';
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
import { HRCorrectionsDialog, HRCorrectionRunsDialog } from '@/components/hr/HRCorrectionsDialog';
import { HRAddressImportDialog } from '@/components/hr/HRAddressImportDialog';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { HRPerson } from '@/types';
import { toast } from 'sonner';
import { differenceInMonths } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { exportHRPeople } from '@/lib/importExport';

function calcularTempoDeCasa(dataAdmissao: string, dataDesligamento?: string): { texto: string; meses: number } {
  const endDate = dataDesligamento ? new Date(dataDesligamento + 'T12:00:00') : new Date();
  const meses = differenceInMonths(endDate, new Date(dataAdmissao + 'T12:00:00'));
  const anos = Math.floor(meses / 12);
  const mesesRest = meses % 12;
  let texto = '';
  if (anos > 0) texto += `${anos} ano${anos !== 1 ? 's' : ''}`;
  if (mesesRest > 0) texto += `${texto ? ' e ' : ''}${mesesRest} mês${mesesRest !== 1 ? 'es' : ''}`;
  if (!texto) texto = 'Menos de 1 mês';
  return { texto, meses };
}

function formatComite(value: string): string {
  const d = new Date(value + '-01T12:00:00');
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

type SortField = 'nome' | 'tipoVinculo' | 'cargo' | 'team' | 'localAtuacao' | 'dataAdmissao' | 'tempo' | 'custoTotal' | 'situacao' | 'comiteGestor';

export default function HRPeoplePage() {
  const navigate = useNavigate();
  const { hrPeople, addPerson, updatePerson, addTimelineEvent } = useHR();
  const { teams, jobTitles } = useData();
  const { canEdit, canViewHRCosts } = useAuth();

  // Restore filters from sessionStorage
  const storedFilters = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('hr-filters');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [search, setSearch] = useState(storedFilters?.search ?? '');
  const [filterSituacao, setFilterSituacao] = useState<'todos' | 'ativo' | 'inativo'>(storedFilters?.filterSituacao ?? 'todos');
  const [filterTeam, setFilterTeam] = useState(storedFilters?.filterTeam ?? '');
  const [filterCargo, setFilterCargo] = useState(storedFilters?.filterCargo ?? '');
  const [filterVinculo, setFilterVinculo] = useState(storedFilters?.filterVinculo ?? '');
  const [filterComite, setFilterComite] = useState(storedFilters?.filterComite ?? '');
  const [filterMesAdmissao, setFilterMesAdmissao] = useState(storedFilters?.filterMesAdmissao ?? '');
  const [filterTalento, setFilterTalento] = useState(storedFilters?.filterTalento ?? false);
  const [filterGuardiao, setFilterGuardiao] = useState(storedFilters?.filterGuardiao ?? false);
  const [filterEmAvaliacao, setFilterEmAvaliacao] = useState(storedFilters?.filterEmAvaliacao ?? false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Persist filters to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('hr-filters', JSON.stringify({ search, filterSituacao, filterTeam, filterCargo, filterVinculo, filterComite, filterMesAdmissao, filterTalento, filterGuardiao, filterEmAvaliacao }));
  }, [search, filterSituacao, filterTeam, filterCargo, filterVinculo, filterComite, filterMesAdmissao, filterTalento, filterGuardiao, filterEmAvaliacao]);

  const hasActiveFilters = search !== '' || filterSituacao !== 'todos' || filterTeam !== '' || filterCargo !== '' || filterVinculo !== '' || filterComite !== '' || filterMesAdmissao !== '' || filterTalento || filterGuardiao || filterEmAvaliacao;
  const handleClearFilters = () => { setSearch(''); setFilterSituacao('todos'); setFilterTeam(''); setFilterCargo(''); setFilterVinculo(''); setFilterComite(''); setFilterMesAdmissao(''); setFilterTalento(false); setFilterGuardiao(false); setFilterEmAvaliacao(false); sessionStorage.removeItem('hr-filters'); };
  const [editingPerson, setEditingPerson] = useState<HRPerson | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [correctionsOpen, setCorrectionsOpen] = useState(false);
  const [correctionRunsOpen, setCorrectionRunsOpen] = useState(false);
  const [addressImportOpen, setAddressImportOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const activeTeams = teams.filter(t => t.isActive);
  const activeJobTitles = jobTitles.filter(jt => jt.isActive);

  const getTeamName = (teamId?: string) => teams.find(t => t.id === teamId)?.name || '';
  const getCargoLabel = (cargoId?: string) => jobTitles.find(jt => jt.id === cargoId)?.label || '';

  const comiteOptions = useMemo(() => {
    const values = new Set<string>();
    hrPeople.forEach(p => { if (p.comiteGestor) values.add(p.comiteGestor); });
    return Array.from(values).sort();
  }, [hrPeople]);

  const filtered = useMemo(() => {
    return hrPeople.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || (p.observacoes || '').toLowerCase().includes(q) || (p.matricula || '').toLowerCase().includes(q);
      const matchSituacao = filterSituacao === 'todos' || p.situacao === filterSituacao;
      const matchTeam = !filterTeam || p.teamId === filterTeam;
      const matchCargo = !filterCargo || p.cargoId === filterCargo;
      const matchVinculo = !filterVinculo || p.tipoVinculo === filterVinculo;
      const matchMesAdmissao = !filterMesAdmissao || (new Date(p.dataAdmissao + 'T12:00:00').getMonth() + 1).toString() === filterMesAdmissao;
      let matchComite = true;
      if (filterComite === '__com') matchComite = !!p.comiteGestor;
      else if (filterComite === '__sem') matchComite = !p.comiteGestor;
      else if (filterComite) matchComite = p.comiteGestor === filterComite;
      const matchTalento = !filterTalento || !!p.isTalento;
      const matchGuardiao = !filterGuardiao || !!p.isGuardiao;
      const matchEmAvaliacao = !filterEmAvaliacao || !!p.isEmAvaliacao;
      return matchSearch && matchSituacao && matchTeam && matchCargo && matchVinculo && matchComite && matchMesAdmissao && matchTalento && matchGuardiao && matchEmAvaliacao;
    });
  }, [hrPeople, search, filterSituacao, filterTeam, filterCargo, filterVinculo, filterComite, filterMesAdmissao, filterTalento, filterGuardiao, filterEmAvaliacao]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortField) {
        case 'nome': va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break;
        case 'tipoVinculo': va = a.tipoVinculo; vb = b.tipoVinculo; break;
        case 'cargo': va = getCargoLabel(a.cargoId).toLowerCase(); vb = getCargoLabel(b.cargoId).toLowerCase(); break;
        case 'team': va = getTeamName(a.teamId).toLowerCase(); vb = getTeamName(b.teamId).toLowerCase(); break;
        case 'localAtuacao': va = (a.localAtuacao || '').toLowerCase(); vb = (b.localAtuacao || '').toLowerCase(); break;
        case 'dataAdmissao': va = a.dataAdmissao; vb = b.dataAdmissao; break;
        case 'tempo': va = calcularTempoDeCasa(a.dataAdmissao, a.situacao === 'inativo' ? a.dataDesligamento : undefined).meses; vb = calcularTempoDeCasa(b.dataAdmissao, b.situacao === 'inativo' ? b.dataDesligamento : undefined).meses; break;
        case 'custoTotal': va = a.remuneracaoMensal + a.beneficios; vb = b.remuneracaoMensal + b.beneficios; break;
        case 'situacao': va = a.situacao; vb = b.situacao; break;
        case 'comiteGestor': va = a.comiteGestor || ''; vb = b.comiteGestor || ''; break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ArrowUp className="inline h-3 w-3 ml-0.5" />
      : <ArrowDown className="inline h-3 w-3 ml-0.5" />;
  };

  const handleAdd = async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await addPerson(data);
      // Register admission event in timeline
      await addTimelineEvent({
        personId: created.id,
        eventDate: data.dataAdmissao,
        ocorrencia: 'observacao',
        descricao: `Admissão registrada — ${data.tipoVinculo?.toUpperCase() || 'CLT'}`,
        atualizarRemuneracao: false,
      });
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

  const handleComiteChange = async (personId: string, value: string) => {
    await updatePerson(personId, { comiteGestor: value || undefined });
    toast.success('Comitê Gestor atualizado.');
  };

  const handleExport = () => {
    exportHRPeople(filtered, teams, jobTitles, canViewHRCosts, 'xlsx');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos Humanos"
        description="Cadastro mestre de pessoas CLT, PJ, Cooperado, Sócio e Estagiário."
        animated={false}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setCorrectionRunsOpen(true)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
                <Button variant="outline" onClick={() => setCorrectionsOpen(true)}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Correções
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                <Button variant="outline" onClick={() => setAddressImportOpen(true)}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Endereços
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, matrícula ou observação..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <SelectItem value="cooperado">Cooperado</SelectItem>
                <SelectItem value="socio">Sócio</SelectItem>
                <SelectItem value="estagio">Estagiário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCargo || 'all'} onValueChange={v => setFilterCargo(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos cargos</SelectItem>
                {activeJobTitles.map(jt => <SelectItem key={jt.id} value={jt.id}>{jt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterComite || 'all'} onValueChange={v => setFilterComite(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Comitê Gestor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="__com">Com indicação</SelectItem>
                <SelectItem value="__sem">Sem indicação</SelectItem>
                {comiteOptions.map(c => <SelectItem key={c} value={c}>{formatComite(c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMesAdmissao || 'all'} onValueChange={v => setFilterMesAdmissao(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Mês admissão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Março</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Maio</SelectItem>
                <SelectItem value="6">Junho</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={filterTalento} onChange={e => setFilterTalento(e.target.checked)} className="rounded border-primary" />
                ⭐ Talentos
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={filterGuardiao} onChange={e => setFilterGuardiao(e.target.checked)} className="rounded border-primary" />
                 🛡️ Guardiões
316:               </label>
317:               <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
318:                 <input type="checkbox" checked={filterEmAvaliacao} onChange={e => setFilterEmAvaliacao(e.target.checked)} className="rounded border-primary" />
319:                 <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 inline" /> Em Avaliação
320:               </label>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nenhuma pessoa encontrada"
          description="Cadastre pessoas ou ajuste os filtros."
          actionLabel={canEdit ? 'Adicionar pessoa' : undefined}
          onAction={canEdit ? () => { setEditingPerson(undefined); setDialogOpen(true); } : undefined}
          actionIcon={Plus}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              {sorted.length} pessoa{sorted.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[calc(100vh-340px)] border rounded-md">
                <div className="min-w-[1000px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[18px]" />
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('nome')}>Nome <SortIcon field="nome" /></TableHead>
                      <TableHead className="text-xs">Matrícula</TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('tipoVinculo')}>Vínculo <SortIcon field="tipoVinculo" /></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('cargo')}>Cargo <SortIcon field="cargo" /></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('localAtuacao')}>Local <SortIcon field="localAtuacao" /></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('dataAdmissao')}>Admissão <SortIcon field="dataAdmissao" /></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('tempo')}><TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('tempo')}>Tempo de Casa <SortIcon field="tempo" /></TableHead></TableHead>
                      {canViewHRCosts && <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('custoTotal')}>Custo Total <SortIcon field="custoTotal" /></TableHead>}
                      <TableHead className="text-xs cursor-pointer select-none" onClick={() => handleSort('situacao')}>Sit. <SortIcon field="situacao" /></TableHead>
                      <TableHead className="text-xs cursor-pointer select-none sticky right-[72px] bg-background z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]" onClick={() => handleSort('comiteGestor')}>Comitê <SortIcon field="comiteGestor" /></TableHead>
                      <TableHead className="sticky right-0 bg-background z-10 w-[72px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map(p => {
                      const isFrozen = p.situacao === 'inativo' && !!p.dataDesligamento;
                      const { texto: tempoCasa } = calcularTempoDeCasa(p.dataAdmissao, isFrozen ? p.dataDesligamento : undefined);
                      const hasFlag = p.isTalento || p.isGuardiao;
                      return (
                        <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${hasFlag ? 'border-l-[3px]' : ''} ${p.isTalento && p.isGuardiao ? 'border-l-purple-500' : p.isTalento ? 'border-l-amber-500' : p.isGuardiao ? 'border-l-sky-600' : ''}`} onClick={() => navigate(`/rh/pessoas/${p.id}`)}>
                          <TableCell className="py-2 px-1 w-[18px] text-center">
                            {p.isTalento && <span title="Talento" className="text-[11px]">⭐</span>}
                            {p.isGuardiao && <span title="Guardião" className="text-[11px]">🛡️</span>}
                          </TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate py-2">{p.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">{p.matricula || '—'}</TableCell>
                          <TableCell className="py-2">
                            <Badge className={`text-xs ${
                              p.tipoVinculo === 'clt' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                              p.tipoVinculo === 'pj' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                              p.tipoVinculo === 'estagio' ? 'bg-sky-500 text-white hover:bg-sky-600' :
                              'bg-purple-500 text-white hover:bg-purple-600'
                            }`}>
                              {p.tipoVinculo === 'estagio' ? 'ESTAGIÁRIO' : p.tipoVinculo.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2 max-w-[140px] truncate">{getCargoLabel(p.cargoId) || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2 max-w-[100px] truncate">{p.localAtuacao || '—'}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{new Date(p.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="py-2">
                            {p.situacao === 'inativo' ? (
                              <Badge className="bg-destructive text-destructive-foreground text-xs">Inativo</Badge>
                            ) : (
                              <span className="text-xs whitespace-nowrap">{tempoCasa}</span>
                            )}
                          </TableCell>
                          {canViewHRCosts && <TableCell className="text-xs font-medium py-2 whitespace-nowrap">{formatCurrency(p.remuneracaoMensal + p.beneficios)}</TableCell>}
                          <TableCell className="py-2">
                            <Badge className={`text-xs ${p.situacao === 'ativo' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                              {p.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()} className="py-2 sticky right-[72px] bg-background z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                            {canEdit ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="month"
                                  value={p.comiteGestor || ''}
                                  onChange={e => handleComiteChange(p.id, e.target.value)}
                                  className="text-xs border rounded px-1.5 py-1 bg-background text-foreground w-[120px]"
                                />
                                {p.comiteGestor && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleComiteChange(p.id, '')}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs whitespace-nowrap">{p.comiteGestor ? formatComite(p.comiteGestor) : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()} className="py-2 sticky right-0 bg-background z-10 w-[72px]">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/rh/pessoas/${p.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPerson(p); setDialogOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
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

      {/* Corrections Dialog */}
      <HRCorrectionsDialog
        open={correctionsOpen}
        onOpenChange={setCorrectionsOpen}
        onComplete={() => window.location.reload()}
      />

      {/* Correction Runs History */}
      <HRCorrectionRunsDialog
        open={correctionRunsOpen}
        onOpenChange={setCorrectionRunsOpen}
        onRollbackComplete={() => window.location.reload()}
      />

      {/* Address Import Dialog */}
      <HRAddressImportDialog
        open={addressImportOpen}
        onOpenChange={setAddressImportOpen}
        onComplete={() => window.location.reload()}
      />
    </div>
  );
}
