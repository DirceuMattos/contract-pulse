import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, differenceInSeconds, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, Search, Trash2, Download, Shield, ChevronLeft, X, Monitor, Clock, Globe, Layers, Route,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessLogs } from '@/contexts/AccessLogContext';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { AccessLogSession } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'Em andamento';
  const secs = differenceInSeconds(parseISO(endedAt), parseISO(startedAt));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}min`;
  return `${mins}min`;
}

export default function AccessLogsPage() {
  const { user } = useAuth();
  const { accessLogs, clearAllLogs } = useAccessLogs();
  const { users: systemUsers } = useSystemUsers();
  const [clearLogsOpen, setClearLogsOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const preFilterUserId = searchParams.get('userId') || '';

  const [filterUser, setFilterUser] = useState(preFilterUserId || 'all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AccessLogSession | null>(null);

  const filteredLogs = useMemo(() => {
    let logs = [...accessLogs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    if (filterUser !== 'all') {
      logs = logs.filter(l => l.userId === filterUser);
    }
    if (filterStatus === 'active') {
      logs = logs.filter(l => !l.endedAt);
    } else if (filterStatus === 'ended') {
      logs = logs.filter(l => !!l.endedAt);
    }
    if (dateFrom) {
      logs = logs.filter(l => isAfter(parseISO(l.startedAt), startOfDay(dateFrom)));
    }
    if (dateTo) {
      logs = logs.filter(l => isBefore(parseISO(l.startedAt), endOfDay(dateTo)));
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      logs = logs.filter(l =>
        l.ipAddress.toLowerCase().includes(q) ||
        l.userAgent.toLowerCase().includes(q) ||
        l.userNameSnapshot.toLowerCase().includes(q) ||
        l.modulesAccessed.some(m => m.toLowerCase().includes(q))
      );
    }
    return logs;
  }, [accessLogs, filterUser, filterStatus, dateFrom, dateTo, searchText]);

  const handleClearLogs = () => {
    clearAllLogs();
    toast.success('Todos os logs de acesso foram removidos.');
    setClearLogsOpen(false);
  };

  const preFilterUserName = preFilterUserId
    ? systemUsers.find(u => u.id === preFilterUserId)?.name
    : null;

  if (user?.role !== 'c-level') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas usuários C-Level podem visualizar logs de acesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={preFilterUserName ? `Logs de Acesso — ${preFilterUserName}` : 'Logs de Acesso'}
        description="Histórico de sessões e módulos acessados pelos usuários"
        animated={false}
        breadcrumbs={[
          { label: 'Admin', href: '/usuarios' },
          { label: 'Usuários', href: '/usuarios' },
          { label: 'Logs' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV (Em breve)
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setClearLogsOpen(true)}>
              <Trash2 className="w-4 h-4" />
              Limpar logs
            </Button>
          </div>
        }
      />

      <ConfirmDeleteDialog
        open={clearLogsOpen}
        onOpenChange={setClearLogsOpen}
        onConfirm={handleClearLogs}
        title="Limpar todos os logs?"
        description="Esta ação removerá permanentemente todos os logs de acesso. Não pode ser desfeita."
        confirmLabel="Limpar"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <label className="text-sm font-medium text-foreground mb-1 block">Usuário</label>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {systemUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="ended">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">De</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-36 justify-start font-normal">
                {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Até</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-36 justify-start font-normal">
                {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-foreground mb-1 block">Busca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="IP, módulo, user agent..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {(dateFrom || dateTo || filterUser !== 'all' || filterStatus !== 'all' || searchText) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFilterUser(preFilterUserId || 'all');
            setFilterStatus('all');
            setDateFrom(undefined);
            setDateTo(undefined);
            setSearchText('');
          }}>
            <X className="w-4 h-4 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhum log encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros ou aguarde novas sessões.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const maxChips = 3;
                const visibleModules = log.modulesAccessed.slice(0, maxChips);
                const extraCount = log.modulesAccessed.length - maxChips;
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          {log.userNameSnapshot.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground text-sm">{log.userNameSnapshot}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{log.ipAddress}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {format(parseISO(log.startedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.endedAt ? (
                        <span className="text-foreground">{format(parseISO(log.endedAt), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                      ) : (
                        <Badge variant="default" className="text-xs">Ativa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(log.startedAt, log.endedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {visibleModules.map(m => (
                          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                        {extraCount > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">+{extraCount}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                {log.modulesAccessed.slice(maxChips).map(m => (
                                  <div key={m}>{m}</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Detalhes da Sessão
            </SheetTitle>
            <SheetDescription>Informações completas da sessão de acesso</SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {selectedLog.userNameSnapshot.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedLog.userNameSnapshot}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedLog.userId}</p>
                </div>
                {!selectedLog.endedAt && <Badge variant="default" className="ml-auto">Ativa</Badge>}
              </div>

              {/* Session details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">IP:</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Início:</span>
                  <span className="text-foreground">{format(parseISO(selectedLog.startedAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Fim:</span>
                  <span className="text-foreground">
                    {selectedLog.endedAt
                      ? format(parseISO(selectedLog.endedAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                      : 'Em andamento'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="text-foreground">{formatDuration(selectedLog.startedAt, selectedLog.endedAt)}</span>
                </div>
                {selectedLog.lastActivityAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Última atividade:</span>
                    <span className="text-foreground">{format(parseISO(selectedLog.lastActivityAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                  </div>
                )}
              </div>

              {/* Modules */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Módulos acessados ({selectedLog.modulesAccessed.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLog.modulesAccessed.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </div>

              {/* Routes */}
              {selectedLog.routesAccessed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Rotas acessadas ({selectedLog.routesAccessed.length})</span>
                  </div>
                  <div className="space-y-1">
                    {selectedLog.routesAccessed.map((r, i) => (
                      <div key={i} className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">{r}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Agent */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">User Agent</span>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 break-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
