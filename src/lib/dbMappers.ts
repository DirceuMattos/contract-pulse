/**
 * DTO mappers: snake_case DB rows ↔ camelCase TypeScript types
 */
import type {
  Client, Contract, Resource, Settings, Snapshot, OverheadItem,
  HistoryEvent, DocumentAttachment, AttachmentDescriptionConfig,
  JobTitle, Team, ContractSimulation, SimulationHRItem, SimulationOtherCost,
  HRPerson, HRTimelineEvent, DemandType,
  MonthlyReport, ReportSection, ReportTemplateConfig, ReportCollaborator,
  ReportStatus, ReportSectionKey, ReportSectionSource,
} from '@/types';
import { emptyToNull } from '@/lib/utils';

/** Ensure demandType is always an array for backward compat */
function normalizeDemandType(q: any): ContractSimulation['questionnaire'] {
  if (!q) return q;
  if (q.demandType && !Array.isArray(q.demandType)) {
    return { ...q, demandType: [q.demandType] };
  }
  return q;
}

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export function clientFromDb(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    razaoSocial: row.razao_social as string,
    nomeFantasia: (row.nome_fantasia as string | null) ?? undefined,
    cnpj: row.cnpj as string,
    inscricaoEstadual: (row.inscricao_estadual as string | null) ?? undefined,
    site: (row.site as string | null) ?? undefined,
    cep: (row.cep as string | null) ?? undefined,
    logradouro: (row.logradouro as string | null) ?? undefined,
    numero: (row.numero as string | null) ?? undefined,
    complemento: (row.complemento as string | null) ?? undefined,
    bairro: (row.bairro as string | null) ?? undefined,
    cidade: (row.cidade as string | null) ?? undefined,
    uf: (row.uf as string | null) ?? undefined,
    contatoPrincipal: row.contato_principal as string,
    email: row.email as string,
    telefone: (row.telefone as string | null) ?? undefined,
    segmento: row.segmento as 'govtech' | 'privado',
    tags: (row.tags as string[]) ?? [],
    observacoes: (row.observacoes as string | null) ?? undefined,
    logoUrl: (row.logo_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function clientToDb(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    razao_social: client.razaoSocial,
    nome_fantasia: client.nomeFantasia ?? null,
    cnpj: client.cnpj,
    inscricao_estadual: client.inscricaoEstadual ?? null,
    site: client.site ?? null,
    cep: client.cep ?? null,
    logradouro: client.logradouro ?? null,
    numero: client.numero ?? null,
    complemento: client.complemento ?? null,
    bairro: client.bairro ?? null,
    cidade: client.cidade ?? null,
    uf: client.uf ?? null,
    contato_principal: client.contatoPrincipal,
    email: client.email,
    telefone: client.telefone ?? null,
    segmento: client.segmento,
    tags: client.tags ?? [],
    observacoes: client.observacoes ?? null,
    logo_url: client.logoUrl ?? null,
  };
}

// ─── CONTRACT ─────────────────────────────────────────────────────────────────

export function contractFromDb(row: Record<string, unknown>): Contract {
  return {
    id: row.id as string,
    codigo: row.codigo as string,
    nome: row.nome as string,
    clientId: row.client_id as string,
    tipo: row.tipo as Contract['tipo'],
    segmento: row.segmento as Contract['segmento'],
    status: row.status as Contract['status'],
    unidade: (row.unidade as string | null) ?? undefined,
    centroCusto: (row.centro_custo as string | null) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    govSphere: (row.gov_sphere as Contract['govSphere']) ?? undefined,
    dataInicio: row.data_inicio as string,
    dataFim: (row.data_fim as string | null) ?? undefined,
    renovacaoAutomatica: row.renovacao_automatica as boolean,
    periodicidadeRenovacao: (row.periodicidade_renovacao as string | null) ?? undefined,
    statusRenovacao: row.status_renovacao as Contract['statusRenovacao'],
    renewalTermMonths: (row.renewal_term_months as number | null) ?? undefined,
    renewalBaseDate: (row.renewal_base_date as string | null) ?? undefined,
    indiceReajuste: row.indice_reajuste as string,
    dataBaseReajuste: row.data_base_reajuste as string,
    percentualFixo: (row.percentual_fixo as number | null) ?? undefined,
    alertaReajusteDias: row.alerta_reajuste_dias as number,
    modeloReceita: row.modelo_receita as Contract['modeloReceita'],
    valorMensalReferencia: (row.valor_mensal_referencia as number | null) ?? undefined,
    valorTotalContrato: (row.valor_total_contrato as number | null) ?? undefined,
    moeda: row.moeda as 'BRL' | 'USD',
    observacoesFinanceiras: (row.observacoes_financeiras as string | null) ?? undefined,
    objeto: row.objeto as string,
    escopoOperacional: (row.escopo_operacional as string | null) ?? undefined,
    slas: (row.slas as string | null) ?? undefined,
    riscosPendencias: (row.riscos_pendencias as string | null) ?? undefined,
    responsavelInterno: row.responsavel_interno as string,
    responsavelCS: (row.responsavel_cs as string | null) ?? undefined,
    responsavelComercial: (row.responsavel_comercial as string | null) ?? undefined,
    responsavelCliente: (row.responsavel_cliente as string | null) ?? undefined,
    responsavelClienteEmail: (row.responsavel_cliente_email as string | null) ?? undefined,
    responsavelClienteTelefone: (row.responsavel_cliente_telefone as string | null) ?? undefined,
    percentualImpostosFaturamento: (row.percentual_impostos_faturamento as number | null) ?? undefined,
    superlogicaCustomerCnpj: (row.superlogica_customer_cnpj as string | null) ?? undefined,
    superlogicaCustomerId: (row.superlogica_customer_id as string | null) ?? undefined,
    superlogicaSubscriptionId: (row.superlogica_subscription_id as string | null) ?? undefined,
    superlogicaSubscriptionLabel: (row.superlogica_subscription_label as string | null) ?? undefined,
    superlogicaMatchHint: (row.superlogica_match_hint as string | null) ?? undefined,
    receivablesStatus: (row.receivables_status as any) ?? undefined,
    receivablesOverdueAmount: (row.receivables_overdue_amount as number | null) ?? undefined,
    receivablesOpenAmount: (row.receivables_open_amount as number | null) ?? undefined,
    receivablesLastPaymentAt: (row.receivables_last_payment_at as string | null) ?? undefined,
    receivablesLastSyncAt: (row.receivables_last_sync_at as string | null) ?? undefined,
    hasSubprojects: (row.has_subprojects as boolean) ?? false,
    logoUrl: (row.logo_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ultimaAtualizacaoRecursos: (row.ultima_atualizacao_recursos as string | null) ?? undefined,
  };
}

export function contractToDb(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    codigo: contract.codigo,
    nome: contract.nome,
    client_id: contract.clientId,
    tipo: contract.tipo,
    segmento: contract.segmento,
    status: contract.status,
    unidade: contract.unidade ?? null,
    centro_custo: contract.centroCusto ?? null,
    tags: contract.tags ?? [],
    gov_sphere: contract.govSphere ?? null,
    data_inicio: emptyToNull(contract.dataInicio) || new Date().toISOString().split('T')[0],
    data_fim: emptyToNull(contract.dataFim),
    renovacao_automatica: contract.renovacaoAutomatica,
    periodicidade_renovacao: contract.periodicidadeRenovacao ?? null,
    status_renovacao: contract.statusRenovacao,
    renewal_term_months: contract.renewalTermMonths ?? null,
    renewal_base_date: emptyToNull(contract.renewalBaseDate),
    indice_reajuste: contract.indiceReajuste,
    data_base_reajuste: emptyToNull(contract.dataBaseReajuste) || new Date().toISOString().split('T')[0],
    percentual_fixo: contract.percentualFixo ?? null,
    alerta_reajuste_dias: contract.alertaReajusteDias,
    modelo_receita: contract.modeloReceita,
    valor_mensal_referencia: contract.valorMensalReferencia ?? null,
    valor_total_contrato: contract.valorTotalContrato ?? null,
    moeda: contract.moeda,
    observacoes_financeiras: contract.observacoesFinanceiras ?? null,
    objeto: contract.objeto,
    escopo_operacional: contract.escopoOperacional ?? null,
    slas: contract.slas ?? null,
    riscos_pendencias: contract.riscosPendencias ?? null,
    responsavel_interno: contract.responsavelInterno,
    responsavel_cs: contract.responsavelCS ?? null,
    responsavel_comercial: contract.responsavelComercial ?? null,
    responsavel_cliente: contract.responsavelCliente ?? null,
    responsavel_cliente_email: contract.responsavelClienteEmail ?? null,
    responsavel_cliente_telefone: contract.responsavelClienteTelefone ?? null,
    percentual_impostos_faturamento: contract.percentualImpostosFaturamento ?? null,
    superlogica_customer_cnpj: contract.superlogicaCustomerCnpj ?? null,
    superlogica_customer_id: contract.superlogicaCustomerId ?? null,
    superlogica_subscription_id: contract.superlogicaSubscriptionId ?? null,
    superlogica_subscription_label: contract.superlogicaSubscriptionLabel ?? null,
    superlogica_match_hint: contract.superlogicaMatchHint ?? null,
    receivables_status: contract.receivablesStatus ?? null,
    receivables_overdue_amount: contract.receivablesOverdueAmount ?? null,
    receivables_open_amount: contract.receivablesOpenAmount ?? null,
    receivables_last_payment_at: contract.receivablesLastPaymentAt ?? null,
    receivables_last_sync_at: contract.receivablesLastSyncAt ?? null,
    ultima_atualizacao_recursos: contract.ultimaAtualizacaoRecursos ?? null,
    has_subprojects: contract.hasSubprojects ?? false,
    logo_url: contract.logoUrl ?? null,
  };
}

// ─── RESOURCE ─────────────────────────────────────────────────────────────────

export function resourceFromDb(row: Record<string, unknown>): Resource {
  return {
    id: row.id as string,
    contractId: row.contract_id as string,
    tipo: row.tipo as Resource['tipo'],
    hrPersonId: (row.hr_person_id as string | null) ?? undefined,
    nome: row.nome as string,
    cargo: (row.cargo as string | null) ?? undefined,
    senioridade: (row.senioridade as Resource['senioridade']) ?? undefined,
    custoBase: row.custo_base as number,
    percentualDedicacao: row.percentual_dedicacao as number,
    dataInicio: row.data_inicio as string,
    dataFim: (row.data_fim as string | null) ?? undefined,
    observacoes: (row.observacoes as string | null) ?? undefined,
    encargosOverride: (row.encargos_override as number | null) ?? undefined,
    impostosOverride: (row.impostos_override as number | null) ?? undefined,
    categoria: (row.categoria as Resource['categoria']) ?? undefined,
    recorrencia: (row.recorrencia as Resource['recorrencia']) ?? undefined,
    rateioMeses: (row.rateio_meses as number | null) ?? undefined,
    tipoValor: (row.tipo_valor as Resource['tipoValor']) ?? undefined,
    duracaoMeses: (row.duracao_meses as number | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function resourceToDb(resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    contract_id: resource.contractId,
    tipo: resource.tipo,
    hr_person_id: resource.hrPersonId ?? null,
    nome: resource.nome,
    cargo: resource.cargo ?? null,
    senioridade: resource.senioridade ?? null,
    custo_base: resource.custoBase,
    percentual_dedicacao: resource.percentualDedicacao,
    data_inicio: emptyToNull(resource.dataInicio) || new Date().toISOString().split('T')[0],
    data_fim: emptyToNull(resource.dataFim),
    observacoes: resource.observacoes ?? null,
    encargos_override: resource.encargosOverride ?? null,
    impostos_override: resource.impostosOverride ?? null,
    categoria: resource.categoria ?? null,
    recorrencia: resource.recorrencia ?? null,
    rateio_meses: resource.rateioMeses ?? null,
    tipo_valor: resource.tipoValor ?? null,
    duracao_meses: resource.duracaoMeses ?? null,
  };
}

// ─── OVERHEAD ITEM ────────────────────────────────────────────────────────────

export function overheadFromDb(row: Record<string, unknown>): OverheadItem {
  return {
    id: row.id as string,
    contractId: row.contract_id as string,
    categoria: row.categoria as OverheadItem['categoria'],
    nome: row.nome as string,
    modo: row.modo as OverheadItem['modo'],
    percentual: (row.percentual as number | null) ?? undefined,
    valorFixoMensal: (row.valor_fixo_mensal as number | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function overheadToDb(item: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    contract_id: item.contractId,
    categoria: item.categoria,
    nome: item.nome,
    modo: item.modo,
    percentual: item.percentual ?? null,
    valor_fixo_mensal: item.valorFixoMensal ?? null,
  };
}

// ─── HISTORY EVENT ────────────────────────────────────────────────────────────

export function historyEventFromDb(row: Record<string, unknown>): HistoryEvent {
  return {
    id: row.id as string,
    contractId: row.contract_id as string,
    eventDate: row.event_date as string,
    eventType: row.event_type as HistoryEvent['eventType'],
    title: row.title as string,
    description: row.description as string,
    impactArea: row.impact_area as HistoryEvent['impactArea'],
    severity: row.severity as HistoryEvent['severity'],
    relatedValue: (row.related_value as number | null) ?? undefined,
    relatedClause: (row.related_clause as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdByUserId: (row.created_by_user_id as string | null) ?? undefined,
  };
}

export function historyEventToDb(event: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    contract_id: event.contractId,
    event_date: event.eventDate,
    event_type: event.eventType,
    title: event.title,
    description: event.description,
    impact_area: event.impactArea,
    severity: event.severity,
    related_value: event.relatedValue ?? null,
    related_clause: event.relatedClause ?? null,
    created_by_user_id: event.createdByUserId ?? null,
  };
}

// ─── SNAPSHOT ─────────────────────────────────────────────────────────────────

export function snapshotFromDb(row: Record<string, unknown>): Snapshot {
  return {
    id: row.id as string,
    contractId: row.contract_id as string,
    receitaMensal: row.receita_mensal as number,
    custoMensal: row.custo_mensal as number,
    margemMensal: row.margem_mensal as number,
    margemPercentual: row.margem_percentual as number,
    healthStatus: row.health_status as Snapshot['healthStatus'],
    createdAt: row.created_at as string,
    userId: (row.user_id as string | null) ?? undefined,
  };
}

export function snapshotToDb(snapshot: Omit<Snapshot, 'id' | 'createdAt'>): Record<string, unknown> {
  return {
    contract_id: snapshot.contractId,
    receita_mensal: snapshot.receitaMensal,
    custo_mensal: snapshot.custoMensal,
    margem_mensal: snapshot.margemMensal,
    margem_percentual: snapshot.margemPercentual,
    health_status: snapshot.healthStatus,
    user_id: snapshot.userId ?? null,
  };
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export function settingsFromDb(row: Record<string, unknown>): Settings {
  return {
    percentualEncargosCLT: row.percentual_encargos_clt as number,
    percentualImpostosPJ: row.percentual_impostos_pj as number,
    percentualImpostosFaturamento: row.percentual_impostos_faturamento as number,
    valorDolar: row.valor_dolar as number,
    limiarSaudavel: row.limiar_saudavel as number,
    limiarAtencao: row.limiar_atencao as number,
    diasAlertaReajuste: row.dias_alerta_reajuste as number,
    diasAlertaVigencia: row.dias_alerta_vigencia as number,
    diasAlertaDesatualizacao: row.dias_alerta_desatualizacao as number,
    thresholdSubocupacao: (row.threshold_subocupacao as number) ?? 50,
  };
}

export function settingsToDb(settings: Partial<Settings>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (settings.percentualEncargosCLT !== undefined) result.percentual_encargos_clt = settings.percentualEncargosCLT;
  if (settings.percentualImpostosPJ !== undefined) result.percentual_impostos_pj = settings.percentualImpostosPJ;
  if (settings.percentualImpostosFaturamento !== undefined) result.percentual_impostos_faturamento = settings.percentualImpostosFaturamento;
  if (settings.valorDolar !== undefined) result.valor_dolar = settings.valorDolar;
  if (settings.limiarSaudavel !== undefined) result.limiar_saudavel = settings.limiarSaudavel;
  if (settings.limiarAtencao !== undefined) result.limiar_atencao = settings.limiarAtencao;
  if (settings.diasAlertaReajuste !== undefined) result.dias_alerta_reajuste = settings.diasAlertaReajuste;
  if (settings.diasAlertaVigencia !== undefined) result.dias_alerta_vigencia = settings.diasAlertaVigencia;
  if (settings.diasAlertaDesatualizacao !== undefined) result.dias_alerta_desatualizacao = settings.diasAlertaDesatualizacao;
  if (settings.thresholdSubocupacao !== undefined) result.threshold_subocupacao = settings.thresholdSubocupacao;
  return result;
}

// ─── DOCUMENT ATTACHMENT ──────────────────────────────────────────────────────

export function attachmentFromDb(row: Record<string, unknown>): DocumentAttachment {
  return {
    id: row.id as string,
    contractId: row.contract_id as string,
    fileName: row.file_name as string,
    fileSizeBytes: row.file_size_bytes as number,
    fileTypeMime: row.file_type_mime as string,
    fileExtension: row.file_extension as string,
    descriptionType: row.description_type as string,
    descriptionText: (row.description_text as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    uploadedAt: row.uploaded_at as string,
    uploadedByUserId: (row.uploaded_by_user_id as string | null) ?? undefined,
    storageKey: row.storage_key as string,
  };
}

export function attachmentToDb(att: Omit<DocumentAttachment, 'id'>): Record<string, unknown> {
  return {
    contract_id: att.contractId,
    file_name: att.fileName,
    file_size_bytes: att.fileSizeBytes,
    file_type_mime: att.fileTypeMime,
    file_extension: att.fileExtension,
    description_type: att.descriptionType,
    description_text: att.descriptionText ?? null,
    notes: att.notes ?? null,
    uploaded_at: att.uploadedAt,
    uploaded_by_user_id: att.uploadedByUserId ?? null,
    storage_key: att.storageKey,
  };
}

// ─── ATTACHMENT DESCRIPTION CONFIG ────────────────────────────────────────────

export function attachmentConfigFromDb(row: Record<string, unknown>): AttachmentDescriptionConfig {
  return {
    id: row.id as string,
    label: row.label as string,
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
  };
}

export function attachmentConfigToDb(config: Omit<AttachmentDescriptionConfig, 'id'>): Record<string, unknown> {
  return {
    label: config.label,
    is_active: config.isActive,
    sort_order: config.sortOrder,
  };
}

// ─── JOB TITLE ────────────────────────────────────────────────────────────────

export function jobTitleFromDb(row: Record<string, unknown>): JobTitle {
  return {
    id: row.id as string,
    label: row.label as string,
    isActive: row.is_active as boolean,
    teamId: (row.team_id as string | null) ?? undefined,
  };
}

export function jobTitleToDb(jt: Omit<JobTitle, 'id'>): Record<string, unknown> {
  return {
    label: jt.label,
    is_active: jt.isActive,
    team_id: jt.teamId ?? null,
  };
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────

export function teamFromDb(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
  };
}

export function teamToDb(team: Omit<Team, 'id'>): Record<string, unknown> {
  return {
    name: team.name,
    description: team.description ?? null,
    is_active: team.isActive,
    sort_order: team.sortOrder,
  };
}

// ─── SIMULATION ───────────────────────────────────────────────────────────────

export function simulationHRFromDb(row: Record<string, unknown>): SimulationHRItem & { isSuggested: boolean } {
  return {
    id: row.id as string,
    role: row.role as string,
    hiringType: row.hiring_type as 'clt' | 'pj',
    quantity: row.quantity as number,
    grossMonthly: row.gross_monthly as number,
    chargesPercent: row.charges_percent as number,
    isSuggested: row.is_suggested as boolean,
  };
}

export function simulationHRToDb(item: SimulationHRItem & { isSuggested: boolean; simulationId: string }): Record<string, unknown> {
  return {
    simulation_id: item.simulationId,
    role: item.role,
    hiring_type: item.hiringType,
    quantity: item.quantity,
    gross_monthly: item.grossMonthly,
    charges_percent: item.chargesPercent,
    is_suggested: item.isSuggested,
  };
}

export function simulationOtherCostFromDb(row: Record<string, unknown>): SimulationOtherCost & { isSuggested: boolean } {
  return {
    id: row.id as string,
    category: row.category as string,
    description: row.description as string,
    valueMonthly: row.value_monthly as number,
    isSuggested: row.is_suggested as boolean,
  };
}

export function simulationOtherCostToDb(item: SimulationOtherCost & { isSuggested: boolean; simulationId: string }): Record<string, unknown> {
  return {
    simulation_id: item.simulationId,
    category: item.category,
    description: item.description,
    value_monthly: item.valueMonthly,
    is_suggested: item.isSuggested,
  };
}

export function simulationFromDb(
  row: Record<string, unknown>,
  hrRows: (SimulationHRItem & { isSuggested: boolean })[],
  costRows: (SimulationOtherCost & { isSuggested: boolean })[],
): ContractSimulation {
  const suggestedOverhead = (row.suggested_overhead ?? { infraPercent: 0, adminPercent: 0, governancePercent: 0 }) as ContractSimulation['suggestedOverhead'];
  const customOverhead = (row.custom_overhead ?? { infraPercent: 0, adminPercent: 0, governancePercent: 0 }) as ContractSimulation['customOverhead'];

  return {
    id: row.id as string,
    name: row.name as string,
    clientName: row.client_name as string,
    contractType: row.contract_type as ContractSimulation['contractType'],
    govSphere: (row.gov_sphere as ContractSimulation['govSphere']) ?? undefined,
    expectedStartDate: (row.expected_start_date as string | null) ?? undefined,
    termMonths: row.term_months as number,
    pricingModel: (row.pricing_model as ContractSimulation['pricingModel']) ?? undefined,
    proposedMonthlyValue: (row.proposed_monthly_value as number | null) ?? undefined,
    proposedTotalValue: (row.proposed_total_value as number | null) ?? undefined,
    description: row.description as string,
    consultancyCost: (row.consultancy_cost as number | null) ?? undefined,
    responsavelCliente: (row.responsavel_cliente as string | null) ?? undefined,
    responsavelClienteEmail: (row.responsavel_cliente_email as string | null) ?? undefined,
    responsavelClienteTelefone: (row.responsavel_cliente_telefone as string | null) ?? undefined,
    complexityLevel: row.complexity_level as ContractSimulation['complexityLevel'],
    questionnaire: normalizeDemandType((row.questionnaire ?? {}) as ContractSimulation['questionnaire']),
    suggestedHR: hrRows.filter(h => h.isSuggested),
    suggestedOtherCosts: costRows.filter(c => c.isSuggested),
    suggestedOverhead,
    customHR: hrRows.filter(h => !h.isSuggested),
    customOtherCosts: costRows.filter(c => !c.isSuggested),
    customOverhead,
    usingSuggested: row.using_suggested as boolean,
    status: row.status as ContractSimulation['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    consultantAnalysis: (row.consultant_analysis as string | null) ?? undefined,
    aiNotes: (row.ai_notes as string | null) ?? undefined,
    aiConfidence: (row.ai_confidence as Record<string, string> | null) ?? undefined,
    aiCoverage: (row.ai_coverage as ContractSimulation['aiCoverage'] | null) ?? undefined,
    aiComplexityJustification: (row.ai_complexity_justification as string | null) ?? undefined,
    createdByUserId: (row.created_by_user_id as string | null) ?? undefined,
  };
}

export function simulationToDb(sim: ContractSimulation): Record<string, unknown> {
  return {
    id: sim.id,
    name: sim.name,
    client_name: sim.clientName,
    contract_type: sim.contractType,
    gov_sphere: sim.govSphere ?? null,
    expected_start_date: emptyToNull(sim.expectedStartDate),
    term_months: sim.termMonths,
    pricing_model: sim.pricingModel ?? null,
    proposed_monthly_value: sim.proposedMonthlyValue ?? null,
    proposed_total_value: sim.proposedTotalValue ?? null,
    description: sim.description,
    consultancy_cost: sim.consultancyCost ?? null,
    responsavel_cliente: sim.responsavelCliente ?? null,
    responsavel_cliente_email: sim.responsavelClienteEmail ?? null,
    responsavel_cliente_telefone: sim.responsavelClienteTelefone ?? null,
    complexity_level: sim.complexityLevel,
    questionnaire: sim.questionnaire,
    suggested_overhead: sim.suggestedOverhead,
    custom_overhead: sim.customOverhead,
    using_suggested: sim.usingSuggested,
    consultant_analysis: sim.consultantAnalysis ?? null,
    ai_notes: sim.aiNotes ?? null,
    ai_confidence: sim.aiConfidence ?? null,
    ai_coverage: sim.aiCoverage ?? null,
    ai_complexity_justification: sim.aiComplexityJustification ?? null,
    status: sim.status,
    created_by_user_id: sim.createdByUserId ?? null,
  };
}

// ─── HR PERSON ────────────────────────────────────────────────────────────────

export function hrPersonFromDb(row: Record<string, unknown>): HRPerson {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipoVinculo: row.tipo_vinculo as HRPerson['tipoVinculo'],
    cargoId: (row.cargo_id as string | null) ?? undefined,
    teamId: (row.team_id as string | null) ?? undefined,
    remuneracaoMensal: row.remuneracao_mensal as number,
    beneficios: row.beneficios as number,
    localAtuacao: (row.local_atuacao as string | null) ?? undefined,
    regimeTrabalho: (row.regime_trabalho as HRPerson['regimeTrabalho']) ?? undefined,
    regimeObservacoes: (row.regime_observacoes as string | null) ?? undefined,
    dataAdmissao: row.data_admissao as string,
    situacao: row.situacao as HRPerson['situacao'],
    observacoes: (row.observacoes as string | null) ?? undefined,
    comiteGestor: (row.comite_gestor as string | null) ?? undefined,
    dataDesligamento: (row.data_desligamento as string | null) ?? undefined,
    motivoDesligamento: (row.motivo_desligamento as string | null) ?? undefined,
    tipoDesligamento: (row.tipo_desligamento as HRPerson['tipoDesligamento']) ?? undefined,
    nivel: (row.nivel as string | null) ?? undefined,
    trilha: (row.trilha as string | null) ?? undefined,
    projeto: (row.projeto as string | null) ?? undefined,
    cargoAntigo: (row.cargo_antigo as string | null) ?? undefined,
    remuneracaoII: (row.remuneracao_ii as number | null) ?? undefined,
    observacoesDesligamento: (row.observacoes_desligamento as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    celular: (row.celular as string | null) ?? undefined,
    idExterno: (row.id_externo as string | null) ?? undefined,
    centroCusto: (row.centro_custo as string | null) ?? undefined,
    beneficioNome: (row.beneficio_nome as string | null) ?? undefined,
    beneficioSomaRemuneracao: (row.beneficio_soma_remuneracao as boolean | null) ?? undefined,
    beneficiosLista: Array.isArray(row.beneficios_lista) ? row.beneficios_lista as any[] : [],
    source: (row.source as string | null) ?? undefined,
    syncStatus: (row.sync_status as string | null) ?? undefined,
    lastSyncedAt: (row.last_synced_at as string | null) ?? undefined,
    matricula: (row.matricula as string | null) ?? undefined,
    nomeNormalizado: (row.nome_normalizado as string | null) ?? undefined,
    isTalento: (row.is_talento as boolean | null) ?? false,
    isGuardiao: (row.is_guardiao as boolean | null) ?? false,
    isEmAvaliacao: (row.is_em_avaliacao as boolean | null) ?? false,
    enderecoCep: (row.endereco_cep as string | null) ?? undefined,
    enderecoLogradouro: (row.endereco_logradouro as string | null) ?? undefined,
    enderecoNumero: (row.endereco_numero as string | null) ?? undefined,
    enderecoSemNumero: (row.endereco_sem_numero as boolean | null) ?? undefined,
    enderecoComplemento: (row.endereco_complemento as string | null) ?? undefined,
    enderecoBairro: (row.endereco_bairro as string | null) ?? undefined,
    enderecoMunicipio: (row.endereco_municipio as string | null) ?? undefined,
    enderecoUf: (row.endereco_uf as string | null) ?? undefined,
    fotoUrl: (row.foto_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function hrPersonToDb(p: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    nome: p.nome,
    tipo_vinculo: p.tipoVinculo,
    cargo_id: p.cargoId ?? null,
    team_id: p.teamId ?? null,
    remuneracao_mensal: p.remuneracaoMensal,
    beneficios: p.beneficios,
    local_atuacao: p.localAtuacao ?? null,
    regime_trabalho: p.regimeTrabalho ?? null,
    regime_observacoes: p.regimeObservacoes ?? null,
    data_admissao: emptyToNull(p.dataAdmissao) || new Date().toISOString().split('T')[0],
    situacao: p.situacao,
    observacoes: p.observacoes ?? null,
    comite_gestor: p.comiteGestor ?? null,
    data_desligamento: emptyToNull(p.dataDesligamento),
    motivo_desligamento: p.motivoDesligamento ?? null,
    tipo_desligamento: p.tipoDesligamento ?? null,
    nivel: p.nivel ?? null,
    trilha: p.trilha ?? null,
    projeto: p.projeto ?? null,
    cargo_antigo: p.cargoAntigo ?? null,
    remuneracao_ii: p.remuneracaoII ?? null,
    observacoes_desligamento: p.observacoesDesligamento ?? null,
    email: p.email ?? null,
    celular: p.celular ?? null,
    id_externo: p.idExterno ?? null,
    centro_custo: p.centroCusto ?? null,
    beneficio_nome: p.beneficioNome ?? null,
    beneficio_soma_remuneracao: p.beneficioSomaRemuneracao ?? false,
    beneficios_lista: p.beneficiosLista ?? [],
    source: p.source ?? null,
    sync_status: p.syncStatus ?? null,
    last_synced_at: p.lastSyncedAt ?? null,
    matricula: p.matricula ?? null,
    nome_normalizado: p.nomeNormalizado ?? null,
    is_talento: p.isTalento ?? false,
    is_guardiao: p.isGuardiao ?? false,
    is_em_avaliacao: p.isEmAvaliacao ?? false,
    endereco_cep: p.enderecoCep ?? null,
    endereco_logradouro: p.enderecoLogradouro ?? null,
    endereco_numero: p.enderecoNumero ?? null,
    endereco_sem_numero: p.enderecoSemNumero ?? false,
    endereco_complemento: p.enderecoComplemento ?? null,
    endereco_bairro: p.enderecoBairro ?? null,
    endereco_municipio: p.enderecoMunicipio ?? null,
    endereco_uf: p.enderecoUf ?? null,
    foto_url: p.fotoUrl ?? null,
  };
}

// ─── HR TIMELINE ──────────────────────────────────────────────────────────────

export function hrTimelineFromDb(row: Record<string, unknown>): HRTimelineEvent {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    eventDate: row.event_date as string,
    ocorrencia: row.ocorrencia as HRTimelineEvent['ocorrencia'],
    descricao: row.descricao as string,
    valor: (row.valor as number | null) ?? undefined,
    remuneracaoApos: (row.remuneracao_apos as number | null) ?? undefined,
    beneficiosApos: (row.beneficios_apos as number | null) ?? undefined,
    atualizarRemuneracao: row.atualizar_remuneracao as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function hrTimelineToDb(e: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    person_id: e.personId,
    event_date: e.eventDate,
    ocorrencia: e.ocorrencia,
    descricao: e.descricao,
    valor: e.valor ?? null,
    remuneracao_apos: e.remuneracaoApos ?? null,
    beneficios_apos: e.beneficiosApos ?? null,
    atualizar_remuneracao: e.atualizarRemuneracao,
  };
}

// ============================================
// Monthly Reports mappers
// ============================================
export function monthlyReportFromDb(row: Record<string, any>): MonthlyReport {
  return {
    id: row.id,
    contractId: row.contract_id,
    month: row.month,
    year: row.year,
    status: row.status as ReportStatus,
    asanaProjectId: row.asana_project_id ?? undefined,
    clientEmailDomain: row.client_email_domain ?? undefined,
    createdBy: row.created_by ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function monthlyReportToDb(r: Partial<MonthlyReport>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (r.contractId !== undefined) out.contract_id = r.contractId;
  if (r.month !== undefined) out.month = r.month;
  if (r.year !== undefined) out.year = r.year;
  if (r.status !== undefined) out.status = r.status;
  if (r.asanaProjectId !== undefined) out.asana_project_id = emptyToNull(r.asanaProjectId);
  if (r.clientEmailDomain !== undefined) out.client_email_domain = emptyToNull(r.clientEmailDomain);
  if (r.createdBy !== undefined) out.created_by = r.createdBy ?? null;
  if (r.reviewedBy !== undefined) out.reviewed_by = r.reviewedBy ?? null;
  if (r.publishedAt !== undefined) out.published_at = r.publishedAt ?? null;
  return out;
}

export function reportSectionFromDb(row: Record<string, any>): ReportSection {
  return {
    id: row.id,
    reportId: row.report_id,
    sectionKey: row.section_key as ReportSectionKey,
    content: (row.content ?? {}) as Record<string, unknown>,
    source: row.source as ReportSectionSource,
    syncedAt: row.synced_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function reportSectionToDb(s: Partial<ReportSection>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.reportId !== undefined) out.report_id = s.reportId;
  if (s.sectionKey !== undefined) out.section_key = s.sectionKey;
  if (s.content !== undefined) out.content = s.content as unknown;
  if (s.source !== undefined) out.source = s.source;
  if (s.syncedAt !== undefined) out.synced_at = s.syncedAt ?? null;
  return out;
}

export function reportTemplateConfigFromDb(row: Record<string, any>): ReportTemplateConfig {
  return {
    id: row.id,
    contractId: row.contract_id,
    showHistoricoTr: row.show_historico_tr ?? true,
    showEvolucaoInovacao: row.show_evolucao_inovacao ?? true,
    showEntregas: row.show_entregas ?? true,
    showPriorizadas: row.show_priorizadas ?? true,
    showDemonstrativoHoras: row.show_demonstrativo_horas ?? true,
    showEficienciaOperacional: row.show_eficiencia_operacional ?? true,
    showEficienciaPrevisibilidade: row.show_eficiencia_previsibilidade ?? true,
    showDesempenhoAplicacao: row.show_desempenho_aplicacao ?? true,
    showEngajamentoUsuario: row.show_engajamento_usuario ?? true,
    showMaturidadePlataforma: row.show_maturidade_plataforma ?? true,
    showTreinamentosReunioes: row.show_treinamentos_reunioes ?? true,
    showOportunidadesAtencao: row.show_oportunidades_atencao ?? true,
    asanaProjectId: row.asana_project_id ?? undefined,
    clientEmailDomain: row.client_email_domain ?? undefined,
    firefliesKeywords: row.fireflies_keywords ?? [],
    milvusClientNames: row.milvus_client_names ?? [],
  };
}

export function reportTemplateConfigToDb(c: Partial<ReportTemplateConfig>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.contractId !== undefined) out.contract_id = c.contractId;
  if (c.showHistoricoTr !== undefined) out.show_historico_tr = c.showHistoricoTr;
  if (c.showEvolucaoInovacao !== undefined) out.show_evolucao_inovacao = c.showEvolucaoInovacao;
  if (c.showEntregas !== undefined) out.show_entregas = c.showEntregas;
  if (c.showPriorizadas !== undefined) out.show_priorizadas = c.showPriorizadas;
  if (c.showDemonstrativoHoras !== undefined) out.show_demonstrativo_horas = c.showDemonstrativoHoras;
  if (c.showEficienciaOperacional !== undefined) out.show_eficiencia_operacional = c.showEficienciaOperacional;
  if (c.showEficienciaPrevisibilidade !== undefined) out.show_eficiencia_previsibilidade = c.showEficienciaPrevisibilidade;
  if (c.showDesempenhoAplicacao !== undefined) out.show_desempenho_aplicacao = c.showDesempenhoAplicacao;
  if (c.showEngajamentoUsuario !== undefined) out.show_engajamento_usuario = c.showEngajamentoUsuario;
  if (c.showMaturidadePlataforma !== undefined) out.show_maturidade_plataforma = c.showMaturidadePlataforma;
  if (c.showTreinamentosReunioes !== undefined) out.show_treinamentos_reunioes = c.showTreinamentosReunioes;
  if (c.showOportunidadesAtencao !== undefined) out.show_oportunidades_atencao = c.showOportunidadesAtencao;
  if (c.asanaProjectId !== undefined) out.asana_project_id = emptyToNull(c.asanaProjectId);
  if (c.clientEmailDomain !== undefined) out.client_email_domain = emptyToNull(c.clientEmailDomain);
  if (c.firefliesKeywords !== undefined) out.fireflies_keywords = c.firefliesKeywords ?? [];
  if (c.milvusClientNames !== undefined) out.milvus_client_names = c.milvusClientNames ?? [];
  return out;
}

export function reportCollaboratorFromDb(row: Record<string, any>): ReportCollaborator {
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    role: row.role as ReportCollaborator['role'],
    addedAt: row.added_at,
  };
}
