import { z } from 'zod';

// CNPJ Validation
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate check digits
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

// CNPJ Schema
export const cnpjSchema = z.string()
  .min(1, 'CNPJ é obrigatório')
  .refine((val) => validateCNPJ(val), {
    message: 'CNPJ inválido',
  });

// Email Schema
export const emailSchema = z.string()
  .min(1, 'E-mail é obrigatório')
  .email('E-mail inválido')
  .max(255, 'E-mail deve ter no máximo 255 caracteres');

// Phone Schema (optional)
export const phoneSchema = z.string()
  .optional()
  .refine((val) => !val || /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(val) || /^\d{10,11}$/.test(val.replace(/\D/g, '')), {
    message: 'Telefone inválido',
  });

// CEP Schema (optional)
export const cepSchema = z.string()
  .optional()
  .refine((val) => !val || /^\d{5}-?\d{3}$/.test(val) || /^\d{8}$/.test(val.replace(/\D/g, '')), {
    message: 'CEP inválido',
  });

// Client Form Schema
export const clientFormSchema = z.object({
  razaoSocial: z.string()
    .min(1, 'Razão Social é obrigatória')
    .max(200, 'Razão Social deve ter no máximo 200 caracteres'),
  nomeFantasia: z.string().max(200).optional(),
  cnpj: cnpjSchema,
  inscricaoEstadual: z.string().max(20).optional(),
  site: z.string().url('URL inválida').optional().or(z.literal('')),
  cep: cepSchema,
  logradouro: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
  contatoPrincipal: z.string()
    .min(1, 'Contato principal é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: emailSchema,
  telefone: phoneSchema,
  segmento: z.enum(['govtech', 'privado'], {
    required_error: 'Segmento é obrigatório',
  }),
  tags: z.array(z.string()).default([]),
  observacoes: z.string().max(2000).optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

// Contract Form Schema
export const contractFormSchema = z.object({
  // Identificação
  codigo: z.string()
    .min(1, 'Código é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres'),
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  tipo: z.enum(['sistema', 'infraestrutura', 'hibrido'], {
    required_error: 'Tipo é obrigatório',
  }),
  segmento: z.enum(['govtech', 'privado'], {
    required_error: 'Segmento é obrigatório',
  }),
  status: z.enum(['implantacao', 'operacao', 'suspenso', 'encerrado'], {
    required_error: 'Status é obrigatório',
  }),
  unidade: z.string().max(100).optional(),
  centroCusto: z.string().max(50).optional(),
  tags: z.array(z.string()).default([]),
  govSphere: z.enum(['municipal', 'estadual', 'federal']).optional(),

  // Vigência
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().optional().or(z.literal('')),
  renovacaoAutomatica: z.boolean().default(false),
  periodicidadeRenovacao: z.string().optional(),
  statusRenovacao: z.enum(['negociacao', 'renovado', 'sem-tratativa'], {
    required_error: 'Status de renovação é obrigatório',
  }),
  renewalTermMonths: z.number().int().min(1).max(120).optional(),
  renewalBaseDate: z.string().optional(),

  // Reajuste
  indiceReajuste: z.string().min(1, 'Índice de reajuste é obrigatório'),
  dataBaseReajuste: z.string().min(1, 'Data base de reajuste é obrigatória'),
  percentualFixo: z.number().min(0).max(100).optional(),
  alertaReajusteDias: z.number().min(1).max(365).default(60),

  // Receita
  modeloReceita: z.enum(['mrr', 'media-mensal'], {
    required_error: 'Modelo de receita é obrigatório',
  }),
  valorMensalReferencia: z.number().min(0).optional(),
  valorTotalContrato: z.number().min(0).optional(),
  moeda: z.enum(['BRL', 'USD']).default('BRL'),
  observacoesFinanceiras: z.string().max(2000).optional(),

  // Escopo
  objeto: z.string()
    .min(1, 'Objeto do contrato é obrigatório')
    .max(5000, 'Objeto deve ter no máximo 5000 caracteres'),
  escopoOperacional: z.string().max(5000).optional(),
  slas: z.string().max(2000).optional(),
  riscosPendencias: z.string().max(2000).optional(),

  // Responsáveis
  responsavelInterno: z.string()
    .min(1, 'Responsável interno é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  responsavelCS: z.string().max(100).optional(),
  responsavelComercial: z.string().max(100).optional(),
  responsavelCliente: z.string().max(100).optional(),
  responsavelClienteEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  responsavelClienteTelefone: z.string().max(20).optional(),
  hasSubprojects: z.boolean().default(false),
}).refine((data) => {
  // Validate that valorMensalReferencia is provided when modeloReceita is 'mrr'
  if (data.modeloReceita === 'mrr' && (!data.valorMensalReferencia || data.valorMensalReferencia <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Valor mensal de referência é obrigatório para modelo MRR',
  path: ['valorMensalReferencia'],
}).refine((data) => {
  // Validate that valorTotalContrato is provided when modeloReceita is 'media-mensal'
  if (data.modeloReceita === 'media-mensal' && (!data.valorTotalContrato || data.valorTotalContrato <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Valor total do contrato é obrigatório para modelo média mensal',
  path: ['valorTotalContrato'],
}).refine((data) => {
  // dataFim is required when renovacaoAutomatica is false
  if (!data.renovacaoAutomatica && (!data.dataFim || data.dataFim.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Data de término é obrigatória quando renovação automática está desligada',
  path: ['dataFim'],
}).refine((data) => {
  // Validate that dataFim is after dataInicio
  if (data.dataInicio && data.dataFim && data.dataFim.trim() !== '') {
    return new Date(data.dataFim) > new Date(data.dataInicio);
  }
  return true;
}, {
  message: 'Data de término deve ser posterior à data de início',
  path: ['dataFim'],
});

export type ContractFormData = z.infer<typeof contractFormSchema>;
