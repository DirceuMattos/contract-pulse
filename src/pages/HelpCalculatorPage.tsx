import { Calculator } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Simulador de Contratos',
    content: <p className="text-sm text-muted-foreground">O simulador apoia análises de viabilidade, custos, preço e margem antes ou durante negociações contratuais.</p>,
  },
  {
    id: 'simular',
    label: 'Simular',
    title: 'Criar uma simulação',
    content: (
      <Steps items={[
        { title: 'Informe premissas', body: 'Preencha escopo, recursos, despesas e parâmetros comerciais.' },
        { title: 'Revise custos', body: 'Valide recursos humanos, custos operacionais e despesas adicionais.' },
        { title: 'Analise cenários', body: 'Compare margem, resultado e status de viabilidade.' },
      ]} />
    ),
  },
  {
    id: 'resultado',
    label: 'Resultado',
    title: 'Leitura dos resultados',
    content: (
      <DataTable headers={['Indicador', 'Uso']} rows={[
        ['Custo total', 'Base de comparação para preço e margem.'],
        ['Resultado', 'Diferença entre receita estimada e custos.'],
        ['Margem', 'Indicador principal de viabilidade.'],
      ]} />
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Permissões',
    content: <Callout type="warn">Simulações podem envolver valores sensíveis. Restrinja acesso conforme a política de valores financeiros.</Callout>,
  },
];

export default function HelpCalculatorPage() {
  return <HelpArticle title="Simulador de Contratos" description="Premissas, custos e cenários de viabilidade" icon={Calculator} sections={sections} />;
}
