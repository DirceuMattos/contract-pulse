import Papa from 'papaparse';
import { Client, Contract, Resource, HRPerson, Team, JobTitle } from '@/types';
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

export function buildXlsx(headers: unknown[], rows: unknown[][]): Blob {
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

  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;

  const wb = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  // Root relationship: points to the workbook
  const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  // Workbook relationship: points to the worksheet
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

  // Build a simple ZIP manually (stored, no compression) using DataView
  const enc = new TextEncoder();
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ];

  // CRC-32 helper
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
          // For reading xlsx we parse the XML manually (sheet1.xml inside the zip)
          const ab = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(ab);
          // Locate sheet1.xml in the ZIP by scanning for local file header
          const findFile = (name: string): Uint8Array | null => {
            const nameBytes = new TextEncoder().encode(name);
            for (let i = 0; i < bytes.length - 30; i++) {
              if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
                const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
                const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
                const fileNameBytes = bytes.slice(i + 30, i + 30 + nameLen);
                const compSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24);
                if (fileNameBytes.length === nameBytes.length && fileNameBytes.every((b, j) => b === nameBytes[j])) {
                  const dataStart = i + 30 + nameLen + extraLen;
                  return bytes.slice(dataStart, dataStart + compSize);
                }
              }
            }
            return null;
          };
          const sheetData = findFile('xl/worksheets/sheet1.xml');
          if (!sheetData) { reject(new Error('Arquivo xlsx inválido')); return; }
          const xml = new TextDecoder().decode(sheetData);
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, 'application/xml');
          const rowEls = Array.from(doc.querySelectorAll('row'));
          if (rowEls.length === 0) { reject(new Error('Arquivo vazio')); return; }
          const parseRow = (el: Element): string[] =>
            Array.from(el.querySelectorAll('c')).map(c => {
              const t = c.getAttribute('t');
              if (t === 'inlineStr') return c.querySelector('t')?.textContent ?? '';
              return c.querySelector('v')?.textContent ?? '';
            });
          const headers = parseRow(rowEls[0]).map(h => h.trim());
          const rows = rowEls.slice(1).map(r => {
            const vals = parseRow(r);
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
            return obj;
          });
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

// Export data to CSV
export function exportToCSV<T extends Record<string, unknown>>(data: T[], entityType: EntityType): string {
  const columns = entityType === 'clients' ? clientColumns : 
                  entityType === 'contracts' ? contractColumns : 
                  resourceColumns;

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
export function exportToExcel<T extends Record<string, unknown>>(data: T[], entityType: EntityType, filename: string): void {
  const columns = entityType === 'clients' ? clientColumns : 
                  entityType === 'contracts' ? contractColumns : 
                  resourceColumns;

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
  { key: 'tipoVinculo', label: 'Vínculo (CLT/PJ)', required: true },
  { key: 'cargo', label: 'Cargo/Função', required: false },
  { key: 'departamento', label: 'Departamento', required: false },
  { key: 'localAtuacao', label: 'Local de Atuação', required: false },
  { key: 'dataAdmissao', label: 'Data de Admissão', required: false },
  { key: 'tempoDeCasaMeses', label: 'Tempo de Casa (meses)', required: false },
  { key: 'situacao', label: 'Situação', required: false },
  { key: 'dataDesligamento', label: 'Data de Desligamento', required: false },
  { key: 'tipoDesligamento', label: 'Tipo de Desligamento', required: false },
  { key: 'motivoDesligamento', label: 'Motivo de Desligamento', required: false },
  { key: 'observacoes', label: 'Observações', required: false },
  { key: 'comiteGestor', label: 'Comitê Gestor (mês/ano)', required: false },
  { key: 'remuneracaoMensal', label: 'Remuneração Mensal', required: false },
  { key: 'beneficios', label: 'Benefícios', required: false },
];

// Import columns for HR (subset used to build import template)
export const hrImportColumns = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'tipoVinculo', label: 'Vínculo (CLT/PJ)', required: true },
  { key: 'cargo', label: 'Cargo', required: false },
  { key: 'departamento', label: 'Departamento', required: false },
  { key: 'localAtuacao', label: 'Local de Atuação', required: false },
  { key: 'dataAdmissao', label: 'Data de Admissão (YYYY-MM-DD)', required: false },
  { key: 'remuneracaoMensal', label: 'Remuneração Mensal', required: false },
  { key: 'beneficios', label: 'Benefícios', required: false },
  { key: 'situacao', label: 'Situação (ativo/inativo)', required: false },
  { key: 'observacoes', label: 'Observações', required: false },
  { key: 'comiteGestor', label: 'Comitê Gestor', required: false },
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
      if (col.key === 'observacoes') return p.observacoes || '';
      if (col.key === 'comiteGestor') return p.comiteGestor || '';
      if (col.key === 'remuneracaoMensal') return canViewFinanceiro ? p.remuneracaoMensal : 'CONFIDENCIAL';
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

