import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Mail, Lock, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('admin@bnp.com.br');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<UserRole>('c-level');
  const [loading, setLoading] = useState(false);
  
  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !role) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para continuar.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await login(email, password, role);
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Erro ao entrar',
        description: 'Não foi possível realizar o login.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const roleDescriptions: Record<UserRole, string> = {
    'c-level': 'Acesso total com visualização de valores financeiros',
    'intermediario': 'Edição de dados sem visualização de valores',
    'leitor': 'Apenas visualização sem valores',
  };
  
  return (
    <div className="min-h-screen flex">
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
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">BNP</span>
              <span className="text-2xl font-semibold text-emerald-400">Contratos</span>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-2">Saúde e Break Even de Contratos</p>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Controle total da<br />
              <span className="text-emerald-400">saúde financeira</span><br />
              dos seus contratos
            </h1>
            <p className="text-white/70 text-lg max-w-md">
              Saiba a qualquer momento se cada contrato está saudável, em atenção ou crítico. 
              Tome decisões baseadas em dados.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Contratos', value: '15+' },
              { label: 'Clientes', value: '10+' },
              { label: 'Recursos', value: '60+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        
        <p className="relative z-10 text-white/40 text-sm">
          © 2024 BNP. Todos os direitos reservados.
        </p>
      </motion.div>
      
      {/* Right side - Login form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">BNP</span>
              <span className="text-xl font-semibold text-accent">Contratos</span>
            </div>
          </div>
          
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
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
            
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de acesso</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="c-level">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">C-Level / Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="intermediario">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Intermediário</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="leitor">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Leitor</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {roleDescriptions[role]}
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full gap-2" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
          
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Ambiente de demonstração</p>
            <p className="text-xs text-muted-foreground">
              Este é um ambiente simulado com dados fictícios. Use qualquer e-mail 
              e senha para acessar. O perfil selecionado define as permissões.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
