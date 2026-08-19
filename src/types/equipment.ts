export const EQUIPMENT_STATUSES = [
  'em_estoque', 'cedido', 'cedido_grupo', 'em_manutencao', 'extraviado',
  'baixado_perda', 'descartado', 'doado', 'vendido', 'transferido_grupo',
  'devolvido_fornecedor',
] as const;
export type EquipmentStatus = typeof EQUIPMENT_STATUSES[number];

export const EQUIPMENT_TYPES = [
  'notebook', 'desktop', 'mini_pc', 'monitor', 'headset', 'teclado', 'mouse',
  'suporte_ergonomico', 'celular', 'tablet', 'impressora', 'projetor', 'outro',
] as const;
export type EquipmentType = typeof EQUIPMENT_TYPES[number];

export type EquipmentOwnership = 'proprio' | 'locado';
export type EquipmentHolderType = 'pessoa' | 'empresa_grupo' | 'estoque' | 'fornecedor';

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  em_estoque: 'Em estoque',
  cedido: 'Cedido',
  cedido_grupo: 'Cedido ao grupo',
  em_manutencao: 'Em manutenção',
  extraviado: 'Extraviado',
  baixado_perda: 'Baixado por perda',
  descartado: 'Descartado',
  doado: 'Doado',
  vendido: 'Vendido',
  transferido_grupo: 'Transferido ao grupo',
  devolvido_fornecedor: 'Devolvido ao fornecedor',
};

export const STATUS_COLORS: Record<EquipmentStatus, string> = {
  em_estoque: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  cedido: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  cedido_grupo: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  em_manutencao: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  extraviado: 'bg-red-500/10 text-red-700 border-red-500/20',
  baixado_perda: 'bg-muted text-muted-foreground border-border',
  descartado: 'bg-muted text-muted-foreground border-border',
  doado: 'bg-muted text-muted-foreground border-border',
  vendido: 'bg-muted text-muted-foreground border-border',
  transferido_grupo: 'bg-muted text-muted-foreground border-border',
  devolvido_fornecedor: 'bg-muted text-muted-foreground border-border',
};

export const TYPE_LABELS: Record<EquipmentType, string> = {
  notebook: 'Notebook',
  desktop: 'Desktop',
  mini_pc: 'Mini PC',
  monitor: 'Monitor',
  headset: 'Headset',
  teclado: 'Teclado',
  mouse: 'Mouse',
  suporte_ergonomico: 'Suporte ergonômico',
  celular: 'Celular',
  tablet: 'Tablet',
  impressora: 'Impressora',
  projetor: 'Projetor',
  outro: 'Outro',
};

/** Estados sem saída: o item não se move mais a partir deles. */
export const TERMINAL_STATUSES: EquipmentStatus[] = [
  'baixado_perda', 'descartado', 'doado', 'vendido',
  'transferido_grupo', 'devolvido_fornecedor',
];

/**
 * Espelha public.equipment_transition_allowed() do banco.
 * Serve para a tela oferecer só o que o banco aceita — a regra continua
 * imposta no banco, aqui é só para não mostrar opção que vai dar erro.
 */
export const ALLOWED_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  em_estoque: ['cedido', 'cedido_grupo', 'em_manutencao', 'extraviado', 'descartado', 'doado', 'vendido', 'transferido_grupo', 'devolvido_fornecedor'],
  cedido: ['em_estoque', 'em_manutencao', 'extraviado', 'cedido_grupo'],
  cedido_grupo: ['em_estoque', 'em_manutencao', 'extraviado', 'transferido_grupo'],
  em_manutencao: ['em_estoque', 'cedido', 'descartado', 'devolvido_fornecedor'],
  extraviado: ['em_estoque', 'baixado_perda'],
  baixado_perda: [],
  descartado: [],
  doado: [],
  vendido: [],
  transferido_grupo: [],
  devolvido_fornecedor: [],
};

