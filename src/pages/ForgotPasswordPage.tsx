import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import logoBnp from '@/assets/logo-bnp.png';
import logoSystem from '@/assets/logo-system-v5.png';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o e-mail.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-foreground">Esqueceu a senha?</h2>
          <p className="text-muted-foreground mt-2">
            {sent
              ? 'Um e-mail com instruções foi enviado. Verifique sua caixa de entrada.'
              : 'Informe seu e-mail para receber as instruções de redefinição.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <Button asChild variant="outline" className="w-full gap-2" size="lg">
            <Link to="/login">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </Button>
        )}

        {!sent && (
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              ← Voltar ao login
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
