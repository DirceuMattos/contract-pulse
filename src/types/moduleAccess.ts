import { UserRole } from './index';

export const MODULE_KEYS = [
  'DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL',
  'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS',
  'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS',
  'SETTINGS', 'IMPORT_EXPORT',
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
  { key: 'CALCULATOR', label: 'Calculadora', description: 'Simulador de contratos', routes: ['/calculadora', '/calculadora/nova', '/calculadora/:id'], roleRestrictions: [] },
  { key: 'USERS_ADMIN', label: 'Usuários', description: 'Administração de usuários do sistema', routes: ['/usuarios'], roleRestrictions: ['c-level'] },
  { key: 'ACCESS_LOGS', label: 'Logs de Acesso', description: 'Registro de acessos ao sistema', routes: ['/usuarios/logs'], roleRestrictions: ['c-level'] },
  { key: 'SETTINGS', label: 'Configurações', description: 'Preferências e parâmetros do sistema', routes: ['/configuracoes', '/configuracoes/cargos'], roleRestrictions: ['c-level'] },
  { key: 'IMPORT_EXPORT', label: 'Importar/Exportar', description: 'Importação e exportação de dados', routes: ['/importar-exportar'], roleRestrictions: [] },
];

/**
 * Returns default moduleAccess based on user role.
 * Role restrictions from MODULE_CATALOG take priority.
 */
export function getDefaultModuleAccess(role: UserRole): Record<ModuleKey, boolean> {
  const access = {} as Record<ModuleKey, boolean>;
  
  for (const mod of MODULE_CATALOG) {
    // If module has role restrictions and the role is not in the list, default to false
    if (mod.roleRestrictions.length > 0 && !mod.roleRestrictions.includes(role)) {
      access[mod.key] = false;
    } else {
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
  if (pathname === '/usuarios/logs') return 'ACCESS_LOGS';
  if (pathname === '/usuarios') return 'USERS_ADMIN';
  if (pathname.startsWith('/configuracoes')) return 'SETTINGS';
  if (pathname === '/importar-exportar') return 'IMPORT_EXPORT';
  
  // Calculator routes
  if (pathname.startsWith('/calculadora')) return 'CALCULATOR';
  
  // Contract sub-routes
  if (/^\/contratos\/[^/]+\/recursos/.test(pathname)) return 'RESOURCES';
  if (/^\/contratos\/[^/]+\/editar/.test(pathname)) return 'CONTRACT_DETAIL';
  if (/^\/contratos\/[^/]+$/.test(pathname)) return 'CONTRACT_DETAIL';
  if (pathname === '/contratos' || pathname === '/contratos/novo') return 'CONTRACTS';
  
  // Client routes
  if (pathname.startsWith('/clientes')) return 'CLIENTS';
  
  return undefined;
}
