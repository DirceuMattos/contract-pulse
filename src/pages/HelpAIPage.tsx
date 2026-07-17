import { Sparkles } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'IA e Análises',
    content: <p className="text-sm text-muted-foreground">As páginas de IA apoiam análises de contratos, recursos e geração de minutas, sempre dependendo da qualidade dos dados disponíveis.</p>,
  },
  {
    id: 'analises',
    label: 'Análises',
    title: 'Tipos de análise',
    content: (
      <DataTable headers={['Área', 'Objetivo']} rows={[
        ['Contratos', 'Identificar riscos, pontos de atenção e oportunidades.'],
        ['Recursos', 'Analisar alocação, capacidade e sinais operacionais.'],
        ['Minutas', 'Apoiar criação de textos e documentos internos.'],
      ]} />
    ),
  },
  {
    id: 'logs',
    label: 'Logs',
    title: 'Logs e rastreabilidade',
    content: <p className="text-sm text-muted-foreground">Logs de IA ajudam a entender fonte, status, erros e resultados de execuções.</p>,
  },
  {
    id: 'talentos',
    label: 'Talentos',
    title: 'Ideias futuras para pessoas',
    content: <Callout type="info">Está em avaliação o uso de IA para leitura de talentos e predição de possíveis solicitações de demissão. Essa frente exige cuidado com privacidade, vieses e governança.</Callout>,
  },
];

export default function HelpAIPage() {
  return <HelpArticle title="IA / Análises" description="Análises inteligentes, minutas e rastreabilidade" icon={Sparkles} sections={sections} />;
}
