import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShieldCheck,
  LayoutGrid,
  Users,
  FileText,
  Settings,
  Upload,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  UserCog,
  Calculator,
  X,
  UsersRound,
  Receipt,
  Clock,
  Truck,
  ClipboardList,
  Sparkles,
  Briefcase,
  UserCircle2,
  Cog,
  FileBarChart2,
  Lock,
  BookOpen,
} from 'lucide-react';
import logoBnp from '@/assets/logo-bnp.png';
import logoSystem from '@/assets/logo-system-v5.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useToast } from '@/hooks/use-toast';
import { ModuleKey } from '@/types/moduleAccess';
import { UserRole } from '@/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type NavItem = {
  path: string;
  label: string;
  icon: any;
  moduleKey?: ModuleKey;
  comingSoon?: boolean;
  external?: boolean;
  allowedRoles?: UserRole[];
};

type NavGroup = {
  label?: string;
  icon?: any;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'DASHBOARD' },
      { path: '/alertas', label: 'Alertas', icon: Bell, moduleKey: 'ALERTS' },
    ],
  },
  {
    label: 'Adm Clientes e Contratos',
    icon: Briefcase,
    items: [
      { path: '/clientes', label: 'Clientes', icon: Users, moduleKey: 'CLIENTS' },
      { path: '/contratos', label: 'Contratos', icon: FileText, moduleKey: 'CONTRACTS' },
      { path: '/receivables', label: 'Recebíveis', icon: Receipt, moduleKey: 'RECEIVABLES' },
      { path: '/relatorios', label: 'Relatórios Mensais', icon: FileBarChart2, moduleKey: 'REPORTS' },
      { path: '/calculadora', label: 'Simulador de Contratos', icon: Calculator, moduleKey: 'CALCULATOR' },
    ],
  },
  {
    label: 'Adm Recursos e Pessoas',
    icon: UserCircle2,
    items: [
      { path: '/rh', label: 'Recursos Humanos', icon: UsersRound, moduleKey: 'HR' },
      { path: '/squads', label: 'Squads', icon: LayoutGrid, moduleKey: 'SQUADS' },
      { path: '#', label: 'Adm Horas Extras', icon: Clock, comingSoon: true },
      { path: '/adm-transportes', label: 'Adm Deslocamentos (Aplicativo)', icon: Truck },
      {
        path: '#',
        label: 'Requisição de Vagas',
        icon: ClipboardList,
        comingSoon: true,
        allowedRoles: ['c-level', 'intermediario', 'lider_tribo', 'coordenacao_suporte', 'projetos_produtos'],
      },
      { path: '/skills-vagas', label: 'Skills de Vagas', icon: Sparkles, moduleKey: 'JOB_SKILLS' },
    ],
  },
  {
    label: 'Setup',
    icon: Cog,
    items: [
      { path: '/configuracoes', label: 'Configurações', icon: Settings, moduleKey: 'SETTINGS' },
      { path: '/usuarios', label: 'Usuários', icon: UserCog, moduleKey: 'USERS_ADMIN' },
      { path: '/usuarios/perfis', label: 'Perfis', icon: ShieldCheck, moduleKey: 'PROFILES_ADMIN' },
      { path: '/importar-exportar', label: 'Importar/Exportar', icon: Upload, moduleKey: 'IMPORT_EXPORT' },
    ],
  },
  {
    items: [{ path: '/ajuda', label: 'Ajuda', icon: HelpCircle }],
  },
];

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout, userRole } = useAuth();
  const isMobile = useIsMobile();
  const { canAccessModule } = useModuleAccess();
  const { toast } = useToast();

  const handleComingSoonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: 'Em breve',
      description: 'Este módulo está em desenvolvimento e será disponibilizado em breve.',
    });
  };

  const handleLockedClick = (e: React.MouseEvent, item: NavItem) => {
    e.preventDefault();
    toast({
      title: '🔒 Acesso restrito',
      description: `Seu perfil não permite acesso ao módulo "${item.label}". Solicite ao administrador do sistema.`,
    });
  };

  const isItemAllowed = (item: NavItem): boolean => {
    if (item.moduleKey && !canAccessModule(item.moduleKey)) return false;
    if (item.allowedRoles && (!userRole || !item.allowedRoles.includes(userRole))) return false;
    return true;
  };

  // Mostrar todos os módulos, mas marcar os inacessíveis
  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.map((item) => ({
        ...item,
        locked: !isItemAllowed(item),
      })),
    }))
    .filter((g) => g.items.length > 0);

  // Estado de abertura por grupo (apenas para grupos com label).
  // Inicializa com o grupo que contém a rota ativa aberto; demais fechados.
  const initialOpen = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    visibleGroups.forEach((g) => {
      if (!g.label) return;
      map[g.label] = g.items.some(
        (it) =>
          !it.comingSoon &&
          !it.external &&
          it.path !== '#' &&
          (location.pathname === it.path ||
            (it.path !== '/dashboard' && location.pathname.startsWith(it.path))),
      );
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(initialOpen);
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActiveItem = (item: NavItem) =>
    !item.comingSoon &&
    !item.external &&
    (location.pathname === item.path ||
      (item.path !== '/dashboard' && item.path !== '#' && location.pathname.startsWith(item.path)));

  const renderItemBody = (item: NavItem & { locked?: boolean }, showLabel: boolean, onNavigate?: () => void) => {
    const Icon = item.icon;
    const active = isActiveItem(item);
    const locked = item.locked;

    const baseClasses = cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full',
      active && 'bg-sidebar-accent text-sidebar-primary',
      !active && !item.comingSoon && !locked && 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
      item.comingSoon && 'text-sidebar-foreground/40 cursor-not-allowed',
      locked && 'text-sidebar-foreground/55 cursor-not-allowed',
    );

    const inner = (
      <>
        <Icon className={cn('w-5 h-5 shrink-0', active && 'text-sidebar-primary', locked && 'opacity-40')} />
        {showLabel && <span title={item.label} className="text-sm font-medium leading-snug min-w-0 flex-1 break-words">{item.label}</span>}
        {showLabel && item.comingSoon && (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-sidebar-foreground/10 text-sidebar-foreground/60 shrink-0">
            Em breve
          </span>
        )}
        {showLabel && locked && (
          <Lock className="w-3.5 h-3.5 shrink-0 opacity-70" />
        )}
      </>
    );

    if (locked) {
      return (
        <button
          type="button"
          onClick={(e) => { handleLockedClick(e, item); onNavigate?.(); }}
          className={cn(baseClasses, 'text-left')}
          aria-disabled="true"
        >
          {inner}
        </button>
      );
    }

    if (item.comingSoon) {
      return (
        <button
          type="button"
          onClick={(e) => {
            handleComingSoonClick(e);
            onNavigate?.();
          }}
          className={cn(baseClasses, 'text-left')}
          aria-disabled="true"
        >
          {inner}
        </button>
      );
    }

    if (item.external) {
      return (
        <a
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={baseClasses}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link to={item.path} onClick={onNavigate} className={baseClasses}>
        {inner}
      </Link>
    );
  };

  const renderGroups = (opts: { showLabels: boolean; onNavigate?: () => void; useTooltip?: boolean }) => {
    const { showLabels, onNavigate, useTooltip } = opts;

    const renderItemsList = (items: NavItem[]) => (
      <ul className="space-y-1">
        {items.map((item) => {
          const body = renderItemBody(item, showLabels, onNavigate);
          return (
            <li key={`${item.label}-${item.path}`}>
              {useTooltip && !showLabels ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{body}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                    {item.comingSoon ? ' (Em breve)' : ''}
                  </TooltipContent>
                </Tooltip>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    );

    return (
      <ul className="space-y-1">
        {visibleGroups.map((group, gIdx) => {
          // Grupos sem label: itens sempre visíveis (Dashboard/Alertas/Ajuda)
          if (!group.label) {
            return (
              <li key={`group-${gIdx}`}>
                {gIdx > 0 && !showLabels && (
                  <div className="mx-3 mb-2 border-t border-sidebar-border/60" />
                )}
                {renderItemsList(group.items)}
              </li>
            );
          }

          // Grupos com label: accordion (somente quando a sidebar está expandida)
          if (!showLabels) {
            // Sidebar colapsada: mostra apenas ícones dos itens (com tooltip)
            return (
              <li key={`group-${gIdx}`}>
                {gIdx > 0 && <div className="mx-3 mb-2 border-t border-sidebar-border/60" />}
                {renderItemsList(group.items)}
              </li>
            );
          }

          const open = !!openGroups[group.label];
          const GroupIcon = group.icon;
          const groupContainsActive = group.items.some(
            (it) =>
              !it.comingSoon &&
              !it.external &&
              it.path !== '#' &&
              (location.pathname === it.path ||
                (it.path !== '/dashboard' && location.pathname.startsWith(it.path))),
          );

          return (
            <li key={`group-${gIdx}`} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.label!)}
                aria-expanded={open}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200',
                  'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  groupContainsActive && 'text-sidebar-foreground',
                )}
              >
                {GroupIcon && <GroupIcon className="w-5 h-5 shrink-0" />}
                <span className="text-sm font-semibold flex-1 min-w-0 text-left leading-snug whitespace-normal break-words">
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200',
                    open ? 'rotate-0' : '-rotate-90',
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-1">{renderItemsList(group.items)}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    );
  };

  // Mobile drawer overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <img src={logoBnp} alt="BNP Logo" className="w-16 h-auto object-contain" />
                  <img src={logoSystem} alt="BNPHub" className="w-10 h-10 object-contain" />
                  <div>
                    <span className="font-bold text-sidebar-foreground text-sm">BNP</span>
                    <span className="text-sidebar-primary font-semibold text-sm">Hub</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onMobileClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
                {renderGroups({ showLabels: true, onNavigate: onMobileClose })}
              </nav>

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
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <img src={logoBnp} alt="BNP Logo" className="w-16 h-auto object-contain" />
            <img src={logoSystem} alt="BNPHub" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-bold text-sidebar-foreground text-sm">BNP</span>
              <span className="text-sidebar-primary font-semibold text-sm">Hub</span>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <img src={logoSystem} alt="BNPHub" className="w-9 h-9 object-contain" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        {renderGroups({ showLabels: !collapsed, useTooltip: true })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-2">
        {user && (
          <div className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', collapsed ? 'justify-center' : '')}>
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

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={cn(
                'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'px-0 justify-center' : 'justify-start',
              )}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span className="ml-2">Sair</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
        </Tooltip>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'px-0 justify-center' : 'justify-start',
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
