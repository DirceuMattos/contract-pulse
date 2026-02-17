import { useAuth } from '@/contexts/AuthContext';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { ModuleKey, MODULE_CATALOG, isRoleAllowedForModule, getModuleKeyForRoute, getDefaultModuleAccess } from '@/types/moduleAccess';

export function useModuleAccess() {
  const { user } = useAuth();
  const { getUser } = useSystemUsers();

  function canAccessModule(moduleKey: ModuleKey): boolean {
    if (!user) return false;
    
    // 1. Check role-level restriction first
    if (!isRoleAllowedForModule(user.role, moduleKey)) return false;
    
    // 2. Check user-specific moduleAccess
    const systemUser = getUser(user.id);
    const access = systemUser?.moduleAccess ?? getDefaultModuleAccess(user.role);
    if (access[moduleKey] === false) return false;
    
    return true;
  }

  function canAccessRoute(pathname: string): boolean {
    const moduleKey = getModuleKeyForRoute(pathname);
    // If route doesn't map to a module, allow access (e.g. /integracoes, /ajuda)
    if (!moduleKey) return true;
    return canAccessModule(moduleKey);
  }

  return { canAccessModule, canAccessRoute };
}
