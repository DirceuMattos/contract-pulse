import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { parseFile } from '@/lib/importExport';
import { generateHRImportTemplate, parseHRImportRow, HRImportRow } from '@/lib/importExport';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canViewFinanceiro: boolean;
}

export function HRImportDialog({ open, onOpenChange, canViewFinanceiro }: Props) {
  const { hrPeople, addPerson, addTimelineEvent } = useHR();
  const { teams, jobTitles } = useData();

  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<HRImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [replaceAll, setReplaceAll] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setParseErrors([]);
    setReplaceAll(false);
    setResult(null);
  };

  const handleFile = useCallback(async (file: File) => {
    try {
      const { data } = await parseFile(file);
      const parsed: HRImportRow[] = [];
      const errors: string[] = [];

      data.forEach((raw, i) => {
        const row = parseHRImportRow(raw);
        if (row) {
          parsed.push(row);
        } else {
          errors.push(`Linha ${i + 2}: campo "Nome" ausente ou vazio — linha ignorada.`);
        }
      });

      setRows(parsed);
      setParseErrors(errors);
      setStep('preview');
    } catch (err) {
      toast.error('Erro ao ler arquivo. Certifique-se de que é CSV ou XLSX válido.');
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const resolveIds = (row: HRImportRow) => {
    const cargoId = jobTitles.find(
      jt => jt.label.toLowerCase() === row.cargo.toLowerCase()
    )?.id ?? null;
    const teamId = teams.find(
      t => t.name.toLowerCase() === row.departamento.toLowerCase()
    )?.id ?? null;
    return { cargoId, teamId };
  };

  const handleImport = async () => {
    setStep('importing');
    let imported = 0;
    let errors = 0;

    try {
      if (replaceAll) {
        // Delete all current records directly via Supabase for efficiency
        const ids = hrPeople.map(p => p.id);
        if (ids.length > 0) {
          const { error } = await supabase.from('hr_people').delete().in('id', ids);
          if (error) throw error;
        }
      }

      for (const row of rows) {
        try {
          const { cargoId, teamId } = resolveIds(row);
          const person = await addPerson({
            nome: row.nome,
            tipoVinculo: row.tipoVinculo,
            cargoId: cargoId ?? undefined,
            teamId: teamId ?? undefined,
            localAtuacao: row.localAtuacao || undefined,
            dataAdmissao: row.dataAdmissao,
            remuneracaoMensal: row.remuneracaoMensal,
            beneficios: row.beneficios,
            situacao: row.situacao,
            observacoes: row.observacoes || undefined,
            comiteGestor: row.comiteGestor || undefined,
            dataDesligamento: row.dataDesligamento,
            tipoDesligamento: row.tipoDesligamento,
            motivoDesligamento: row.motivoDesligamento,
            observacoesDesligamento: row.observacoesDesligamento,
            nivel: row.nivel,
            trilha: row.trilha,
            projeto: row.projeto,
            cargoAntigo: row.cargoAntigo,
            remuneracaoII: row.remuneracaoII || undefined,
            email: row.email,
            celular: row.celular,
            idExterno: row.idExterno,
            centroCusto: row.centroCusto,
          });

          // Inserir eventos de timeline (histórico de remuneração)
          for (const ev of row.timelineEvents) {
            try {
              const isNumeric = ev.valor > 0;
              await addTimelineEvent({
                personId: person.id,
                eventDate: ev.data,
                ocorrencia: isNumeric ? 'reajuste' : 'observacao',
                descricao: ev.descricaoTexto
                  ? ev.descricaoTexto
                  : `Remuneração: ${formatCurrency(ev.valor)}`,
                valor: isNumeric ? ev.valor : undefined,
                remuneracaoApos: isNumeric ? ev.valor : undefined,
                atualizarRemuneracao: false,
              });
            } catch {
              // falha em evento de timeline não cancela a importação da pessoa
            }
          }

          imported++;
        } catch {
          errors++;
        }
      }
    } catch (err) {
      toast.error('Erro ao limpar dados existentes.');
      setStep('preview');
      return;
    }

    setResult({ imported, errors });
    setStep('done');
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Pessoas — RH</DialogTitle>
          <DialogDescription>
            Carregue uma planilha CSV ou XLSX com os dados das pessoas.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Baixe o template para ver o formato correto das colunas.
              </p>
              <Button variant="outline" size="sm" onClick={() => generateHRImportTemplate()}>
                <Download className="h-4 w-4 mr-2" />
                Baixar template
              </Button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">CSV ou XLSX</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{rows.length} pessoa{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}</Badge>
                {parseErrors.length > 0 && (
                  <Badge variant="destructive">{parseErrors.length} linha{parseErrors.length !== 1 ? 's' : ''} ignorada{parseErrors.length !== 1 ? 's' : ''}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>Escolher outro arquivo</Button>
            </div>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {rows.length > 0 && (
              <div className="border rounded-lg overflow-x-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Vínculo</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Trilha</TableHead>
                      <TableHead>Admissão</TableHead>
                      {canViewFinanceiro && <TableHead>Remuneração</TableHead>}
                      <TableHead>Situação</TableHead>
                      <TableHead>Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell><Badge variant={r.tipoVinculo === 'clt' ? 'default' : 'secondary'}>{r.tipoVinculo.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cargo || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.departamento || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.nivel || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.trilha || '—'}</TableCell>
                        <TableCell className="text-sm">{r.dataAdmissao || '—'}</TableCell>
                        {canViewFinanceiro && <TableCell className="text-sm">{r.remuneracaoMensal ? formatCurrency(r.remuneracaoMensal) : '—'}</TableCell>}
                        <TableCell><Badge variant={r.situacao === 'ativo' ? 'default' : 'secondary'}>{r.situacao}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.timelineEvents.length > 0 ? (
                            <Badge variant="outline">{r.timelineEvents.length} evento{r.timelineEvents.length !== 1 ? 's' : ''}</Badge>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Replace option */}
            <div className={`rounded-lg border p-4 space-y-2 ${replaceAll ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <Label htmlFor="replace-switch" className="flex items-center gap-2 cursor-pointer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="font-medium">Substituir todos os dados existentes</span>
                </Label>
                <Switch id="replace-switch" checked={replaceAll} onCheckedChange={setReplaceAll} />
              </div>
              {replaceAll && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> Os {hrPeople.length} registros atuais serão excluídos permanentemente antes da importação. Esta ação não pode ser desfeita.
                  </AlertDescription>
                </Alert>
              )}
              {!replaceAll && (
                <p className="text-xs text-muted-foreground">
                  Os registros importados serão <strong>adicionados</strong> aos {hrPeople.length} existentes.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={rows.length === 0}
                variant={replaceAll ? 'destructive' : 'default'}
              >
                {replaceAll ? 'Substituir e Importar' : 'Importar'} {rows.length} pessoa{rows.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Importing ── */}
        {step === 'importing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando registros…</p>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="py-8 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-[hsl(var(--health-healthy))]" />
              <p className="text-lg font-semibold">Importação concluída</p>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{result.imported} importado{result.imported !== 1 ? 's' : ''}</Badge>
                {result.errors > 0 && (
                  <Badge variant="destructive">{result.errors} erro{result.errors !== 1 ? 's' : ''}</Badge>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={close}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
