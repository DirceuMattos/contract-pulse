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
