import { ReceivableInvoice, ContractReceivableRow, SubscriptionCandidate } from '@/types/receivables';

// Contracts with Superlógica link (subscription_id set)
// ctr-001, ctr-003, ctr-004, ctr-005, ctr-006 → linked
// ctr-002, ctr-007, ctr-008 + more → unlinked

const currentMonth = '2026-03';
const prevMonth = '2026-02';

export const mockInvoices: ReceivableInvoice[] = [
  // ctr-001 – Em dia
  { id: 'inv-001', contractId: 'ctr-001', subscriptionId: 'sub-001', competence: currentMonth, dueDate: '2026-03-10', status: 'paid', amount: 285000, paidAmount: 285000, paidAt: '2026-03-08', daysOverdue: 0 },
  { id: 'inv-002', contractId: 'ctr-001', subscriptionId: 'sub-001', competence: prevMonth, dueDate: '2026-02-10', status: 'paid', amount: 285000, paidAmount: 285000, paidAt: '2026-02-09', daysOverdue: 0 },
  // ctr-003 – Em dia
  { id: 'inv-003', contractId: 'ctr-003', subscriptionId: 'sub-003', competence: currentMonth, dueDate: '2026-03-15', status: 'paid', amount: 120000, paidAmount: 120000, paidAt: '2026-03-14', daysOverdue: 0 },
  { id: 'inv-004', contractId: 'ctr-003', subscriptionId: 'sub-003', competence: prevMonth, dueDate: '2026-02-15', status: 'paid', amount: 120000, paidAmount: 120000, paidAt: '2026-02-14', daysOverdue: 0 },
  // ctr-004 – INADIMPLENTE (2 meses em atraso)
  { id: 'inv-005', contractId: 'ctr-004', subscriptionId: 'sub-004', competence: currentMonth, dueDate: '2026-03-05', status: 'overdue', amount: 380000, paidAmount: 0, daysOverdue: 12 },
  { id: 'inv-006', contractId: 'ctr-004', subscriptionId: 'sub-004', competence: prevMonth, dueDate: '2026-02-05', status: 'overdue', amount: 380000, paidAmount: 0, daysOverdue: 40 },
  { id: 'inv-007', contractId: 'ctr-004', subscriptionId: 'sub-004', competence: '2026-01', dueDate: '2026-01-05', status: 'paid', amount: 380000, paidAmount: 380000, paidAt: '2026-01-10', daysOverdue: 0 },
  // ctr-005 – Em dia
  { id: 'inv-008', contractId: 'ctr-005', subscriptionId: 'sub-005', competence: currentMonth, dueDate: '2026-03-10', status: 'paid', amount: 210000, paidAmount: 210000, paidAt: '2026-03-09', daysOverdue: 0 },
  // ctr-006 – INADIMPLENTE (1 mês)
  { id: 'inv-009', contractId: 'ctr-006', subscriptionId: 'sub-006', competence: currentMonth, dueDate: '2026-03-01', status: 'overdue', amount: 450000, paidAmount: 0, daysOverdue: 16 },
  { id: 'inv-010', contractId: 'ctr-006', subscriptionId: 'sub-006', competence: prevMonth, dueDate: '2026-02-01', status: 'paid', amount: 450000, paidAmount: 450000, paidAt: '2026-02-03', daysOverdue: 0 },
  // ctr-009 – INADIMPLENTE parcial
  { id: 'inv-011', contractId: 'ctr-009', subscriptionId: 'sub-009', competence: currentMonth, dueDate: '2026-03-10', status: 'overdue', amount: 42000, paidAmount: 20000, daysOverdue: 7 },
  { id: 'inv-012', contractId: 'ctr-009', subscriptionId: 'sub-009', competence: prevMonth, dueDate: '2026-02-10', status: 'paid', amount: 42000, paidAmount: 42000, paidAt: '2026-02-12', daysOverdue: 0 },
];

// Superlógica subscription links per contract
export const mockSubscriptionLinks: Record<string, { subscriptionId: string; subscriptionLabel: string }> = {
  'ctr-001': { subscriptionId: 'sub-001', subscriptionLabel: 'Plano Gestão Tributária - SEFAZ SP' },
  'ctr-003': { subscriptionId: 'sub-003', subscriptionLabel: 'Portal Cidadão - PBH Mensal' },
  'ctr-004': { subscriptionId: 'sub-004', subscriptionLabel: 'Processual Digital - TJRJ' },
  'ctr-005': { subscriptionId: 'sub-005', subscriptionLabel: 'Investimentos BNI Premium' },
  'ctr-006': { subscriptionId: 'sub-006', subscriptionLabel: 'Vigilância Nacional - MS Federal' },
  'ctr-009': { subscriptionId: 'sub-009', subscriptionLabel: 'DETRAN-MG Sistema Veículos' },
};

// Contracts WITHOUT subscription link (for reconciliation page)
export const unlinkedContractIds = ['ctr-002', 'ctr-007', 'ctr-008', 'ctr-010', 'ctr-011'];

// Mock subscription candidates returned by "search by CNPJ"
const _mockCandidates: Record<string, SubscriptionCandidate[]> = {
  // SEFAZ-SP (cli-001) – ctr-002 is unlinked but same client
  '46.377.222/0001-29': [
    { subscriptionId: 'sub-001', label: 'Plano Gestão Tributária - SEFAZ SP', amount: 285000, periodicidade: 'mensal', status: 'ativa', dataInicio: '2023-03-01' },
    { subscriptionId: 'sub-002', label: 'Infra Cloud Gov - SEFAZ SP', amount: 95000, periodicidade: 'mensal', status: 'ativa', dataInicio: '2024-01-01' },
  ],
  // TechSol (cli-003)
  '12.345.678/0001-90': [
    { subscriptionId: 'sub-007', label: 'ERP TechSol - Licença Mensal', amount: 75000, periodicidade: 'mensal', status: 'ativa', dataInicio: '2023-08-01' },
  ],
  // LogExpress (cli-007)
  '45.678.901/0001-23': [
    { subscriptionId: 'sub-008a', label: 'Rastreamento Básico', amount: 30000, periodicidade: 'mensal', status: 'ativa' },
    { subscriptionId: 'sub-008b', label: 'Rastreamento Premium + IoT', amount: 55000, periodicidade: 'mensal', status: 'ativa' },
    { subscriptionId: 'sub-008c', label: 'Manutenção Legado', amount: 15000, periodicidade: 'mensal', status: 'cancelada' },
  ],
  // CMPA (cli-010)
  '89.523.697/0001-76': [
    { subscriptionId: 'sub-010', label: 'Sistema Legislativo CMPA', amount: 48000, periodicidade: 'mensal', status: 'ativa' },
  ],
};
