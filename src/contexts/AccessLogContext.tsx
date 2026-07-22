import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AccessLogSession } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AccessLogContextType {
  accessLogs: AccessLogSession[];
  currentSessionId: string | null;
  trackNavigation: (pathname: string) => void;
  getLogsByUser: (userId: string) => AccessLogSession[];
  clearAllLogs: () => void;
  getAllLogs: () => AccessLogSession[];
}

const AccessLogContext = createContext<AccessLogContextType | undefined>(undefined);

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard-rh': 'Dashboard RH',
  '/clientes': 'Clientes',
  '/contratos': 'Contratos',
  '/alertas': 'Alertas',
  '/usuarios': 'Usuarios',
  '/configuracoes': 'Configuracoes',
  '/importar-exportar': 'Importar/Exportar',
  
  '/ajuda': 'Ajuda',
  '/usuarios/logs': 'Logs de Acesso',
};

function resolveModule(pathname: string): string {
  if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];
  if (/^\/contratos\/[^/]+\/recursos$/.test(pathname)) return 'Contrato:Recursos';
  if (/^\/contratos\/[^/]+\/editar$/.test(pathname)) return 'Contrato:Edicao';
  if (/^\/contratos\/[^/]+$/.test(pathname)) return 'Contrato:Detalhe';
  if (/^\/clientes\/[^/]+\/editar$/.test(pathname)) return 'Cliente:Edicao';
  if (/^\/clientes\/[^/]+$/.test(pathname)) return 'Cliente:Detalhe';
  return pathname;
}

export function AccessLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accessLogs, setAccessLogs] = useState<AccessLogSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const prevUserRef = useRef<string | null>(null);

  // Load logs for c-level users
  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from('access_log_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(500);

    if (data) {
      setAccessLogs(data.map(d => ({
        id: d.id,
        userId: d.user_id,
        userNameSnapshot: d.user_name_snapshot,
        ipAddress: d.ip_address,
        userAgent: d.user_agent,
        startedAt: d.started_at,
        endedAt: d.ended_at,
        modulesAccessed: d.modules_accessed || [],
        routesAccessed: d.routes_accessed || [],
        lastActivityAt: d.last_activity_at,
      })));
    }
  }, []);

  // Start/end session based on user changes
  useEffect(() => {
    const prevUserId = prevUserRef.current;
    const currentUserId = user?.id ?? null;
    prevUserRef.current = currentUserId;

    if (prevUserId && !currentUserId && currentSessionId) {
      // User logged out - end session
      supabase
        .from('access_log_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', currentSessionId)
        .then();
      setCurrentSessionId(null);
    }

    if (!prevUserId && currentUserId && user) {
      // User logged in - start session
      const sessionId = crypto.randomUUID();
      supabase
        .from('access_log_sessions')
        .insert({
          id: sessionId,
          user_id: currentUserId,
          user_name_snapshot: user.name,
          ip_address: '0.0.0.0',
          user_agent: navigator.userAgent,
          modules_accessed: [],
          routes_accessed: [],
        })
        .then(() => {
          setCurrentSessionId(sessionId);
          loadLogs();
        });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload - best-effort session end
  useEffect(() => {
    const handler = () => {
      if (!currentSessionId) return;
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/access_log_sessions?id=eq.${currentSessionId}`;
      const body = JSON.stringify({ ended_at: new Date().toISOString() });
      navigator.sendBeacon?.(url);
      // Fallback: try supabase update
      supabase
        .from('access_log_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', currentSessionId)
        .then();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentSessionId]);

  const trackNavigation = useCallback((pathname: string) => {
    if (!currentSessionId) return;
    const moduleName = resolveModule(pathname);

    // Update session in DB
    supabase
      .from('access_log_sessions')
      .select('modules_accessed, routes_accessed')
      .eq('id', currentSessionId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const modules = data.modules_accessed?.includes(moduleName)
          ? data.modules_accessed
          : [...(data.modules_accessed || []), moduleName];
        const routes = data.routes_accessed?.includes(pathname)
          ? data.routes_accessed
          : [...(data.routes_accessed || []).slice(-49), pathname];

        supabase
          .from('access_log_sessions')
          .update({
            modules_accessed: modules,
            routes_accessed: routes,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', currentSessionId)
          .then();
      });
  }, [currentSessionId]);

  const getLogsByUser = useCallback((userId: string) => {
    return accessLogs.filter(l => l.userId === userId);
  }, [accessLogs]);

  const clearAllLogs = useCallback(async () => {
    // Only c-level can clear - but we just clear local state
    setAccessLogs([]);
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
