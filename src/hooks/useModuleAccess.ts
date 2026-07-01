import { useAuth } from '@/contexts/AuthContext';
import { ModuleKey, isRoleAllowedForModule, getModuleKeyForRoute, getDefaultModuleAccess } from '@/types/moduleAccess';

export function useModuleAccess() {
  const { user, userRole, modulePermissions } = useAuth();

  function canAccessModule(moduleKey: ModuleKey): boolean {
    if (!user || !userRole) return false;
    
    // Superadmin tem acesso irrestrito a todos os módulos
    if (userRole === 'superadmin') return true;
    
    // 1. Check role-level restriction first
    if (!isRoleAllowedForModule(userRole, moduleKey)) return false;
    
    // 2. Role-based forced grants — modules that a role must always access,
    // regardless of stale per-user DB permissions.
    const FORCED_GRANTS: Partial<Record<string, ModuleKey[]>> = {
      lider_tribo: ['DASHBOARD', 'SQUADS', 'CONTRACT_DETAIL', 'RESOURCES'],
      coordenacao_suporte: ['DASHBOARD', 'SQUADS', 'CONTRACT_DETAIL', 'RESOURCES'],
      projetos_produtos: ['DASHBOARD', 'SQUADS', 'CONTRACT_DETAIL', 'RESOURCES'],
      superadmin: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS', 'SETTINGS', 'PROFILES_ADMIN', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
    };
    if (FORCED_GRANTS[userRole]?.includes(moduleKey)) return true;

    // 3. Check user-specific moduleAccess from DB permissions, merged with defaults
    const defaults = getDefaultModuleAccess(userRole);
    const access = modulePermissions ? { ...defaults, ...modulePermissions } : defaults;
    if (access[moduleKey] === false) return false;
    
    return true;
  }

  function canAccessRoute(pathname: string): boolean {
    const moduleKey = getModuleKeyForRoute(pathname);
    if (!moduleKey) return true;
    return canAccessModule(moduleKey);
  }

  return { canAccessModule, canAccessRoute };
}
