import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Calculator,
  Users,
  AlertTriangle,
  Settings,
  Upload,
  Plus,
  Moon,
  Sun,
  RotateCcw,
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

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, canEdit } = useAuth();

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
          <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
            <span className="ml-auto text-xs text-muted-foreground">g d</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/contratos'))}>
            <FileText className="mr-2 h-4 w-4" />
            Contratos
            <span className="ml-auto text-xs text-muted-foreground">g c</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/clientes'))}>
            <Building2 className="mr-2 h-4 w-4" />
            Clientes
            <span className="ml-auto text-xs text-muted-foreground">g r</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/calculadora'))}>
            <Calculator className="mr-2 h-4 w-4" />
            Calculadora
            <span className="ml-auto text-xs text-muted-foreground">g k</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/alertas'))}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Alertas
          </CommandItem>
          {user?.role === 'c-level' && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate('/usuarios'))}>
                <Users className="mr-2 h-4 w-4" />
                Usuários
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/usuarios/logs'))}>
                <Users className="mr-2 h-4 w-4" />
                Logs de Acesso
              </CommandItem>
            </>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate('/configuracoes'))}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/importar-exportar'))}>
            <Upload className="mr-2 h-4 w-4" />
            Importar / Exportar
          </CommandItem>
        </CommandGroup>

        {canEdit && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ações rápidas">
              <CommandItem onSelect={() => runCommand(() => navigate('/contratos/novo'))}>
                <Plus className="mr-2 h-4 w-4" />
                Novo contrato
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/clientes/novo'))}>
                <Plus className="mr-2 h-4 w-4" />
                Novo cliente
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/calculadora/nova'))}>
                <Plus className="mr-2 h-4 w-4" />
                Nova simulação
              </CommandItem>
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
