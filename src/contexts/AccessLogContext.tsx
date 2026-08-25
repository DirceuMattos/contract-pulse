import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveModule } from '@/lib/accessLogs';

/**
 * Registro de sessões de acesso.
 *
 * Este contexto SÓ ESCREVE. A leitura pertence à tela de auditoria
 * (AccessLogsPage), que consulta o banco com filtro e paginação próprios.
 * Antes o contexto carregava 500 registros para todo mundo no login — inútil
 * para quem não audita e insuficiente para quem audita.
 */
interface AccessLogContextType {
  currentSessionId: string | null;
  trackNavigation: (pathname: string) => void;
}

const AccessLogContext = createContext<AccessLogContextType | undefined>(undefined);

/** Chave por aba: sobrevive ao F5, não vaza para outras abas. */
const STORAGE_KEY = 'bnphub.accessLogSession';

function readStored(): { sessionId: string; userId: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string; userId?: string };
    if (!parsed?.sessionId || !parsed?.userId) return null;
    return { sessionId: parsed.sessionId, userId: parsed.userId };
  } catch {
    return null;
  }
}

export function AccessLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const prevUserRef = useRef<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const setSession = useCallback((id: string | null, userId?: string) => {
    sessionRef.current = id;
    setCurrentSessionId(id);
    try {
      if (id && userId) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: id, userId }));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* aba anônima ou storage bloqueado: seguimos sem persistir */
    }
  }, []);

  useEffect(() => {
    const prevUserId = prevUserRef.current;
    const currentUserId = user?.id ?? null;
    prevUserRef.current = currentUserId;

    // Saiu: encerra a sessão.
    if (prevUserId && !currentUserId && sessionRef.current) {
      const id = sessionRef.current;
      void supabase.from('access_log_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id);
      setSession(null);
      return;
    }

    if (!currentUserId || !user) return;
    if (sessionRef.current) return;

    // F5 na mesma aba reaproveita a sessão em vez de abrir outra. Sem isto,
    // cada recarga virava uma linha nova e a auditoria ficava ilegível.
    const stored = readStored();
    if (stored && stored.userId === currentUserId) {
      setSession(stored.sessionId, currentUserId);
      return;
    }

    const sessionId = crypto.randomUUID();
    void supabase.from('access_log_sessions')
      .insert({
        id: sessionId,
        user_id: currentUserId,
        user_name_snapshot: user.name,
        // IP não é gravado: o navegador não conhece o próprio IP público.
        // Antes ia '0.0.0.0' fixo, o que dava aparência de evidência a um
        // campo vazio. Capturar de verdade exige edge function.
        ip_address: '',
        user_agent: navigator.userAgent,
        modules_accessed: [],
        routes_accessed: [],
      })
      .then(({ error }) => {
        if (error) {
          console.error('Falha ao abrir sessão de acesso:', error.message);
          return;
        }
        setSession(sessionId, currentUserId);
      });
  }, [user, setSession]);

  // Fechamento da aba: melhor esforço.
  //
  // O sendBeacon anterior era chamado sem corpo e sem cabeçalho de
  // autenticação, então nunca gravou nada. Aqui atualizamos last_activity_at
  // e tentamos o ended_at; se o navegador cortar antes, a tela de auditoria
  // trata a sessão como encerrada por inatividade, em vez de exibi-la
  // eternamente "em andamento".
  useEffect(() => {
    const encerrar = () => {
      const id = sessionRef.current;
      if (!id) return;
      void supabase.from('access_log_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id);
    };
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') encerrar();
    };
    window.addEventListener('pagehide', encerrar);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', encerrar);
      document.removeEventListener('visibilitychange', aoEsconder);
    };
  }, []);

  const trackNavigation = useCallback((pathname: string) => {
    const id = sessionRef.current;
    if (!id) return;
    // Uma única ida ao banco. Antes eram duas (SELECT dos arrays + UPDATE por
    // cima), o que perdia navegação quando duas abas escreviam junto.
    //
    // O cast existe porque src/integrations/supabase/types.ts é gerado e ainda
    // não conhece esta função. Mesmo padrão já usado no AuthContext para
    // role_module_permissions. Some quando os tipos forem regerados.
    const rpc = supabase.rpc as unknown as (
      fn: 'record_access_navigation',
      args: { p_session_id: string; p_module: string; p_route: string },
    ) => Promise<{ error: unknown }>;
    void rpc('record_access_navigation', {
      p_session_id: id,
      p_module: resolveModule(pathname),
      p_route: pathname,
    });
  }, []);

  return (
    <AccessLogContext.Provider value={{ currentSessionId, trackNavigation }}>
      {children}
    </AccessLogContext.Provider>
  );
}

export function useAccessLogs() {
  const context = useContext(AccessLogContext);
  if (!context) throw new Error('useAccessLogs must be used within AccessLogProvider');
  return context;
}
