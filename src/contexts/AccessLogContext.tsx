import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AccessLogSession, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { mockAccessLogs } from '@/data/mockAccessLogs';

const STORAGE_KEY = 'bnp_access_logs';
const MAX_LOGS = 500;

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/contratos': 'Contratos',
  '/alertas': 'Alertas',
  '/usuarios': 'Usuarios',
  '/configuracoes': 'Configuracoes',
  '/importar-exportar': 'Importar/Exportar',
  '/integracoes': 'Integracoes',
  '/ajuda': 'Ajuda',
  '/usuarios/logs': 'Logs de Acesso',
};

function resolveModule(pathname: string): string {
  // Exact match first
  if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];
  
  // Pattern matching for dynamic routes
  if (/^\/contratos\/[^/]+\/recursos$/.test(pathname)) return 'Contrato:Recursos';
  if (/^\/contratos\/[^/]+\/editar$/.test(pathname)) return 'Contrato:Edicao';
  if (/^\/contratos\/[^/]+$/.test(pathname)) return 'Contrato:Detalhe';
  if (/^\/clientes\/[^/]+\/editar$/.test(pathname)) return 'Cliente:Edicao';
  if (/^\/clientes\/[^/]+$/.test(pathname)) return 'Cliente:Detalhe';
  
  return pathname;
}

function generateFakeIp(): string {
  const subnets = ['192.168', '10.0'];
  const subnet = subnets[Math.floor(Math.random() * subnets.length)];
  return `${subnet}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

interface AccessLogContextType {
  accessLogs: AccessLogSession[];
  currentSessionId: string | null;
  trackNavigation: (pathname: string) => void;
  getLogsByUser: (userId: string) => AccessLogSession[];
  clearAllLogs: () => void;
  getAllLogs: () => AccessLogSession[];
}

const AccessLogContext = createContext<AccessLogContextType | undefined>(undefined);

function loadLogs(): AccessLogSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  // Seed with mock data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAccessLogs));
  return [...mockAccessLogs];
}

function saveLogs(logs: AccessLogSession[]) {
  const trimmed = logs.slice(-MAX_LOGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function AccessLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accessLogs, setAccessLogs] = useState<AccessLogSession[]>(loadLogs);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const prevUserRef = useRef<User | null>(null);

  // Start/end session based on user changes
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser && !user) {
      // User logged out - end session
      setAccessLogs(prev => {
        if (!currentSessionId) return prev;
        const updated = prev.map(log =>
          log.id === currentSessionId ? { ...log, endedAt: new Date().toISOString() } : log
        );
        return saveLogs(updated);
      });
      setCurrentSessionId(null);
    }

    if (!prevUser && user) {
      // User logged in - start session
      const newSession: AccessLogSession = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: user.id,
        userNameSnapshot: user.name,
        ipAddress: generateFakeIp(),
        userAgent: navigator.userAgent,
        startedAt: new Date().toISOString(),
        endedAt: null,
        modulesAccessed: [],
        routesAccessed: [],
        lastActivityAt: null,
      };
      setAccessLogs(prev => {
        const updated = [...prev, newSession];
        return saveLogs(updated);
      });
      setCurrentSessionId(newSession.id);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload - best-effort session end
  useEffect(() => {
    const handler = () => {
      if (!currentSessionId) return;
      const logs = loadLogs();
      const updated = logs.map(log =>
        log.id === currentSessionId ? { ...log, endedAt: new Date().toISOString() } : log
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(-MAX_LOGS)));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentSessionId]);

  const trackNavigation = useCallback((pathname: string) => {
    if (!currentSessionId) return;
    const moduleName = resolveModule(pathname);
    setAccessLogs(prev => {
      const updated = prev.map(log => {
        if (log.id !== currentSessionId) return log;
        const modulesAccessed = log.modulesAccessed.includes(moduleName)
          ? log.modulesAccessed
          : [...log.modulesAccessed, moduleName];
        const routesAccessed = log.routesAccessed.includes(pathname)
          ? log.routesAccessed
          : [...log.routesAccessed.slice(-49), pathname];
        return { ...log, modulesAccessed, routesAccessed, lastActivityAt: new Date().toISOString() };
      });
      return saveLogs(updated);
    });
  }, [currentSessionId]);

  const getLogsByUser = useCallback((userId: string) => {
    return accessLogs.filter(l => l.userId === userId);
  }, [accessLogs]);

  const clearAllLogs = useCallback(() => {
    setAccessLogs([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getAllLogs = useCallback(() => accessLogs, [accessLogs]);

  return (
    <AccessLogContext.Provider value={{ accessLogs, currentSessionId, trackNavigation, getLogsByUser, clearAllLogs, getAllLogs }}>
      {children}
    </AccessLogContext.Provider>
  );
}

export function useAccessLogs() {
  const context = useContext(AccessLogContext);
  if (!context) throw new Error('useAccessLogs must be used within AccessLogProvider');
  return context;
}
