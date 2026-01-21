import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Upload,
  Plug,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/contratos', label: 'Contratos', icon: FileText },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
  { path: '/importar-exportar', label: 'Importar/Exportar', icon: Upload },
  { path: '/integracoes', label: 'Integrações', icon: Plug },
  { path: '/ajuda', label: 'Ajuda', icon: HelpCircle },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  
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
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sidebar-foreground text-sm">BNP</span>
              <span className="text-sidebar-primary font-semibold text-sm">Contratos</span>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
