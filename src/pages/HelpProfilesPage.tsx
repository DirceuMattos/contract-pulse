import { ShieldCheck } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visao Geral',
    title: 'O que e a Gestao de Perfis?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Gestao de Perfis controla quais modulos cada perfil acessa e quais acoes pode executar dentro de cada modulo.
          Ela evita que usuarios consultem valores sensiveis ou alterem cadastros mestres indevidamente.
        </p>
        <Callout type="warn">Antes de liberar uma permissao, pense no impacto operacional: o usuario apenas precisa consultar ou tambem precisa alterar dados?</Callout>
      </>
    ),
  },
  {
    id: 'grade',
    label: 'Grade',
    title: 'Como ler a grade de permissoes',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Cada linha representa um modulo. As colunas indicam as acoes permitidas naquele modulo.
          Se o acesso ao modulo estiver desligado, as acoes daquele modulo ficam sem efeito.
        </p>
        <DataTable headers={['Coluna', 'Uso pratico']} rows={[
          ['Modulo', 'Permite ou bloqueia a entrada naquele modulo.'],
          ['Editar', 'Permite alterar registros ja existentes.'],
          ['Criar', 'Permite cadastrar novos registros.'],
          ['Excluir', 'Permite remover registros quando a tela e o banco permitem.'],
          ['Exportar', 'Permite baixar dados em planilha ou arquivo.'],
          ['Ver valores', 'Libera valores financeiros de contratos, recebiveis e indicadores.'],
          ['Custos RH', 'Libera salarios, beneficios, encargos e custo total de RH.'],
          ['Alocar', 'Libera acoes operacionais de alocacao, especialmente em Squads.'],
        ]} />
      </>
    ),
  },
  {
    id: 'editar',
    label: 'Editar',
    title: 'Alterar permissao de um perfil',
    content: (
      <Steps items={[
        { title: 'Abra Setup > Gestao de Perfis', body: 'Apenas perfis administrativos autorizados devem acessar esta tela.' },
        { title: 'Escolha o perfil', body: 'Clique em Configurar no card do perfil que sera ajustado.' },
        { title: 'Revise modulo por modulo', body: 'Ative apenas os modulos realmente necessarios para a funcao daquele perfil.' },
        { title: 'Ajuste as acoes', body: 'Marque Editar, Criar, Excluir, Exportar, Ver valores, Custos RH ou Alocar conforme a necessidade.' },
        { title: 'Salve e teste', body: 'Depois de salvar, teste com um usuario real ou de homologacao daquele perfil.' },
      ]} />
    ),
  },
  {
    id: 'valores',
    label: 'Valores',
    title: 'Permissoes sensiveis',
    content: (
      <>
        <DataTable headers={['Permissao', 'Cuidado']} rows={[
          ['Ver valores', 'Exibe valores financeiros de contratos, receitas, margens e recebiveis.'],
          ['Custos RH', 'Exibe remuneracao, beneficios, encargos e custo total de RH.'],
          ['Editar em RH', 'Altera cadastro mestre da pessoa. Nao deve ser usado para simples alocacao.'],
          ['Editar em Contratos/Clientes', 'Altera dados cadastrais e pode afetar relatorios e indicadores.'],
          ['Alocar em Squads', 'Permite mover ou adicionar RH em projetos sem liberar edicao do cadastro mestre.'],
        ]} />
        <Callout type="info">Perfis operacionais podem precisar de Alocar em Squads, mas nao necessariamente de Editar RH, Contratos ou Clientes.</Callout>
      </>
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas Praticas',
    title: 'Regras recomendadas por perfil',
    content: (
      <DataTable headers={['Perfil', 'Configuracao recomendada']} rows={[
        ['Lider de Tribo', 'Acesso a Squads e acao Alocar. Sem valores financeiros e sem Custos RH.'],
        ['RH', 'Acesso a RH e Vagas. Pode alterar cadastros de RH conforme politica interna, mas sem visualizar custos se a regra assim definir.'],
        ['Administrativo', 'Pode ver valores e custos conforme necessidade de gestao financeira/operacional.'],
        ['Projetos/Produtos e Coordenacao', 'Acesso operacional, preferencialmente sem valores e sem edicao de cadastros mestres.'],
        ['Superadmin', 'Acesso amplo para manutencao, configuracao e suporte. Usar com parcimonia.'],
      ]} />
    ),
  },
];

export default function HelpProfilesPage() {
  return <HelpArticle title="Gestao de Perfis" description="Configuracao de acesso e acoes por modulo" icon={ShieldCheck} sections={sections} />;
}
