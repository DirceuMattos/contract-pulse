import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, FileBarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TUTORIALS = [
  {
    path: '/ajuda/relatorios',
    icon: FileBarChart2,
    title: 'Relatórios Mensais',
    description: 'Como criar, editar, sincronizar e exportar relatórios mensais dos contratos.',
    topics: ['Criar relatório', 'Editar seções', 'Sincronizar dados', 'Fluxo de status', 'Gerar PPTX'],
  },
];

export default function HelpPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        </div>
        <p className="text-muted-foreground text-sm">Guias e tutoriais para os módulos do BNPHub.</p>
      </div>

      <div className="grid gap-4">
        {TUTORIALS.map((t) => (
          <Card
            key={t.path}
            className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
            onClick={() => navigate(t.path)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base mb-1">{t.title}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.topics.map((topic) => (
                        <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {topic}
                        </span>
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
