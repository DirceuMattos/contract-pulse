import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/useModuleAccess';

interface AIPageLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { path: '/ai/contracts-analysis', label: 'Análise de Contratos' },
  { path: '/ai/resources-analysis', label: 'Análise de Recursos' },
  { path: '/ai/drafts', label: 'Minutas' },
  { path: '/ai/logs', label: 'Fontes e Logs', moduleKey: 'AI_LOGS' as const },
];

export function AIPageLayout({ children }: AIPageLayoutProps) {
  const location = useLocation();
  const { canAccessModule } = useModuleAccess();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border">
        {tabs
          .filter(tab => !tab.moduleKey || canAccessModule(tab.moduleKey))
          .map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        <div className="ml-auto pb-2">
          <Badge variant="secondary" className="text-xs">Simulação (Etapa 1)</Badge>
        </div>
      </div>
      {children}
    </div>
  );
}
