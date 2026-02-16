import type {
  Client, Contract, Resource, Settings, Alert, Snapshot,
  OverheadItem, HistoryEvent, DocumentAttachment,
  AttachmentDescriptionConfig, ContractSimulation,
} from '@/types';
import type { AccessLogSession } from '@/types';

// ── Error type ──
export class ProviderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ProviderError';
  }
}

// ── Filter types ──
export interface ContractFilters {
  clientId?: string;
  status?: string;
  segmento?: string;
  search?: string;
}

export interface SimulationFilters {
  status?: string;
  contractType?: string;
  search?: string;
}

// ── Provider interfaces ──

export interface ClientsProvider {
  list(): Promise<Client[]>;
  getById(id: string): Promise<Client | undefined>;
  create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ContractsProvider {
  list(filters?: ContractFilters): Promise<Contract[]>;
  getById(id: string): Promise<Contract | undefined>;
  create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract>;
  update(id: string, data: Partial<Contract>): Promise<void>;
  delete(id: string): Promise<void>;
  getByClient(clientId: string): Promise<Contract[]>;
}

export interface ResourcesProvider {
  listByContract(contractId: string): Promise<Resource[]>;
  create(data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource>;
  update(id: string, data: Partial<Resource>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface HistoryProvider {
  listByContract(contractId: string): Promise<HistoryEvent[]>;
  create(data: Omit<HistoryEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<HistoryEvent>;
  update(id: string, data: Partial<HistoryEvent>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface DocumentsProvider {
  listByContract(contractId: string): Promise<DocumentAttachment[]>;
  create(data: Omit<DocumentAttachment, 'id'>): Promise<DocumentAttachment>;
  delete(id: string): Promise<void>;
}

export interface OverheadProvider {
  listByContract(contractId: string): Promise<OverheadItem[]>;
  create(data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<OverheadItem>;
  update(id: string, data: Partial<OverheadItem>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SettingsProvider {
  get(): Promise<Settings>;
  update(data: Partial<Settings>): Promise<void>;
}

export interface SnapshotsProvider {
  listByContract(contractId: string): Promise<Snapshot[]>;
  create(data: Omit<Snapshot, 'id' | 'createdAt'>): Promise<Snapshot>;
}

export interface UsersProvider {
  list(): Promise<any[]>;
  getById(id: string): Promise<any | undefined>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<void>;
  delete(id: string): Promise<void>;
  validateCredentials(email: string, password: string): any;
}

export interface AccessLogsProvider {
  list(): Promise<AccessLogSession[]>;
  getByUser(userId: string): Promise<AccessLogSession[]>;
  clear(): Promise<void>;
}

export interface CalculatorProvider {
  listSimulations(filters?: SimulationFilters): Promise<ContractSimulation[]>;
  getSimulation(id: string): Promise<ContractSimulation | undefined>;
  createSimulation(data: Omit<ContractSimulation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractSimulation>;
  updateSimulation(data: ContractSimulation): Promise<void>;
  deleteSimulation(id: string): Promise<void>;
  duplicateSimulation(id: string): Promise<ContractSimulation>;
}

// ── Aggregate provider ──
export interface DataProviders {
  clients: ClientsProvider;
  contracts: ContractsProvider;
  resources: ResourcesProvider;
  history: HistoryProvider;
  documents: DocumentsProvider;
  overhead: OverheadProvider;
  settings: SettingsProvider;
  snapshots: SnapshotsProvider;
  users: UsersProvider;
  accessLogs: AccessLogsProvider;
  calculator: CalculatorProvider;
}
