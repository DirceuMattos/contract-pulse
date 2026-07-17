import { Bell } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que são Alertas?',
    content: <p className="text-sm text-muted-foreground">Alertas destacam riscos, pendências e eventos que exigem acompanhamento operacional ou gerencial.</p>,
  },
  {
    id: 'tipos',
    label: 'Tipos',
    title: 'Tipos de alerta',
    content: (
      <DataTable headers={['Tipo', 'Exemplo']} rows={[
        ['Contrato', 'Saúde crítica, margem baixa ou status que exige atenção.'],
        ['Recursos', 'Sub-dedicação, recurso inativo ou substituição pendente.'],
        ['Financeiro', 'Alertas que envolvem valores aparecem apenas para perfis autorizados.'],
      ]} />
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Alertas e confidencialidade',
    content: <Callout type="warn">Alertas financeiros são ocultados para perfis sem permissão de ver valores.</Callout>,
  },
];

export default function HelpAlertsPage() {
  return <HelpArticle title="Alertas" description="Central de pendências e riscos operacionais" icon={Bell} sections={sections} />;
}
