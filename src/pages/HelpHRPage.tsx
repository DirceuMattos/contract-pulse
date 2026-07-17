import { UsersRound } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é Recursos Humanos?',
    content: <p className="text-sm text-muted-foreground">O módulo de RH concentra o cadastro mestre de pessoas, vínculos, cargos, equipes, situação e informações financeiras autorizadas.</p>,
  },
  {
    id: 'cadastro',
    label: 'Cadastro Mestre',
    title: 'Cadastro mestre de pessoas',
    content: (
      <Steps items={[
        { title: 'Acesse Recursos Humanos', body: 'Use filtros de situação, equipe, cargo, vínculo, local e projeto para encontrar a pessoa.' },
        { title: 'Abra o detalhe', body: 'Consulte dados cadastrais, histórico, benefícios e alocações.' },
        { title: 'Edite somente quando autorizado', body: 'Perfis sem permissão ficam em modo de consulta para evitar alteração indevida do cadastro mestre.' },
      ]} />
    ),
  },
  {
    id: 'financeiro',
    label: 'Custos e Salários',
    title: 'Proteção de salários e custos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">Campos financeiros de RH são sensíveis e aparecem apenas para perfis autorizados a ver custos de RH.</p>
        <DataTable headers={['Informação', 'Regra']} rows={[
          ['Salário bruto', 'Oculto para perfis sem Custos RH.'],
          ['Encargos e impostos', 'Ocultos para perfis sem Custos RH.'],
          ['Cálculo de custo mensal', 'Oculto para perfis sem Custos RH.'],
          ['Percentual de dedicação', 'Pode aparecer nos fluxos operacionais de alocação.'],
        ]} />
      </>
    ),
  },
  {
    id: 'squads',
    label: 'Relação com Squads',
    title: 'Alocações e Squads',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">Alocações de pessoas em projetos devem ser feitas preferencialmente em Squads quando o objetivo for redistribuir dedicação operacional.</p>
        <Callout type="info">Líder de Tribo deve usar Squads &gt; Alocar para colocar a mesma pessoa em mais de um projeto sem editar o cadastro mestre de RH.</Callout>
      </>
    ),
  },
];

export default function HelpHRPage() {
  return <HelpArticle title="Recursos Humanos" description="Cadastro mestre, custos e relação com Squads" icon={UsersRound} sections={sections} />;
}
