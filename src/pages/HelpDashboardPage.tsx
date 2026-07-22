import { LayoutDashboard } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visao Geral',
    title: 'Para que serve o Dashboard Contratos?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O Dashboard Contratos mostra a visao consolidada da carteira: quantidade de contratos, saude do portfolio,
          receita, custo, margem e agrupamentos por status de saude. Ele deve ser usado para priorizar acoes de gestao,
          nao para editar cadastros.
        </p>
        <Callout type="info">Os valores financeiros aparecem somente para perfis autorizados a ver valores.</Callout>
      </>
    ),
  },
  {
    id: 'kpis',
    label: 'KPIs',
    title: 'Como ler os cards principais',
    content: (
      <DataTable headers={['Card', 'Como interpretar']} rows={[
        ['Total de Contratos', 'Conta contratos ativos da carteira filtrada. O detalhamento separa Govtech, Privado e Hibrido.'],
        ['Saude do Portfolio', 'Mostra quantos contratos estao Saudaveis, em Atencao ou Criticos.'],
        ['Receita Mensal Liquida', 'Receita bruta menos impostos de faturamento. A linha inferior mostra receita bruta e custo.'],
        ['Margem Total', 'Diferenca entre receita liquida e custo total dos contratos filtrados.'],
      ]} />
    ),
  },
  {
    id: 'saude',
    label: 'Saude',
    title: 'Filtros Saudavel, Atencao e Critico',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os botoes de saude filtram a carteira e tambem exibem a lista de contratos que compoem cada grupo.
          Use essa lista para entender exatamente quais contratos sustentam o numero do card.
        </p>
        <DataTable headers={['Filtro', 'Quando usar', 'Acao recomendada']} rows={[
          ['Todos', 'Visao completa da carteira.', 'Use para acompanhar o portfolio inteiro.'],
          ['Saudavel', 'Contratos com margem e indicadores dentro dos parametros.', 'Manter monitoramento de rotina.'],
          ['Atencao', 'Contratos com margem intermediaria, vencimento proximo ou risco operacional.', 'Revisar escopo, custos e pendencias.'],
          ['Critico', 'Contratos com margem baixa, vencimento muito proximo ou risco alto.', 'Priorizar acao da gestao.'],
        ]} />
        <Callout type="tip">Depois de clicar em um filtro de saude, role a pagina ate a lista de contratos para ver os nomes envolvidos.</Callout>
      </>
    ),
  },
  {
    id: 'custos',
    label: 'Custos',
    title: 'Como o custo e calculado',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O custo do Dashboard Contratos segue a mesma regra usada nas telas de contrato e subprojetos.
          Para RH, o conceito e: remuneracao mensal + encargos sobre remuneracao + beneficios, multiplicado pelo percentual de dedicacao.
        </p>
        <DataTable headers={['Componente', 'Regra']} rows={[
          ['Remuneracao', 'Valor mensal do RH ou custo base do recurso.'],
          ['Encargos / impostos', 'Aplicados somente sobre a remuneracao, nunca sobre beneficios.'],
          ['Beneficios', 'Somados depois dos encargos.'],
          ['Dedicacao', 'Aplica o percentual alocado ao contrato ou subprojeto.'],
          ['Subprojetos', 'Entram no custo do contrato sem duplicar o mesmo RH no contrato principal.'],
        ]} />
        <Callout type="warn">O custo do Dashboard Contratos pode ser menor que o custo total do modulo RH porque considera apenas a parcela alocada aos contratos ativos filtrados.</Callout>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Filtros de cliente e contrato',
    content: (
      <Steps items={[
        { title: 'Escolha um cliente', body: 'Use o primeiro filtro para ver somente contratos daquele cliente.' },
        { title: 'Escolha um contrato', body: 'Use o segundo filtro quando quiser analisar um contrato especifico.' },
        { title: 'Combine com saude', body: 'Use Saudavel, Atencao ou Critico para entender rapidamente a composicao do grupo.' },
        { title: 'Volte para Todos', body: 'Retorne os filtros para Todos quando quiser comparar a carteira completa.' },
      ]} />
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissoes',
    title: 'Quem ve valores no dashboard',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Indicadores financeiros sao sensiveis. Perfis sem permissao continuam vendo indicadores operacionais,
          mas nao enxergam receita, custo ou margem.
        </p>
        <DataTable headers={['Perfil', 'Valores financeiros']} rows={[
          ['C-Level', 'Sim'],
          ['Superadmin', 'Sim'],
          ['Administrativo', 'Nao no Dashboard Contratos, por regra operacional atual'],
          ['Lider de Tribo, RH, Projetos/Produtos, Coordenacao, Juridico, Comercial', 'Nao'],
        ]} />
      </>
    ),
  },
];

export default function HelpDashboardPage() {
  return <HelpArticle title="Dashboard Contratos" description="Indicadores, filtros e leitura da carteira de contratos" icon={LayoutDashboard} sections={sections} />;
}
