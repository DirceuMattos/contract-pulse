import React from 'react';
import { Lock } from 'lucide-react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import type { ModuleKey } from '@/types/moduleAccess';

interface AccessGuardProps {
  moduleKey: ModuleKey;
  children: React.ReactNode;
}

export function AccessGuard({ moduleKey, children }: AccessGuardProps) {
  const { canAccessModule } = useModuleAccess();

  if (!canAccessModule(moduleKey)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Seu perfil não tem permissão para acessar este módulo.
              Entre em contato com o administrador do sistema para solicitar acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AccessGuard;
