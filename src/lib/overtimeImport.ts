// Parsing de planilhas de Horas Extras. Suporta tres formatos:
//  - "consolidada": colunas Mês, Fornecedor, Área, Categoria, Valor Convertido
//  - "PJ": uma aba por mês (JANEIRO..DEZEMBRO), colunas Nome, HORAS, VALOR
//  - "contabilidade": .xls legado com Nome, Referência, Valor calculado e Valor informado
import * as XLSX from 'xlsx';

export interface ParsedOvertimeRow {
  colaborador_nome: string;
  mes: number;
  ano: number;
  valor: number;
  horas: number;       // decimais
  regime_hint: string | null; // 'clt' | 'pj' | null (só a consolidada informa)
  area_hint: string | null;   // só a consolidada informa
}

const MESES_PT: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, 'março': 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// Valor: aceita "$ 3.897,32" (BR), "991.07" (US), "1.234,56" (BR), "R$ 1.000".
export function parseValor(v: unknown): number {
  if (v == null) return 0;
  let s = String(v).replace(/[R$\s]/g, '').trim();
  if (!s) return 0;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // separador decimal é o último que aparece
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); // BR
    else s = s.replace(/,/g, ''); // US
  } else if (hasComma) {
    s = s.replace(',', '.'); // vírgula decimal
  }
  return parseFloat(s) || 0;
}

// Horas: aceita "18:30:00", "26:30", "4 days, 1:00:00", "1 day, 2:35:00", "8".
export function parseHoras(v: unknown): number {
  if (v == null) return 0;
  let s = String(v).trim().toLowerCase();
  if (!s) return 0;
  let dias = 0;
  const dm = s.match(/(\d+)\s*days?/);
  if (dm) { dias = parseInt(dm[1], 10) || 0; s = s.replace(/\d+\s*days?,?/, '').trim(); }
  if (s.includes(':')) {
    const [h, m] = s.split(':');
    return dias * 24 + (parseInt(h, 10) || 0) + (parseInt(m, 10) || 0) / 60;
  }
  return dias * 24 + (parseFloat(s.replace(',', '.')) || 0);
}

function normRegime(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s.startsWith('clt')) return 'clt';
  if (s.startsWith('pj')) return 'pj';
  if (s.startsWith('coop')) return 'cooperado';
  return null;
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array', cellText: false, cellDates: false });
}

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Detecta o formato pela cara da planilha.
function detectFormato(wb: XLSX.WorkBook): 'consolidada' | 'pj' {
  const sheetNames = wb.SheetNames.map((n) => n.toLowerCase());
  if (sheetNames.some((n) => MESES_PT[n] !== undefined)) return 'pj';
  return 'consolidada';
}

// ── Formato consolidada ──
function parseConsolidada(wb: XLSX.WorkBook, ano: number): ParsedOvertimeRow[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (rows.length === 0) return [];
  // encontra a linha de cabeçalho (contém "Fornecedor" e "Mês")
  let hdrIdx = rows.findIndex((r) => r.some((c) => /fornecedor/i.test(String(c))));
  if (hdrIdx < 0) hdrIdx = 0;
  const header = rows[hdrIdx].map(normalizeHeader);
  const col = (aliases: string[]) => header.findIndex((h) => aliases.some((a) => h.includes(a)));
  const iNome = col(['fornecedor', 'colaborador', 'nome']);
  const iMes = col(['mês', 'mes']);
  const iArea = col(['área', 'area']);
  const iCat = col(['categoria', 'regime']);
  const iValCalc = col(['valor calculado']);
  const iValConv = col(['valor convertido']);
  const iValor = col(['valor']);
  const iAno = col(['ano']);
  const iHoras = col(['horas', 'hora']);

  const out: ParsedOvertimeRow[] = [];
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const nome = String(row[iNome] ?? '').trim();
    if (!nome) continue;
    const valorRaw =
      iValCalc >= 0 && row[iValCalc] ? row[iValCalc] :
      iValConv >= 0 && row[iValConv] ? row[iValConv] :
      row[iValor];
    const anoLinha = iAno >= 0 ? (parseInt(String(row[iAno] ?? ''), 10) || ano) : ano;
    out.push({
      colaborador_nome: nome,
      mes: parseInt(String(row[iMes] ?? ''), 10) || 0,
      ano: anoLinha,
      valor: parseValor(valorRaw),
      horas: iHoras >= 0 ? parseHoras(row[iHoras]) : 0,
      regime_hint: normRegime(iCat >= 0 ? String(row[iCat]) : null),
      area_hint: iArea >= 0 ? String(row[iArea] ?? '').trim() || null : null,
    });
  }
  return out.filter((r) => r.mes >= 1 && r.mes <= 12);
}

