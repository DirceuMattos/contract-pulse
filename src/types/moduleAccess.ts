import { UserRole } from './index';

export const MODULE_KEYS = [
  'DASHBOARD', 'HR_DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL',
  'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS',
  'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS',
  'SETTINGS', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS',
  'RECEIVABLES', 'REPORTS', 'SUPPORT_COSTS',
  'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS',
  'PROFILES_ADMIN',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  routes: string[];
  isSubmodule?: boolean;
  parentModule?: ModuleKey;
  roleRestrictions: UserRole[];
}

export const MODULE_CATALOG: ModuleDefinition[] = [
  { key: 'DASHBOARD', label: 'Dashboard Contratos', description: 'Painel principal com KPIs e visão geral de contratos', routes: ['/dashboard'], roleRestrictions: [] },
  { key: 'HR_DASHBOARD', label: 'Dashboard RH', description: 'Painel gerencial de custos, alocação e indicadores de RH', routes: ['/dashboard-rh'], roleRestrictions: ['superadmin', 'c-level', 'rh', 'administrativo'] },
  { key: 'CLIENTS', label: 'Clientes', description: 'Cadastro e gestão de clientes', routes: ['/clientes'], roleRestrictions: [] },
  { key: 'CONTRACTS', label: 'Contratos', description: 'Lista e gestão de contratos', routes: ['/contratos'], roleRestrictions: [] },
  { key: 'CONTRACT_DETAIL', label: 'Detalhe do Contrato', description: 'Visualização detalhada do contrato', routes: ['/contratos/:id'], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'RESOURCES', label: 'Recursos', description: 'Gestão de recursos alocados nos contratos', routes: ['/contratos/:id/recursos'], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'HISTORY', label: 'Histórico', description: 'Timeline de eventos do contrato', routes: [], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'DOCUMENTS', label: 'Documentos', description: 'Anexos e documentos do contrato', routes: [], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'ALERTS', label: 'Alertas', description: 'Central de alertas e notificações', routes: ['/alertas'], roleRestrictions: [] },
  { key: 'SQUADS', label: 'Squads', description: 'Distribuição de equipes por contrato', routes: ['/squads'], roleRestrictions: [] },
  { key: 'CALCULATOR', label: 'Simulador de Contratos', description: 'Simulador para precificação e viabilidade de contratos', routes: ['/calculadora', '/calculadora/nova', '/calculadora/:id'], roleRestrictions: [] },
  { key: 'USERS_ADMIN', label: 'Usuários', description: 'Administração de usuários do sistema', routes: ['/usuarios'], roleRestrictions: ['c-level', 'demo', 'superadmin'] },
  { key: 'ACCESS_LOGS', label: 'Logs de Acesso', description: 'Registro de acessos ao sistema', routes: ['/usuarios/logs'], roleRestrictions: [] },
  { key: 'SETTINGS', label: 'Configurações', description: 'Preferências e parâmetros do sistema', routes: ['/configuracoes'], roleRestrictions: ['c-level', 'demo', 'superadmin'] },
  { key: 'PROFILES_ADMIN', label: 'Gestão de Perfis', description: 'Configuração de permissões por perfil', routes: ['/usuarios/perfis'], roleRestrictions: ['superadmin'] },
  { key: 'IMPORT_EXPORT', label: 'Importar/Exportar', description: 'Importação e exportação de dados', routes: ['/importar-exportar'], roleRestrictions: ['c-level', 'superadmin'] },
  { key: 'HR', label: 'Recursos Humanos', description: 'Cadastro mestre de pessoas, cargos e equipes', routes: ['/rh', '/rh/cargos', '/rh/equipes'], roleRestrictions: [] },
  { key: 'AI', label: 'IA / Análises', description: 'Análises inteligentes, insights e geração de minutas', routes: ['/ai', '/ai/contracts-analysis', '/ai/resources-analysis', '/ai/drafts'], roleRestrictions: [] },
  { key: 'AI_LOGS', label: 'IA Logs', description: 'Fontes e logs das análises de IA', routes: ['/ai/logs'], isSubmodule: true, parentModule: 'AI', roleRestrictions: ['c-level'] },
  { key: 'RECEIVABLES', label: 'Recebíveis', description: 'Posição de pagamentos e inadimplência por contrato', routes: ['/receivables', '/receivables/reconcile'], roleRestrictions: [] },
  { key: 'REPORTS', label: 'Relatórios Mensais', description: 'Relatórios mensais de atividades por contrato', routes: ['/relatorios', '/relatorios/:reportId', '/relatorios/config/:contractId'], roleRestrictions: ['c-level', 'superadmin', 'lider_tribo', 'administrativo', 'coordenacao_suporte', 'projetos_produtos'] },
  { key: 'SUPPORT_COSTS', label: 'Custos do Suporte a Sistemas', description: 'Custos de atendimento de suporte a sistemas por cliente e projeto', routes: ['/custos-suporte'], roleRestrictions: ['superadmin', 'c-level', 'rh', 'administrativo', 'lider_tribo'] },
  { key: 'OVERTIME', label: 'Adm Horas Extras', description: 'Administração de horas extras', routes: ['/horas-extras'], roleRestrictions: [] },
  { key: 'TRANSPORT', label: 'Adm Transportes', description: 'Administração de transportes', routes: ['/transportes'], roleRestrictions: [] },
  { key: 'JOB_REQUESTS', label: 'Requisição de Vagas', description: 'Abertura e acompanhamento de vagas', routes: ['/requisicao-vagas'], roleRestrictions: [] },
  { key: 'JOB_SKILLS', label: 'Skills de Vagas', description: 'Catálogo de skills para vagas', routes: ['/skills-vagas'], roleRestrictions: [] },
];

