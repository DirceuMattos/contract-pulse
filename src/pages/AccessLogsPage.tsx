import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, Search, Trash2, Download, Shield, X, Monitor, Clock, Layers, Route, Filter, RefreshCw,
} from 'lucide-react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  situacaoDaSessao, formatarDuracao, paraIso, escaparCsv, ROTULO_SITUACAO,
  rotuloDoModuloGravado, agruparModulosPorRotulo,
} from '@/lib/accessLogs';
import { callRpc } from '@/lib/supabaseRpc';

const POR_PAGINA = 25;
const TETO_EXPORTACAO = 5000;
const RETENCAO_SUGERIDA_DIAS = 180;

interface SessaoLog {
  id: string;
  userId: string;
  nome: string;
  userAgent: string;
  iniciadaEm: string;
  encerradaEm: string | null;
  ultimaAtividade: string | null;
  modulos: string[];
  rotas: string[];
}

export default function AccessLogsPage() {
  const { canAccessModule } = useModuleAccess();
  const { users: usuariosDoSistema } = useSystemUsers();
  const [searchParams] = useSearchParams();

  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [usuario, setUsuario] = useState(searchParams.get('userId') || 'todos');
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');

  const [sessoes, setSessoes] = useState<SessaoLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [gruposDeModulo, setGruposDeModulo] = useState<Map<string, string[]>>(new Map());
  const [detalhe, setDetalhe] = useState<SessaoLog | null>(null);
  const [expurgoAberto, setExpurgoAberto] = useState(false);
  const [diasExpurgo, setDiasExpurgo] = useState(String(RETENCAO_SUGERIDA_DIAS));
  const [expurgando, setExpurgando] = useState(false);

  const podeVer = canAccessModule('ACCESS_LOGS');

  // Busca livre com respiro, para não consultar o banco a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => { setBuscaAplicada(busca.trim()); setPagina(0); }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  const montarConsulta = useCallback(() => {
    let q = supabase.from('access_log_sessions').select('*', { count: 'exact' });
    const deIso = paraIso(de);
    const ateIso = paraIso(ate);
    if (deIso) q = q.gte('started_at', deIso);
    if (ateIso) q = q.lte('started_at', ateIso);
    if (usuario !== 'todos') q = q.eq('user_id', usuario);
    if (modulosSelecionados.length > 0) {
      // O usuário escolhe rótulos; o banco guarda também os caminhos crus do
      // histórico. Consultamos por todos os valores que dão naquele rótulo.
      const crus = modulosSelecionados.flatMap((rotulo) => gruposDeModulo.get(rotulo) ?? [rotulo]);
      q = q.overlaps('modules_accessed', crus);
    }
    if (buscaAplicada) q = q.ilike('user_name_snapshot', `%${buscaAplicada}%`);
    return q.order('started_at', { ascending: false });
  }, [de, ate, usuario, modulosSelecionados, buscaAplicada, gruposDeModulo]);

  const mapear = (d: Record<string, unknown>): SessaoLog => ({
    id: String(d.id),
    userId: String(d.user_id),
    nome: String(d.user_name_snapshot || 'Sem nome'),
    userAgent: String(d.user_agent || ''),
    iniciadaEm: String(d.started_at),
    encerradaEm: (d.ended_at as string) ?? null,
    ultimaAtividade: (d.last_activity_at as string) ?? null,
    modulos: (d.modules_accessed as string[]) ?? [],
    rotas: (d.routes_accessed as string[]) ?? [],
  });

  const carregar = useCallback(async () => {
    if (!podeVer) return;
    setCarregando(true);
    const inicio = pagina * POR_PAGINA;
    const { data, count, error } = await montarConsulta().range(inicio, inicio + POR_PAGINA - 1);
    if (error) {
      toast.error('Não foi possível carregar os registros de acesso.');
      setCarregando(false);
      return;
    }
    setSessoes((data ?? []).map((d) => mapear(d as Record<string, unknown>)));
    setTotal(count ?? 0);
    setCarregando(false);
  }, [montarConsulta, pagina, podeVer]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Lista de módulos para o filtro: vem do banco, não da página atual.
  useEffect(() => {
    if (!podeVer) return;
    void callRpc<{ modulo: string }[]>('list_access_log_modules').then(({ data }) => {
      if (data) setGruposDeModulo(agruparModulosPorRotulo(data.map((r) => r.modulo).filter(Boolean)));
    });
  }, [podeVer]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = Boolean(de || ate || usuario !== 'todos' || modulosSelecionados.length > 0 || buscaAplicada);

  const limparFiltros = () => {
    setDe(''); setAte(''); setUsuario('todos'); setModulosSelecionados([]);
    setBusca(''); setBuscaAplicada(''); setPagina(0);
  };

  const alternarModulo = (m: string) => {
    setModulosSelecionados((atual) => atual.includes(m) ? atual.filter((x) => x !== m) : [...atual, m]);
    setPagina(0);
  };

  const exportarCsv = async () => {
    const { data, error } = await montarConsulta().range(0, TETO_EXPORTACAO - 1);
    if (error || !data) { toast.error('Falha ao exportar.'); return; }
    const linhas = data.map((d) => mapear(d as Record<string, unknown>));
    const cabecalho = ['Usuário', 'Início', 'Fim', 'Duração', 'Situação', 'Módulos acessados', 'Rotas acessadas', 'Navegador'];
    const escapar = escaparCsv;
    const corpo = linhas.map((s) => [
      s.nome,
      format(parseISO(s.iniciadaEm), 'dd/MM/yyyy HH:mm:ss'),
      s.encerradaEm ? format(parseISO(s.encerradaEm), 'dd/MM/yyyy HH:mm:ss') : '',
      formatarDuracao(s.iniciadaEm, s.encerradaEm),
      ROTULO_SITUACAO[situacaoDaSessao(s)],
      [...new Set(s.modulos.map(rotuloDoModuloGravado))].join(' | '),
      s.rotas.join(' | '),
      s.userAgent,
    ].map(escapar).join(';'));
    // BOM para o Excel abrir acentuação corretamente.
    const blob = new Blob(['﻿' + [cabecalho.map(escapar).join(';'), ...corpo].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-acesso-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (data.length === TETO_EXPORTACAO) {
      toast.warning(`Exportação limitada a ${TETO_EXPORTACAO} registros. Estreite o período para levar tudo.`);
    } else {
      toast.success(`${linhas.length} registro(s) exportado(s).`);
    }
  };

  const executarExpurgo = async () => {
    const dias = Number(diasExpurgo);
    if (!Number.isFinite(dias) || dias < 1) { toast.error('Informe um número de dias maior ou igual a 1.'); return; }
    setExpurgando(true);
    const { data, error } = await callRpc<number>('purge_access_log_sessions', { p_dias: dias });
    setExpurgando(false);
    if (error) { toast.error(`Não foi possível expurgar: ${error.message}`); return; }
    toast.success(`${data ?? 0} registro(s) removido(s) definitivamente.`);
    setExpurgoAberto(false);
    setPagina(0);
    void carregar();
  };

  if (!podeVer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas o Superadmin pode consultar os logs de acesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Acesso"
        description="Registro de sessões de uso do sistema. Contém dado pessoal de colaborador: use apenas para auditoria."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void carregar()}>
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => void exportarCsv()} disabled={total === 0}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setExpurgoAberto(true)}>
              <Trash2 className="w-4 h-4" /> Expurgar antigos
            </Button>
          </div>
        }
      />

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="de" className="text-xs">De (data e hora)</Label>
              <Input id="de" type="datetime-local" value={de}
                onChange={(e) => { setDe(e.target.value); setPagina(0); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ate" className="text-xs">Até (data e hora)</Label>
              <Input id="ate" type="datetime-local" value={ate}
                onChange={(e) => { setAte(e.target.value); setPagina(0); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Usuário</Label>
              <Select value={usuario} onValueChange={(v) => { setUsuario(v); setPagina(0); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  {usuariosDoSistema.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Módulos acessados</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <Filter className="w-4 h-4 mr-2 shrink-0" />
                    {modulosSelecionados.length === 0
                      ? 'Todos os módulos'
                      : `${modulosSelecionados.length} selecionado(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                      {gruposDeModulo.size === 0 && (
                        <p className="text-sm text-muted-foreground p-2">Nenhum módulo registrado ainda.</p>
                      )}
                      {[...gruposDeModulo.keys()].map((m) => (
                        <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                          <Checkbox checked={modulosSelecionados.includes(m)} onCheckedChange={() => alternarModulo(m)} />
                          <span className="text-sm">{m}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="busca" className="text-xs">Nome do usuário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="busca" className="pl-9" placeholder="Buscar por nome..."
                  value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{total}</span> sessão(ões) encontrada(s)
              {temFiltro && ' com os filtros atuais'}
            </p>
            {temFiltro && (
              <Button variant="ghost" size="sm" className="gap-1" onClick={limparFiltros}>
                <X className="w-3 h-3" /> Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Resultados ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="p-10 text-center text-muted-foreground">Carregando...</div>
          ) : sessoes.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={temFiltro ? 'Nenhuma sessão neste recorte' : 'Nenhuma sessão registrada'}
              description={temFiltro
                ? 'Ajuste o período ou os filtros para ver outros registros.'
                : 'As sessões passam a aparecer aqui conforme os usuários acessam o sistema.'}
              actionLabel={temFiltro ? 'Limpar filtros' : undefined}
              onAction={temFiltro ? limparFiltros : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((s) => {
                  const situacao = situacaoDaSessao(s);
                  const rotulos = [...new Set(s.modulos.map(rotuloDoModuloGravado))];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(s.iniciadaEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.encerradaEm ? format(parseISO(s.encerradaEm), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
                      </TableCell>
                      <TableCell>{formatarDuracao(s.iniciadaEm, s.encerradaEm)}</TableCell>
                      <TableCell>
                        <Badge variant={situacao === 'ativa' ? 'default' : situacao === 'encerrada' ? 'secondary' : 'outline'}>
                          {ROTULO_SITUACAO[situacao]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {rotulos.slice(0, 3).map((m) => (
                            <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                          ))}
                          {rotulos.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px]">+{rotulos.length - 3}</Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">{rotulos.slice(3).join(', ')}</TooltipContent>
                            </Tooltip>
                          )}
                          {rotulos.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setDetalhe(s)}>Detalhes</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {pagina + 1} de {totalPaginas}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* ── Detalhe ───────────────────────────────────────────────────────── */}
      <Sheet open={!!detalhe} onOpenChange={(o) => { if (!o) setDetalhe(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle>{detalhe.nome}</SheetTitle>
                <SheetDescription>
                  Sessão iniciada em {format(parseISO(detalhe.iniciadaEm), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duração</p>
                    <p className="font-medium">{formatarDuracao(detalhe.iniciadaEm, detalhe.encerradaEm)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Situação</p>
                    <p className="font-medium">{ROTULO_SITUACAO[situacaoDaSessao(detalhe)]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última atividade</p>
                    <p className="font-medium">
                      {detalhe.ultimaAtividade
                        ? format(parseISO(detalhe.ultimaAtividade), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Encerrada em</p>
                    <p className="font-medium">
                      {detalhe.encerradaEm
                        ? format(parseISO(detalhe.encerradaEm), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Layers className="w-3 h-3" /> Módulos acessados ({[...new Set(detalhe.modulos.map(rotuloDoModuloGravado))].length})</p>
                  <div className="flex flex-wrap gap-1">
                    {detalhe.modulos.length === 0
                      ? <span className="text-muted-foreground">Nenhum</span>
                      : [...new Set(detalhe.modulos.map(rotuloDoModuloGravado))].map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Route className="w-3 h-3" /> Rotas acessadas ({detalhe.rotas.length})</p>
                  <div className="space-y-1 font-mono text-xs">
                    {detalhe.rotas.length === 0
                      ? <span className="text-muted-foreground font-sans">Nenhuma</span>
                      : detalhe.rotas.map((r, i) => <p key={`${r}-${i}`} className="text-muted-foreground">{r}</p>)}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Monitor className="w-3 h-3" /> Navegador</p>
                  <p className="text-xs text-muted-foreground break-all">{detalhe.userAgent || '—'}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Expurgo ───────────────────────────────────────────────────────── */}
      <Dialog open={expurgoAberto} onOpenChange={setExpurgoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expurgar registros antigos</DialogTitle>
            <DialogDescription>
              Remove definitivamente as sessões iniciadas há mais tempo que o prazo informado.
              A ação não pode ser desfeita e não há cópia em outro lugar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dias">Manter os últimos (dias)</Label>
            <Input id="dias" type="number" min={1} value={diasExpurgo} onChange={(e) => setDiasExpurgo(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Tudo anterior a esse prazo será apagado. Sugestão de partida: {RETENCAO_SUGERIDA_DIAS} dias —
              mas o prazo de retenção precisa ser definido formalmente, não escolhido na hora.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpurgoAberto(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void executarExpurgo()} disabled={expurgando}>
              {expurgando ? 'Expurgando...' : 'Expurgar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
