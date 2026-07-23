import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Calculator,
  Users,
  AlertTriangle,
  LayoutGrid,
  Settings,
  Upload,
  Plus,
  Moon,
  Sun,
  Briefcase,
  UsersRound,
  CircleDollarSign,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, canEdit } = useAuth();
  const { canAccessModule } = useModuleAccess();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Digite um comando ou busque..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Navegar">
          {canAccessModule('DASHBOARD') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard Contratos
              <span className="ml-auto text-xs text-muted-foreground">g d</span>
            </CommandItem>
          )}
          {canAccessModule('HR_DASHBOARD') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard-rh'))}>
              <UsersRound className="mr-2 h-4 w-4" />
              Dashboard RH
            </CommandItem>
          )}
          {canAccessModule('SUPPORT_COSTS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/custos-suporte'))}>
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Custos do Suporte
            </CommandItem>
          )}
          {canAccessModule('CONTRACTS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/contratos'))}>
              <FileText className="mr-2 h-4 w-4" />
              Contratos
              <span className="ml-auto text-xs text-muted-foreground">g c</span>
            </CommandItem>
          )}
          {canAccessModule('CLIENTS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/clientes'))}>
              <Building2 className="mr-2 h-4 w-4" />
              Clientes
              <span className="ml-auto text-xs text-muted-foreground">g r</span>
            </CommandItem>
          )}
          {canAccessModule('CALCULATOR') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/calculadora'))}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculadora
              <span className="ml-auto text-xs text-muted-foreground">g k</span>
            </CommandItem>
          )}
          {canAccessModule('ALERTS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/alertas'))}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Alertas
            </CommandItem>
          )}
          {canAccessModule('SQUADS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/squads'))}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Squads
            </CommandItem>
          )}
          {canAccessModule('USERS_ADMIN') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/usuarios'))}>
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </CommandItem>
          )}
          {canAccessModule('ACCESS_LOGS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/usuarios/logs'))}>
              <Users className="mr-2 h-4 w-4" />
              Logs de Acesso
            </CommandItem>
          )}
          {canAccessModule('SETTINGS') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/configuracoes'))}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </CommandItem>
          )}
          {canAccessModule('HR') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/rh'))}>
              <UsersRound className="mr-2 h-4 w-4" />
              Recursos Humanos
            </CommandItem>
          )}
          {canAccessModule('HR') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/rh/cargos'))}>
              <Briefcase className="mr-2 h-4 w-4" />
              RH &gt; Cargos
            </CommandItem>
          )}
          {canAccessModule('HR') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/rh/equipes'))}>
              <Users className="mr-2 h-4 w-4" />
              RH &gt; Equipes
            </CommandItem>
          )}
          {canAccessModule('IMPORT_EXPORT') && (
            <CommandItem onSelect={() => runCommand(() => navigate('/importar-exportar'))}>
              <Upload className="mr-2 h-4 w-4" />
              Importar / Exportar
            </CommandItem>
          )}
        </CommandGroup>

        {canEdit && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ações rápidas">
              {canAccessModule('CONTRACTS') && (
                <CommandItem onSelect={() => runCommand(() => navigate('/contratos/novo'))}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo contrato
                </CommandItem>
              )}
              {canAccessModule('CLIENTS') && (
                <CommandItem onSelect={() => runCommand(() => navigate('/clientes/novo'))}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo cliente
                </CommandItem>
              )}
              {canAccessModule('CALCULATOR') && (
                <CommandItem onSelect={() => runCommand(() => navigate('/calculadora/nova'))}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova simulação
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Utilidades">
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
            Alternar tema ({theme === 'light' ? 'escuro' : 'claro'})
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex gap-4">
        <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd> navegar</span>
        <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">↵</kbd> selecionar</span>
        <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">esc</kbd> fechar</span>
      </div>
    </CommandDialog>
  );
}
