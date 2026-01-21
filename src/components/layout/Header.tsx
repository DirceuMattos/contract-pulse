import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Plus, Bell, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useAlerts } from '@/hooks/useAlerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { clients, contracts } = useData();
  const { alerts, criticalCount } = useAlerts();
  const navigate = useNavigate();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search results
  const searchResults = searchQuery.length >= 2 ? [
    ...clients
      .filter(c => 
        c.razaoSocial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nomeFantasia?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 3)
      .map(c => ({ type: 'client' as const, id: c.id, title: c.nomeFantasia || c.razaoSocial, subtitle: 'Cliente' })),
    ...contracts
      .filter(c => 
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.codigo.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 3)
      .map(c => ({ type: 'contract' as const, id: c.id, title: c.nome, subtitle: c.codigo })),
  ] : [];
  
  
  
  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-background/95 backdrop-blur border-b border-border z-30 transition-all duration-200',
      sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
    )}>
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md relative">
          {searchOpen ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar clientes, contratos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 bg-secondary/50"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        navigate(result.type === 'client' ? `/clientes/${result.id}` : `/contratos/${result.id}`);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {result.type === 'client' ? 'Cliente' : 'Contrato'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Buscar...</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* New Contract Button */}
          <Button
            size="sm"
            onClick={() => navigate('/contratos/novo')}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Contrato</span>
          </Button>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {criticalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-health-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {criticalCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Alertas
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {alerts.slice(0, 5).map((alert) => (
                <DropdownMenuItem
                  key={alert.id}
                  onClick={() => navigate(`/contratos/${alert.contractId}`)}
                  className="flex flex-col items-start gap-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      alert.severity === 'critico' ? 'bg-health-critical' : 'bg-health-attention'
                    )} />
                    <span className="font-medium text-sm truncate">{alert.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 ml-4">
                    {alert.description}
                  </p>
                </DropdownMenuItem>
              ))}
              {alerts.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum alerta ativo
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>
          
          {/* User Avatar */}
          {user && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm border border-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
