import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { ModuleKey } from '@/types/moduleAccess';
import { ActionFlagKey, ActionFlags, ModuleActionPermissions, getDefaultActionFlagsForRole } from '@/types/modulePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface RoleModulePermissionRow {
  module_key: ModuleKey;
  can_access: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_view_values: boolean;
  can_view_hr_costs: boolean;
  can_allocate: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canViewValues: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canAllocate: boolean;
  canViewHRCosts: boolean;
  isSuperAdmin: boolean;
  userRole: UserRole | null;
  modulePermissions: Record<ModuleKey, boolean> | null;
  moduleActionPermissions: ModuleActionPermissions | null;
  canModuleAction: (moduleKey: ModuleKey, action: ActionFlagKey) => boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [modulePermissions, setModulePermissions] = useState<Record<ModuleKey, boolean> | null>(null);
  const [moduleActionPermissions, setModuleActionPermissions] = useState<ModuleActionPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const initializedRef = useRef(false);

  async function fetchRoleAndPermissions(userId: string): Promise<{ role: UserRole; perms: Record<ModuleKey, boolean> | null; actionPerms: ModuleActionPermissions | null }> {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const role = (roleData?.role as UserRole) || 'leitor';

    const { data: permsData } = await supabase
      .from('user_module_permissions')
      .select('module_key, is_allowed')
      .eq('user_id', userId);

    let perms: Record<ModuleKey, boolean> | null = null;
    if (permsData && permsData.length > 0) {
      perms = {} as Record<ModuleKey, boolean>;
      for (const p of permsData) {
        (perms as Record<string, boolean>)[p.module_key] = p.is_allowed;
      }
    }

    const roleModulePermissionsClient = supabase as unknown as {
      from: (table: 'role_module_permissions') => {
        select: (columns: string) => {
          eq: (column: 'role', value: UserRole) => Promise<{ data: RoleModulePermissionRow[] | null }>;
        };
      };
    };

    const { data: actionRows } = await roleModulePermissionsClient
      .from('role_module_permissions')
      .select('module_key, can_access, can_edit, can_create, can_delete, can_export, can_view_values, can_view_hr_costs, can_allocate')
      .eq('role', role);

    let actionPerms: ModuleActionPermissions | null = null;
    if (actionRows && actionRows.length > 0) {
      actionPerms = {};
      for (const row of actionRows) {
        actionPerms[row.module_key as ModuleKey] = {
          can_edit: row.can_access && !!row.can_edit,
          can_create: row.can_access && !!row.can_create,
          can_delete: row.can_access && !!row.can_delete,
          can_export: row.can_access && !!row.can_export,
          can_view_values: row.can_access && !!row.can_view_values,
          can_view_hr_costs: row.can_access && !!row.can_view_hr_costs,
          can_allocate: row.can_access && !!row.can_allocate,
        };
      }
    }

    return { role, perms, actionPerms };
  }

  async function buildUser(session: Session) {
    const su = session.user;
    const { role, perms, actionPerms } = await fetchRoleAndPermissions(su.id);

    const authUser: User = {
      id: su.id,
      name: su.user_metadata?.name || su.email || '',
      email: su.email || '',
      role,
      avatar: su.user_metadata?.avatar_url,
    };

    setUser(authUser);
    setUserRole(role);
    setModulePermissions(perms);
    setModuleActionPermissions(actionPerms);
    setMustChangePassword(!!su.user_metadata?.must_change_password);
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Use setTimeout to avoid potential deadlock with Supabase client
        setTimeout(async () => {
          await buildUser(session);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setUserRole(null);
        setModulePermissions(null);
        setModuleActionPermissions(null);
        setMustChangePassword(false);
        setLoading(false);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await buildUser(session);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message === 'Invalid login credentials'
        ? 'Credenciais inválidas'
        : error.message);
    }
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  const isSuperAdmin = userRole === 'superadmin';
  const canViewValues = userRole === 'c-level' || userRole === 'demo' || userRole === 'administrativo' || userRole === 'superadmin';
  const canEdit = userRole === 'c-level' || userRole === 'demo' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh' || userRole === 'lider_tribo' || userRole === 'coordenacao_suporte' || userRole === 'superadmin';
  const canCreate = userRole !== 'lider_tribo' && userRole !== 'coordenacao_suporte' && userRole !== 'projetos_produtos' && (userRole === 'c-level' || userRole === 'demo' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh' || userRole === 'superadmin');
  const canDelete = userRole !== 'lider_tribo' && userRole !== 'coordenacao_suporte' && userRole !== 'projetos_produtos' && (userRole === 'c-level' || userRole === 'demo' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh' || userRole === 'superadmin');
  const canAllocate = userRole === 'c-level' || userRole === 'demo' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh' || userRole === 'lider_tribo' || userRole === 'coordenacao_suporte' || userRole === 'superadmin';
  const canViewHRCosts = userRole === 'c-level' || userRole === 'demo' || userRole === 'administrativo' || userRole === 'superadmin';
  const legacyActionFlags: ActionFlags = userRole ? getDefaultActionFlagsForRole(userRole) : {
    can_edit: false,
    can_create: false,
    can_delete: false,
    can_export: false,
    can_view_values: false,
    can_view_hr_costs: false,
    can_allocate: false,
  };

  const canModuleAction = (moduleKey: ModuleKey, action: ActionFlagKey): boolean => {
    const moduleFlags = moduleActionPermissions?.[moduleKey];
    if (moduleFlags) return moduleFlags[action];
    return legacyActionFlags[action];
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      canViewValues,
      canEdit,
      canCreate,
      canDelete,
      canViewHRCosts,
      canAllocate,
      isSuperAdmin,
      userRole,
      modulePermissions,
      moduleActionPermissions,
      canModuleAction,
      mustChangePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
