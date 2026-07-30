import { Clock } from 'lucide-react';
import { DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Adm Horas Extras',
    content: (
      <p className="text-sm text-muted-foreground">
        O módulo centraliza os lançamentos de horas extras (HE) dos colaboradores e apresenta a evolução
        dos valores para controle administrativo. Os dados entram de três formas: importação de planilha,
        lançamento manual e (em breve) importação de PDF da contabilidade. A tela organiza tudo em três abas —
        Painel, Lançamentos e Pendências.
      </p>
    ),
  },
  {
    id: 'abas',
    label: 'As três abas',
    title: 'Painel, Lançamentos e Pendências',
    content: (
      <DataTable headers={['Aba', 'Para que serve']} rows={[
        ['Painel', 'Filtros de ano/mês, cards de resumo (média mensal do ano e último mês fechado) e os dashboards de evolução.'],
        ['Lançamentos', 'Lista de todos os lançamentos do período, com filtros próprios por colaborador, área e mês.'],
        ['Pendências', 'Fila dos itens de importação cujo nome não casou com um colaborador do Hub, para conciliação posterior.'],
      ]} />
    ),
  },
  {
    id: 'importar',
    label: 'Importar planilha',
    title: 'Importação de planilha',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O botão “Importar planilha” aceita dois formatos: a planilha consolidada (colunas Ano, Mês, Fornecedor,
          Área, Categoria, Horas, Valor) e a planilha de PJ (uma aba por mês). O sistema reconhece o formato
          automaticamente.
        </p>
        <Steps items={[
          { title: 'Escolha o arquivo', body: 'Informe o ano de referência (usado quando a planilha não traz o ano) e selecione o arquivo .xlsx/.xls.' },
          { title: 'Confira o matching', body: 'Cada linha é casada com um colaborador do Hub pelo nome. As que casaram vêm pré-vinculadas; as ambíguas ou sem correspondência pedem seleção manual.' },
          { title: 'Resolva ou ignore', body: 'Ajuste o colaborador de cada linha ou marque “Ignorar” para as que não devem entrar.' },
          { title: 'Salve', body: 'As linhas com colaborador entram como lançamentos; as não resolvidas vão para a aba Pendências, para conciliação depois — sem precisar reenviar o arquivo.' },
        ]} />
        <p className="text-sm text-muted-foreground">
          Reimportar o mesmo arquivo é seguro: lançamentos idênticos não são duplicados, e o que já está no banco
          é ocultado da lista de importação.
        </p>
      </div>
    ),
  },
  {
    id: 'manual',
    label: 'Lançamento manual',
    title: 'Lançamento manual (multi-linha)',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O botão “Novo lançamento” abre um formulário em lista, para registrar vários movimentos do mesmo
          período de uma só vez. Serve como via alternativa quando a importação não for possível.
        </p>
        <Steps items={[
          { title: 'Defina o período', body: 'Escolha o mês e o ano no topo — valem para todas as linhas do lote.' },
          { title: 'Preencha as linhas', body: 'Para cada colaborador, informe valor, horas (formato 26:30) e ocorrências. Use “Adicionar linha” para incluir mais.' },
          { title: 'Salve tudo', body: 'Todos os lançamentos preenchidos são gravados de uma vez. Regime e área são registrados conforme o cadastro do colaborador.' },
        ]} />
      </div>
    ),
  },
  {
    id: 'pendencias',
    label: 'Pendências',
    title: 'Conciliação de pendências',
    content: (
      <p className="text-sm text-muted-foreground">
        Quando um nome da planilha não casa com um colaborador, o item fica na aba Pendências (persistente,
        sobrevive a fechar a tela). Ali, qualquer pessoa autorizada pode escolher o colaborador e “Resolver”
        (cria o lançamento) ou “Ignorar”. Isso permite tratar as inconsistências de forma assíncrona, sem
        reenviar planilhas.
      </p>
    ),
  },
  {
    id: 'regime-area',
    label: 'Regime e Área',
    title: 'Como regime e área são definidos',
    content: (
      <p className="text-sm text-muted-foreground">
        Regime (CLT/PJ/cooperado) e área vêm do cadastro do colaborador no momento do lançamento e ficam
        congelados no registro (snapshot). Assim, o histórico permanece fiel: se o colaborador mudar de área
        depois, os lançamentos antigos não se alteram.
      </p>
    ),
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    title: 'Dashboards e exportação',
    content: (
      <div className="space-y-4">
        <DataTable headers={['Análise', 'O que mostra']} rows={[
          ['Por regime', 'Distribuição do valor entre CLT, PJ e cooperado.'],
          ['Por mês', 'Evolução do valor ao longo dos meses.'],
          ['Por área', 'Áreas que mais concentram HE (top 8).'],
          ['Por colaborador', 'Colaboradores com maior valor (top 10).'],
        ]} />
        <p className="text-sm text-muted-foreground">
          Os filtros de ano/mês no Painel recalculam os dashboards. O botão “Exportar” gera um CSV dos
          lançamentos do período. Observação: horas nem sempre estão disponíveis na origem, por isso as
          análises priorizam valor.
        </p>
      </div>
    ),
  },
];

export default function HelpOvertimePage() {
  return <HelpArticle title="Adm Horas Extras" description="Importação, lançamento e análise de horas extras" icon={Clock} sections={sections} />;
}
