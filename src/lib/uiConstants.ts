import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { HealthStatus, AlertSeverity, AlertCategory } from '@/types';

// Health status mappings
export const healthConfig: Record<HealthStatus, { label: string; icon: typeof CheckCircle2; badgeClass: string; colorClass: string; tooltip: string }> = {
  saudavel: {
    label: 'Saudável',
    icon: CheckCircle2,
    badgeClass: 'health-badge-healthy',
    colorClass: 'text-health-healthy',
    tooltip: 'Margem financeira dentro dos parâmetros saudáveis',
  },
  atencao: {
    label: 'Atenção',
    icon: AlertCircle,
    badgeClass: 'health-badge-attention',
    colorClass: 'text-health-attention',
    tooltip: 'Margem financeira abaixo do ideal, requer acompanhamento',
  },
  critico: {
    label: 'Crítico',
    icon: AlertTriangle,
    badgeClass: 'health-badge-critical',
    colorClass: 'text-health-critical',
    tooltip: 'Margem financeira deficitária, ação imediata necessária',
  },
};

// Alert severity mappings
export const severityConfig: Record<AlertSeverity, { label: string; icon: typeof Info; badgeClass: string; tooltip: string }> = {
  info: {
    label: 'Informativo',
    icon: Info,
    badgeClass: 'bg-blue-500/10 border-blue-500 text-blue-500',
    tooltip: 'Informação para acompanhamento',
  },
  atencao: {
    label: 'Atenção',
    icon: AlertCircle,
    badgeClass: 'bg-health-attention/10 border-health-attention text-health-attention',
    tooltip: 'Situação que requer atenção',
  },
  critico: {
    label: 'Crítico',
    icon: AlertTriangle,
    badgeClass: 'bg-health-critical/10 border-health-critical text-health-critical',
    tooltip: 'Situação crítica que requer ação imediata',
  },
};

// Alert category mappings
export const categoryConfig: Record<string, { label: string; badgeClass: string }> = {
  financeiro: { label: 'Financeiro', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  prazo: { label: 'Prazo', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  reajuste: { label: 'Reajuste', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  governanca: { label: 'Governança', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};

// Contract type labels
export const typeLabels: Record<string, string> = {
  sistema: 'Sistema',
  infraestrutura: 'Infraestrutura',
  hibrido: 'Híbrido',
};

// Contract status labels
export const statusLabels: Record<string, string> = {
  implantacao: 'Em Implantação',
  operacao: 'Em Operação',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

// Seniority labels
export const senioridadeLabels: Record<string, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
};
