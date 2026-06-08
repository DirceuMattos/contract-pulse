import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

// ─── ZIP entry extraction (cópia local do parser nativo do projeto) ────────────
async function extractZipEntry(bytes: Uint8Array, name: string): Promise<Uint8Array | null> {
  const nameBytes = new TextEncoder().encode(name);
  for (let i = 0; i < bytes.length - 30; i++) {
    if (bytes[i] !== 0x50 || bytes[i + 1] !== 0x4b || bytes[i + 2] !== 0x03 || bytes[i + 3] !== 0x04) continue;
    const compressionMethod = bytes[i + 8] | (bytes[i + 9] << 8);
    const compSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24);
    const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
    const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
    const entryName = bytes.slice(i + 30, i + 30 + nameLen);
    if (entryName.length !== nameBytes.length || !entryName.every((b, j) => b === nameBytes[j])) continue;
    const dataStart = i + 30 + nameLen + extraLen;
    const rawData = bytes.slice(dataStart, dataStart + compSize);
    if (compressionMethod === 0) return rawData;
    if (compressionMethod === 8) {
      let ds: DecompressionStream;
      let inputData: Uint8Array = rawData;
      try {
        ds = new DecompressionStream('deflate-raw' as CompressionFormat);
      } catch {
        ds = new DecompressionStream('deflate');
        const withHeader = new Uint8Array(rawData.length + 2);
        withHeader[0] = 0x78;
        withHeader[1] = 0x01;
        withHeader.set(rawData, 2);
        inputData = withHeader;
      }
      const writer = ds.writable.getWriter();
      writer.write(inputData as any);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      return out;
    }
    return null;
  }
  return null;
}

// ─── XLSX parser ───────────────────────────────────────────────────────────────
async function parseXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);
  const dec = new TextDecoder();
  const dom = new DOMParser();

  // Encontrar a sheet
  const wbRaw = await extractZipEntry(bytes, 'xl/workbook.xml');
  const relsRaw = await extractZipEntry(bytes, 'xl/_rels/workbook.xml.rels');
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (wbRaw && relsRaw) {
    const wbDoc = dom.parseFromString(dec.decode(wbRaw), 'application/xml');
    const relsDoc = dom.parseFromString(dec.decode(relsRaw), 'application/xml');
    const sheets = Array.from(wbDoc.getElementsByTagName('sheet'));
    const target =
      sheets.find((s) => (s.getAttribute('name') || '').toLowerCase() === 'matrizmovimentototal') || sheets[0];
    if (target) {
      const rid = target.getAttribute('r:id') || target.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const rels = Array.from(relsDoc.getElementsByTagName('Relationship'));
      const rel = rels.find((r) => r.getAttribute('Id') === rid);
      const targetAttr = rel?.getAttribute('Target') || '';
      if (targetAttr) {
        sheetPath = targetAttr.startsWith('/') ? targetAttr.slice(1) : `xl/${targetAttr.replace(/^\.\//, '')}`;
      }
    }
  }

  const [ssRaw, sheetRaw] = await Promise.all([
    extractZipEntry(bytes, 'xl/sharedStrings.xml'),
    extractZipEntry(bytes, sheetPath),
  ]);
  if (!sheetRaw) throw new Error('Arquivo XLSX inválido');

  const shared: string[] = [];
  if (ssRaw) {
    const ssDoc = dom.parseFromString(dec.decode(ssRaw), 'application/xml');
    ssDoc.querySelectorAll('si').forEach((si) => {
      const ts = si.querySelectorAll('t');
      shared.push(Array.from(ts).map((t) => t.textContent ?? '').join(''));
    });
  }

  const sheetDoc = dom.parseFromString(dec.decode(sheetRaw), 'application/xml');
  const rowEls = Array.from(sheetDoc.querySelectorAll('row'));
  if (!rowEls.length) return { headers: [], rows: [] };

  const colIdx = (ref: string) => {
    const m = ref.match(/^([A-Z]+)/);
    if (!m) return 0;
    let n = 0;
    for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  const cellValue = (c: Element): string => {
    const t = c.getAttribute('t');
    if (t === 's') return shared[parseInt(c.querySelector('v')?.textContent ?? '0', 10)] ?? '';
    if (t === 'inlineStr') return c.querySelector('t')?.textContent ?? '';
    return c.querySelector('v')?.textContent ?? '';
  };
  const parseRow = (r: Element): string[] => {
    const out: string[] = [];
    Array.from(r.querySelectorAll('c')).forEach((c) => {
      const ref = c.getAttribute('r') || '';
      const i = colIdx(ref);
      while (out.length < i) out.push('');
      out[i] = cellValue(c);
    });
    return out;
  };

  const headers = parseRow(rowEls[0]).map((h) => h.trim());
  const rows = rowEls.slice(1).map((r) => {
    const v = parseRow(r);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = v[i] ?? ''));
    return o;
  }).filter((r) => Object.values(r).some((v) => v && v.trim() !== ''));

  return { headers, rows };
}

// ─── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  let lines = text.split(/\r?\n/);
  if (lines[0]?.toLowerCase().startsWith('sep=')) lines = lines.slice(1);
  lines = lines.filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const sep = lines[0].includes(',') ? ',' : ';';
  const split = (line: string) => {
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
      } else if (c === sep && !inQ) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = split(line);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (cols[i] ?? '').trim()));
    return o;
  });
  return { headers, rows };
}

