import { UserRole } from './index';

export const MODULE_KEYS = [
  'DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL',
  'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS',
  'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS',
  'SETTINGS', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS',
  'RECEIVABLES',
  'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  routes: string[];
  isSubmodule?: boolean;
  parentModule?: ModuleKey;
  roleRestrictions: UserRole[]; // roles que PODEM acessar (vazio = todos)
}

export const MODULE_CATALOG: ModuleDefinition[] = [
  { key: 'DASHBOARD', label: 'Dashboard', description: 'Painel principal com KPIs e visão geral', routes: ['/dashboard'], roleRestrictions: [] },
  { key: 'CLIENTS', label: 'Clientes', description: 'Cadastro e gestão de clientes', routes: ['/clientes'], roleRestrictions: [] },
  { key: 'CONTRACTS', label: 'Contratos', description: 'Lista e gestão de contratos', routes: ['/contratos'], roleRestrictions: [] },
  { key: 'CONTRACT_DETAIL', label: 'Detalhe do Contrato', description: 'Visualização detalhada do contrato', routes: ['/contratos/:id'], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'RESOURCES', label: 'Recursos', description: 'Gestão de recursos alocados nos contratos', routes: ['/contratos/:id/recursos'], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'HISTORY', label: 'Histórico', description: 'Timeline de eventos do contrato', routes: [], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'DOCUMENTS', label: 'Documentos', description: 'Anexos e documentos do contrato', routes: [], isSubmodule: true, parentModule: 'CONTRACTS', roleRestrictions: [] },
  { key: 'ALERTS', label: 'Alertas', description: 'Central de alertas e notificações', routes: ['/alertas'], roleRestrictions: [] },
  { key: 'SQUADS', label: 'Squads', description: 'Distribuição de equipes por contrato', routes: ['/squads'], roleRestrictions: [] },
  { key: 'CALCULATOR', label: 'Simulador de Contratos', description: 'Simulador para precificação e viabilidade de contratos', routes: ['/calculadora', '/calculadora/nova', '/calculadora/:id'], roleRestrictions: [] },
  { key: 'USERS_ADMIN', label: 'Usuários', description: 'Administração de usuários do sistema', routes: ['/usuarios'], roleRestrictions: ['c-level'] },
  { key: 'ACCESS_LOGS', label: 'Logs de Acesso', description: 'Registro de acessos ao sistema', routes: ['/usuarios/logs'], roleRestrictions: ['c-level'] },
  { key: 'SETTINGS', label: 'Configurações', description: 'Preferências e parâmetros do sistema', routes: ['/configuracoes'], roleRestrictions: ['c-level'] },
  { key: 'IMPORT_EXPORT', label: 'Importar/Exportar', description: 'Importação e exportação de dados', routes: ['/importar-exportar'], roleRestrictions: [] },
  { key: 'HR', label: 'Recursos Humanos', description: 'Cadastro mestre de pessoas, cargos e equipes', routes: ['/rh', '/rh/cargos', '/rh/equipes'], roleRestrictions: [] },
  { key: 'AI', label: 'IA / Análises', description: 'Análises inteligentes, insights e geração de minutas', routes: ['/ai', '/ai/contracts-analysis', '/ai/resources-analysis', '/ai/drafts'], roleRestrictions: [] },
  { key: 'AI_LOGS', label: 'IA Logs', description: 'Fontes e logs das análises de IA', routes: ['/ai/logs'], isSubmodule: true, parentModule: 'AI', roleRestrictions: ['c-level'] },
  { key: 'RECEIVABLES', label: 'Recebíveis', description: 'Posição de pagamentos e inadimplência por contrato', routes: ['/receivables', '/receivables/reconcile'], roleRestrictions: [] },
  { key: 'OVERTIME', label: 'Adm Horas Extras', description: 'Administração de horas extras', routes: ['/horas-extras'], roleRestrictions: [] },
  { key: 'TRANSPORT', label: 'Adm Transportes', description: 'Administração de transportes', routes: ['/transportes'], roleRestrictions: [] },
  { key: 'JOB_REQUESTS', label: 'Requisição de Vagas', description: 'Abertura e acompanhamento de vagas', routes: ['/requisicao-vagas'], roleRestrictions: [] },
  { key: 'JOB_SKILLS', label: 'Skills de Vagas', description: 'Catálogo de skills para vagas', routes: ['/skills-vagas'], roleRestrictions: [] },
];

