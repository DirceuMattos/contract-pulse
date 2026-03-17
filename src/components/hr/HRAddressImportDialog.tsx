import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { parseFile } from '@/lib/importExport';
import { toast } from 'sonner';

interface AddressRow {
  matricula: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  semNumero?: boolean;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

interface MatchResult extends AddressRow {
  hrPersonId?: string;
  hrPersonName?: string;
  status: 'found' | 'not_found';
}

interface HRAddressImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Column header aliases
const COLUMN_MAP: Record<string, keyof AddressRow> = {
  'matricula': 'matricula',
  'matrícula': 'matricula',
  'residência - cep': 'cep',
  'residencia - cep': 'cep',
  'cep': 'cep',
  'cep residência': 'cep',
  'cep residencia': 'cep',
  'residência - endereço': 'logradouro',
  'residencia - endereço': 'logradouro',
  'residência - endereco': 'logradouro',
  'residencia - endereco': 'logradouro',
  'endereço': 'logradouro',
  'endereco': 'logradouro',
  'endereço residência': 'logradouro',
  'logradouro': 'logradouro',
  'residência - número': 'numero',
  'residencia - número': 'numero',
  'residência - numero': 'numero',
  'residencia - numero': 'numero',
  'número': 'numero',
  'numero': 'numero',
  'número residência': 'numero',
  'residência - sem número': 'semNumero',
  'residencia - sem número': 'semNumero',
  'residência - sem numero': 'semNumero',
  'residencia - sem numero': 'semNumero',
  'sem número': 'semNumero',
  'sem numero': 'semNumero',
  'residência - complemento': 'complemento',
  'residencia - complemento': 'complemento',
  'complemento': 'complemento',
  'complemento residência': 'complemento',
  'residência - bairro': 'bairro',
  'residencia - bairro': 'bairro',
  'bairro': 'bairro',
  'bairro residência': 'bairro',
  'residência - município': 'municipio',
  'residencia - município': 'municipio',
  'residência - municipio': 'municipio',
  'residencia - municipio': 'municipio',
  'município': 'municipio',
  'municipio': 'municipio',
  'município residência': 'municipio',
  'cidade': 'municipio',
  'residência - uf': 'uf',
  'residencia - uf': 'uf',
  'uf': 'uf',
  'uf residência': 'uf',
  'estado': 'uf',
};

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',' || ch === ';') { result.push(current.trim()); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  });
}

