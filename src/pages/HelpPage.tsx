import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
  Clock,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TUTORIALS = [
  {
    path: '/ajuda/dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard Contratos',
    description: 'Como ler indicadores, custos, filtros de saude e contratos de cada grupo.',
    topics: ['KPIs', 'Saude', 'Contratos por filtro', 'Custos'],
  },
  {
    path: '/ajuda/alertas',
    icon: Bell,
    title: 'Alertas',
    description: 'Como acompanhar riscos, pendencias e alertas operacionais.',
    topics: ['Riscos', 'Pendencias', 'Valores', 'Prioridade'],
  },
  {
    path: '/ajuda/clientes',
    icon: Building2,
    title: 'Clientes',
    description: 'Como cadastrar, editar e gerenciar a base de clientes da BNP.',
    topics: ['Cadastrar cliente', 'Editar dados', 'Upload de logo', 'Segmentos', 'Excluir cliente'],
  },
  {
    path: '/ajuda/contratos',
    icon: FileText,
    title: 'Contratos',
    description: 'Como criar e gerenciar contratos, equipes, saude financeira e alertas.',
    topics: ['Criar contrato', 'Saude', 'Filtros', 'Recursos', 'Status'],
  },
  {
    path: '/ajuda/relatorios',
    icon: FileBarChart2,
    title: 'Relatorios Mensais',
    description: 'Como criar, editar, sincronizar e exportar relatorios mensais dos contratos.',
    topics: ['Criar relatorio', 'Editar secoes', 'Sincronizar dados', 'Fluxo de status', 'Gerar PPTX'],
  },
  {
    path: '/ajuda/squads',
    icon: Users,
    title: 'Squads',
    description: 'Como atualizar equipes, gerenciar subprojetos e alocar membros por frente de trabalho.',
    topics: ['Editar alocacao', 'Subprojetos', 'Alocar RH', 'Multiplos projetos', 'Remover alocacao'],
  },
  {
    path: '/ajuda/rh',
    icon: UsersRound,
    title: 'Recursos Humanos',
    description: 'Como consultar cadastro mestre, financeiro, linha do tempo e relacao com Squads.',
    topics: ['Cadastro', 'Financeiro', 'Historico', 'Squads'],
  },
  {
    path: '/ajuda/vagas',
    icon: ClipboardList,
    title: 'Vagas e Skills',
    description: 'Como criar vagas, acompanhar status, registrar condicoes e organizar skills.',
    topics: ['Requisicao', 'Status', 'Skills', 'Beneficios'],
  },
  {
    path: '/ajuda/usuarios',
    icon: UserCog,
    title: 'Usuarios',
    description: 'Como gerenciar usuarios, status, perfis e modo de manutencao.',
    topics: ['Criar usuario', 'Ativar', 'Manutencao', 'Reativar'],
  },
  {
    path: '/ajuda/perfis',
    icon: ShieldCheck,
    title: 'Gestao de Perfis',
    description: 'Como configurar acesso, acoes por modulo e permissoes sensiveis.',
    topics: ['Modulos', 'Acoes', 'Valores', 'Custos RH'],
  },
  {
    path: '/ajuda/logs-acesso',
    icon: Activity,
    title: 'Logs de Acesso',
    description: 'Como consultar acessos e usar logs para auditoria.',
    topics: ['Sessoes', 'IP', 'Modulos', 'Auditoria'],
  },
  {
    path: '/ajuda/configuracoes',
    icon: Settings,
    title: 'Configuracoes',
    description: 'Como lidar com parametros, cargos, equipes e integracoes auxiliares.',
    topics: ['Cargos', 'Equipes', 'Feedz', 'Overhead'],
  },
  {
    path: '/ajuda/importar-exportar',
    icon: Upload,
    title: 'Importar/Exportar',
    description: 'Como movimentar dados com cuidado e respeitando permissoes.',
    topics: ['Exportar', 'Importar', 'CSV', 'Excel'],
  },
  {
    path: '/ajuda/recebiveis',
    icon: Receipt,
    title: 'Recebiveis',
    description: 'Como acompanhar pagamentos, vencimentos e conciliacao.',
    topics: ['Pagamentos', 'Atrasos', 'Conciliacao', 'Valores'],
  },
  {
    path: '/ajuda/simulador',
    icon: Calculator,
    title: 'Simulador de Contratos',
    description: 'Como simular custos, preco, resultado e margem.',
    topics: ['Premissas', 'Custos', 'Cenarios', 'Margem'],
  },
  {
    path: '/ajuda/ia',
    icon: Sparkles,
    title: 'IA / Analises',
    description: 'Como usar analises inteligentes, minutas e logs de IA.',
    topics: ['Contratos', 'Recursos', 'Minutas', 'Logs'],
  },
  {
    path: '/ajuda/transportes',
    icon: Truck,
    title: 'Adm Transportes',
    description: 'Como analisar deslocamentos, custos e projecoes.',
    topics: ['Gastos', 'Destinos', 'Projecao', 'Mercado'],
  },
  {
    path: '/ajuda/horas-extras',
    icon: Clock,
    title: 'Adm Horas Extras',
    description: 'Como importar, lancar e analisar horas extras.',
    topics: ['Importar', 'Manual', 'Pendencias', 'Dashboards'],
  },
];

