import { useAuth } from '@/contexts/AuthContext';
import { ModuleKey, isRoleAllowedForModule, getModuleKeyForRoute, getDefaultModuleAccess } from '@/types/moduleAccess';

export function useModuleAccess() {
  const { user, userRole, modulePermissions } = useAuth();

  function canAccessModule(moduleKey: ModuleKey): boolean {
    if (!user || !userRole) return false;
    
    // 1. Check role-level restriction first
    if (!isRoleAllowedForModule(userRole, moduleKey)) return false;
    
    // 2. Check user-specific moduleAccess from DB permissions
    const access = modulePermissions ?? getDefaultModuleAccess(userRole);
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