/** Saídas vedadas a item locado — não é patrimônio da BNP. */
export const RENTAL_FORBIDDEN: EquipmentStatus[] = ['vendido', 'doado', 'descartado', 'transferido_grupo'];

export function holderTypeForStatus(status: EquipmentStatus): EquipmentHolderType {
  if (status === 'cedido') return 'pessoa';
  if (status === 'cedido_grupo') return 'empresa_grupo';
  if (status === 'em_estoque') return 'estoque';
  if (status === 'em_manutencao' || status === 'devolvido_fornecedor') return 'fornecedor';
  return 'estoque';
}

export function allowedTransitionsFor(
  status: EquipmentStatus,
  ownership: EquipmentOwnership,
): EquipmentStatus[] {
  const base = ALLOWED_TRANSITIONS[status] || [];
  if (ownership === 'locado') return base.filter((s) => !RENTAL_FORBIDDEN.includes(s));
  return base.filter((s) => s !== 'devolvido_fornecedor');
}

export interface EquipmentItem {
  id: string;
  serial_number: string | null;
  asset_tag: string | null;
  hostname: string | null;
  equipment_type: EquipmentType;
  manufacturer: string | null;
  model: string | null;
  cpu_model: string | null;
  ram_gb: number | null;
  storage_gb: number | null;
  storage_type: string | null;
  ownership: EquipmentOwnership;
  supplier_id: string | null;
  purchase_date: string | null;
  purchase_value: number | null;
  invoice_number: string | null;
  rental_monthly_value: number | null;
  rental_start: string | null;
  rental_end: string | null;
  warranty_end: string | null;
  status: EquipmentStatus;
  holder_type: EquipmentHolderType;
  holder_person_id: string | null;
  holder_company_id: string | null;
  location: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // vindos da view
  holder_person_name?: string | null;
  holder_person_situacao?: string | null;
  holder_company_name?: string | null;
  supplier_name?: string | null;
  alerta_colaborador_inativo?: boolean;
  alerta_fora_da_bnp?: boolean;
  ultima_movimentacao?: string | null;
}

export interface EquipmentMovement {
  id: string;
  equipment_item_id: string;
  from_status: EquipmentStatus | null;
  to_status: EquipmentStatus;
  to_holder_type: EquipmentHolderType;
  to_holder_person_id: string | null;
  to_holder_company_id: string | null;
  occurred_at: string;
  reason: string | null;
  exception_justification: string | null;
  registered_at: string;
}

export interface GroupCompany {
  id: string;
  name: string;
  active: boolean;
}

export interface EquipmentSupplier {
  id: string;
  name: string;
  active: boolean;
}

/* ---------------------------------------------------------------------------
 * I10 Fase 4 — Devoluções no desligamento
 * ------------------------------------------------------------------------- */

export const RETURN_STATUSES = [
  'pending', 'returned', 'returned_damaged', 'lost', 'not_applicable', 'cancelled',
] as const;
export type EquipmentReturnStatus = typeof RETURN_STATUSES[number];

/** Desfechos que o usuário escolhe. 'cancelled' é automático, na reativação. */
export const RETURN_OUTCOMES = [
  'returned', 'returned_damaged', 'lost', 'not_applicable',
] as const;
export type EquipmentReturnOutcome = typeof RETURN_OUTCOMES[number];

export const RETURN_STATUS_LABELS: Record<EquipmentReturnStatus, string> = {
  pending: 'Pendente',
  returned: 'Devolvido',
  returned_damaged: 'Devolvido com avaria',
  lost: 'Extraviado',
  not_applicable: 'Não se aplica',
  cancelled: 'Cancelada',
};

export const RETURN_STATUS_COLORS: Record<EquipmentReturnStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  returned: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  returned_damaged: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  lost: 'bg-red-500/10 text-red-700 border-red-500/20',
  not_applicable: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

/**
 * O que cada desfecho faz com o item e o que exige do usuário.
 * Espelha resolve_equipment_return_pending() — a regra continua no banco,
 * aqui é só para a tela pedir a coisa certa antes de enviar.
 */
