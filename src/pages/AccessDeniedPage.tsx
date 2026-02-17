import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <ShieldOff className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Negado</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Você não tem permissão para acessar este módulo. Entre em contato com o administrador para solicitar acesso.
      </p>
      <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
    </div>
  );
}
