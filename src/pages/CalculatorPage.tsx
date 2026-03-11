import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSimulations } from '@/contexts/SimulationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { calculateSimulationResults } from '@/lib/simulationEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Calculator, Copy, Trash2, Archive, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { HealthStatus } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { healthConfig } from '@/lib/uiConstants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function healthBorderClass(s: HealthStatus) {
  return s === 'saudavel' ? 'border-l-health-healthy' : s === 'atencao' ? 'border-l-health-attention' : 'border-l-health-critical';
}

export default function CalculatorPage() {
  const { user } = useAuth();
  const { simulations, deleteSimulation, duplicateSimulation, updateSimulation } = useSimulations();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return simulations.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && s.contractType !== typeFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [simulations, search, typeFilter, statusFilter]);

  if (user?.role === 'intermediario') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Este módulo está disponível apenas para C-Level e Leitores.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Simulador de Contratos"
        description="Simule contratos em negociação e projete resultados financeiros."
        animated={false}
        actions={
          <Link to="/calculadora/nova">
            <Button><Plus className="w-4 h-4 mr-2" /> Nova simulação</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="gov">Governo</SelectItem>
            <SelectItem value="private">Privado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calculator className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma simulação encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira simulação para começar.</p>
          <Link to="/calculadora/nova"><Button><Plus className="w-4 h-4 mr-2" /> Nova simulação</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(sim => {
            const results = calculateSimulationResults(sim);
            const hc = healthConfig[results.healthStatus];
            const margemColor = results.margemPercent >= 15 ? 'text-health-healthy' : results.margemPercent >= 0 ? 'text-health-attention' : 'text-health-critical';
            return (
              <Card key={sim.id} className={cn('p-4 space-y-3 hover:shadow-md transition-shadow border-l-4', healthBorderClass(results.healthStatus))}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/calculadora/${sim.id}`} className="text-sm font-semibold text-foreground hover:text-primary truncate block">{sim.name}</Link>
                    <p className="text-xs text-muted-foreground truncate">{sim.clientName}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={cn('border-0', hc.badgeClass)}>{hc.label}</Badge>
                    </TooltipTrigger>
                    <TooltipContent>{hc.tooltip}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{sim.contractType === 'gov' ? 'GOV' : 'Privado'}</span></div>
                  <div><span className="text-muted-foreground">Prazo:</span> <span className="font-medium">{sim.termMonths} meses</span></div>
                  <div><span className="text-muted-foreground">Margem R$:</span> <span className={cn('font-medium', margemColor)}>{results.resultadoMensal >= 0 ? '+' : ''}{formatCurrency(results.resultadoMensal)}/mês</span></div>
                  <div><span className="text-muted-foreground">Margem:</span> <span className={cn('font-medium', margemColor)}>{results.margemPercent.toFixed(1)}%</span></div>
                </div>
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                  <Link to={`/calculadora/${sim.id}`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs">Abrir</Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { duplicateSimulation(sim.id); toast.success('Simulação duplicada'); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { updateSimulation({ ...sim, status: sim.status === 'archived' ? 'draft' : 'archived' }); toast.success(sim.status === 'archived' ? 'Restaurada' : 'Arquivada'); }}>
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir simulação?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteSimulation(sim.id); toast.success('Simulação excluída'); }}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
