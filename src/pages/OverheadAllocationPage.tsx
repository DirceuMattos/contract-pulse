import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { calculateOverheadAllocation } from '@/lib/overheadAllocation';

const OVERHEAD_CENTRAL_KEY = 'overhead-central';

interface OverheadCentralData {
  administrativo: number;
  infraestrutura: number;
  governanca: number;
  indiretos: number;
  consultoria: number;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function loadPool(): number {
  try {
    const raw = localStorage.getItem(OVERHEAD_CENTRAL_KEY);
    if (!raw) return 0;
    const d: OverheadCentralData = JSON.parse(raw);
    return (d.administrativo || 0) + (d.infraestrutura || 0) + (d.governanca || 0) + (d.indiretos || 0) + (d.consultoria || 0);
  } catch {
    return 0;
  }
}

export default function OverheadAllocationPage() {
  const navigate = useNavigate();
  const { contracts, clients } = useData();

  const poolTotal = useMemo(() => loadPool(), []);

  const result = useMemo(
    () => calculateOverheadAllocation(contracts, clients, poolTotal),
    [contracts, clients, poolTotal],
  );

  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('__all__');

  // Unique client names for filter
  const clientOptions = useMemo(() => {
    const names = new Set(result.allocations.map(a => a.clientName));
    return Array.from(names).sort();
  }, [result.allocations]);

  const filtered = useMemo(() => {
    let items = result.allocations;
    if (clientFilter !== '__all__') {
      items = items.filter(a => a.clientName === clientFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        a =>
          a.clientName.toLowerCase().includes(q) ||
          a.contractName.toLowerCase().includes(q) ||
          a.contractCode.toLowerCase().includes(q),
      );
    }
    return items;
  }, [result.allocations, clientFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhamento do Rateio"
        description="Distribuição do overhead central entre contratos vigentes, proporcional à receita mensal."
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/configuracoes')} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Voltar para Configurações
      </Button>

      {/* Pool summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pool Overhead</CardDescription>
            <CardTitle className="text-xl">{fmt(poolTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita Total Considerada</CardDescription>
            <CardTitle className="text-xl">{fmt(result.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Soma Overhead Alocado</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              {fmt(result.totalAllocated)}
              {Math.abs(result.totalAllocated - poolTotal) < 0.02 && poolTotal > 0 && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou contrato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os clientes</SelectItem>
            {clientOptions.map(name => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos no Rateio ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Valor Mensal (R$)</TableHead>
                <TableHead className="text-right">Percentual (%)</TableHead>
                <TableHead className="text-right">Overhead Alocado (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum contrato elegível encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(a => (
                  <TableRow key={a.contractId}>
                    <TableCell className="font-medium">{a.clientName}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{a.contractCode}</span>
                      <br />
                      {a.contractName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(a.monthlyRevenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(a.allocationPercent)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="flex items-center justify-end gap-1">
                        {fmt(a.overheadAllocated)}
                        {a.roundingAdjustment != null && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                ±
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Ajuste de arredondamento aplicado: {fmt(a.roundingAdjustment)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {a.contractStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/contratos/${a.contractId}`)}
                        title="Abrir contrato"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending section */}
      {result.pending.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Pendências do Rateio ({result.pending.length})</CardTitle>
            </div>
            <CardDescription>
              Contratos excluídos do rateio. Corrija os dados para incluí-los.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.pending.map(p => (
                  <TableRow key={p.contractId}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{p.contractCode}</span>
                      <br />
                      {p.contractName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-600 border-amber-400">
                        {p.reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/contratos/${p.contractId}/editar`)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
