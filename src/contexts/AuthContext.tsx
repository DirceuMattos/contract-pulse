import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { useSystemUsers } from '@/contexts/SystemUsersContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canViewValues: boolean;
  canEdit: boolean;
  canViewHRCosts: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'bnp_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { validateCredentials } = useSystemUsers();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const systemUser = validateCredentials(email, password);
    
    if (!systemUser) {
      throw new Error('Credenciais inválidas ou usuário inativo');
    }
    
    const authUser: User = {
      id: systemUser.id,
      name: systemUser.name,
      email: systemUser.email,
      role: systemUser.role as UserRole,
      avatar: undefined,
    };
    
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const canViewValues = user?.role === 'c-level';
  const canEdit = user?.role === 'c-level' || user?.role === 'intermediario';
  const canViewHRCosts = user?.role === 'c-level';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      canViewValues,
      canEdit,
      canViewHRCosts,
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
