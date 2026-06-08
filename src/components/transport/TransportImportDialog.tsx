import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if ((c === ',' || c === ';') && !inQ) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? '').trim()));
    return row;
  });
}

function pick(row: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return null;
}

function toNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function toISO(v: string | null): string | null {
  if (!v) return null;
  // Aceita "YYYY-MM-DD HH:MM" ou "DD/MM/YYYY HH:MM"
  const dm = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (dm) {
    const [, d, mo, y, h = '12', mi = '00'] = dm;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00`).toISOString();
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function TransportImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<number>(0);

  const handleFile = async (f: File) => {
    setFile(f);
    const text = await f.text();
    setPreview(parseCSV(text).length);
  };

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const payload = rows.map((r) => {
        const start = toISO(pick(r, ['ride_start_at', 'inicio', 'início', 'data', 'data_inicio']));
        const startDate = start ? new Date(start) : null;
        return {
          ride_id: pick(r, ['ride_id', 'id', 'id_corrida']),
          collaborator_name: pick(r, ['collaborator_name', 'colaborador', 'nome']),
          collaborator_email: pick(r, ['collaborator_email', 'email']),
          supervisor_name: pick(r, ['supervisor_name', 'supervisor', 'gestor', 'area']),
          supervisor_email: pick(r, ['supervisor_email']),
          value: toNumber(pick(r, ['value', 'valor', 'total'])),
          distance_km: toNumber(pick(r, ['distance_km', 'km', 'distancia'])),
          origin_address: pick(r, ['origin_address', 'origem']),
          destination_address: pick(r, ['destination_address', 'destino']),
          origin_city: pick(r, ['origin_city', 'cidade']),
          category: pick(r, ['category', 'categoria']),
          ride_start_at: start,
          ride_end_at: toISO(pick(r, ['ride_end_at', 'fim', 'data_fim'])),
          month: startDate ? startDate.getMonth() + 1 : null,
          year: startDate ? startDate.getFullYear() : null,
        };
      });

      // insere em lotes de 500
      for (let i = 0; i < payload.length; i += 500) {
        const chunk = payload.slice(i, i + 500);
        const { error } = await supabase.from('transport_rides').insert(chunk as any);
        if (error) throw error;
      }
      toast({ title: 'Importação concluída', description: `${payload.length} corridas importadas.` });
      onImported?.();
      onOpenChange(false);
      setFile(null);
      setPreview(0);
    } catch (e: any) {
      toast({ title: 'Erro ao importar', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar planilha de transportes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie um arquivo CSV com as colunas: collaborator_name, collaborator_email, supervisor_name, value,
            distance_km, origin_address, destination_address, origin_city, category, ride_start_at, ride_end_at.
          </p>
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file && (
            <p className="text-sm">
              <span className="font-medium">{file.name}</span> — {preview} linha(s) detectada(s).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
