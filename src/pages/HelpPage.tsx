import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
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
    description: 'Como ler indicadores, filtros de saúde e informações da carteira de contratos.',
    topics: ['KPIs', 'Saúde', 'Filtros', 'Valores'],
  },
  {
    path: '/ajuda/alertas',
    icon: Bell,
    title: 'Alertas',
    description: 'Como acompanhar riscos, pendências e alertas operacionais.',
    topics: ['Riscos', 'Pendências', 'Valores', 'Prioridade'],
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
    description: 'Como criar e gerenciar contratos, equipes, saúde financeira e alertas.',
    topics: ['Criar contrato', 'Indicadores de saúde', 'Filtros', 'Recursos', 'Status'],
  },
  {
    path: '/ajuda/relatorios',
    icon: FileBarChart2,
    title: 'Relatórios Mensais',
    description: 'Como criar, editar, sincronizar e exportar relatórios mensais dos contratos.',
    topics: ['Criar relatório', 'Editar seções', 'Sincronizar dados', 'Fluxo de status', 'Gerar PPTX'],
  },
  {
    path: '/ajuda/squads',
    icon: Users,
    title: 'Squads',
    description: 'Como atualizar equipes, gerenciar subprojetos e alocar membros por frente de trabalho.',
    topics: ['Editar alocação', 'Subprojetos', 'Alocar RH', 'Múltiplos projetos', 'Remover alocação'],
  },
  {
    path: '/ajuda/rh',
    icon: UsersRound,
    title: 'Recursos Humanos',
    description: 'Como consultar cadastro mestre, custos autorizados e relação com Squads.',
    topics: ['Cadastro', 'Custos', 'Somente leitura', 'Squads'],
  },
  {
    path: '/ajuda/vagas',
    icon: ClipboardList,
    title: 'Vagas e Skills',
    description: 'Como acompanhar requisições de vagas e padronizar competências.',
    topics: ['Requisição', 'Status', 'Skills', 'Comunicação'],
  },
  {
    path: '/ajuda/usuarios',
    icon: UserCog,
    title: 'Usuários',
    description: 'Como gerenciar usuários, status e modo de manutenção.',
    topics: ['Criar usuário', 'Ativar', 'Manutenção', 'Reativar'],
  },
  {
    path: '/ajuda/perfis',
    icon: ShieldCheck,
    title: 'Gestão de Perfis',
    description: 'Como configurar acesso e ações permitidas por módulo.',
    topics: ['Módulos', 'Ações', 'Valores', 'Custos RH'],
  },
  {
    path: '/ajuda/logs-acesso',
    icon: Activity,
    title: 'Logs de Acesso',
    description: 'Como consultar acessos e usar logs para auditoria.',
    topics: ['Sessões', 'IP', 'Módulos', 'Auditoria'],
  },
  {
    path: '/ajuda/configuracoes',
    icon: Settings,
    title: 'Configurações',
    description: 'Como lidar com parâmetros, cargos, equipes e integrações auxiliares.',
    topics: ['Cargos', 'Equipes', 'Feedz', 'Overhead'],
  },
  {
    path: '/ajuda/importar-exportar',
    icon: Upload,
    title: 'Importar/Exportar',
    description: 'Como movimentar dados com cuidado e respeitando permissões.',
    topics: ['Exportar', 'Importar', 'CSV', 'Excel'],
  },
  {
    path: '/ajuda/recebiveis',
    icon: Receipt,
    title: 'Recebíveis',
    description: 'Como acompanhar pagamentos, vencimentos e conciliação.',
    topics: ['Pagamentos', 'Atrasos', 'Conciliação', 'Valores'],
  },
  {
    path: '/ajuda/simulador',
    icon: Calculator,
    title: 'Simulador de Contratos',
    description: 'Como simular custos, preço, resultado e margem.',
    topics: ['Premissas', 'Custos', 'Cenários', 'Margem'],
  },
  {
    path: '/ajuda/ia',
    icon: Sparkles,
    title: 'IA / Análises',
    description: 'Como usar análises inteligentes, minutas e logs de IA.',
    topics: ['Contratos', 'Recursos', 'Minutas', 'Logs'],
  },
  {
    path: '/ajuda/transportes',
    icon: Truck,
    title: 'Adm Transportes',
    description: 'Como analisar deslocamentos, custos e projeções.',
    topics: ['Gastos', 'Destinos', 'Projeção', 'Mercado'],
  },
];

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        </div>
        <p className="text-muted-foreground text-sm">Guias e tutoriais para os módulos do BNPHub.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TUTORIALS.map((tutorial) => (
          <Card key={tutorial.path} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all" onClick={() => navigate(tutorial.path)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <tutorial.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base mb-1">{tutorial.title}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tutorial.topics.map((topic) => (
                        <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{topic}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