/**
 * Returns default moduleAccess based on user role.
 * Role restrictions from MODULE_CATALOG take priority.
 */
// Default modules enabled per role (modules not listed default to false for these roles)
const ROLE_DEFAULT_MODULES: Partial<Record<UserRole, ModuleKey[]>> = {
  comercial: ['DASHBOARD', 'CONTRACTS', 'CONTRACT_DETAIL', 'SQUADS'],
  lider_tribo: ['DASHBOARD', 'SQUADS', 'CONTRACT_DETAIL', 'RESOURCES'],
  juridico: ['DASHBOARD', 'CONTRACTS', 'CONTRACT_DETAIL', 'SQUADS'],
  rh: ['DASHBOARD', 'SQUADS', 'HR'],
  administrativo: [], // all managed via flags
  intermediario: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS', 'SQUADS', 'CALCULATOR', 'IMPORT_EXPORT', 'HR', 'RECEIVABLES'],
};

export function getDefaultModuleAccess(role: UserRole): Record<ModuleKey, boolean> {
  const access = {} as Record<ModuleKey, boolean>;
  const customDefaults = ROLE_DEFAULT_MODULES[role];

  for (const mod of MODULE_CATALOG) {
    // Role-level restriction always takes priority
    if (mod.roleRestrictions.length > 0 && !mod.roleRestrictions.includes(role)) {
      access[mod.key] = false;
    } else if (customDefaults !== undefined) {
      // For roles with explicit default lists, only listed modules are enabled
      access[mod.key] = customDefaults.includes(mod.key);
    } else {
      // Legacy roles (c-level, intermediario, leitor): all allowed modules enabled
      access[mod.key] = true;
    }
  }
  
  return access;
}

/**
 * Check if a role is allowed to access a module at all (role-level restriction).
 */
export function isRoleAllowedForModule(role: UserRole, moduleKey: ModuleKey): boolean {
  const mod = MODULE_CATALOG.find(m => m.key === moduleKey);
  if (!mod) return false;
  if (mod.roleRestrictions.length === 0) return true;
  return mod.roleRestrictions.includes(role);
}

/**
 * Map a pathname to its ModuleKey. Returns undefined if no match.
 */
export function getModuleKeyForRoute(pathname: string): ModuleKey | undefined {
  // Specific routes first (more specific patterns before general)
  if (pathname === '/dashboard') return 'DASHBOARD';
  if (pathname === '/alertas') return 'ALERTS';
  if (pathname.startsWith('/squads')) return 'SQUADS';
  if (pathname === '/usuarios/logs') return 'ACCESS_LOGS';
  if (pathname === '/usuarios') return 'USERS_ADMIN';
  if (pathname.startsWith('/configuracoes')) return 'SETTINGS';
  if (pathname === '/importar-exportar') return 'IMPORT_EXPORT';
  
  // HR routes
  if (pathname.startsWith('/rh')) return 'HR';
  
  // Receivables routes
  if (pathname.startsWith('/receivables')) return 'RECEIVABLES';
  
  // AI routes
  if (pathname === '/ai/logs') return 'AI_LOGS';
  if (pathname.startsWith('/ai')) return 'AI';
  
  // Calculator routes
  if (pathname.startsWith('/calculadora')) return 'CALCULATOR';
  
  // Contract sub-routes (exact matches BEFORE regex to avoid /contratos/novo matching CONTRACT_DETAIL)
  if (pathname === '/contratos' || pathname === '/contratos/novo') return 'CONTRACTS';
  if (/^\/contratos\/[^/]+\/recursos/.test(pathname)) return 'RESOURCES';
  if (/^\/contratos\/[^/]+\/editar/.test(pathname)) return 'CONTRACT_DETAIL';
  if (/^\/contratos\/[^/]+$/.test(pathname)) return 'CONTRACT_DETAIL';
  
  // Client routes (exact matches BEFORE wildcard)
  if (pathname === '/clientes' || pathname === '/clientes/novo') return 'CLIENTS';
  if (pathname.startsWith('/clientes')) return 'CLIENTS';
  
  return undefined;
}
