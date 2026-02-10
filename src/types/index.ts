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
  
  // Vigência
  dataInicio: string;
  dataFim: string;
  renovacaoAutomatica: boolean;
  periodicidadeRenovacao?: string;
  statusRenovacao: RenewalStatus;
  
  // Reajuste
  indiceReajuste: string;
  dataBaseReajuste: string;
  percentualFixo?: number;
  alertaReajusteDias: number;
  
  // Receita
  modeloReceita: RevenueModel;
  valorMensalReferencia?: number;
  valorTotalContrato?: number;
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
  
  createdAt: string;
  updatedAt: string;
  ultimaAtualizacaoRecursos?: string;
}

// Resource Types
export type ResourceType = 'clt' | 'pj' | 'outro';
export type OtherCostCategory = 'cloud' | 'licenca' | 'equipamento' | 'terceiros' | 'outros' | 'consultoria';
export type Seniority = 'junior' | 'pleno' | 'senior' | 'especialista';

export interface Resource {
  id: string;
  contractId: string;
  tipo: ResourceType;
  
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
  | 'desatualizacao';

export type AlertSeverity = 'atencao' | 'critico';

export interface Alert {
  id: string;
  contractId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  recommendation: string;
  createdAt: string;
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
  custoTotal?: number;
  margemTotal?: number;
}

// Computed Types
export interface ContractHealth {
  contractId: string;
  receitaMensal: number;
  custoMensal: number;
  margemMensal: number;
  margemPercentual: number;
  status: HealthStatus;
}
