import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import logoBnp from '@/assets/logo-bnp.png';
import logoSystem from '@/assets/logo-system-v5.png';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, mustChangePassword, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
    if (!authLoading && isAuthenticated && !mustChangePassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, mustChangePassword, navigate]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 12) return 'A senha deve ter pelo menos 12 caracteres.';
    if (!/[A-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[a-z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra minúscula.';
    if (!/[0-9]/.test(pwd)) return 'A senha deve conter pelo menos um número.';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'A senha deve conter pelo menos um caractere especial.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      toast({
        title: 'Senha inválida',
        description: pwdError,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha deve ser igual à nova senha.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (error) throw error;

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi alterada com sucesso.',
      });

      // Small delay so the auth state picks up the metadata change
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      toast({
        title: 'Erro ao alterar senha',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <img src={logoBnp} alt="BNP Logo" className="w-24 h-auto object-contain" />
          <div className="flex items-center gap-2">
            <img src={logoSystem} alt="BNPContractCore" className="w-8 h-8 object-contain" />
            <div>
              <span className="text-xl font-bold text-foreground">BNPContract</span>
              <span className="text-xl font-semibold text-accent">Core</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Troca de Senha Obrigatória</h2>
          <p className="text-muted-foreground mt-2">
            Este é seu primeiro acesso. Por favor, defina uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10"
                required
                minLength={12}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={12}
              />
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? 'Alterando...' : 'Alterar Senha e Continuar'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Mínimo 12 caracteres com maiúscula, minúscula, número e caractere especial.
        </p>
      </motion.div>
    </div>
  );
}