export function HRAddressImportDialog({ open, onOpenChange, onComplete }: HRAddressImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [resultSummary, setResultSummary] = useState({ updated: 0, notFound: 0 });

  const reset = () => {
    setStep('upload');
    setMatches([]);
    setImporting(false);
    setResultSummary({ updated: 0, notFound: 0 });
  };

  const handleFile = useCallback(async (file: File) => {
    try {
      let parsed: AddressRow[] = [];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isExcel) {
        const result = await parseFile(file);
        if (result.data.length === 0) { toast.error('Arquivo vazio ou sem dados.'); return; }

        const headerMap: Record<string, keyof AddressRow> = {};
        result.headers.forEach(h => {
          const mapped = COLUMN_MAP[h.toLowerCase().trim()];
          if (mapped) headerMap[h] = mapped;
        });

        if (!Object.values(headerMap).includes('matricula')) {
          toast.error('Coluna "Matrícula" não encontrada na planilha.');
          return;
        }

        parsed = result.data
          .map(row => {
            const obj: any = {};
            Object.entries(headerMap).forEach(([header, field]) => {
              const val = String(row[header] ?? '').trim();
              if (field === 'semNumero') {
                obj[field] = val.toLowerCase() === 'sim' || val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'x';
              } else {
                obj[field] = val;
              }
            });
            return obj;
          })
          .filter((obj): obj is AddressRow => !!obj.matricula);
      } else {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 2) { toast.error('Arquivo vazio ou sem dados.'); return; }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const colMap: Record<number, keyof AddressRow> = {};
        headers.forEach((h, i) => {
          const mapped = COLUMN_MAP[h];
          if (mapped) colMap[i] = mapped;
        });

        if (!Object.values(colMap).includes('matricula')) {
          toast.error('Coluna "Matrícula" não encontrada na planilha.');
          return;
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const obj: any = {};
          Object.entries(colMap).forEach(([idx, field]) => {
            const val = row[Number(idx)]?.trim() || '';
            if (field === 'semNumero') {
              obj[field] = val.toLowerCase() === 'sim' || val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'x';
            } else {
              obj[field] = val;
            }
          });
          if (obj.matricula) parsed.push(obj as AddressRow);
        }
      }

      if (parsed.length === 0) { toast.error('Nenhuma linha com matrícula encontrada.'); return; }

      // Match against hr_people
      const matriculas = parsed.map(p => p.matricula);
      const { data: hrPeople } = await supabase
        .from('hr_people')
        .select('id, nome, matricula')
        .in('matricula', matriculas);

      const hrMap = new Map<string, { id: string; nome: string }>();
      (hrPeople || []).forEach(p => {
        if (p.matricula) hrMap.set(p.matricula, { id: p.id, nome: p.nome });
      });

      const results: MatchResult[] = parsed.map(row => {
        const match = hrMap.get(row.matricula);
        return {
          ...row,
          hrPersonId: match?.id,
          hrPersonName: match?.nome,
          status: match ? 'found' : 'not_found',
        };
      });

      setMatches(results);
      setStep('preview');
    } catch (err) {
      console.error('HRAddressImport error:', err);
      toast.error(`Erro ao processar arquivo: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    setImporting(true);
    let updated = 0;
    let notFound = 0;

    const toUpdate = matches.filter(m => m.status === 'found');
    notFound = matches.filter(m => m.status === 'not_found').length;

    for (const row of toUpdate) {
      const { error } = await supabase
        .from('hr_people')
        .update({
          endereco_cep: row.cep || null,
          endereco_logradouro: row.logradouro || null,
          endereco_numero: row.numero || null,
          endereco_sem_numero: row.semNumero || false,
          endereco_complemento: row.complemento || null,
          endereco_bairro: row.bairro || null,
          endereco_municipio: row.municipio || null,
          endereco_uf: row.uf || null,
        })
        .eq('id', row.hrPersonId!);

      if (!error) updated++;
    }

    setResultSummary({ updated, notFound });
    setStep('done');
    setImporting(false);
    toast.success(`${updated} endereço(s) atualizado(s).`);
    onComplete();
  };

  const foundCount = matches.filter(m => m.status === 'found').length;
  const notFoundCount = matches.filter(m => m.status === 'not_found').length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Endereços via Planilha
          </DialogTitle>
          <DialogDescription>
            Faça upload de um CSV com as colunas: Matrícula, CEP, Endereço, Número, Sem número, Complemento, Bairro, Município, UF.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.txt,.xlsx,.xls';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Arraste um arquivo CSV ou Excel (.xlsx) ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">A correspondência será feita pelo campo Matrícula</p>
          </div>
        )}

        {step === 'preview' && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {foundCount} encontrado{foundCount !== 1 ? 's' : ''}
              </Badge>
              {notFoundCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {notFoundCount} não encontrado{notFoundCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1 max-h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Matrícula</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">CEP</TableHead>
                    <TableHead className="text-xs">Logradouro</TableHead>
                    <TableHead className="text-xs">Nº</TableHead>
                    <TableHead className="text-xs">Cidade/UF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((m, i) => (
                    <TableRow key={i} className={m.status === 'not_found' ? 'opacity-50' : ''}>
                      <TableCell>
                        {m.status === 'found'
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{m.matricula}</TableCell>
                      <TableCell className="text-xs">{m.hrPersonName || '—'}</TableCell>
                      <TableCell className="text-xs">{m.cep || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{m.logradouro || '—'}</TableCell>
                      <TableCell className="text-xs">{m.semNumero ? 'S/N' : m.numero || '—'}</TableCell>
                      <TableCell className="text-xs">{[m.municipio, m.uf].filter(Boolean).join('/') || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing || foundCount === 0}>
                {importing ? 'Importando...' : `Atualizar ${foundCount} endereço(s)`}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <div>
              <p className="text-lg font-semibold">{resultSummary.updated} endereço(s) atualizado(s)</p>
              {resultSummary.notFound > 0 && (
                <p className="text-sm text-muted-foreground">{resultSummary.notFound} matrícula(s) não encontrada(s)</p>
              )}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
