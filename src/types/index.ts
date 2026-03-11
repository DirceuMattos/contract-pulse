// Team Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

// Job Title Types
export interface JobTitle {
  id: string;
  label: string;
  isActive: boolean;
  teamId?: string;
}

// User and Auth Types
export type UserRole = 'c-level' | 'intermediario' | 'leitor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// Client Types
export interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  site?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  contatoPrincipal: string;
  email: string;
  telefone?: string;
  segmento: 'govtech' | 'privado';
  tags: string[];
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

// Contract Types
export type ContractType = 'sistema' | 'infraestrutura' | 'hibrido';
export type ContractSegment = 'govtech' | 'privado';
export type ContractStatus = 'implantacao' | 'operacao' | 'suspenso' | 'encerrado';
export type GovSphere = 'municipal' | 'estadual' | 'federal';
export type RenewalStatus = 'negociacao' | 'renovado' | 'sem-tratativa';
export type RevenueModel = 'mrr' | 'media-mensal';
export type HealthStatus = 'saudavel' | 'atencao' | 'critico';

export interface Contract {
  id: string;
  codigo: string;
  nome: string;
  clientId: string;
  tipo: ContractType;
  segmento: ContractSegment;
  status: ContractStatus;
  unidade?: string;
  centroCusto?: string;
  tags: string[];
  govSphere?: GovSphere;
  
  // Vigência
  dataInicio: string;
  dataFim?: string;
  renovacaoAutomatica: boolean;
  periodicidadeRenovacao?: string;
  statusRenovacao: RenewalStatus;
  renewalTermMonths?: number;
  renewalBaseDate?: string;
  
  // Reajuste
  indiceReajuste: string;
  dataBaseReajuste: string;
  percentualFixo?: number;
  alertaReajusteDias: number;
  
  // Receita
  modeloReceita: RevenueModel;
  valorMensalReferencia?: number;
  valorTotalContrato?: number;
  percentualImpostosFaturamento?: number;
  moeda: 'BRL' | 'USD';
  observacoesFinanceiras?: string;
  
  // Escopo
  objeto: string;
  escopoOperacional?: string;
  slas?: string;
  riscosPendencias?: string;
  
  // Responsáveis
  responsavelInterno: string;
  responsavelCS?: string;
  responsavelComercial?: string;
  responsavelCliente?: string;
  responsavelClienteEmail?: string;
  responsavelClienteTelefone?: string;
  
  hasSubprojects?: boolean;
  createdAt: string;
  updatedAt: string;
  ultimaAtualizacaoRecursos?: string;
}

// Subproject Types
export type SubprojectStatus = 'ativo' | 'suspenso' | 'encerrado';