export const RETURN_OUTCOME_RULES: Record<EquipmentReturnOutcome, {
  label: string;
  destino: EquipmentStatus;
  descricao: string;
  exigeIdentificacao: boolean;
  exigeObservacao: boolean;
}> = {
  returned: {
    label: 'Devolvido',
    destino: 'em_estoque',
    descricao: 'Voltou em ordem. Confira o número de série ou o patrimônio do que foi entregue.',
    exigeIdentificacao: true,
    exigeObservacao: false,
  },
  returned_damaged: {
    label: 'Devolvido com avaria',
    destino: 'em_manutencao',
    descricao: 'Voltou danificado e vai para manutenção. Descreva a avaria; anexar foto é recomendado.',
    exigeIdentificacao: false,
    exigeObservacao: true,
  },
  lost: {
    label: 'Extraviado',
    destino: 'extraviado',
    descricao: 'Não voltou. O item segue vinculado à pessoa para o passivo não desaparecer do inventário. A baixa por perda é ato separado, na tela do item.',
    exigeIdentificacao: false,
    exigeObservacao: true,
  },
  not_applicable: {
    label: 'Não se aplica',
    destino: 'em_estoque',
    descricao: 'O cadastro estava errado — o item não estava com esta pessoa. Explique o que aconteceu.',
    exigeIdentificacao: false,
    exigeObservacao: true,
  },
};

export interface EquipmentReturnPending {
  id: string;
  equipment_item_id: string;
  person_id: string;
  termination_date: string | null;
  status: EquipmentReturnStatus;
  notes: string | null;
  evidence_url: string | null;
  movement_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;

  person_name: string;
  person_situacao: string | null;
  team_id: string | null;
  team_name: string | null;

  equipment_type: EquipmentType;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  hostname: string | null;
  ownership: EquipmentOwnership;
  rental_monthly_value: number | null;
  item_status: EquipmentStatus;
  item_holder_person_id: string | null;

  dias_em_aberto: number;
  alerta_locado: boolean;
  alerta_item_movimentado_por_fora: boolean;
}

/** Faixas de dias em aberto usadas no filtro da aba. */
export const DIAS_BUCKETS = [
  { value: 'todos', label: 'Qualquer tempo em aberto', min: 0, max: Infinity },
  { value: '0-7', label: 'Até 7 dias', min: 0, max: 7 },
  { value: '8-15', label: '8 a 15 dias', min: 8, max: 15 },
  { value: '16-30', label: '16 a 30 dias', min: 16, max: 30 },
  { value: '30+', label: 'Mais de 30 dias', min: 31, max: Infinity },
] as const;

/** Identificação legível do item, na ordem em que é útil para conferência. */
export function itemLabel(r: Pick<EquipmentReturnPending,
  'equipment_type' | 'manufacturer' | 'model' | 'serial_number' | 'asset_tag' | 'hostname'>): string {
  const desc = [r.manufacturer, r.model].filter(Boolean).join(' ');
  return [TYPE_LABELS[r.equipment_type], desc || null].filter(Boolean).join(' · ');
}

/** Valores aceitos na conferência de identificação, como o banco valida. */
export function identificacoesAceitas(r: Pick<EquipmentReturnPending, 'serial_number' | 'asset_tag'>): string[] {
  return [r.serial_number, r.asset_tag]
    .map((v) => (v ?? '').trim())
    .filter((v) => v !== '');
}

/** Espelha a checagem do banco: aceita SN ou patrimônio, sem caixa e sem espaços. */
export function identificacaoConfere(
  r: Pick<EquipmentReturnPending, 'serial_number' | 'asset_tag'>,
  informado: string,
): boolean {
  const aceitas = identificacoesAceitas(r).map((v) => v.toUpperCase());
  if (aceitas.length === 0) return true; // item sem SN e sem patrimônio: banco exige observação
  return aceitas.includes(informado.trim().toUpperCase());
}
