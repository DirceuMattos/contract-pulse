import { Upload } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Importar e Exportar',
    content: <p className="text-sm text-muted-foreground">O módulo centraliza exportações e importações operacionais, respeitando permissões de visualização de valores e custos.</p>,
  },
  {
    id: 'exportar',
    label: 'Exportar',
    title: 'Exportação de dados',
    content: (
      <>
        <DataTable headers={['Exportação', 'Observação']} rows={[
          ['Clientes e contratos', 'Valores financeiros dependem da permissão do usuário.'],
          ['RH', 'Salários e custos dependem da permissão de Custos RH.'],
          ['Formato', 'Use Excel ou CSV conforme necessidade de análise.'],
        ]} />
        <Callout type="info">Exportações devem ser compartilhadas apenas com pessoas autorizadas a ver os dados contidos no arquivo.</Callout>
      </>
    ),
  },
  {
    id: 'importar',
    label: 'Importar',
    title: 'Importação de dados',
    content: (
      <Steps items={[
        { title: 'Baixe ou prepare o modelo', body: 'Use colunas compatíveis com o sistema.' },
        { title: 'Revise antes de enviar', body: 'Confira nomes, vínculos, datas, equipes e campos obrigatórios.' },
        { title: 'Execute e valide', body: 'Após importar, revise amostras na tela correspondente.' },
      ]} />
    ),
  },
];

export default function HelpImportExportPage() {
  return <HelpArticle title="Importar/Exportar" description="Movimentação controlada de dados" icon={Upload} sections={sections} />;
}