export interface ContractSubproject {
  id: string;
  contractId: string;
  name: string;
  description?: string;
  status: SubprojectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubprojectAllocation {
  id: string;
  subprojectId: string;
  hrPersonId?: string | null;
  resourceId?: string | null;
  overheadItemId?: string | null;
  dedicationPercent: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Resource Types
export type ResourceType = 'clt' | 'pj' | 'outro';
export type OtherCostCategory = 'cloud' | 'licenca' | 'equipamento' | 'terceiros' | 'outros' | 'consultoria' | 'ia' | 'acessibilidade';
export type Seniority = 'junior' | 'pleno' | 'senior' | 'especialista';

export interface Resource {
  id: string;
  contractId: string;
  tipo: ResourceType;
  hrPersonId?: string; // FK para RH Mestre
  
  // Common fields
  nome: string;
  cargo?: string;
  senioridade?: Seniority;
  custoBase: number;
  percentualDedicacao: number;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
  
  // CLT specific
  encargosOverride?: number;
  
  // PJ specific
  impostosOverride?: number;
  
  // Outros specific
  categoria?: OtherCostCategory;
  recorrencia?: 'mensal' | 'anual' | 'unico';
  rateioMeses?: number;
  
  // Consultoria specific
  tipoValor?: 'mensal' | 'totalPeriodo';
  duracaoMeses?: number;

  createdAt: string;
  updatedAt: string;
}

// Overhead Types
export type OverheadMode = 'percentual' | 'fixo';
export type OverheadCategory = 'infraestrutura' | 'administrativo' | 'governanca';

export interface OverheadItem {
  id: string;
  contractId: string;
  categoria: OverheadCategory;
  nome: string;
  modo: OverheadMode;
  percentual?: number;
  valorFixoMensal?: number;
  createdAt: string;
  updatedAt: string;
}

// Settings Types
export interface Settings {
  percentualEncargosCLT: number;
  percentualImpostosPJ: number;
  percentualImpostosFaturamento: number;
  valorDolar: number;
  limiarSaudavel: number;
  limiarAtencao: number;
  diasAlertaReajuste: number;
  diasAlertaVigencia: number;
  diasAlertaDesatualizacao: number;
}

// Alert Types
export type AlertType = 
  | 'tendencia-deterioracao'
  | 'concentracao-custo'
  | 'reajuste-proximo'
  | 'vigencia-fim'
  | 'desatualizacao'
  | 'financeiro-deficit'
  | 'financeiro-margem-baixa'
  | 'vigencia-vencido'
  | 'governanca-contatos'
  | 'renovacao-proxima'
  | 'hr-links-quebrados';

export type AlertSeverity = 'atencao' | 'critico' | 'info';

export type AlertCategory = 'financeiro' | 'prazo' | 'reajuste' | 'governanca';

export interface Alert {
  id: string;
  contractId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  recommendation: string;
  createdAt: string;
  alertCategory?: AlertCategory;
}

// Notification Types (for in-app notification center)
export interface Notification {
  id: string;
  alertId: string;
  contractId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  read: boolean;
  browserNotified: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  browserPermissionStatus: 'default' | 'granted' | 'denied';
  notifyOnCritical: boolean;
  notifyOnWarning: boolean;
}

// Snapshot Types
export interface Snapshot {
  id: string;
  contractId: string;
  receitaMensal: number;
  custoMensal: number;
  margemMensal: number;
  margemPercentual: number;
  healthStatus: HealthStatus;
  createdAt: string;
  userId?: string;
}

// Dashboard Types
export interface DashboardKPIs {
  totalContratos: number;
  contratosGovtech: number;
  contratosPrivado: number;
  contratosSistema: number;
  contratosInfraestrutura: number;
  contratosHibrido: number;
  contratosSaudavel: number;
  contratosAtencao: number;
  contratosCritico: number;
  receitaTotal?: number;
  receitaLiquidaTotal?: number;
  custoTotal?: number;
  margemTotal?: number;
}

// History Event Types
export type HistoryEventType =
  | 'assinatura'
  | 'inicio-vigencia'
  | 'aditivo'
  | 'reajuste-aplicado'
  | 'notificacao-recebida'
  | 'notificacao-enviada'
  | 'multa-penalidade'
  | 'marco-operacional'
  | 'reuniao-ata'
  | 'ocorrencia'
  | 'renegociacao'
  | 'renovacao'
  | 'encerramento'
  | 'outro';

export type HistoryImpactArea =
  | 'financeiro'
  | 'prazo'
  | 'reajuste'
  | 'juridico'
  | 'operacional'
  | 'governanca';

export interface HistoryEvent {
  id: string;
  contractId: string;
  eventDate: string;
  eventType: HistoryEventType;
  title: string;
  description: string;
  impactArea: HistoryImpactArea;
  severity: AlertSeverity;
  relatedValue?: number;
  relatedClause?: string;
  createdAt: string;
  createdByUserId?: string;
  updatedAt?: string;
}

// Document Attachment Types
export type DocumentDescriptionType = 
  | 'contrato' | 'aditivo' | 'reajuste' | 'notificacao' 
  | 'multa-penalidade' | 'ata-reuniao' | 'proposta-comercial' | 'outro';

export interface DocumentAttachment {
  id: string;
  contractId: string;
  fileName: string;
  fileSizeBytes: number;
  fileTypeMime: string;
  fileExtension: string;
  descriptionType: string;
  descriptionText?: string;
  notes?: string;
  uploadedAt: string;
  uploadedByUserId?: string;
  storageKey: string;
}

export interface AttachmentDescriptionConfig {
  id: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

// Access Log Types
export interface AccessLogSession {
  id: string;
  userId: string;
  userNameSnapshot: string;
  ipAddress: string;
  userAgent: string;
  startedAt: string;
  endedAt: string | null;
  modulesAccessed: string[];
  routesAccessed: string[];
  lastActivityAt: string | null;
}

// Computed Types
export interface ContractHealth {
  contractId: string;
  receitaBruta: number;
  receitaMensal: number;
  receitaLiquida: number;
  percentualImpostos: number;
  custoMensal: number;
  margemMensal: number;
  margemPercentual: number;
  status: HealthStatus;
}

// HR Module Types
export type HRTipoVinculo = 'clt' | 'pj' | 'cooperado' | 'socio' | 'estagio';
export type HRSituacao = 'ativo' | 'inativo';
export type HRTipoDesligamento = 'dispensado' | 'solicitou-dispensa' | 'transferido-grupo' | 'outro';
export type HROcorrencia = 'reajuste' | 'bonificacao' | 'beneficio' | 'mudanca-cargo' | 'observacao' | 'desligamento' | 'outro';

export interface BeneficioItem {
  nome: string;
  valor: number;
  somaRemuneracao: boolean;
}

export interface HRPerson {
  id: string;
  nome: string;
  tipoVinculo: HRTipoVinculo;
  cargoId?: string;
  teamId?: string;
  remuneracaoMensal: number;
  beneficios: number;
  localAtuacao?: string;
  dataAdmissao: string;
  situacao: HRSituacao;
  observacoes?: string;
  comiteGestor?: string;
  dataDesligamento?: string;
  motivoDesligamento?: string;
  tipoDesligamento?: HRTipoDesligamento;
  // Novos campos
  nivel?: string;
  trilha?: string;
  projeto?: string;
  cargoAntigo?: string;
  remuneracaoII?: number;
  observacoesDesligamento?: string;
  email?: string;
  celular?: string;
  idExterno?: string;
  centroCusto?: string;
  beneficioNome?: string;
  beneficioSomaRemuneracao?: boolean;
  beneficiosLista?: BeneficioItem[];
  source?: string;
  syncStatus?: string;
  lastSyncedAt?: string;
  nomeNormalizado?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HRTimelineEvent {
  id: string;
  personId: string;
  eventDate: string;
  ocorrencia: HROcorrencia;
  descricao: string;
  valor?: number;
  remuneracaoApos?: number;
  beneficiosApos?: number;
  atualizarRemuneracao: boolean;
  createdAt: string;
  updatedAt: string;
}

// Simulation Types
export type SimulationContractType = 'gov' | 'private';
export type SimulationComplexity = 'baixa' | 'media' | 'alta';
export type SimulationPricingModel = 'mensal' | 'total';
export type SimulationStatus = 'draft' | 'archived';

export type DemandType = 'sustentacao' | 'evolucao' | 'novo-sistema' | 'implantacao';
export type CriticalityLevel = 'baixa' | 'media' | 'alta';
export type IntegrationCount = 'nenhuma' | '1-2' | '3-5' | 'mais-5';
export type ModuleCount = '1-2' | '3-5' | '6-10' | 'mais-10';
export type UserVolume = 'menos-200' | '200-2k' | '2k-20k' | 'mais-20k';
export type SLALevel = 'comercial' | '12x5' | '24x7';
export type DeliveryPace = 'flexivel' | 'moderado' | 'agressivo';

export interface SimulationQuestionnaire {
  demandType: DemandType | DemandType[];
  criticality: CriticalityLevel;
  integrations: IntegrationCount;
  modules: ModuleCount;
  userVolume: UserVolume;
  slaLevel: SLALevel;
  deliveryPace: DeliveryPace;
  fieldDependency: boolean;
}

export interface SimulationHRItem {
  id: string;
  role: string;
  hiringType: 'clt' | 'pj';
  quantity: number;
  grossMonthly: number;
  chargesPercent: number;
}

export interface SimulationOtherCost {
  id: string;
  category: string;
  description: string;
  valueMonthly: number;
}

export interface SimulationOverhead {
  infraPercent: number;
  adminPercent: number;
  governancePercent: number;
}

export interface SimulationScenario {
  label: string;
  receitaMensal: number;
  custoMensal: number;
  overheadMensal: number;
  resultadoMensal: number;
  margemPercent: number;
  healthStatus: HealthStatus;
}

export interface ContractSimulation {
  id: string;
  name: string;
  clientName: string;
  contractType: SimulationContractType;
  govSphere?: GovSphere;
  expectedStartDate?: string;
  termMonths: number;
  pricingModel?: SimulationPricingModel;
  proposedMonthlyValue?: number;
  proposedTotalValue?: number;
  description: string;
  consultancyCost?: number;
  responsavelCliente?: string;
  responsavelClienteEmail?: string;
  responsavelClienteTelefone?: string;
  complexityLevel: SimulationComplexity;
  questionnaire: SimulationQuestionnaire;
  suggestedHR: SimulationHRItem[];
  suggestedOtherCosts: SimulationOtherCost[];
  suggestedOverhead: SimulationOverhead;
  customHR: SimulationHRItem[];
  customOtherCosts: SimulationOtherCost[];
  customOverhead: SimulationOverhead;
  usingSuggested: boolean;
  consultantAnalysis?: string;
  status: SimulationStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
}