function parseReferenceMonth(v: unknown, fallbackAno: number): { mes: number; ano: number } {
  const s = String(v ?? '').trim();
  const m = s.match(/(\d{1,2})\s*[\/\-]\s*(\d{2,4})/);
  if (!m) return { mes: 0, ano: fallbackAno };
  const mes = Number(m[1]) || 0;
  const ano = Number(m[2].length === 2 ? `20${m[2]}` : m[2]) || fallbackAno;
  return { mes, ano };
}

function readUInt16(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUInt32(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0;
}

function decodeLatin1(bytes: Uint8Array): string {
  return String.fromCharCode(...Array.from(bytes));
}

function decodeUtf16Le(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode(readUInt16(bytes, i));
  }
  return out;
}

function parseBiffUnicodeString(buffer: Uint8Array, offset: number): { value: string; nextOffset: number } {
  const length = readUInt16(buffer, offset);
  let cursor = offset + 2;
  const flags = buffer[cursor++];
  const hasRichText = (flags & 0x08) !== 0;
  const hasExtended = (flags & 0x04) !== 0;
  const isUtf16 = (flags & 0x01) !== 0;

  let richTextRuns = 0;
  let extendedSize = 0;
  if (hasRichText) {
    richTextRuns = readUInt16(buffer, cursor);
    cursor += 2;
  }
  if (hasExtended) {
    extendedSize = readUInt32(buffer, cursor);
    cursor += 4;
  }

  const byteLength = length * (isUtf16 ? 2 : 1);
  const raw = buffer.slice(cursor, cursor + byteLength);
  const value = isUtf16 ? decodeUtf16Le(raw) : decodeLatin1(raw);
  cursor += byteLength + richTextRuns * 4 + extendedSize;

  return { value, nextOffset: cursor };
}

function getWorkbookStream(buffer: ArrayBuffer): Uint8Array | null {
  const xlsxModule = XLSX as unknown as {
    CFB?: {
      read: (data: Uint8Array, opts?: { type?: string }) => {
        FileIndex: Array<{ name: string; content?: Uint8Array | number[] }>;
      };
    };
    default?: {
      CFB?: {
        read: (data: Uint8Array, opts?: { type?: string }) => {
          FileIndex: Array<{ name: string; content?: Uint8Array | number[] }>;
        };
      };
    };
  };
  const cfbApi = xlsxModule.CFB ?? xlsxModule.default?.CFB;

  if (!cfbApi) return null;
  try {
    const fileBytes = new Uint8Array(buffer.slice(0));
    const cfb = cfbApi.read(fileBytes, { type: 'array' });
    const workbook = cfb.FileIndex.find((entry) => /^(Workbook|Book)$/i.test(entry.name));
    return workbook?.content ? new Uint8Array(workbook.content) : null;
  } catch {
    return null;
  }
}

function parseSst(workbook: Uint8Array): string[] {
  const strings: string[] = [];
  for (let offset = 0; offset + 4 <= workbook.length;) {
    const recordType = readUInt16(workbook, offset);
    const recordLength = readUInt16(workbook, offset + 2);
    const dataStart = offset + 4;
    const dataEnd = dataStart + recordLength;

    if (recordType === 0x00fc) {
      let cursor = dataStart + 8; // total strings + unique strings
      while (cursor < dataEnd) {
        const parsed = parseBiffUnicodeString(workbook, cursor);
        strings.push(parsed.value);
        cursor = parsed.nextOffset;
      }
    }

    offset = dataEnd;
  }
  return strings;
}

function parseLegacyLabelRows(workbook: Uint8Array): string[][] {
  const sharedStrings = parseSst(workbook);
  const rows: string[][] = [];

  for (let offset = 0; offset + 4 <= workbook.length;) {
    const recordType = readUInt16(workbook, offset);
    const recordLength = readUInt16(workbook, offset + 2);
    const dataStart = offset + 4;
    const dataEnd = dataStart + recordLength;

    if (recordType === 0x00fd && recordLength >= 10) {
      const rowIndex = readUInt16(workbook, dataStart);
      const columnIndex = readUInt16(workbook, dataStart + 2);
      const stringIndex = readUInt32(workbook, dataStart + 6);
      rows[rowIndex] ??= [];
      rows[rowIndex][columnIndex] = sharedStrings[stringIndex] ?? '';
    }

    offset = dataEnd;
  }

  return rows;
}

