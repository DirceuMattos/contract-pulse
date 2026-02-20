import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  FileText,
  Settings,
  Upload,
  Plug,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  UserCog,
  Calculator,
  X,
  UsersRound,
} from 'lucide-react';
import logoBnp from '@/assets/logo-bnp.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { ModuleKey } from '@/types/moduleAccess';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems: { path: string; label: string; icon: any; moduleKey?: ModuleKey }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'DASHBOARD' },
  { path: '/calculadora', label: 'Simulador de Contratos', icon: Calculator, moduleKey: 'CALCULATOR' },
  { path: '/clientes', label: 'Clientes', icon: Users, moduleKey: 'CLIENTS' },
  { path: '/contratos', label: 'Contratos', icon: FileText, moduleKey: 'CONTRACTS' },
  { path: '/alertas', label: 'Alertas', icon: Bell, moduleKey: 'ALERTS' },
  { path: '/squads', label: 'Squads', icon: LayoutGrid, moduleKey: 'SQUADS' },
  { path: '/rh', label: 'Recursos Humanos', icon: UsersRound, moduleKey: 'HR' },
  { path: '/usuarios', label: 'Usuários', icon: UserCog, moduleKey: 'USERS_ADMIN' },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, moduleKey: 'SETTINGS' },
  { path: '/importar-exportar', label: 'Importar/Exportar', icon: Upload, moduleKey: 'IMPORT_EXPORT' },
  { path: '/integracoes', label: 'Integrações', icon: Plug },
  { path: '/ajuda', label: 'Ajuda', icon: HelpCircle },
];

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const { canAccessModule } = useModuleAccess();

  // Mobile drawer overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 z-40"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            >
              {/* Mobile Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <img src={logoBnp} alt="BNP Logo" className="w-20 h-auto object-contain" />
                  <div>
                    <span className="font-bold text-sidebar-foreground text-sm">BNP</span>
                    <span className="text-sidebar-primary font-semibold text-sm">Contratos</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onMobileClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
                <ul className="space-y-1">
                {navItems
                    .filter(item => !item.moduleKey || canAccessModule(item.moduleKey))
                    .map((item) => {
                      const isActive = location.pathname === item.path || 
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            onClick={onMobileClose}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                              'hover:bg-sidebar-accent',
                              isActive && 'bg-sidebar-accent text-sidebar-primary',
                              !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                            )}
                          >
                            <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-sidebar-primary')} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </nav>

              {/* User & Logout */}
              <div className="border-t border-sidebar-border p-2 space-y-2">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                      <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role.replace('-', ' ')}</p>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    onMobileClose?.();
                  }}
                  className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }
  
  // Desktop sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <img src={logoBnp} alt="BNP Logo" className="w-20 h-auto object-contain" />
            <div>
              <span className="font-bold text-sidebar-foreground text-sm">BNP</span>
              <span className="text-sidebar-primary font-semibold text-sm">Contratos</span>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <img src={logoBnp} alt="BNP Logo" className="w-12 h-auto object-contain" />
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems
            .filter(item => !item.moduleKey || canAccessModule(item.moduleKey))
            .map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              
              const linkContent = (
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent',
                    isActive && 'bg-sidebar-accent text-sidebar-primary',
                    !isActive && 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-sidebar-primary')} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              );
              
              return (
                <li key={item.path}>
                  {collapsed ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
        </ul>
      </nav>
      
      {/* User & Collapse */}
      <div className="border-t border-sidebar-border p-2 space-y-2">
        {/* User info */}
        {user && (
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg',
            collapsed ? 'justify-center' : ''
          )}>
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role.replace('-', ' ')}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Logout button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={cn(
                'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'px-0 justify-center' : 'justify-start'
              )}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sair</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Sair</TooltipContent>
          )}
        </Tooltip>
        
        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'px-0 justify-center' : 'justify-start'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-2">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
