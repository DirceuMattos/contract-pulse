import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, RotateCcw, FileCheck, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CorrectionResult {
  nome: string;
  status: 'changed' | 'not_found' | 'no_diff';
  personId?: string;
  changes?: Array<{ field: string; before: any; after: any }>;
}

interface CorrectionRun {
  id: string;
  status: string;
  total_processed: number;
  total_changed: number;
  total_not_found: number;
  total_no_diff: number;
  started_at: string;
  ended_at: string | null;
}

interface HRCorrectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = 'upload' | 'preview' | 'applying' | 'done';

const FIELD_LABELS: Record<string, string> = {
  tipo_vinculo: 'Vínculo',
  cargo_id: 'Cargo (ID)',
  team_id: 'Departamento (ID)',
  local_atuacao: 'Local de Atuação',
  data_admissao: 'Data de Admissão',
  situacao: 'Situação',
  data_desligamento: 'Data Desligamento',
  observacoes_desligamento: 'Motivo Desligamento',
  nivel: 'Nível',
  trilha: 'Trilha',
  projeto: 'Projeto',
  cargo_antigo: 'Cargo Antigo',
  email: 'E-mail',
  celular: 'Celular',
  id_externo: 'ID Externo',
  centro_custo: 'Centro de Custo',
  observacoes: 'Observações',
  comite_gestor: 'Comitê Gestor',
  remuneracao_mensal: 'Remuneração Mensal',
  remuneracao_ii: 'Remuneração II',
  beneficios: 'Benefícios',
};

export function HRCorrectionsDialog({ open, onOpenChange, onComplete }: HRCorrectionsDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [csvRecords, setCsvRecords] = useState<any[]>([]);
  const [previewResults, setPreviewResults] = useState<CorrectionResult[]>([]);
  const [applyResults, setApplyResults] = useState<{ totalChanged: number; totalNotFound: number; totalNoDiff: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setCsvRecords([]);
      setPreviewResults([]);
      setApplyResults(null);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const records = result.data as any[];
        setCsvRecords(records);
        setLoading(true);
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token;
          const res = await supabase.functions.invoke('hr-apply-corrections', {
            body: { records, dryRun: true },
          });
          if (res.error) throw new Error(res.error.message);
          setPreviewResults(res.data.results || []);
          setStep('preview');
        } catch (err: any) {
          toast.error('Erro ao analisar CSV: ' + (err.message || 'Erro desconhecido'));
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        toast.error('Erro ao ler CSV: ' + err.message);
      },
    });
  };

  const handleApply = async () => {
    setStep('applying');
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('hr-apply-corrections', {
        body: { records: csvRecords, dryRun: false },
      });
      if (res.error) throw new Error(res.error.message);
      setApplyResults({
        totalChanged: res.data.totalChanged,
        totalNotFound: res.data.totalNotFound,
        totalNoDiff: res.data.totalNoDiff,
      });
      setStep('done');
      toast.success(`Correções aplicadas: ${res.data.totalChanged} registros alterados.`);
      onComplete();
    } catch (err: any) {
      toast.error('Erro ao aplicar correções: ' + (err.message || 'Erro desconhecido'));
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const changedResults = previewResults.filter(r => r.status === 'changed');
  const notFoundResults = previewResults.filter(r => r.status === 'not_found');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Aplicar Correções de RH
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do CSV com as correções para análise.'}
            {step === 'preview' && 'Revise as divergências encontradas antes de aplicar.'}
            {step === 'applying' && 'Aplicando correções...'}
            {step === 'done' && 'Correções aplicadas com sucesso.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione o arquivo CSV com as correções</p>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
              <Button asChild variant="outline" disabled={loading}>
                <span>{loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : 'Selecionar CSV'}</span>
              </Button>
            </label>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default" className="bg-blue-600">{changedResults.length} alterações</Badge>
              <Badge variant="secondary">{previewResults.filter(r => r.status === 'no_diff').length} sem divergência</Badge>
              {notFoundResults.length > 0 && (
                <Badge variant="destructive">{notFoundResults.length} não encontrados</Badge>
              )}
            </div>

            {notFoundResults.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Não encontrados no banco
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {notFoundResults.map(r => r.nome).join(', ')}
                  </p>
                </CardContent>
              </Card>
            )}

            {changedResults.length > 0 && (
              <div className="border rounded-md overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Campo</TableHead>
                      <TableHead className="text-xs">Valor Atual</TableHead>
                      <TableHead className="text-xs">Novo Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changedResults.flatMap(r =>
                      (r.changes || []).map((ch, i) => (
                        <TableRow key={`${r.nome}-${ch.field}-${i}`}>
                          {i === 0 ? (
                            <TableCell className="text-xs font-medium" rowSpan={r.changes!.length}>
                              {r.nome}
                            </TableCell>
                          ) : null}
                          <TableCell className="text-xs">{FIELD_LABELS[ch.field] || ch.field}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ch.before ?? '—'}</TableCell>
                          <TableCell className="text-xs font-medium text-primary">{ch.after ?? '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleApply} disabled={changedResults.length === 0}>
                Aplicar {changedResults.length} correções
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'applying' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Aplicando correções no banco de dados...</p>
          </div>
        )}

        {step === 'done' && applyResults && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-lg font-medium">Correções aplicadas!</p>
            </div>
            <div className="flex justify-center gap-4">
              <Badge className="bg-blue-600">{applyResults.totalChanged} alterados</Badge>
              <Badge variant="secondary">{applyResults.totalNoDiff} sem divergência</Badge>
              {applyResults.totalNotFound > 0 && (
                <Badge variant="destructive">{applyResults.totalNotFound} não encontrados</Badge>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Correction Runs History ────────────────────────────────────────────────

interface HRCorrectionRunsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRollbackComplete: () => void;
}

export function HRCorrectionRunsDialog({ open, onOpenChange, onRollbackComplete }: HRCorrectionRunsProps) {
  const [runs, setRuns] = useState<CorrectionRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hr_correction_runs' as any)
      .select('*')
      .order('started_at', { ascending: false });
    setRuns((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadRuns();
  }, [open, loadRuns]);

  const handleRollback = async (runId: string) => {
    if (!confirm('Tem certeza que deseja reverter esta correção? Os registros serão restaurados ao estado anterior.')) return;
    setRollingBack(runId);
    try {
      const res = await supabase.functions.invoke('hr-rollback-corrections', {
        body: { runId },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`Rollback realizado: ${res.data.restored} registros restaurados.`);
      loadRuns();
      onRollbackComplete();
    } catch (err: any) {
      toast.error('Erro no rollback: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Correções
          </DialogTitle>
          <DialogDescription>Visualize e reverta lotes de correções aplicados anteriormente.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma correção registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-center">Alterados</TableHead>
                <TableHead className="text-xs text-center">Não Encontrados</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell className="text-xs">
                    {new Date(run.started_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={run.status === 'success' ? 'default' : run.status === 'rolled_back' ? 'secondary' : 'destructive'} className="text-xs">
                      {run.status === 'success' ? 'Aplicado' : run.status === 'rolled_back' ? 'Revertido' : run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{run.total_changed}</TableCell>
                  <TableCell className="text-xs text-center">{run.total_not_found}</TableCell>
                  <TableCell>
                    {run.status === 'success' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRollback(run.id)}
                        disabled={rollingBack === run.id}
                      >
                        {rollingBack === run.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                        Rollback
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
