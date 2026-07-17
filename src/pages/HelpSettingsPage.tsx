import { Settings } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Configurações',
    content: <p className="text-sm text-muted-foreground">Configurações concentram parâmetros estruturais do sistema, como cargos, equipes, integrações e regras auxiliares.</p>,
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    title: 'Cadastros auxiliares',
    content: (
      <DataTable headers={['Cadastro', 'Impacto']} rows={[
        ['Cargos', 'Usados em RH, recursos, squads e relatórios.'],
        ['Equipes', 'Organizam pessoas e alocações.'],
        ['Feedz/Reconcilição', 'Apoia saneamento e integração de dados de RH.'],
        ['Overhead', 'Apoia rateios e custos centrais.'],
      ]} />
    ),
  },
  {
    id: 'cuidados',
    label: 'Cuidados',
    title: 'Cuidados antes de alterar',
    content: <Callout type="warn">Mudanças em configurações podem afetar várias telas. Valide com uma amostra antes de considerar a alteração concluída.</Callout>,
  },
];

export default function HelpSettingsPage() {
  return <HelpArticle title="Configurações" description="Parâmetros e cadastros auxiliares do sistema" icon={Settings} sections={sections} />;
}
