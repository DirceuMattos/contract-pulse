import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Plus, X, Menu } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({ sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { clients, contracts } = useData();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
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
      isMobile ? 'left-0' : (sidebarCollapsed ? 'left-[72px]' : 'left-[260px]')
    )}>
      <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMobileMenuToggle} className="shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        
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
        <div className="flex items-center gap-1 sm:gap-2">
          {/* New Contract Button - Hidden on mobile since it's in Dashboard */}
          <Button
            size="sm"
            onClick={() => navigate('/contratos/novo')}
            className="gap-2 bg-primary hover:bg-primary/90 hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Novo Contrato</span>
          </Button>
          
          {/* Notifications */}
          <NotificationCenter />
          
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
