import { ClipboardList } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'vagas',
    label: 'Requisição',
    title: 'Requisição de Vagas',
    content: (
      <Steps items={[
        { title: 'Abra Requisição de Vagas', body: 'Registre a necessidade, área, função, senioridade e justificativa.' },
        { title: 'Acompanhe o andamento', body: 'Use status e responsáveis para controlar a evolução da solicitação.' },
        { title: 'Comunique equipes operacionais', body: 'Há demanda para criar um canal de comunicação do andamento das vagas com as equipes envolvidas.' },
      ]} />
    ),
  },
  {
    id: 'skills',
    label: 'Skills',
    title: 'Skills de Vagas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">Skills padronizam competências usadas nas vagas e facilitam comparação entre perfis.</p>
        <DataTable headers={['Uso', 'Benefício']} rows={[
          ['Descrição da vaga', 'Evita requisitos ambíguos.'],
          ['Triagem', 'Facilita comparação de candidatos.'],
          ['Histórico', 'Permite analisar demandas recorrentes.'],
        ]} />
      </>
    ),
  },
  {
    id: 'proximos',
    label: 'Próximos passos',
    title: 'Evoluções previstas',
    content: <Callout type="info">Está no radar criar um canal de comunicação do andamento das vagas com equipes operacionais.</Callout>,
  },
];

export default function HelpJobsPage() {
  return <HelpArticle title="Vagas e Skills" description="Requisição, acompanhamento e competências de vagas" icon={ClipboardList} sections={sections} />;
}
