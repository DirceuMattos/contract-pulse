import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logoBnp from '@/assets/logo-bnp.png';
import logoSystem from '@/assets/logo-system-v5.png';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Also listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      toast({ title: 'Senha inválida', description: pwdError, variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Senhas não conferem', description: 'A confirmação deve ser igual à nova senha.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: 'Senha redefinida!', description: 'Sua senha foi alterada com sucesso.' });
      setTimeout(() => navigate('/login', { replace: true }), 1000);
    } catch (error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Link inválido ou expirado.</p>
          <Button onClick={() => navigate('/login')}>Voltar ao login</Button>
        </div>
      </div>
    );
  }

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
            <img src={logoSystem} alt="BNPContractCore" className="w-12 h-12 object-contain" />
            <div>
              <span className="text-xl font-bold text-foreground">BNPContract</span>
              <span className="text-xl font-semibold text-accent">Core</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Redefinir Senha</h2>
          <p className="text-muted-foreground mt-2">Defina sua nova senha abaixo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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
