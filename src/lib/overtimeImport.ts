// Parsing de planilhas de Horas Extras. Suporta dois formatos:
//  - "consolidada": colunas Mês, Fornecedor, Área, Categoria, Valor Convertido
//  - "PJ": uma aba por mês (JANEIRO..DEZEMBRO), colunas Nome, HORAS, VALOR
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

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const ab = await file.arrayBuffer();
  return XLSX.read(ab, { type: 'array', cellText: false, cellDates: false });
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
  // encontra a linha de cabeçalho (contém "Fornecedor" e "Mês")
  let hdrIdx = rows.findIndex((r) => r.some((c) => /fornecedor/i.test(String(c))));
  if (hdrIdx < 0) hdrIdx = 0;
  const header = rows[hdrIdx].map((c) => String(c).trim().toLowerCase());
  const col = (aliases: string[]) => header.findIndex((h) => aliases.some((a) => h.includes(a)));
  const iNome = col(['fornecedor', 'colaborador', 'nome']);
  const iMes = col(['mês', 'mes']);
  const iArea = col(['área', 'area']);
  const iCat = col(['categoria', 'regime']);
  const iValConv = col(['valor convertido']);
  const iValor = col(['valor']);
  const iAno = col(['ano']);
  const iHoras = col(['horas', 'hora']);

  const out: ParsedOvertimeRow[] = [];
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const nome = String(row[iNome] ?? '').trim();
    if (!nome) continue;
    const valorRaw = iValConv >= 0 && row[iValConv] ? row[iValConv] : row[iValor];
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
  const wb = await readWorkbook(file);
  const formato = detectFormato(wb);
  const rows = formato === 'pj' ? parsePJ(wb, ano) : parseConsolidada(wb, ano);
  return { formato, rows };
}
