import { LayoutDashboard } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Dashboard Contratos',
    content: <p className="text-sm text-muted-foreground">O Dashboard Contratos consolida indicadores de contratos, saúde, receita, margem, riscos e composição operacional.</p>,
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Filtros e leitura dos indicadores',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">Use filtros para focar em cliente, segmento, status e saúde do contrato.</p>
        <DataTable headers={['Filtro', 'Uso']} rows={[
          ['Saudável', 'Lista contratos dentro dos parâmetros esperados.'],
          ['Atenção', 'Contratos com pontos de risco ou margem intermediária.'],
          ['Crítico', 'Contratos que exigem ação prioritária.'],
        ]} />
        <Callout type="info">Há demanda pendente para exibir claramente quais contratos compõem cada filtro de saúde.</Callout>
      </>
    ),
  },
  {
    id: 'valores',
    label: 'Valores',
    title: 'Valores financeiros',
    content: <p className="text-sm text-muted-foreground">Indicadores financeiros aparecem apenas para perfis autorizados a ver valores.</p>,
  },
];

export default function HelpDashboardPage() {
  return <HelpArticle title="Dashboard Contratos" description="Indicadores e filtros da carteira de contratos" icon={LayoutDashboard} sections={sections} />;
}