// Paleta por card (ciclada por índice) — dá identidade visual a cada módulo.
const PALETTE = [
  { ring: 'before:bg-blue-500', icon: 'text-blue-600', iconBg: 'bg-blue-50', chip: 'bg-blue-50 text-blue-700', glow: 'hover:shadow-blue-100' },
  { ring: 'before:bg-emerald-500', icon: 'text-emerald-600', iconBg: 'bg-emerald-50', chip: 'bg-emerald-50 text-emerald-700', glow: 'hover:shadow-emerald-100' },
  { ring: 'before:bg-violet-500', icon: 'text-violet-600', iconBg: 'bg-violet-50', chip: 'bg-violet-50 text-violet-700', glow: 'hover:shadow-violet-100' },
  { ring: 'before:bg-amber-500', icon: 'text-amber-600', iconBg: 'bg-amber-50', chip: 'bg-amber-50 text-amber-700', glow: 'hover:shadow-amber-100' },
  { ring: 'before:bg-rose-500', icon: 'text-rose-600', iconBg: 'bg-rose-50', chip: 'bg-rose-50 text-rose-700', glow: 'hover:shadow-rose-100' },
  { ring: 'before:bg-cyan-500', icon: 'text-cyan-600', iconBg: 'bg-cyan-50', chip: 'bg-cyan-50 text-cyan-700', glow: 'hover:shadow-cyan-100' },
];

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gradient-to-b from-muted/40 to-transparent">
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/5" />
          <div className="absolute -right-16 top-10 w-40 h-40 rounded-full bg-primary/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Central de Ajuda</h1>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Guias práticos para usar o BNPHub com segurança. Comece pelo módulo que você usa no dia a dia.
            </p>
            <p className="text-xs text-muted-foreground mt-3">{TUTORIALS.length} tutoriais disponíveis</p>
          </div>
        </div>

        {/* Grade de tutoriais */}
        <div className="grid gap-4 md:grid-cols-2">
          {TUTORIALS.map((tutorial, i) => {
            const c = PALETTE[i % PALETTE.length];
            return (
              <Card
                key={tutorial.path}
                onClick={() => navigate(tutorial.path)}
                className={`group relative cursor-pointer overflow-hidden border-border transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-lg ${c.glow}
                  before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[''] ${c.ring}
                  before:opacity-60 before:transition-opacity hover:before:opacity-100`}
              >
                <CardContent className="p-5 pl-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${c.iconBg} transition-transform group-hover:scale-110`}>
                        <tutorial.icon className={`w-5 h-5 ${c.icon}`} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-base mb-1">{tutorial.title}</h2>
                        <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tutorial.topics.map((topic) => (
                            <span key={topic} className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.chip}`}>{topic}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
