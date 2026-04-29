import Papa from 'papaparse';
import { Client, Contract, Resource, HRPerson, Team, JobTitle, HRTimelineEvent } from '@/types';
import { differenceInMonths } from 'date-fns';

// Column definitions for each entity type
export const clientColumns = [
  { key: 'razaoSocial', label: 'Razão Social', required: true },
  { key: 'nomeFantasia', label: 'Nome Fantasia', required: false },
  { key: 'cnpj', label: 'CNPJ', required: true },
  { key: 'inscricaoEstadual', label: 'Inscrição Estadual', required: false },
  { key: 'site', label: 'Site', required: false },
  { key: 'cep', label: 'CEP', required: false },
  { key: 'logradouro', label: 'Logradouro', required: false },
  { key: 'numero', label: 'Número', required: false },
  { key: 'complemento', label: 'Complemento', required: false },
  { key: 'bairro', label: 'Bairro', required: false },
  { key: 'cidade', label: 'Cidade', required: false },
  { key: 'uf', label: 'UF', required: false },
  { key: 'contatoPrincipal', label: 'Contato Principal', required: true },
  { key: 'email', label: 'E-mail', required: true },
  { key: 'telefone', label: 'Telefone', required: false },
  { key: 'segmento', label: 'Segmento (govtech/privado)', required: true },
  { key: 'tags', label: 'Tags (separadas por ;)', required: false },
  { key: 'observacoes', label: 'Observações', required: false },
];

export const contractColumns = [
  { key: 'codigo', label: 'Código', required: true },
  { key: 'nome', label: 'Nome', required: true },
  { key: 'clientId', label: 'ID do Cliente', required: true },
  { key: 'tipo', label: 'Tipo (sistema/infraestrutura/hibrido)', required: true },
  { key: 'segmento', label: 'Segmento (govtech/privado)', required: true },
  { key: 'status', label: 'Status (implantacao/operacao/suspenso/encerrado)', required: true },
  { key: 'unidade', label: 'Unidade', required: false },
  { key: 'centroCusto', label: 'Centro de Custo', required: false },
  { key: 'tags', label: 'Tags (separadas por ;)', required: false },
  { key: 'dataInicio', label: 'Data Início (YYYY-MM-DD)', required: true },
  { key: 'dataFim', label: 'Data Fim (YYYY-MM-DD)', required: true },
  { key: 'renovacaoAutomatica', label: 'Renovação Automática (sim/nao)', required: false },
  { key: 'periodicidadeRenovacao', label: 'Periodicidade Renovação', required: false },
  { key: 'statusRenovacao', label: 'Status Renovação (negociacao/renovado/sem-tratativa)', required: false },
  { key: 'indiceReajuste', label: 'Índice Reajuste', required: true },
  { key: 'dataBaseReajuste', label: 'Data Base Reajuste (YYYY-MM-DD)', required: true },
  { key: 'percentualFixo', label: 'Percentual Fixo', required: false },
  { key: 'alertaReajusteDias', label: 'Alerta Reajuste (dias)', required: false },
  { key: 'modeloReceita', label: 'Modelo Receita (mrr/media-mensal)', required: true },
  { key: 'valorMensalReferencia', label: 'Valor Mensal Referência', required: false },
  { key: 'valorTotalContrato', label: 'Valor Total Contrato', required: false },
  { key: 'moeda', label: 'Moeda (BRL/USD)', required: false },
  { key: 'observacoesFinanceiras', label: 'Observações Financeiras', required: false },
  { key: 'objeto', label: 'Objeto', required: true },
  { key: 'escopoOperacional', label: 'Escopo Operacional', required: false },
  { key: 'slas', label: 'SLAs', required: false },
  { key: 'riscosPendencias', label: 'Riscos/Pendências', required: false },
  { key: 'responsavelInterno', label: 'Responsável Interno', required: true },
  { key: 'responsavelCS', label: 'Responsável CS', required: false },
  { key: 'responsavelComercial', label: 'Responsável Comercial', required: false },
];

export const resourceColumns = [
  { key: 'contractId', label: 'ID do Contrato', required: true },
  { key: 'tipo', label: 'Tipo (clt/pj/outro)', required: true },
  { key: 'nome', label: 'Nome', required: true },
  { key: 'cargo', label: 'Cargo', required: false },
  { key: 'senioridade', label: 'Senioridade (junior/pleno/senior/especialista)', required: false },
  { key: 'custoBase', label: 'Custo Base', required: true },
  { key: 'percentualDedicacao', label: 'Percentual Dedicação (%)', required: true },
  { key: 'dataInicio', label: 'Data Início (YYYY-MM-DD)', required: true },
  { key: 'dataFim', label: 'Data Fim (YYYY-MM-DD)', required: false },
  { key: 'observacoes', label: 'Observações', required: false },
  { key: 'encargosOverride', label: 'Encargos Override (%)', required: false },
  { key: 'impostosOverride', label: 'Impostos Override (%)', required: false },
  { key: 'categoria', label: 'Categoria (cloud/licenca/equipamento/terceiros/outros)', required: false },
  { key: 'recorrencia', label: 'Recorrência (mensal/anual/unico)', required: false },
  { key: 'rateioMeses', label: 'Rateio Meses', required: false },
];