// Generate an HR import template (.xlsx)
export function generateHRImportTemplate(): void {
  const headers = hrImportColumns.map(c => `${c.label}${c.required ? ' *' : ''}`);
  const exampleRow = hrImportColumns.map(col => {
    if (col.key === 'nome') return 'João da Silva';
    if (col.key === 'tipoVinculo') return 'CLT';
    if (col.key === 'cargo') return 'Analista';
    if (col.key === 'departamento') return 'Tecnologia';
    if (col.key === 'localAtuacao') return 'São Paulo';
    if (col.key === 'dataAdmissao') return '2022-03-15';
    if (col.key === 'remuneracaoMensal') return '8000';
    if (col.key === 'beneficios') return '1500';
    if (col.key === 'situacao') return 'ativo';
    return '';
  });
  writeXlsxFile(headers, [exampleRow], 'template_importacao_rh.xlsx');
}

// Row type returned after parsing an HR import file
export interface HRImportRow {
  nome: string;
  tipoVinculo: 'clt' | 'pj';
  cargo: string;
  departamento: string;
  localAtuacao: string;
  dataAdmissao: string;
  remuneracaoMensal: number;
  beneficios: number;
  situacao: 'ativo' | 'inativo';
  observacoes: string;
  comiteGestor: string;
}

export function parseHRImportRow(raw: Record<string, unknown>): HRImportRow | null {
  const get = (keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(raw).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
      if (found && raw[found] !== undefined && raw[found] !== '') return String(raw[found]).trim();
    }
    return '';
  };

  const nome = get(['Nome', 'nome']);
  if (!nome) return null;

  const vinculoRaw = get(['Vínculo (CLT/PJ)', 'Vincculo (CLT/PJ)', 'Vinculo', 'vínculo', 'tipoVinculo']).toLowerCase();
  const tipoVinculo: 'clt' | 'pj' = vinculoRaw === 'pj' ? 'pj' : 'clt';

  const admissaoRaw = get(['Data de Admissão (YYYY-MM-DD)', 'Data de Admissao', 'dataAdmissao', 'data_admissao', 'Data de Admissão']);
  let dataAdmissao = admissaoRaw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(admissaoRaw)) {
    const [d, m, y] = admissaoRaw.split('/');
    dataAdmissao = `${y}-${m}-${d}`;
  }
  if (!dataAdmissao || !/^\d{4}-\d{2}-\d{2}$/.test(dataAdmissao)) {
    dataAdmissao = new Date().toISOString().split('T')[0];
  }

  const remuneracaoRaw = get(['Remuneração Mensal', 'Remuneracao Mensal', 'remuneracaoMensal']);
  const beneficiosRaw = get(['Benefícios', 'Beneficios', 'beneficios']);
  const situacaoRaw = get(['Situação (ativo/inativo)', 'Situacao', 'situacao']).toLowerCase();

  return {
    nome,
    tipoVinculo,
    cargo: get(['Cargo', 'cargo']),
    departamento: get(['Departamento', 'departamento']),
    localAtuacao: get(['Local de Atuação', 'Local de Atuacao', 'localAtuacao']),
    dataAdmissao,
    remuneracaoMensal: parseFloat(remuneracaoRaw.replace(',', '.')) || 0,
    beneficios: parseFloat(beneficiosRaw.replace(',', '.')) || 0,
    situacao: situacaoRaw === 'inativo' ? 'inativo' : 'ativo',
    observacoes: get(['Observações', 'Observacoes', 'observacoes']),
    comiteGestor: get(['Comitê Gestor', 'Comite Gestor', 'comiteGestor']),
  };
}
