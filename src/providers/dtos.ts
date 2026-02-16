/**
 * DTOs aligned with future backend schema.
 * Mapping functions to convert between app models and DTOs.
 */

import type { Contract, Resource, HistoryEvent, DocumentAttachment, ContractSimulation } from '@/types';

// ── DTOs ──

export interface ContractDTO {
  id: string;
  code: string;
  name: string;
  client_id: string;
  type: string;
  segment: string;
  status: string;
  start_date: string;
  end_date: string;
  revenue_model: string;
  monthly_reference_value?: number;
  total_contract_value?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceDTO {
  id: string;
  contract_id: string;
  type: string;
  name: string;
  role?: string;
  seniority?: string;
  base_cost: number;
  dedication_percent: number;
  start_date: string;
  end_date?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryEventDTO {
  id: string;
  contract_id: string;
  event_date: string;
  event_type: string;
  title: string;
  description: string;
  impact_area: string;
  severity: string;
  related_value?: number;
  created_at: string;
}

export interface DocumentDTO {
  id: string;
  contract_id: string;
  file_name: string;
  file_size_bytes: number;
  file_type_mime: string;
  description_type: string;
  description_text?: string;
  uploaded_at: string;
  storage_key: string;
}

export interface SimulationDTO {
  id: string;
  name: string;
  client_name: string;
  contract_type: string;
  term_months: number;
  complexity_level: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Mapping functions ──

export function mapContractToDTO(c: Contract): ContractDTO {
  return {
    id: c.id,
    code: c.codigo,
    name: c.nome,
    client_id: c.clientId,
    type: c.tipo,
    segment: c.segmento,
    status: c.status,
    start_date: c.dataInicio,
    end_date: c.dataFim,
    revenue_model: c.modeloReceita,
    monthly_reference_value: c.valorMensalReferencia,
    total_contract_value: c.valorTotalContrato,
    currency: c.moeda,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export function mapDTOToContract(dto: ContractDTO): Partial<Contract> {
  return {
    id: dto.id,
    codigo: dto.code,
    nome: dto.name,
    clientId: dto.client_id,
    tipo: dto.type as Contract['tipo'],
    segmento: dto.segment as Contract['segmento'],
    status: dto.status as Contract['status'],
    dataInicio: dto.start_date,
    dataFim: dto.end_date,
    modeloReceita: dto.revenue_model as Contract['modeloReceita'],
    valorMensalReferencia: dto.monthly_reference_value,
    valorTotalContrato: dto.total_contract_value,
    moeda: dto.currency as Contract['moeda'],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapResourceToDTO(r: Resource): ResourceDTO {
  return {
    id: r.id,
    contract_id: r.contractId,
    type: r.tipo,
    name: r.nome,
    role: r.cargo,
    seniority: r.senioridade,
    base_cost: r.custoBase,
    dedication_percent: r.percentualDedicacao,
    start_date: r.dataInicio,
    end_date: r.dataFim,
    category: r.categoria,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function mapSimulationToDTO(s: ContractSimulation): SimulationDTO {
  return {
    id: s.id,
    name: s.name,
    client_name: s.clientName,
    contract_type: s.contractType,
    term_months: s.termMonths,
    complexity_level: s.complexityLevel,
    status: s.status,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}