function valueNearColumn(row: string[], columnIndex: number, lookahead = 3): string {
  for (let offset = 0; offset <= lookahead; offset++) {
    const value = row[columnIndex + offset];
    if (String(value ?? '').trim()) return value;
  }
  return '';
}

// Alguns XLS legados da contabilidade sao BIFF/OLE validos, mas o sheet_to_json
// do xlsx nao monta o !ref. Nesse caso, extraimos as celulas LABELSST diretamente.
function parseContabilidadeLegacyXls(buffer: ArrayBuffer, fallbackAno: number): ParsedOvertimeRow[] {
  const workbook = getWorkbookStream(buffer);
  if (!workbook) return [];

  const rows = parseLegacyLabelRows(workbook);
  const headerIndex = rows.findIndex((row) =>
    Array.isArray(row) &&
    row.some((cell) => normalizeHeader(cell) === 'nome') &&
    row.some((cell) => normalizeHeader(cell) === 'valor calculado')
  );
  if (headerIndex < 0) return [];

  const header = rows[headerIndex].map(normalizeHeader);
  const findColumn = (name: string) => header.findIndex((h) => h === name);
  const nameColumn = findColumn('nome');
  const referenceColumn = findColumn('referencia');
  const calculatedValueColumn = findColumn('valor calculado');
  const informedValueColumn = findColumn('valor informado');

  if (nameColumn < 0 || referenceColumn < 0 || calculatedValueColumn < 0) return [];

  const parsedRows: ParsedOvertimeRow[] = [];
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const colaboradorNome = String(row[nameColumn] ?? '').trim();
    const isTotal = row.some((cell) => normalizeHeader(cell).startsWith('total da'));
    if (!colaboradorNome || isTotal || normalizeHeader(colaboradorNome) === 'empregados') continue;

    const { mes, ano } = parseReferenceMonth(valueNearColumn(row, referenceColumn), fallbackAno);
    if (mes < 1 || mes > 12) continue;

    parsedRows.push({
      colaborador_nome: colaboradorNome,
      mes,
      ano,
      valor: parseValor(valueNearColumn(row, calculatedValueColumn)),
      horas: informedValueColumn >= 0 ? parseHoras(valueNearColumn(row, informedValueColumn)) : 0,
      regime_hint: null,
      area_hint: null,
    });
  }

  return parsedRows.filter((row) => row.valor > 0 || row.horas > 0);
}

// ── Formato PJ (uma aba por mês) ──
function parsePJ(wb: XLSX.WorkBook, ano: number): ParsedOvertimeRow[] {
  const out: ParsedOvertimeRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const mes = MESES_PT[sheetName.trim().toLowerCase()];
    if (!mes) continue;
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    // cabeçalho: linha com "horas extras pj" ou "horas" e "valor"
    let hdrIdx = rows.findIndex((r) => r.some((c) => /horas/i.test(String(c))) && r.some((c) => /valor/i.test(String(c))));
    if (hdrIdx < 0) hdrIdx = 0;
    for (let r = hdrIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const nome = String(row[0] ?? '').trim();
      if (!nome) continue;
      out.push({
        colaborador_nome: nome,
        mes,
        ano,
        valor: parseValor(row[2]),
        horas: parseHoras(row[1]),
        regime_hint: 'pj',
        area_hint: null,
      });
    }
  }
  return out;
}

export async function parseOvertimeFile(file: File, ano: number): Promise<{ formato: string; rows: ParsedOvertimeRow[] }> {
  const buffer = await readFileBuffer(file);
  const wb = readWorkbook(buffer.slice(0));
  const formato = detectFormato(wb);
  const rows = formato === 'pj' ? parsePJ(wb, ano) : parseConsolidada(wb, ano);
  if (rows.length > 0) return { formato, rows };

  const legacyRows = parseContabilidadeLegacyXls(buffer, ano);
  if (legacyRows.length > 0) return { formato: 'contabilidade', rows: legacyRows };

  return { formato, rows };
}