export type EntityType = 'clients' | 'contracts' | 'resources' | 'hr_people';
export type FileFormat = 'csv' | 'xlsx';

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

// ─── Lightweight XLSX generator (no external dependency) ──────────────────────
// Generates a valid Office Open XML (.xlsx) file using only browser APIs.

function escapeXml(val: unknown): string {
  return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function colRef(idx: number): string {
  let ref = '';
  let n = idx;
  do {
    ref = String.fromCharCode(65 + (n % 26)) + ref;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return ref;
}

// Build a single sheet XML string
function buildSheetXml(headers: unknown[], rows: unknown[][]): string {
  const toCell = (val: unknown, colIdx: number, rowIdx: number): string => {
    const ref = colRef(colIdx) + rowIdx;
    const str = String(val ?? '');
    if (str === '' || isNaN(Number(str))) {
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(str)}</t></is></c>`;
    }
    return `<c r="${ref}"><v>${escapeXml(str)}</v></c>`;
  };

  const sheetRows = [headers, ...rows]
    .map((row, rIdx) => `<row r="${rIdx + 1}">${(row as unknown[]).map((cell, cIdx) => toCell(cell, cIdx, rIdx + 1)).join('')}</row>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
}

// ZIP builder helper (shared between single and multi-sheet)
function buildZipBlob(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();

  function crc32(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeUint32LE(view: DataView, offset: number, val: number) { view.setUint32(offset, val, true); }
  function writeUint16LE(view: DataView, offset: number, val: number) { view.setUint16(offset, val, true); }

  const enc = new TextEncoder();
  const localHeaders: Array<{ offset: number; name: Uint8Array; data: Uint8Array; crc: number }> = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    writeUint32LE(lv, 0, 0x04034b50);
    writeUint16LE(lv, 4, 20);
    writeUint16LE(lv, 6, 0);
    writeUint16LE(lv, 8, 0);
    writeUint16LE(lv, 10, 0);
    writeUint16LE(lv, 12, 0);
    writeUint32LE(lv, 14, crc);
    writeUint32LE(lv, 18, f.data.length);
    writeUint32LE(lv, 22, f.data.length);
    writeUint16LE(lv, 26, nameBytes.length);
    writeUint16LE(lv, 28, 0);
    lh.set(nameBytes, 30);
    localHeaders.push({ offset, name: nameBytes, data: f.data, crc });
    parts.push(lh, f.data);
    offset += lh.length + f.data.length;
  }

  const cdOffset = offset;
  for (const lh of localHeaders) {
    const cd = new Uint8Array(46 + lh.name.length);
    const cv = new DataView(cd.buffer);
    writeUint32LE(cv, 0, 0x02014b50);
    writeUint16LE(cv, 4, 20);
    writeUint16LE(cv, 6, 20);
    writeUint16LE(cv, 8, 0);
    writeUint16LE(cv, 10, 0);
    writeUint16LE(cv, 12, 0);
    writeUint16LE(cv, 14, 0);
    writeUint32LE(cv, 16, lh.crc);
    writeUint32LE(cv, 20, lh.data.length);
    writeUint32LE(cv, 24, lh.data.length);
    writeUint16LE(cv, 28, lh.name.length);
    writeUint16LE(cv, 30, 0);
    writeUint16LE(cv, 32, 0);
    writeUint16LE(cv, 34, 0);
    writeUint16LE(cv, 36, 0);
    writeUint32LE(cv, 38, 0);
    writeUint32LE(cv, 42, lh.offset);
    cd.set(lh.name, 46);
    parts.push(cd);
    offset += cd.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeUint32LE(ev, 0, 0x06054b50);
  writeUint16LE(ev, 4, 0);
  writeUint16LE(ev, 6, 0);
  writeUint16LE(ev, 8, localHeaders.length);
  writeUint16LE(ev, 10, localHeaders.length);
  writeUint32LE(ev, 12, offset - cdOffset);
  writeUint32LE(ev, 16, cdOffset);
  writeUint16LE(ev, 20, 0);
  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function buildXlsx(headers: unknown[], rows: unknown[][]): Blob {
  const enc = new TextEncoder();
  const sheet = buildSheetXml(headers, rows);
  const wb = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

  return buildZipBlob([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ]);
}

// Multi-sheet XLSX builder
export interface XlsxSheet {
  name: string;
  headers: unknown[];
  rows: unknown[][];
}

export function buildMultiSheetXlsx(sheets: XlsxSheet[]): Blob {
  const enc = new TextEncoder();

  // Build sheet XML for each sheet
  const sheetXmls = sheets.map(s => buildSheetXml(s.headers, s.rows));

  // Workbook with multiple sheets
  const sheetRefs = sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const wb = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetRefs}</sheets></workbook>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const wbRelsEntries = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('');
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRelsEntries}</Relationships>`;

  const overrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`;

  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    ...sheetXmls.map((xml, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(xml) })),
  ];

  return buildZipBlob(files);
}

// ─── Feedz Sync Report XLSX Generator (V2 — uses feedz_sync_change) ─────────
export function buildFeedzSyncReportV2(run: any, changes: any[], inconsistencies: any[]): Blob {
  const created = changes.filter(i => i.action === 'created');
  const updated = changes.filter(i => i.action === 'updated');
  const terminated = changes.filter(i => i.action === 'terminated');

  // Sheet 1: Resumo
  const summaryHeaders = ['Campo', 'Valor'];
  const summaryRows = [
    ['Run ID', run.id],
    ['Data Início', run.started_at ? new Date(run.started_at).toLocaleString('pt-BR') : ''],
    ['Data Fim', run.ended_at ? new Date(run.ended_at).toLocaleString('pt-BR') : ''],
    ['Status', run.status],
    ['Modo', run.sync_mode || 'strict'],
    ['Processados', String(run.records_processed)],
    ['Criados', String(run.records_created)],
    ['Alterados', String(run.records_updated)],
    ['Desligados', String(run.records_terminated)],
    ['Inconsistências', String(run.inconsistency_count || 0)],
  ];

  // Sheet 2: Criados
  const createdHeaders = ['Matrícula Feedz', 'Nome RH', 'Ação', 'Data/Hora', 'Revertido'];
  const createdRows = created.map(i => [
    i.matricula || '',
    i.after_snapshot?.nome || '',
    'Criado',
    i.synced_at ? new Date(i.synced_at).toLocaleString('pt-BR') : '',
    i.reverted_at ? 'Sim' : 'Não',
  ]);

  // Sheet 3: Alterados
  const updatedHeaders = ['Matrícula Feedz', 'Nome RH', 'Ação', 'Data/Hora', 'Campos Alterados', 'Revertido'];
  const updatedRows = updated.map(i => {
    const ch = (i.changed_fields as any[]) || [];
    const changesStr = ch.map((c: any) => `${c.field}: ${c.before ?? ''} → ${c.after ?? ''}`).join('; ');
    return [
      i.matricula || '',
      i.after_snapshot?.nome || i.before_snapshot?.nome || '',
      'Alterado',
      i.synced_at ? new Date(i.synced_at).toLocaleString('pt-BR') : '',
      changesStr,
      i.reverted_at ? 'Sim' : 'Não',
    ];
  });

  // Sheet 4: Desligados
  const terminatedHeaders = ['Matrícula Feedz', 'Nome RH', 'Ação', 'Data/Hora', 'Data Desligamento', 'Revertido'];
  const terminatedRows = terminated.map(i => [
    i.matricula || '',
    i.after_snapshot?.nome || i.before_snapshot?.nome || '',
    'Desligado',
    i.synced_at ? new Date(i.synced_at).toLocaleString('pt-BR') : '',
    i.after_snapshot?.data_desligamento || '',
    i.reverted_at ? 'Sim' : 'Não',
  ]);

  // Sheet 5: Inconsistências
  const inconsistencyHeaders = ['Matrícula Feedz', 'Nome', 'Código', 'Detalhe', 'Data/Hora'];
  const inconsistencyRows = inconsistencies.map(i => [
    i.matricula || '(vazio)',
    i.feedz_payload?.nome || i.feedz_payload?.employeeId || '',
    i.reason_code || '',
    i.reason_detail || '',
    i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : '',
  ]);

  return buildMultiSheetXlsx([
    { name: 'Resumo', headers: summaryHeaders, rows: summaryRows },
    { name: 'Criados', headers: createdHeaders, rows: createdRows },
    { name: 'Alterados', headers: updatedHeaders, rows: updatedRows },
    { name: 'Desligados', headers: terminatedHeaders, rows: terminatedRows },
    { name: 'Inconsistencias', headers: inconsistencyHeaders, rows: inconsistencyRows },
  ]);
}

// Legacy V1 report (for old runs using feedz_sync_items)
export function buildFeedzSyncReport(run: any, items: any[]): Blob {
  const inserts = items.filter(i => i.action === 'INSERT');
  const updates = items.filter(i => i.action === 'UPDATE');
  const pendings = items.filter(i => i.action === 'PENDING');
  const conflicts = items.filter(i => i.action === 'CONFLICT');

  const summaryHeaders = ['Campo', 'Valor'];
  const summaryRows = [
    ['Run ID', run.id],
    ['Data Início', run.started_at ? new Date(run.started_at).toLocaleString('pt-BR') : ''],
    ['Data Fim', run.ended_at ? new Date(run.ended_at).toLocaleString('pt-BR') : ''],
    ['Status', run.status],
    ['Processados', run.records_processed],
    ['Criados', run.records_created],
    ['Atualizados', run.records_updated],
  ];

  const insertHeaders = ['Feedz ID', 'Email', 'Nome', 'Estratégia', 'HR Person ID', 'Motivo'];
  const insertRows = inserts.map(i => [
    i.feedz_id, i.feedz_email, i.feedz_name, i.match_strategy,
    i.matched_hr_person_id || '', i.reason_code || 'Novo registro',
  ]);

  const updateHeaders = ['Feedz ID', 'Email', 'Nome', 'Estratégia', 'HR Person ID', 'Campos Alterados'];
  const updateRows = updates.map(i => {
    const changes = (i.fields_changed_json || []) as any[];
    const changesStr = changes.map((c: any) => `${c.field}: ${c.before ?? ''} → ${c.after ?? ''}`).join('; ');
    return [i.feedz_id, i.feedz_email, i.feedz_name, i.match_strategy, i.matched_hr_person_id || '', changesStr];
  });

  const pendingHeaders = ['Feedz ID', 'Email', 'Nome', 'Estratégia', 'Motivo', 'HR Person Sugerido'];
  const pendingRows = pendings.map(i => [
    i.feedz_id, i.feedz_email, i.feedz_name, i.match_strategy,
    i.reason_code || '', i.matched_hr_person_id || '',
  ]);

  const conflictHeaders = ['Feedz ID', 'Email', 'Nome', 'Estratégia', 'Motivo', 'HR Person Conflitante'];
  const conflictRows = conflicts.map(i => [
    i.feedz_id, i.feedz_email, i.feedz_name, i.match_strategy,
    i.reason_code || '', i.matched_hr_person_id || '',
  ]);

  return buildMultiSheetXlsx([
    { name: 'Resumo', headers: summaryHeaders, rows: summaryRows },
    { name: 'Insercoes', headers: insertHeaders, rows: insertRows },
    { name: 'Atualizacoes', headers: updateHeaders, rows: updateRows },
    { name: 'Pendencias', headers: pendingHeaders, rows: pendingRows },
    { name: 'Conflitos', headers: conflictHeaders, rows: conflictRows },
  ]);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function writeXlsxFile(headers: unknown[], rows: unknown[][], filename: string): void {
  downloadBlob(buildXlsx(headers, rows), filename);
}

// ─── Parse file content ────────────────────────────────────────────────────────
export function parseFile(file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = async (e) => {
      try {
        if (isExcel) {
          const ab = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(ab);

          // Extract a file from the ZIP, handling both stored and deflate compression
          const extractZipEntry = async (name: string): Promise<Uint8Array | null> => {
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

              if (compressionMethod === 0) {
                // Stored (no compression)
                return rawData;
              } else if (compressionMethod === 8) {
                // Deflate — use DecompressionStream with fallback
                let ds: DecompressionStream;
                let inputData: Uint8Array = rawData;
                try {
                  ds = new DecompressionStream('deflate-raw' as CompressionFormat);
                } catch {
                  // Fallback: prepend zlib header and use 'deflate'
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
                const totalLen = chunks.reduce((s, c) => s + c.length, 0);
                const result = new Uint8Array(totalLen);
                let offset = 0;
                for (const c of chunks) { result.set(c, offset); offset += c.length; }
                return result;
              }
              return null; // Unsupported compression
            }
            return null;
          };

          // Extract shared strings table and sheet data
          const [sharedStringsRaw, sheetRaw] = await Promise.all([
            extractZipEntry('xl/sharedStrings.xml'),
            extractZipEntry('xl/worksheets/sheet1.xml'),
          ]);

          if (!sheetRaw) { reject(new Error('Arquivo xlsx inválido')); return; }

          const domParser = new DOMParser();

          // Build shared strings array
          const sharedStrings: string[] = [];
          if (sharedStringsRaw) {
            const ssXml = new TextDecoder().decode(sharedStringsRaw);
            const ssDoc = domParser.parseFromString(ssXml, 'application/xml');
            const siEls = ssDoc.querySelectorAll('si');
            siEls.forEach(si => {
              // <si> may contain a single <t> or multiple <r><t> runs
              const tEls = si.querySelectorAll('t');
              sharedStrings.push(Array.from(tEls).map(t => t.textContent ?? '').join(''));
            });
          }

          // Parse sheet XML
          const sheetXml = new TextDecoder().decode(sheetRaw);
          const sheetDoc = domParser.parseFromString(sheetXml, 'application/xml');
          const rowEls = Array.from(sheetDoc.querySelectorAll('row'));
          if (rowEls.length === 0) { reject(new Error('Arquivo vazio')); return; }

          const parseCellValue = (c: Element): string => {
            const t = c.getAttribute('t');
            if (t === 's') {
              // Shared string reference
              const idx = parseInt(c.querySelector('v')?.textContent ?? '0', 10);
              return sharedStrings[idx] ?? '';
            }
            if (t === 'inlineStr') {
              return c.querySelector('t')?.textContent ?? '';
            }
            // Number or direct value
            return c.querySelector('v')?.textContent ?? '';
          };

          const parseRow = (el: Element): string[] =>
            Array.from(el.querySelectorAll('c')).map(parseCellValue);

          const headers = parseRow(rowEls[0]).map(h => h.trim());
          const rows = rowEls.slice(1).map(r => {
            const vals = parseRow(r);
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
            return obj;
          }).filter(row => Object.values(row).some(v => v !== undefined && v !== ''));
          resolve({ headers, data: rows });
        } else {
          Papa.parse(file, {
            complete: (result) => {
              if (result.data.length === 0) { reject(new Error('Arquivo vazio')); return; }
              const headers = (result.data[0] as string[]).map(h => String(h || '').trim());
              const rows = result.data.slice(1).map((row: unknown) => {
                const obj: Record<string, unknown> = {};
                headers.forEach((header, index) => { obj[header] = (row as string[])[index]; });
                return obj;
              }).filter(row => Object.values(row).some(v => v !== undefined && v !== ''));
              resolve({ headers, data: rows });
            },
            error: (error) => reject(error),
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    if (isExcel) { reader.readAsArrayBuffer(file); } else { reader.readAsText(file); }
  });
}

// Transform imported data based on column mapping
export function transformImportedData(
  data: Record<string, unknown>[],
  mapping: ColumnMapping[],
  entityType: EntityType
): Record<string, unknown>[] {
  return data.map(row => {
    const transformed: Record<string, unknown> = {};

    mapping.forEach(({ sourceColumn, targetColumn }) => {
      if (sourceColumn && targetColumn) {
        let value = row[sourceColumn];

        // Type conversions
        if (targetColumn === 'tags' && typeof value === 'string') {
          value = value.split(';').map(t => t.trim()).filter(Boolean);
        } else if (targetColumn === 'renovacaoAutomatica') {
          value = String(value).toLowerCase() === 'sim' || value === true || value === '1';
        } else if (['custoBase', 'percentualDedicacao', 'valorMensalReferencia', 'valorTotalContrato', 'percentualFixo', 'alertaReajusteDias', 'encargosOverride', 'impostosOverride', 'rateioMeses'].includes(targetColumn)) {
          value = parseFloat(String(value).replace(',', '.')) || 0;
        }

        transformed[targetColumn] = value;
      }
    });

    return transformed;
  });
}

// Validate imported data
export function validateImportedData(
  data: Record<string, unknown>[],
  entityType: EntityType
): { valid: Record<string, unknown>[]; errors: Array<{ row: number; message: string }> } {
  const columns = entityType === 'clients' ? clientColumns : 
                  entityType === 'contracts' ? contractColumns : 
                  resourceColumns;
  
  const requiredFields = columns.filter(c => c.required).map(c => c.key);
  const valid: Record<string, unknown>[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  data.forEach((row, index) => {
    const missingFields = requiredFields.filter(field => {
      const value = row[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      errors.push({
        row: index + 2, // +2 because of header row and 0-index
        message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
      });
    } else {
      valid.push(row);
    }
  });

  return { valid, errors };
}

// Value-sensitive column keys that should be hidden for non-privileged users
const SENSITIVE_CONTRACT_KEYS = ['valorMensalReferencia', 'valorTotalContrato', 'percentualFixo', 'observacoesFinanceiras'];
const SENSITIVE_RESOURCE_KEYS = ['custoBase', 'encargosOverride', 'impostosOverride'];

function getFilteredColumns(entityType: EntityType, canViewValues: boolean) {
  const allColumns = entityType === 'clients' ? clientColumns : 
                     entityType === 'contracts' ? contractColumns : 
                     resourceColumns;
  if (canViewValues) return allColumns;
  const sensitiveKeys = entityType === 'contracts' ? SENSITIVE_CONTRACT_KEYS :
                        entityType === 'resources' ? SENSITIVE_RESOURCE_KEYS : [];
  return allColumns.filter(c => !sensitiveKeys.includes(c.key));
}

// Export data to CSV
export function exportToCSV<T extends Record<string, unknown>>(data: T[], entityType: EntityType, canViewValues = true): string {
  const columns = getFilteredColumns(entityType, canViewValues);

  const headers = columns.map(c => c.label);
  const rows = data.map(row => {
    return columns.map(col => {
      let value = (row as Record<string, unknown>)[col.key];
      
      // Convert arrays to semicolon-separated strings
      if (Array.isArray(value)) {
        value = value.join('; ');
      }
      // Convert booleans
      else if (typeof value === 'boolean') {
        value = value ? 'Sim' : 'Não';
      }
      // Escape values with commas or quotes
      else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value ?? '';
    });
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Export data to Excel
export function exportToExcel<T extends Record<string, unknown>>(data: T[], entityType: EntityType, filename: string, canViewValues = true): void {
  const columns = getFilteredColumns(entityType, canViewValues);

  const headers = columns.map(c => c.label);
  const rows = data.map(row => {
    return columns.map(col => {
      let value = (row as Record<string, unknown>)[col.key];
      
      if (Array.isArray(value)) {
        value = value.join('; ');
      } else if (typeof value === 'boolean') {
        value = value ? 'Sim' : 'Não';
      }
      
      return value ?? '';
    });
  });

  writeXlsxFile(headers, rows, filename);
}

// Download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Generate template file
export function generateTemplate(entityType: EntityType, format: FileFormat): void {
  const columns = entityType === 'clients' ? clientColumns : 
                  entityType === 'contracts' ? contractColumns : 
                  resourceColumns;

  const headers = columns.map(c => `${c.label}${c.required ? ' *' : ''}`);
  const exampleRow = columns.map(col => {
    if (col.key === 'segmento') return 'privado';
    if (col.key === 'tipo') return 'sistema';
    if (col.key === 'status') return 'operacao';
    if (col.key === 'modeloReceita') return 'mrr';
    if (col.key === 'moeda') return 'BRL';
    if (col.key === 'tags') return 'tag1; tag2';
    if (col.key === 'renovacaoAutomatica') return 'Sim';
    if (col.key.includes('data')) return '2024-01-01';
    if (col.key.includes('valor') || col.key.includes('custo')) return '10000';
    if (col.key.includes('percentual')) return '100';
    return '';
  });

  const entityNames = {
    clients: 'clientes',
    contracts: 'contratos',
    resources: 'recursos',
    hr_people: 'rh_pessoas',
  };

  if (format === 'xlsx') {
    writeXlsxFile(headers, [exampleRow], `template_${entityNames[entityType] || entityType}.xlsx`);
  } else {
    const content = [headers.join(','), exampleRow.join(',')].join('\n');
    downloadCSV(content, `template_${entityNames[entityType] || entityType}.csv`);
  }
}

export const hrColumns = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'tipoVinculo', label: 'Tipo_Vinculo', required: true },
  { key: 'cargo', label: 'Cargo_Funcao', required: false },
  { key: 'departamento', label: 'Departamento', required: false },
  { key: 'localAtuacao', label: 'Local_Atuacao', required: false },
  { key: 'dataAdmissao', label: 'Data_Admissao', required: false },
  { key: 'tempoDeCasaMeses', label: 'Tempo_de_Casa_Calc', required: false },
  { key: 'situacao', label: 'Situacao', required: false },
  { key: 'dataDesligamento', label: 'Data_Desligamento', required: false },
  { key: 'tipoDesligamento', label: 'Tipo_Motivo_Desligamento', required: false },
  { key: 'motivoDesligamento', label: 'Observacoes_Desligamento', required: false },
  { key: 'nivel', label: 'Nivel', required: false },
  { key: 'trilha', label: 'Trilha', required: false },
  { key: 'projeto', label: 'Projeto', required: false },
  { key: 'cargoAntigo', label: 'Cargo_Antigo', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'celular', label: 'Celular', required: false },
  { key: 'idExterno', label: 'ID_Externo', required: false },
  { key: 'centroCusto', label: 'Centro_Custo', required: false },
  { key: 'observacoes', label: 'Observacoes', required: false },
  { key: 'comiteGestor', label: 'Comite_Gestor', required: false },
  { key: 'remuneracaoMensal', label: 'Remuneracao_Mensal', required: false },
  { key: 'remuneracaoII', label: 'Remuneracao_II', required: false },
  { key: 'beneficios', label: 'Beneficios', required: false },
];

export function exportHRPeople(
  people: HRPerson[],
  teams: Team[],
  jobTitles: JobTitle[],
  canViewFinanceiro: boolean,
  format: FileFormat
): void {
  const getTeamName = (teamId?: string) => teams.find(t => t.id === teamId)?.name || '';
  const getCargoLabel = (cargoId?: string) => jobTitles.find(jt => jt.id === cargoId)?.label || '';

  const headers = hrColumns.map(c => c.label);
  const rows = people.map(p => {
    const meses = differenceInMonths(new Date(), new Date(p.dataAdmissao));
    return hrColumns.map(col => {
      if (col.key === 'nome') return p.nome;
      if (col.key === 'tipoVinculo') return p.tipoVinculo.toUpperCase();
      if (col.key === 'cargo') return getCargoLabel(p.cargoId);
      if (col.key === 'departamento') return getTeamName(p.teamId);
      if (col.key === 'localAtuacao') return p.localAtuacao || '';
      if (col.key === 'dataAdmissao') return p.dataAdmissao;
      if (col.key === 'tempoDeCasaMeses') return meses;
      if (col.key === 'situacao') return p.situacao;
      if (col.key === 'dataDesligamento') return p.dataDesligamento || '';
      if (col.key === 'tipoDesligamento') return p.tipoDesligamento || '';
      if (col.key === 'motivoDesligamento') return p.motivoDesligamento || '';
      if (col.key === 'nivel') return p.nivel || '';
      if (col.key === 'trilha') return p.trilha || '';
      if (col.key === 'projeto') return p.projeto || '';
      if (col.key === 'cargoAntigo') return p.cargoAntigo || '';
      if (col.key === 'email') return p.email || '';
      if (col.key === 'celular') return p.celular || '';
      if (col.key === 'idExterno') return p.idExterno || '';
      if (col.key === 'centroCusto') return p.centroCusto || '';
      if (col.key === 'observacoes') return p.observacoes || '';
      if (col.key === 'comiteGestor') return p.comiteGestor || '';
      if (col.key === 'remuneracaoMensal') return canViewFinanceiro ? p.remuneracaoMensal : 'CONFIDENCIAL';
      if (col.key === 'remuneracaoII') return canViewFinanceiro ? (p.remuneracaoII || 0) : 'CONFIDENCIAL';
      if (col.key === 'beneficios') return canViewFinanceiro ? p.beneficios : 'CONFIDENCIAL';
      return '';
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  if (format === 'xlsx') {
    writeXlsxFile(headers, rows, `rh_pessoas_${timestamp}.xlsx`);
  } else {
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(content, `rh_pessoas_${timestamp}.csv`);
  }
}

// Generate an HR import template (.xlsx) matching the real spreadsheet columns
export function generateHRImportTemplate(): void {
  const headers = [
    'Nome', 'Tipo_Vinculo', 'Cargo_Funcao', 'Departamento', 'Local_Atuacao',
    'Data_Admissao', 'Situacao', 'Remuneracao_Mensal', 'Remuneracao_II', 'Beneficios',
    'Observacoes', 'Comite_Gestor', 'Nivel', 'Trilha', 'Projeto', 'Cargo_Antigo',
    'Email', 'Celular', 'ID_Externo', 'Centro_Custo',
    'Data_Desligamento', 'Tipo_Motivo_Desligamento', 'Observacoes_Desligamento',
  ];
  const exampleRow = [
    'João da Silva', 'CLT', 'Analista de Sistemas', 'Tecnologia', 'Remoto',
    '2022-03-15', 'Ativo', '8000', '500', '1500',
    '', '2025-01', 'N2', 'Técnica', 'Projeto Alpha', '',
    'joao@empresa.com', '11999990000', '', '',
    '', '', '',
  ];
  writeXlsxFile(headers, [exampleRow], 'template_importacao_rh.xlsx');
}

// ─── HR Import row type ───────────────────────────────────────────────────────

export interface HRImportRow {
  nome: string;
  tipoVinculo: 'clt' | 'pj';
  cargo: string;
  departamento: string;
  localAtuacao: string;
  dataAdmissao: string;
  remuneracaoMensal: number;
  remuneracaoII: number;
  beneficios: number;
  situacao: 'ativo' | 'inativo';
  observacoes: string;
  comiteGestor: string;
  dataDesligamento?: string;
  tipoDesligamento?: 'dispensado' | 'solicitou-dispensa' | 'transferido-grupo' | 'outro';
  motivoDesligamento?: string;
  observacoesDesligamento?: string;
  nivel?: string;
  trilha?: string;
  projeto?: string;
  cargoAntigo?: string;
  email?: string;
  celular?: string;
  idExterno?: string;
  centroCusto?: string;
  // Pares de histórico de remuneração extraídos das colunas RAW_*
  timelineEvents: Array<{ data: string; valor: number; descricaoTexto?: string }>;
}

// Parse a date string supporting multiple formats into YYYY-MM-DD
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function mapTipoDesligamento(raw: string): 'dispensado' | 'solicitou-dispensa' | 'transferido-grupo' | 'outro' {
  const v = raw.toLowerCase().trim();
  if (v === 'dispensado' || v === 'dispensada') return 'dispensado';
  if (v.includes('solicitou')) return 'solicitou-dispensa';
  if (v.includes('transfer')) return 'transferido-grupo';
  return 'outro';
}

export function parseHRImportRow(raw: Record<string, unknown>): HRImportRow | null {
  // Case-insensitive column lookup
  const get = (keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(raw).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (found && raw[found] !== undefined && String(raw[found]).trim() !== '') {
        return String(raw[found]).trim();
      }
    }
    return '';
  };

  const nome = get(['Nome', 'nome']);
  if (!nome) return null;

  // Vínculo
  const vinculoRaw = get(['Tipo_Vinculo', 'Vínculo (CLT/PJ)', 'Vinculo', 'tipoVinculo']).toLowerCase();
  const tipoVinculo: 'clt' | 'pj' = vinculoRaw === 'pj' ? 'pj' : 'clt';

  // Data de Admissão
  const admissaoRaw = get(['Data_Admissao', 'Data de Admissão (YYYY-MM-DD)', 'Data de Admissao', 'dataAdmissao', 'data_admissao', 'Data de Admissão']);
  const dataAdmissao = parseDate(admissaoRaw) || new Date().toISOString().split('T')[0];

  // Situação
  const situacaoRaw = get(['Situacao', 'Situação (ativo/inativo)', 'situacao']).toLowerCase();
  const situacao: 'ativo' | 'inativo' = situacaoRaw === 'inativo' ? 'inativo' : 'ativo';

  // Financeiro
  const remuneracaoRaw = get(['Remuneracao_Mensal', 'Remuneração Mensal', 'Remuneracao Mensal', 'remuneracaoMensal']);
  const remuneracaoIIRaw = get(['Remuneracao_II', 'Remuneração II', 'remuneracaoII']);
  const beneficiosRaw = get(['Beneficios', 'Benefícios', 'beneficios']);

  // Desligamento
  const desligamentoRaw = get(['Data_Desligamento', 'Data Desligamento', 'dataDesligamento', 'data_desligamento']);
  const dataDesligamento = parseDate(desligamentoRaw) || undefined;
  const tipoMotRaw = get(['Tipo_Motivo_Desligamento', 'Tipo Motivo Desligamento', 'tipoDesligamento']);
  const tipoDesligamento = tipoMotRaw ? mapTipoDesligamento(tipoMotRaw) : undefined;
  const obsDesligRaw = get(['Observacoes_Desligamento', 'Observações Desligamento', 'observacoesDesligamento']);

  // Comite Gestor — planilha pode ter formato YYYY-MM ou YYYY-MM-DD
  const comiteRaw = get(['Comite_Gestor', 'Comitê Gestor', 'Comite Gestor', 'comiteGestor']);
  // Se vier como data completa tipo "2025-01-01", pegar só YYYY-MM
  let comiteGestor = comiteRaw;
  if (/^\d{4}-\d{2}-\d{2}/.test(comiteRaw)) comiteGestor = comiteRaw.substring(0, 7);

  // ─── Extrair pares RAW_Data Ocorrência / RAW_Valor (0 a 16) ──────────────
  const timelineEvents: Array<{ data: string; valor: number; descricaoTexto?: string }> = [];
  for (let i = 0; i <= 16; i++) {
    const suffix = i === 0 ? '' : `.${i}`;
    const dataKey = `RAW_Data Ocorrência${suffix}`;
    const valorKey = `RAW_Valor${suffix}`;

    const dataRaw = get([dataKey]);
    const valorRaw = get([valorKey]);

    if (!dataRaw) continue; // sem data, pular

    const dataFmt = parseDate(dataRaw);
    if (!dataFmt) continue;

    if (valorRaw) {
      // Tentar parsear como número
      const cleaned = valorRaw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
      const valorNum = parseFloat(cleaned);
      if (!isNaN(valorNum) && valorNum > 0) {
        timelineEvents.push({ data: dataFmt, valor: valorNum });
      } else {
        // Valor é texto descritivo (ex: "VA +R$500,00", "Função - Analista")
        timelineEvents.push({ data: dataFmt, valor: 0, descricaoTexto: valorRaw });
      }
    }
  }

  return {
    nome,
    tipoVinculo,
    cargo: get(['Cargo_Funcao', 'Cargo/Função', 'Cargo', 'cargo']),
    departamento: get(['Departamento', 'departamento']),
    localAtuacao: get(['Local_Atuacao', 'Local de Atuação', 'Local de Atuacao', 'localAtuacao']),
    dataAdmissao,
    remuneracaoMensal: parseFloat(remuneracaoRaw.replace(',', '.')) || 0,
    remuneracaoII: parseFloat(remuneracaoIIRaw.replace(',', '.')) || 0,
    beneficios: parseFloat(beneficiosRaw.replace(',', '.')) || 0,
    situacao,
    observacoes: get(['Observacoes', 'Observações', 'observacoes']),
    comiteGestor,
    dataDesligamento,
    tipoDesligamento,
    motivoDesligamento: obsDesligRaw || undefined,
    observacoesDesligamento: obsDesligRaw || undefined,
    nivel: get(['Nivel', 'Nível', 'nivel']) || undefined,
    trilha: get(['Trilha', 'trilha']) || undefined,
    projeto: get(['Projeto', 'projeto']) || undefined,
    cargoAntigo: get(['Cargo_Antigo', 'Cargo Antigo', 'cargoAntigo']) || undefined,
    email: get(['Email', 'email']) || undefined,
    celular: get(['Celular', 'celular']) || undefined,
    idExterno: get(['ID_Externo', 'Id Externo', 'idExterno']) || undefined,
    centroCusto: get(['Centro_Custo', 'Centro de Custo', 'centroCusto']) || undefined,
    timelineEvents,
  };
}
