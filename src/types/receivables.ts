export type InvoiceStatus = 'paid' | 'open' | 'overdue' | 'canceled' | 'renegotiated';
export type ReceivablesStatus = 'em_dia' | 'atrasado' | 'sem_vinculo';

export interface ReceivableInvoice {
  id: string;
  contractId: string;
  subscriptionId: string;
  competence: string; // YYYY-MM
  dueDate: string;
  status: InvoiceStatus;
  amount: number;
  paidAmount: number;
  paidAt?: string;
  daysOverdue: number;
  externalInvoiceId?: string;
}

export interface SubscriptionCandidate {
  subscriptionId: string;
  label: string;
  amount: number;
  periodicidade: string;
  status: 'ativa' | 'suspensa' | 'cancelada';
  dataInicio?: string;
}

export interface SuperlogicaSyncRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  fetchedSubscriptions: number;
  updatedContracts: number;
  invoicesUpserted: number;
  errorSummary?: string;
}

export interface ReceivablesDashboardFilters {
  period: string; // YYYY-MM
  clientId?: string;
  contractId?: string;
  status: 'todos' | 'em_dia' | 'atrasado';
}

export interface ReceivablesSummary {
  totalPrevisto: number;
  totalRecebido: number;
  totalEmAberto: number;
  totalEmAtraso: number;
  percentualInadimplencia: number;
}

export interface ContractReceivableRow {
  contractId: string;
  clientName: string;
  contractName: string;
  subscriptionLabel: string;
  status: ReceivablesStatus;
  valorMes: number;
  valorEmAtraso: number;
  diasEmAtraso: number;
  ultimoPagamentoData?: string;
  ultimoPagamentoValor?: number;
}
