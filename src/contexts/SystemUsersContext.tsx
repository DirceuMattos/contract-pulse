import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SystemUser, SystemUserFormData } from '@/types/systemUser';
import { mockSystemUsers } from '@/data/mockSystemUsers';
import { useAuth } from './AuthContext';

interface SystemUsersContextType {
  users: SystemUser[];
  addUser: (data: SystemUserFormData) => SystemUser | null;
  updateUser: (id: string, data: Partial<SystemUserFormData>) => boolean;
  deleteUser: (id: string) => boolean;
  getUser: (id: string) => SystemUser | undefined;
  getUserByEmail: (email: string) => SystemUser | undefined;
  toggleUserStatus: (id: string) => boolean;
  validateCredentials: (email: string, password: string) => SystemUser | null;
}

const SystemUsersContext = createContext<SystemUsersContextType | undefined>(undefined);

const STORAGE_KEY = 'bnp_system_users';
const PASSWORDS_KEY = 'bnp_user_passwords';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Initialize default passwords for mock users
const defaultPasswords: Record<string, string> = {
  'usr-001': 'admin123',
  'usr-002': 'demo123',
  'usr-003': 'demo123',
  'usr-004': 'demo123',
};

export function SystemUsersProvider({ children }: { children: ReactNode }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>(() => 
    loadFromStorage(STORAGE_KEY, mockSystemUsers)
  );
  const [passwords, setPasswords] = useState<Record<string, string>>(() => 
    loadFromStorage(PASSWORDS_KEY, defaultPasswords)
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEY, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(PASSWORDS_KEY, passwords);
  }, [passwords]);

  const addUser = (data: SystemUserFormData): SystemUser | null => {
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return null;
    }

    const now = new Date().toISOString();
    const newUser: SystemUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id,
    };

    setUsers(prev => [...prev, newUser]);
    setPasswords(prev => ({ ...prev, [newUser.id]: data.password }));
    
    return newUser;
  };

  const updateUser = (id: string, data: Partial<SystemUserFormData>): boolean => {
    const userExists = users.some(u => u.id === id);
    if (!userExists) return false;

    // Check email uniqueness if changing email
    if (data.email) {
      const emailTaken = users.some(
        u => u.id !== id && u.email.toLowerCase() === data.email!.toLowerCase()
      );
      if (emailTaken) return false;
    }

    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u;
      return {
        ...u,
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.role && { role: data.role }),
        ...(typeof data.active === 'boolean' && { active: data.active }),
        updatedAt: new Date().toISOString(),
      };
    }));

    if (data.password) {
      setPasswords(prev => ({ ...prev, [id]: data.password! }));
    }

    return true;
  };

  const deleteUser = (id: string): boolean => {
    // Prevent deleting the main admin
    if (id === 'usr-001') return false;
    
    const userExists = users.some(u => u.id === id);
    if (!userExists) return false;

    setUsers(prev => prev.filter(u => u.id !== id));
    setPasswords(prev => {
      const newPasswords = { ...prev };
      delete newPasswords[id];
      return newPasswords;
    });

    return true;
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  const getUserByEmail = (email: string) => 
    users.find(u => u.email.toLowerCase() === email.toLowerCase());

  const toggleUserStatus = (id: string): boolean => {
    // Prevent deactivating the main admin
    if (id === 'usr-001') return false;
    
    const user = users.find(u => u.id === id);
    if (!user) return false;

    setUsers(prev => prev.map(u => 
      u.id === id ? { ...u, active: !u.active, updatedAt: new Date().toISOString() } : u
    ));

    return true;
  };

  const validateCredentials = (email: string, password: string): SystemUser | null => {
    const user = getUserByEmail(email);
    if (!user || !user.active) return null;
    
    const storedPassword = passwords[user.id];
    if (storedPassword !== password) return null;
    
    return user;
  };

  return (
    <SystemUsersContext.Provider value={{
      users,
      addUser,
      updateUser,
      deleteUser,
      getUser,
      getUserByEmail,
      toggleUserStatus,
      validateCredentials,
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