const ROLE_DEFAULT_MODULES: Partial<Record<UserRole, ModuleKey[]>> = {
  'c-level': ['DASHBOARD', 'HR_DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS', 'SETTINGS', 'PROFILES_ADMIN', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS', 'SUPPORT_COSTS'],
  leitor: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL'],
  demo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'CALCULATOR', 'SETTINGS', 'HR', 'AI', 'AI_LOGS', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  comercial: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'SQUADS', 'CALCULATOR'],
  lider_tribo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS', 'SUPPORT_COSTS'],
  coordenacao_suporte: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS'],
  projetos_produtos: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS'],
  juridico: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL'],
  rh: ['DASHBOARD', 'HR_DASHBOARD', 'ALERTS', 'SQUADS', 'HR', 'TRANSPORT', 'OVERTIME', 'JOB_REQUESTS', 'JOB_SKILLS', 'SUPPORT_COSTS'],
  administrativo: ['DASHBOARD', 'HR_DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'IMPORT_EXPORT', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS', 'SUPPORT_COSTS'],
  intermediario: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS', 'SQUADS', 'CALCULATOR', 'HR', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  superadmin: ['DASHBOARD', 'HR_DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS', 'SETTINGS', 'PROFILES_ADMIN', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS', 'SUPPORT_COSTS'],
};

export function getDefaultModuleAccess(role: UserRole): Record<ModuleKey, boolean> {
  const access = {} as Record<ModuleKey, boolean>;
  const customDefaults = ROLE_DEFAULT_MODULES[role];

  for (const mod of MODULE_CATALOG) {
    if (mod.roleRestrictions.length > 0 && !mod.roleRestrictions.includes(role)) {
      access[mod.key] = false;
    } else if (customDefaults !== undefined) {
      access[mod.key] = customDefaults.includes(mod.key);
    } else {
      access[mod.key] = true;
    }
  }

  return access;
}

export function isRoleAllowedForModule(role: UserRole, moduleKey: ModuleKey): boolean {
  const mod = MODULE_CATALOG.find(m => m.key === moduleKey);
  if (!mod) return false;
  if (mod.roleRestrictions.length === 0) return true;
  return mod.roleRestrictions.includes(role);
}

export function getModuleKeyForRoute(pathname: string): ModuleKey | undefined {
  if (pathname === '/dashboard') return 'DASHBOARD';
  if (pathname === '/dashboard-rh') return 'HR_DASHBOARD';
  if (pathname === '/alertas') return 'ALERTS';
  if (pathname.startsWith('/squads')) return 'SQUADS';
  if (pathname === '/usuarios/logs') return 'ACCESS_LOGS';
  if (pathname === '/usuarios') return 'USERS_ADMIN';
  if (pathname.startsWith('/configuracoes')) return 'SETTINGS';
  if (pathname === '/importar-exportar') return 'IMPORT_EXPORT';
  if (pathname.startsWith('/rh')) return 'HR';
  if (pathname.startsWith('/receivables')) return 'RECEIVABLES';
  if (pathname.startsWith('/relatorios')) return 'REPORTS';
  if (pathname.startsWith('/custos-suporte')) return 'SUPPORT_COSTS';
  if (pathname === '/ai/logs') return 'AI_LOGS';
  if (pathname.startsWith('/ai')) return 'AI';
  if (pathname.startsWith('/calculadora')) return 'CALCULATOR';
  if (pathname === '/contratos' || pathname === '/contratos/novo') return 'CONTRACTS';
  if (/^\/contratos\/[^/]+\/recursos/.test(pathname)) return 'RESOURCES';
  if (/^\/contratos\/[^/]+\/editar/.test(pathname)) return 'CONTRACT_DETAIL';
  if (/^\/contratos\/[^/]+$/.test(pathname)) return 'CONTRACT_DETAIL';
  if (pathname === '/clientes' || pathname === '/clientes/novo') return 'CLIENTS';
  if (pathname.startsWith('/clientes')) return 'CLIENTS';

  return undefined;
}
