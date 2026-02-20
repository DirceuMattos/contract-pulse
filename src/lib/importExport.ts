import * as XLSX from 'xlsx';
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

// Parse file content
export function parseFile(file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      try {
        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Arquivo vazio'));
            return;
          }

          const firstRow = jsonData[0] as unknown[];
          const headers = firstRow.map(h => String(h || '').trim());
          const rows = jsonData.slice(1).map((row) => {
            const rowArray = row as unknown[];
            const obj: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              obj[header] = rowArray[index];
            });
            return obj;
          });

          resolve({ headers, data: rows });
        } else {
          Papa.parse(file, {
            complete: (result) => {
              if (result.data.length === 0) {
                reject(new Error('Arquivo vazio'));
                return;
              }

              const headers = (result.data[0] as string[]).map(h => String(h || '').trim());
              const rows = result.data.slice(1).map((row: unknown) => {
                const obj: Record<string, unknown> = {};
                headers.forEach((header, index) => {
                  obj[header] = (row as string[])[index];
                });
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

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
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

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, entityType);
  XLSX.writeFile(workbook, filename);
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
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityNames[entityType] || entityType);
    XLSX.writeFile(workbook, `template_${entityNames[entityType] || entityType}.xlsx`);
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
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RH');
    XLSX.writeFile(workbook, `rh_pessoas_${timestamp}.xlsx`);
  } else {
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(content, `rh_pessoas_${timestamp}.csv`);
  }
