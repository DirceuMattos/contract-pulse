import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, Link2Off, Search, CheckCircle2, ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/calculations';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionCandidate } from '@/types/receivables';
import { toast } from 'sonner';

export default function ReceivablesReconcilePage() {
  const navigate = useNavigate();
  const { contracts, clients, updateContract } = useData();

  const [linkedMap, setLinkedMap] = useState<Record<string, string>>({});
  const [searchDialogContract, setSearchDialogContract] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [bulkLinking, setBulkLinking] = useState(false);

  const unlinkedContracts = useMemo(() => {
    return contracts.filter(c =>
      !c.superlogicaSubscriptionId &&
      !linkedMap[c.id] &&
      ['implantacao', 'operacao'].includes(c.status)
    );
  }, [contracts, linkedMap]);

  const linkedInSession = useMemo(() => {
    return contracts.filter(c => linkedMap[c.id]);
  }, [contracts, linkedMap]);

  const searchSubscriptions = async (cnpj: string): Promise<SubscriptionCandidate[]> => {
    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (!cnpjDigits) return [];

    try {
      const { data, error } = await supabase.functions.invoke('superlogica-search-subscriptions', {
        body: { cnpj: cnpjDigits },
      });
      if (error) throw error;
      return (data?.subscriptions ?? []).map((s: any) => ({
        subscriptionId: s.superlogica_subscription_id,
        label: s.label,
        status: s.status,
        amount: s.amount,
        periodicidade: s.periodicity,
      }));
    } catch {
      return [];
    }
  };

  const handleSearch = async (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const client = clients.find(cl => cl.id === contract.clientId);

    setSearchDialogContract(contractId);
    setSearching(true);

    const results = await searchSubscriptions(client?.cnpj || '');
    setCandidates(results);
    setSearching(false);
  };

  const handleLink = async (contractId: string, candidate: SubscriptionCandidate) => {
    const client = clients.find(cl => cl.id === contracts.find(c => c.id === contractId)?.clientId);
    try {
      await updateContract(contractId, {
        superlogicaSubscriptionId: candidate.subscriptionId,
        superlogicaSubscriptionLabel: candidate.label,
        superlogicaCustomerCnpj: client?.cnpj ?? undefined,
        receivablesStatus: 'sem_vinculo',
      });
      setLinkedMap(prev => ({ ...prev, [contractId]: candidate.subscriptionId }));
      setSearchDialogContract(null);
      setCandidates([]);
      toast.success(`Contrato vinculado à assinatura "${candidate.label}".`);
    } catch (err: any) {
      toast.error(`Erro ao vincular: ${err.message || err}`);
    }
  };

  const handleBulkAutoLink = async () => {
    setBulkLinking(true);
    let linked = 0;
    let manual = 0;
    let noMatch = 0;

    // Group unlinked contracts by client CNPJ
    const cnpjToContracts: Record<string, typeof unlinkedContracts> = {};
    for (const c of unlinkedContracts) {
      const client = clients.find(cl => cl.id === c.clientId);
      const cnpj = client?.cnpj?.replace(/\D/g, '') || '';
      if (!cnpj) { noMatch++; continue; }
      if (!cnpjToContracts[cnpj]) cnpjToContracts[cnpj] = [];
      cnpjToContracts[cnpj].push(c);
    }

    for (const [cnpj, contractGroup] of Object.entries(cnpjToContracts)) {
      const subs = await searchSubscriptions(cnpj);
      const activeSubs = subs.filter(s => s.amount > 0);

      if (activeSubs.length === 0) {
        noMatch += contractGroup.length;
        continue;
      }

      // Link all contracts in this CNPJ group to the highest-value subscription
      const topSub = activeSubs[0]; // already sorted by amount desc
      for (const c of contractGroup) {
        try {
          await updateContract(c.id, {
            superlogicaSubscriptionId: topSub.subscriptionId,
            superlogicaSubscriptionLabel: topSub.label,
            superlogicaCustomerCnpj: cnpj,
            receivablesStatus: 'sem_vinculo',
          });
          setLinkedMap(prev => ({ ...prev, [c.id]: topSub.subscriptionId }));
          linked++;
        } catch {
          manual++;
        }
      }
    }

    setBulkLinking(false);
    toast.success(
      `Auto-vinculação concluída: ${linked} vinculado(s), ${manual} para revisão manual, ${noMatch} sem assinatura encontrada.`
    );
  };

  const currentContract = searchDialogContract ? contracts.find(c => c.id === searchDialogContract) : null;
  const currentClient = currentContract ? clients.find(cl => cl.id === currentContract.clientId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/receivables')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title="Conciliação de Assinaturas" description="Vincule contratos às assinaturas do Superlógica" />
        <div className="ml-auto">
          {unlinkedContracts.length > 0 && (
            <Button onClick={handleBulkAutoLink} disabled={bulkLinking}>
              {bulkLinking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Auto-vincular todos
            </Button>
          )}
        </div>
      </div>

      {linkedInSession.length > 0 && (
        <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Vinculados nesta sessão ({linkedInSession.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {linkedInSession.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1">
                  <span>{c.nome}</span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-700">Vinculado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2Off className="h-4 w-4 text-amber-600" />
            Contratos sem Vínculo ({unlinkedContracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Complemento</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unlinkedContracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Todos os contratos estão vinculados 🎉
                  </TableCell>
                </TableRow>
              )}
              {unlinkedContracts.map(c => {
                const client = clients.find(cl => cl.id === c.clientId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{client?.nomeFantasia || client?.razaoSocial || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{client?.cnpj || '—'}</TableCell>
                    <TableCell className="text-sm">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.unidade || c.centroCusto || '—'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleSearch(c.id)}>
                        <Search className="h-3 w-3 mr-1" />
                        Buscar assinaturas
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!searchDialogContract} onOpenChange={(open) => { if (!open) { setSearchDialogContract(null); setCandidates([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Assinaturas Encontradas
            </DialogTitle>
          </DialogHeader>
          {currentContract && (
            <div className="text-sm mb-3">
              <p className="text-muted-foreground">
                Contrato: <span className="font-medium text-foreground">{currentContract.nome}</span>
              </p>
              <p className="text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{currentClient?.nomeFantasia || currentClient?.razaoSocial}</span>
                {' · '}CNPJ: {currentClient?.cnpj}
              </p>
            </div>
          )}
          {searching ? (
            <div className="py-8 text-center text-muted-foreground">Buscando assinaturas no Superlógica...</div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhuma assinatura ativa com valor encontrada para este CNPJ</div>
          ) : (
            <div className="space-y-2">
              {candidates.map(cand => (
                <motion.div
                  key={cand.subscriptionId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{cand.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(cand.amount)} · {cand.periodicidade} ·{' '}
                      <Badge variant={cand.status === 'ativa' ? 'outline' : 'secondary'} className="text-xs">
                        {cand.status}
                      </Badge>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={cand.status === 'cancelada'}
                    onClick={() => searchDialogContract && handleLink(searchDialogContract, cand)}
                  >
                    Vincular
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