// ─── Mapeamento ────────────────────────────────────────────────────────────────
const FIELD_ALIASES: Record<string, string[]> = {
  ride_id: ['Corrida', 'Id da Corrida'],
  collaborator_name: ['Nome do Colaborador', 'Nome Colaborador'],
  collaborator_email: ['E-mail do colaborador', 'Email Colaborador'],
  collaborator_id_external: ['Matrícula', 'Matricula'],
  value: ['Valor da Corrida', 'Tarifa'],
  distance_km: ['Distancia (KM)', 'Odometro (km)'],
  origin_address: ['Endereço de Origem', 'Endereço de Origem Real'],
  destination_address: ['Endereço de Destino', 'Endereço Final Real'],
  origin_city: ['Cidade de Origem', 'Cidade Origem'],
  ride_start_at: ['Data de Início da Corrida', 'Data Origem'],
  ride_end_at: ['Data de Fim da Corrida', 'Data Final'],
  category: ['Categoria'],
  supervisor_name: ['Nome do Supervisor', 'Nome Supervisor'],
  supervisor_email: ['E-mail do Supervisor', 'Email Supervisor'],
};

function pick(row: Record<string, string>, lowerMap: Map<string, string>, aliases: string[]): string | null {
  for (const a of aliases) {
    const key = lowerMap.get(a.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== '') return row[key];
  }
  return null;
}

function toNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function toISO(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (dm) {
    const [, d, mo, y, h = '12', mi = '00', se = '00'] = dm;
    const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}`);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function buildRow(row: Record<string, string>, lowerMap: Map<string, string>) {
  const ride_id = pick(row, lowerMap, FIELD_ALIASES.ride_id);
  const start = toISO(pick(row, lowerMap, FIELD_ALIASES.ride_start_at));
  const startDate = start ? new Date(start) : null;
  return {
    ride_id,
    collaborator_name: pick(row, lowerMap, FIELD_ALIASES.collaborator_name),
    collaborator_email: pick(row, lowerMap, FIELD_ALIASES.collaborator_email),
    collaborator_id_external: pick(row, lowerMap, FIELD_ALIASES.collaborator_id_external),
    value: toNumber(pick(row, lowerMap, FIELD_ALIASES.value)),
    distance_km: toNumber(pick(row, lowerMap, FIELD_ALIASES.distance_km)),
    origin_address: pick(row, lowerMap, FIELD_ALIASES.origin_address),
    destination_address: pick(row, lowerMap, FIELD_ALIASES.destination_address),
    origin_city: pick(row, lowerMap, FIELD_ALIASES.origin_city),
    ride_start_at: start,
    ride_end_at: toISO(pick(row, lowerMap, FIELD_ALIASES.ride_end_at)),
    category: pick(row, lowerMap, FIELD_ALIASES.category),
    supervisor_name: pick(row, lowerMap, FIELD_ALIASES.supervisor_name),
    supervisor_email: pick(row, lowerMap, FIELD_ALIASES.supervisor_email),
    month: startDate ? startDate.getMonth() + 1 : null,
    year: startDate ? startDate.getFullYear() : null,
  };
}

// ─── Componente ────────────────────────────────────────────────────────────────
export function TransportImportDialog({ open, onOpenChange, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setProgress(0);
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsed(null);
    try {
      const isXlsx = /\.xlsx$/i.test(f.name);
      const data = isXlsx ? await parseXlsx(f) : parseCsv(await f.text());
      setParsed(data);
    } catch (e: any) {
      toast.error('Erro ao ler arquivo', { description: e.message ?? String(e) });
    }
  };

  const handleImport = async () => {
    if (!parsed || !file) return;
    setBusy(true);
    setProgress(0);
    try {
      const lowerMap = new Map(parsed.headers.map((h) => [h.toLowerCase(), h]));
      const all = parsed.rows.map((r) => buildRow(r, lowerMap));
      const valid = all.filter((r) => r.ride_id);
      const ignored = all.length - valid.length;

      // Quais já existem? Para distinguir importados vs atualizados
      const ids = valid.map((r) => r.ride_id as string);
      const existing = new Set<string>();
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const { data } = await supabase.from('transport_rides').select('ride_id').in('ride_id', chunk);
        (data || []).forEach((r: any) => existing.add(r.ride_id));
      }
      const updated = valid.filter((r) => existing.has(r.ride_id as string)).length;
      const imported = valid.length - updated;

      // Upsert em lotes de 100
      const BATCH = 100;
      for (let i = 0; i < valid.length; i += BATCH) {
        const batch = valid.slice(i, i + BATCH);
        const { error } = await supabase
          .from('transport_rides')
          .upsert(batch as any, { onConflict: 'ride_id' });
        if (error) throw error;
        setProgress(Math.round(((i + batch.length) / valid.length) * 100));
      }

      toast.success('Importação concluída', {
        description: `${imported} importadas, ${updated} atualizadas, ${ignored} ignoradas (sem ride_id)`,
      });
      onImported?.();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error('Erro ao importar', { description: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Planilha de Corridas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aceita o arquivo CSV exportado diretamente do app de corridas (99, Uber, etc.) ou planilha .xlsx no
            mesmo formato. Sheet preferida: <span className="font-mono">MatrizMovimentoTotal</span>.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm mb-3">Arraste o arquivo aqui ou</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Selecionar arquivo
            </Button>
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-md p-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {parsed ? `${parsed.rows.length} linha(s) detectada(s)` : 'Lendo arquivo...'}
                </p>
              </div>
            </div>
          )}

          {busy && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!parsed || !parsed.rows.length || busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
