import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SystemUser, SystemUserFormData } from '@/types/systemUser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SystemUsersContextType {
  users: SystemUser[];
  loading: boolean;
  addUser: (data: SystemUserFormData, createdById?: string) => Promise<SystemUser | null>;
  updateUser: (id: string, data: Partial<SystemUserFormData>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  getUser: (id: string) => SystemUser | undefined;
  getUserByEmail: (email: string) => SystemUser | undefined;
  toggleUserStatus: (id: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}

const SystemUsersContext = createContext<SystemUsersContextType | undefined>(undefined);

async function invokeManageUsers(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

export function SystemUsersProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshUsers = useCallback(async () => {
    if (!isAuthenticated || userRole !== 'c-level') {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const data = await invokeManageUsers('list');
      setUsers(data.users || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const addUser = async (data: SystemUserFormData, _createdById?: string): Promise<SystemUser | null> => {
    try {
      const result = await invokeManageUsers('create', {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        active: data.active,
        moduleAccess: data.moduleAccess,
      });
      // Refresh list in background
      refreshUsers();
      // Return a synthetic user from the API response
      return {
        id: result.userId,
        name: data.name,
        email: data.email,
        role: data.role as any,
        active: data.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        moduleAccess: data.moduleAccess,
      } as SystemUser;
    } catch (e: any) {
      console.error('Failed to create user:', e);
      return null;
    }
  };

  const updateUser = async (id: string, data: Partial<SystemUserFormData>): Promise<boolean> => {
    try {
      const existingUser = users.find(u => u.id === id);
      const emailChanged = data.email && existingUser?.email?.toLowerCase() !== data.email.toLowerCase();
      const result = await invokeManageUsers('update', {
        userId: id,
        name: data.name,
        email: emailChanged ? data.email : undefined,
        role: data.role,
        password: data.password || undefined,
        moduleAccess: data.moduleAccess,
      });
      if (result?.error) throw new Error(result.error);
      await refreshUsers();
      return true;
    } catch (e: any) {
      console.error('Failed to update user:', e);
      throw e;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await invokeManageUsers('delete', { userId: id });
      await refreshUsers();
      return true;
    } catch (e) {
      console.error('Failed to delete user:', e);
      return false;
    }
  };

  const toggleUserStatus = async (id: string): Promise<boolean> => {
    const user = users.find(u => u.id === id);
    if (!user) return false;
    try {
      await invokeManageUsers('toggle-status', {
        userId: id,
        ban: user.active, // if active, ban; if inactive, unban
      });
      await refreshUsers();
      return true;
    } catch (e) {
      console.error('Failed to toggle user status:', e);
      return false;
    }
  };

  const getUser = (id: string) => users.find(u => u.id === id);
  const getUserByEmail = (email: string) =>
    users.find(u => u.email.toLowerCase() === email.toLowerCase());

  return (
    <SystemUsersContext.Provider value={{
      users,
      loading,
      addUser,
      updateUser,
      deleteUser,
      getUser,
      getUserByEmail,
      toggleUserStatus,
      refreshUsers,
    }}>
      {children}
    </SystemUsersContext.Provider>
  );
}

export function useSystemUsers() {
  const context = useContext(SystemUsersContext);
  if (context === undefined) {
    throw new Error('useSystemUsers must be used within a SystemUsersProvider');
  }
  return context;
}
