import { UsersRound } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visao Geral',
    title: 'O que e o modulo de Recursos Humanos?',
    content: (
      <p className="text-sm text-muted-foreground">
        Recursos Humanos e o cadastro mestre das pessoas. Nele ficam dados de vinculo, cargo, equipe, situacao,
        remuneracao, beneficios, linha do tempo, foto e alocacoes em contratos ou subprojetos.
      </p>
    ),
  },
  {
    id: 'consulta',
    label: 'Consultar',
    title: 'Como localizar uma pessoa',
    content: (
      <Steps items={[
        { title: 'Use a busca', body: 'Digite nome, matricula ou parte de uma observacao para encontrar rapidamente o RH.' },
        { title: 'Aplique filtros', body: 'Use situacao, departamento, vinculo, cargo, projeto, regime e marcadores para reduzir a lista.' },
        { title: 'Abra o detalhe', body: 'Clique na linha ou no icone de visualizacao para acessar resumo, financeiro, linha do tempo e alocacoes.' },
      ]} />
    ),
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    title: 'Remuneracao, beneficios, encargos e custo total',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A aba Financeiro mostra a composicao do custo da pessoa. Ela e restrita a perfis autorizados a ver custos de RH.
        </p>
        <DataTable headers={['Card', 'Significado']} rows={[
          ['Remuneracao Mensal', 'Valor mensal de salario ou contrato da pessoa.'],
          ['Total Beneficios', 'Soma dos beneficios cadastrados.'],
          ['Remuneracao Total', 'Remuneracao mensal + beneficios. Representa o total pago ao RH.'],
          ['Encargos', 'Percentual de CLT ou PJ aplicado somente sobre a remuneracao mensal.'],
          ['Custo total com RH', 'Remuneracao mensal + encargos + beneficios.'],
        ]} />
        <Callout type="warn">Encargos nao incidem sobre beneficios. Se houver divergencia, revise o cadastro e avise o administrador.</Callout>
      </>
    ),
  },
  {
    id: 'edicao',
    label: 'Editar',
    title: 'Editar cadastro de RH',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Perfis autorizados podem alterar dados cadastrais, valores, beneficios, regime de trabalho e observacoes.
          Perfis operacionais podem consultar dados, mas nao devem alterar o cadastro mestre.
        </p>
        <DataTable headers={['Situacao', 'Como proceder']} rows={[
          ['Alterar salario ou beneficio', 'Abra Editar, ajuste os valores e salve. O sistema cria evento na linha do tempo.'],
          ['Alterar cargo/equipe', 'Edite o cadastro somente se a informacao mestre mudou. Para alocacao em projeto, use Squads.'],
          ['Trocar foto', 'Disponivel para Superadmin, C-Level, Administrativo e RH.'],
          ['RH inativo', 'Revise alocacoes e substituicoes pendentes antes de manter em contratos.'],
        ]} />
        <Callout type="info">Se o cadastro salvar mas o historico falhar, a tela informa que os dados foram salvos e que a linha do tempo nao foi registrada.</Callout>
      </>
    ),
  },
  {
    id: 'timeline',
    label: 'Linha do Tempo',
    title: 'Linha do tempo do RH',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A linha do tempo registra reajustes, mudancas de cargo, beneficios, observacoes e desligamentos.
          Ela ajuda a entender por que um valor ou situacao mudou.
        </p>
        <DataTable headers={['Evento', 'Quando aparece']} rows={[
          ['Reajuste', 'Quando remuneracao ou beneficios mudam.'],
          ['Mudanca de cargo', 'Quando o cargo mestre e alterado.'],
          ['Observacao', 'Quando ha mudancas cadastrais gerais.'],
          ['Desligamento', 'Quando a pessoa e inativada/desligada.'],
        ]} />
      </>
    ),
  },
  {
    id: 'squads',
    label: 'Squads',
    title: 'Relacao com Squads',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Alocacoes em projetos devem ser feitas no modulo Squads, especialmente para Lider de Tribo.
          O cadastro de RH deve ser preservado como fonte mestre de dados da pessoa.
        </p>
        <DataTable headers={['Caso', 'Onde resolver']} rows={[
          ['Colocar RH em um projeto', 'Squads, visao Por Recurso, botao + no card da pessoa.'],
          ['Alocar em mais de um projeto', 'Squads, adicionando dedicacoes separadas.'],
          ['RH com 0% de dedicacao', 'Aparece na visao Por Recurso para permitir primeira alocacao.'],
          ['Substituir RH inativo', 'Squads, usando o fluxo de substituicao quando houver pendencia.'],
        ]} />
      </>
    ),
  },
];

export default function HelpHRPage() {
  return <HelpArticle title="Recursos Humanos" description="Cadastro mestre, custos, historico e alocacoes" icon={UsersRound} sections={sections} />;
}
