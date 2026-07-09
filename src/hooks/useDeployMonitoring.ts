import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Alert } from '@/types';

export interface DeployHealthStatus {
  uptime: 'ok' | 'down' | 'checking';
  backend: 'ok' | 'down' | 'checking';
  lastCheck: string | null;
  uptimeLatencyMs: number | null;
  backendLatencyMs: number | null;
  consecutiveFailures: {
    uptime: number;
    backend: number;
  };
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FAILURE_THRESHOLD = 2; // Only fire alert after 2 consecutive failures
const STORAGE_KEY = 'bnp_deploy_health';

const defaultStatus: DeployHealthStatus = {
  uptime: 'checking',
  backend: 'checking',
  lastCheck: null,
  uptimeLatencyMs: null,
  backendLatencyMs: null,
  consecutiveFailures: { uptime: 0, backend: 0 },
};

/**
 * Monitora uptime do site e disponibilidade do backend (Lovable Cloud).
 * Emite alertas quando detecta falhas consecutivas.
 */
export function useDeployMonitoring(
  onAlert?: (alert: Alert) => void
) {
  const [status, setStatus] = useState<DeployHealthStatus>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultStatus, ...JSON.parse(stored) } : defaultStatus;
    } catch {
      return defaultStatus;
    }
  });

  const alertsSentRef = useRef<Set<string>>(new Set());

  const persist = useCallback((next: DeployHealthStatus) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const checkUptime = useCallback(async (): Promise<{ ok: boolean; latency: number }> => {
    const start = performance.now();
    try {
      // Ping same-origin favicon (small, cached-bypass with timestamp)
      const res = await fetch(`/favicon.ico?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      return { ok: res.ok, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  }, []);

  const checkBackend = useCallback(async (): Promise<{ ok: boolean; latency: number }> => {
    const start = performance.now();
    try {
      // Lightweight ping: session check hits auth endpoint quickly
      const { error } = await supabase.auth.getSession();
      return { ok: !error, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: Math.round(performance.now() - start) };
    }
  }, []);

  const runCheck = useCallback(async () => {
    const [uptimeResult, backendResult] = await Promise.all([
      checkUptime(),
      checkBackend(),
    ]);

    setStatus(prev => {
      const uptimeFailures = uptimeResult.ok ? 0 : prev.consecutiveFailures.uptime + 1;
      const backendFailures = backendResult.ok ? 0 : prev.consecutiveFailures.backend + 1;

      const next: DeployHealthStatus = {
        uptime: uptimeResult.ok ? 'ok' : 'down',
        backend: backendResult.ok ? 'ok' : 'down',
        lastCheck: new Date().toISOString(),
        uptimeLatencyMs: uptimeResult.latency,
        backendLatencyMs: backendResult.latency,
        consecutiveFailures: { uptime: uptimeFailures, backend: backendFailures },
      };

      // Emit alerts when thresholds crossed (dedup per session)
      if (onAlert) {
        if (uptimeFailures >= FAILURE_THRESHOLD && !alertsSentRef.current.has('uptime')) {
          alertsSentRef.current.add('uptime');
          onAlert({
            id: `deploy-uptime-${Date.now()}`,
            contractId: '',
            type: 'deploy-uptime',
            severity: 'critico',
            title: 'Site fora do ar',
            description: `Falhas consecutivas ao acessar o site (${uptimeFailures}x). Verifique o deploy imediatamente.`,
            recommendation: 'Acesse o painel Lovable e verifique o último deploy. Se necessário, faça republish.',
            createdAt: new Date().toISOString(),
            alertCategory: 'governanca',
          });
        }
        if (backendFailures >= FAILURE_THRESHOLD && !alertsSentRef.current.has('backend')) {
          alertsSentRef.current.add('backend');
          onAlert({
            id: `deploy-backend-${Date.now()}`,
            contractId: '',
            type: 'deploy-backend',
            severity: 'critico',
            title: 'Backend indisponível',
            description: `O Lovable Cloud (banco/auth) não respondeu ${backendFailures}x consecutivas.`,
            recommendation: 'Verifique o status do Cloud no painel. Migrações recentes podem ter falhado.',
            createdAt: new Date().toISOString(),
            alertCategory: 'governanca',
          });
        }
        // Reset dedup when service recovers
        if (uptimeResult.ok) alertsSentRef.current.delete('uptime');
        if (backendResult.ok) alertsSentRef.current.delete('backend');
      }

      persist(next);
      return next;
    });
  }, [checkUptime, checkBackend, onAlert, persist]);

  useEffect(() => {
    // Initial check on mount
    runCheck();
    // Then periodic
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runCheck]);

  return { status, checkNow: runCheck };
}
