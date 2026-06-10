import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessLogs } from '@/contexts/AccessLogContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { MODULE_CATALOG } from '@/types/moduleAccess';
import { supabase } from '@/integrations/supabase/client';
import { useUnderutilized } from '@/hooks/useUnderutilized';
import { useData } from '@/contexts/DataContext';


export function MainLayout() {
  const { isAuthenticated, loading: authLoading, mustChangePassword, userRole, user } = useAuth();
  const { trackNavigation } = useAccessLogs();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { canAccessRoute } = useModuleAccess();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('bnp_sidebar_collapsed');
    return stored === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => sessionStorage.getItem('pendingBannerDismissed') === 'true');
  const [underutilizedDismissed, setUnderutilizedDismissed] = useState<boolean>(() => sessionStorage.getItem('underutilizedBannerDismissed') === 'true');
  const { count: underutilizedCount } = useUnderutilized();
  const { settings } = useData();
  const underutilizedThreshold = settings?.thresholdSubocupacao ?? 50;

  const canSeeBanner = userRole === 'c-level' || userRole === 'lider_tribo';
  const canSeeUnderutilizedBanner = userRole === 'c-level' || userRole === 'lider_tribo' || userRole === 'rh';

  useEffect(() => {
    if (!isAuthenticated || !canSeeBanner) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('pending_replacements')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!cancelled) setPendingCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, canSeeBanner]);
  
  useEffect(() => {
    localStorage.setItem('bnp_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile menu on route change + track navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    trackNavigation(location.pathname);
  }, [location.pathname, trackNavigation]);

  // Global keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
        return;
      }

      if (isInput) return;

      // "/" → focus search (open command palette as proxy)
      if (e.key === '/') {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // g + key navigation
      if (e.key === 'g') {
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gPressed = false; }, 500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimeout);
        const routes: Record<string, string> = { d: '/dashboard', c: '/contratos', r: '/clientes', k: '/calculadora' };
        if (routes[e.key]) {
          e.preventDefault();
          navigate(routes[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(gTimeout);
    };
  }, [navigate]);
  
  if (authLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/trocar-senha" replace />;
  }

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 72 : 260);
  const routeAllowed = canAccessRoute(location.pathname);

  // Redirect to first accessible module instead of showing Access Denied
  if (!routeAllowed) {
    const firstAccessible = MODULE_CATALOG.find(
      m => m.routes.length > 0 && !m.isSubmodule && canAccessRoute(m.routes[0])
    );
    const fallbackRoute = firstAccessible?.routes[0] || '/dashboard';
    if (location.pathname !== fallbackRoute) {
      return <Navigate to={fallbackRoute} replace />;
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <Header 
        sidebarCollapsed={sidebarCollapsed} 
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="pt-16 min-h-screen"
      >
        {canSeeBanner && pendingCount > 0 && !bannerDismissed && (
          <div className="bg-orange-500/15 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-orange-400 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {pendingCount} colaborador(es) inativo(s) aguardando substituição em contratos
            </span>
            <div className="flex items-center gap-3">
              <Link to="/squads" className="text-xs text-orange-400 underline hover:text-orange-300">Ver Squads</Link>
              <button
                onClick={() => { setBannerDismissed(true); sessionStorage.setItem('pendingBannerDismissed', 'true'); }}
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-orange-400" />
              </button>
            </div>
          </div>
        )}
        {canSeeUnderutilizedBanner && underutilizedCount > 0 && !underutilizedDismissed && (
          <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-yellow-400 font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              {underutilizedCount} colaborador(es) com dedicação abaixo de {underutilizedThreshold}%
            </span>
            <div className="flex items-center gap-3">
              <Link to="/rh" className="text-xs text-yellow-400 underline hover:text-yellow-300">Ver no RH</Link>
              <button
                onClick={() => { setUnderutilizedDismissed(true); sessionStorage.setItem('underutilizedBannerDismissed', 'true'); }}
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-yellow-400" />
              </button>
            </div>
          </div>
        )}
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </motion.main>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
