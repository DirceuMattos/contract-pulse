import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { ModuleKey } from '@/types/moduleAccess';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canViewValues: boolean;
  canEdit: boolean;
  canViewHRCosts: boolean;
  userRole: UserRole | null;
  modulePermissions: Record<ModuleKey, boolean> | null;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [modulePermissions, setModulePermissions] = useState<Record<ModuleKey, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const initializedRef = useRef(false);

  async function fetchRoleAndPermissions(userId: string): Promise<{ role: UserRole; perms: Record<ModuleKey, boolean> | null }> {
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

    return { role, perms };
  }

  async function buildUser(session: Session) {
    const su = session.user;
    const { role, perms } = await fetchRoleAndPermissions(su.id);

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

  const canViewValues = userRole === 'c-level' || userRole === 'administrativo';
  const canEdit = userRole === 'c-level' || userRole === 'intermediario' || userRole === 'administrativo' || userRole === 'rh';
  const canViewHRCosts = userRole === 'c-level' || userRole === 'administrativo';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      canViewValues,
      canEdit,
      canViewHRCosts,
      userRole,
      modulePermissions,
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
