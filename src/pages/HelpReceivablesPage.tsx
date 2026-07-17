import { Receipt } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Recebíveis',
    content: <p className="text-sm text-muted-foreground">Recebíveis acompanha pagamentos, vencimentos e inadimplência por cliente e contrato.</p>,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Leitura do painel',
    content: (
      <DataTable headers={['Informação', 'Uso']} rows={[
        ['Status de pagamento', 'Indica se o contrato está pago, pendente ou atrasado.'],
        ['Datas', 'Compara vencimento e pagamento do mês anterior e atual.'],
        ['Valores', 'Exibidos apenas para perfis com permissão de ver valores.'],
      ]} />
    ),
  },
  {
    id: 'conciliacao',
    label: 'Conciliação',
    title: 'Conciliação de recebíveis',
    content: (
      <Steps items={[
        { title: 'Abra a conciliação', body: 'Acesse a tela de reconciliar quando houver divergências entre contratos e pagamentos.' },
        { title: 'Revise cliente e contrato', body: 'Confirme CNPJ, contrato e complemento antes de vincular registros.' },
        { title: 'Salve a associação', body: 'A conciliação melhora a qualidade do dashboard de recebíveis.' },
      ]} />
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Permissões e valores',
    content: <Callout type="warn">Perfis sem permissão de ver valores não visualizam montantes pagos, a pagar ou em atraso.</Callout>,
  },
];

export default function HelpReceivablesPage() {
  return <HelpArticle title="Recebíveis" description="Pagamentos, vencimentos e conciliação" icon={Receipt} sections={sections} />;
}
