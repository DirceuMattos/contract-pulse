import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import logoBnp from "@/assets/logo-bnp.png";
import logoSystem from "@/assets/logo-system-v5.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, mustChangePassword, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (mustChangePassword) {
        navigate('/trocar-senha', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, mustChangePassword, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha e-mail e senha para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // Redirect is handled by the useEffect above after auth state updates
    } catch (error) {
      toast({
        title: "Erro ao entrar",
        description: error instanceof Error ? error.message : "Credenciais inválidas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero p-12 flex-col justify-between relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-white/30" />
          <div className="absolute bottom-40 right-10 w-96 h-96 rounded-full border border-white/20" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex items-start justify-between">
          <img src={logoBnp} alt="BNP Logo" className="w-[280px] h-auto object-contain" />
          <div className="flex items-center gap-3">
            <img src={logoSystem} alt="BNPContractCore" className="w-20 h-20 object-contain" />
            <div>
              <span className="text-3xl font-bold text-white">BNPContract</span>
              <span className="text-3xl font-semibold text-emerald-400">Core</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Squads, Contratos,
              <br />
              <span className="text-emerald-400">Resultados Financeiros</span>
            </h1>
            <p className="text-white/70 text-lg max-w-md">
              Saiba a qualquer momento - Status dos Contratos, Recursos Utilizados, Margem Operacional
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Contratos", value: "15+" },
              { label: "Clientes", value: "10+" },
              { label: "Recursos", value: "60+" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-sm">© 2026 BNP. Todos os direitos reservados.</p>
      </motion.div>

      {/* Right side - Login form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background min-h-screen lg:min-h-0"
      >
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src={logoBnp} alt="BNP Logo" className="w-24 h-auto object-contain" />
            <div className="flex items-center gap-2">
              <img src={logoSystem} alt="BNPContractCore" className="w-12 h-12 object-contain" />
              <div>
                <span className="text-lg font-bold text-foreground">BNPContract</span>
                <span className="text-lg font-semibold text-accent">Core</span>
              </div>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">Entre com suas credenciais para acessar o sistema</p>
          </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Acesse com as credenciais fornecidas pelo administrador do sistema.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
