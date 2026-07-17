import { Truck } from 'lucide-react';
import { DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Adm Transportes',
    content: <p className="text-sm text-muted-foreground">O módulo de transportes apoia análise de deslocamentos, custos, projeções e agrupamentos por destino, usuário ou supervisor.</p>,
  },
  {
    id: 'analises',
    label: 'Análises',
    title: 'Principais análises',
    content: (
      <DataTable headers={['Análise', 'Uso']} rows={[
        ['Total gasto', 'Acompanha custo acumulado por período.'],
        ['Projeção anual', 'Projeta gasto com base na média observada.'],
        ['Destino', 'Identifica rotas ou endereços recorrentes.'],
        ['Supervisor', 'Agrupa deslocamentos por responsável operacional.'],
      ]} />
    ),
  },
  {
    id: 'mercado',
    label: 'Custos de Mercado',
    title: 'Custos de mercado',
    content: <p className="text-sm text-muted-foreground">A análise pode usar referências de mercado para comparar locação, combustível, manutenção, seguro, motorista e outros custos.</p>,
  },
];

export default function HelpTransportPage() {
  return <HelpArticle title="Adm Transportes" description="Análises de deslocamentos e custos" icon={Truck} sections={sections} />;
}
