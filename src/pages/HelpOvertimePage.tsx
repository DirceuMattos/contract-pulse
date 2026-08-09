// v2 - tutorial revisado e ampliado (agosto/2026)
import { Clock } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Para que serve o módulo de horas extras',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo centraliza os lançamentos de horas extras (HE) dos colaboradores e mostra a evolução dos
          valores ao longo do tempo. A ideia é substituir o vaivém de planilhas: os dados entram uma vez, de
          forma controlada, e todo mundo passa a olhar para o mesmo número.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No menu lateral, o módulo fica no grupo <strong>Adm Recursos e Pessoas</strong> com o nome{' '}
          <strong>Adm Horas Extras</strong>. Os dados entram de duas formas:{' '}
          <strong>Importar planilha</strong> e <strong>Novo lançamento</strong> (manual). A tela se organiza
          em três abas: <strong>Painel</strong>, <strong>Lançamentos</strong> e <strong>Pendências</strong>.
        </p>
        <Callout type="info">
          O contador ao lado da aba <strong>Pendências</strong> mostra quantos itens de importação ainda
          aguardam conciliação. Se ele estiver diferente de zero, existem valores fora dos totais do Painel.
        </Callout>
      </div>
    ),
  },
  {
    id: 'abas',
    label: 'As três abas',
    title: 'Painel, Lançamentos e Pendências',
    content: (
      <DataTable
        headers={['Aba', 'Para que serve']}
        rows={[
          ['Painel', 'Filtros de ano e mês, os dois cartões de resumo e os quatro gráficos de evolução.'],
          ['Lançamentos', 'Lista detalhada dos lançamentos do período, com filtros próprios por colaborador, área e mês.'],
          ['Pendências', 'Fila dos itens de importação cujo nome não casou com um colaborador do Hub, para conciliar depois.'],
        ]}
      />
    ),
  },
  {
    id: 'importar',
    label: 'Importar planilha',
    title: 'Importação de planilha',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Importar planilha</strong> aceita arquivos <strong>.xlsx</strong> ou{' '}
          <strong>.xls</strong> em dois formatos, reconhecidos automaticamente: a planilha{' '}
          <strong>consolidada</strong> (uma única aba, com colunas de fornecedor/colaborador, mês, área,
          categoria e valor) e a planilha de <strong>PJ</strong> (uma aba por mês, com nome, horas e valor).
          O formato identificado aparece como um selo assim que o arquivo é lido.
        </p>
        <Steps
          items={[
            { title: 'Informe o ano de referência', body: 'Esse ano é usado quando a planilha não traz a informação — é o caso da planilha de PJ, que só indica o mês pelo nome da aba.' },
            { title: 'Escolha o arquivo', body: 'Clique na área tracejada e selecione a planilha. O sistema lê o arquivo, identifica o formato e monta a lista de conferência.' },
            { title: 'Confira o vínculo de cada linha', body: 'Cada nome da planilha é comparado com o cadastro de pessoas do Hub. Os que casaram já vêm preenchidos na coluna Colaborador (Hub); os ambíguos ou sem correspondência ficam destacados para você escolher manualmente.' },
            { title: 'Ignore o que não deve entrar', body: 'Use Ignorar para descartar uma linha (e Incluir para voltar atrás). O contador no topo mostra quantas estão prontas e quantas seguem pendentes.' },
            { title: 'Salve', body: 'As linhas com colaborador definido viram lançamentos. As que ficaram sem vínculo são enviadas para a aba Pendências, e o botão informa isso antes de você confirmar.' },
          ]}
        />
        <Callout type="tip">
          Reimportar o mesmo arquivo é seguro: lançamentos idênticos não são duplicados e o que já está no
          banco nem aparece na lista de conferência. Se tudo da planilha já tiver sido importado, o sistema
          avisa que não há nada a fazer.
        </Callout>
      </div>
    ),
  },
  {
    id: 'manual',
    label: 'Lançamento manual',
    title: 'Novo lançamento (várias linhas de uma vez)',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Novo lançamento</strong> abre uma grade para registrar vários movimentos do mesmo
          período de uma só vez. É a via alternativa quando não existe planilha ou quando falta apenas um
          ajuste pontual.
        </p>
        <Steps
          items={[
            { title: 'Defina o período do lote', body: 'Escolha Mês e Ano no topo da janela — eles valem para todas as linhas.' },
            { title: 'Preencha as linhas', body: 'Para cada colaborador, informe Valor (R$), Horas e Ocorr. (ocorrências). As horas podem ser digitadas no formato 26:30. Use Adicionar linha para incluir mais.' },
            { title: 'Salve o lote', body: 'O botão mostra quantos lançamentos serão gravados. Linhas sem colaborador selecionado são simplesmente ignoradas.' },
          ]}
        />
        <Callout type="info">
          A mesma trava anti-duplicação da importação vale aqui: se o lançamento já existir com o mesmo
          colaborador, período, valor e horas, ele é ignorado e o sistema avisa quantos foram descartados.
        </Callout>
      </div>
    ),
  },
  {
    id: 'pendencias',
    label: 'Pendências',
    title: 'Conciliação de pendências',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Quando um nome da planilha não corresponde a nenhum colaborador do Hub — grafia diferente,
          apelido, pessoa não cadastrada —, a linha vai para a aba <strong>Pendências</strong> em vez de se
          perder. A fila é persistente: ela sobrevive ao fechamento da tela e pode ser tratada em outro dia,
          por outra pessoa, sem reenviar o arquivo.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A tabela mostra <strong>Nome (origem)</strong>, <strong>Período</strong>, <strong>Valor</strong> e
          uma lista para escolher o <strong>Colaborador (Hub)</strong>. Depois de escolher:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Resolver</strong> cria o lançamento definitivo e tira o item da fila.</li>
          <li><strong>Ignorar</strong> descarta o item sem criar lançamento (use para linhas que não deveriam ter sido importadas).</li>
        </ul>
        <Callout type="warn">
          Enquanto houver pendências, os totais do Painel estão incompletos. Vale conciliar a fila logo após
          cada importação, antes de usar os números em reuniões ou relatórios.
        </Callout>
      </div>
    ),
  },
  {
    id: 'painel',
    label: 'Painel',
    title: 'Painel: filtros, cartões e gráficos',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Os filtros <strong>Ano</strong> e <strong>Mês</strong> no alto do Painel comandam os cartões e os
          quatro gráficos. O seletor de ano lista apenas os anos que já têm lançamentos, além de{' '}
          <strong>Todos os anos</strong>.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>
            <strong>Média mensal</strong> — soma dos lançamentos dividida pela quantidade de meses que
            realmente têm dados. Meses sem lançamento não puxam a média para baixo.
          </li>
          <li>
            <strong>Último mês fechado</strong> — valor do mês mais recente já encerrado, com o nome do mês
            no título do cartão. No ano corrente, o mês em andamento é deliberadamente deixado de fora, para
            não comparar mês incompleto com mês completo.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          Os quatro gráficos mudam de formato conforme o filtro de ano: com um ano selecionado, mostram a
          distribuição daquele ano; com <strong>Todos os anos</strong>, passam a comparar um ano com o outro.
        </p>
        <DataTable
          headers={['Gráfico', 'Com um ano selecionado', 'Com Todos os anos']}
          rows={[
            ['Por regime', 'Barras com o valor de cada regime (CLT, PJ, Cooperado, Sócio, Estágio).', 'Uma barra por ano dentro de cada regime, para ver a evolução.'],
            ['Por mês', 'Linha com a evolução mês a mês no ano.', 'Uma linha por ano sobre os mesmos doze meses, para comparar sazonalidade.'],
            ['Por área', 'As 10 áreas com maior valor de HE.', 'As mesmas áreas, com uma barra por ano.'],
            ['Por colaborador', 'Os 10 colaboradores com maior valor de HE.', 'Os mesmos colaboradores, com uma barra por ano.'],
          ]}
        />
        <Callout type="info">
          Os gráficos priorizam <strong>valor</strong> e não horas: nem toda origem de dados informa a
          quantidade de horas, então o valor é a única métrica sempre comparável.
        </Callout>
      </div>
    ),
  },
  {
    id: 'lancamentos',
    label: 'Lançamentos',
    title: 'Aba Lançamentos e seus filtros',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          A aba <strong>Lançamentos</strong> lista linha a linha o que está no período escolhido no Painel,
          com as colunas <strong>Colaborador</strong>, <strong>Período</strong>, <strong>Regime</strong>,{' '}
          <strong>Área</strong>, <strong>Horas</strong> e <strong>Valor</strong>. As horas aparecem no
          formato horas:minutos.
        </p>
        <p className="text-sm text-muted-foreground mb-3">Acima da tabela há três filtros próprios desta aba:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Buscar colaborador…</strong> — filtra pelo nome, aceitando parte do texto.</li>
          <li><strong>Área</strong> — lista apenas as áreas presentes nos dados carregados.</li>
          <li><strong>Mês</strong> — refina o período dentro do que já está filtrado no Painel.</li>
          <li><strong>Limpar</strong> — aparece assim que algum filtro é usado e devolve a lista completa.</li>
        </ul>
        <Callout type="warn">
          Esses filtros refinam apenas a tabela. Eles não alteram os cartões e gráficos do Painel nem o
          conteúdo do arquivo gerado por <strong>Exportar</strong> — quem manda nesses dois é o filtro de
          ano e mês do Painel.
        </Callout>
      </div>
    ),
  },
  {
    id: 'exportar',
    label: 'Exportar e histórico',
    title: 'Exportação e por que o histórico não muda',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Exportar</strong> gera um arquivo CSV com os lançamentos do período selecionado no
          Painel, contendo Colaborador, Mês, Ano, Regime, Área, Horas, Valor, Ocorrências e Origem. O nome do
          arquivo já indica o recorte exportado. O botão fica desabilitado quando não há lançamentos.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>Regime e área ficam congelados no lançamento.</strong> Eles são copiados do cadastro do
          colaborador no momento em que o registro é criado e não mudam depois. Assim, se alguém trocar de
          área no meio do ano, os meses anteriores continuam atribuídos à área correta da época — o
          histórico permanece fiel ao que aconteceu.
        </p>
      </div>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Permissões: quem pode o quê',
    content: (
      <div>
        <DataTable
          headers={['Ação', 'Quem pode']}
          rows={[
            ['Abrir o módulo Adm Horas Extras', 'Perfis com o módulo liberado. Por padrão: Superadmin, C-Level, RH, Administrativo, Líder de Tribo, Coordenação de Suporte, Projetos e Produtos, Intermediário e Demo.'],
            ['Consultar Painel, Lançamentos e Pendências', 'Qualquer perfil que consiga abrir o módulo.'],
            ['Importar planilha e criar Novo lançamento', 'Qualquer perfil com acesso ao módulo — a tela não separa consulta de inclusão.'],
            ['Resolver ou ignorar pendências', 'Qualquer perfil com acesso ao módulo. Por ser uma decisão que vira lançamento oficial, combine internamente quem faz a conciliação.'],
            ['Exportar o CSV', 'Qualquer perfil com acesso ao módulo, desde que haja lançamentos no período.'],
            ['Perfis sem o módulo', 'Veem o item no menu com um cadeado e recebem um aviso de acesso restrito ao clicar. Leitor, Comercial e Jurídico não têm o módulo por padrão.'],
          ]}
        />
        <Callout type="info">
          A liberação por perfil é feita em <strong>Setup</strong> → <strong>Perfis</strong>. Qualquer perfil
          pode receber o módulo; não há restrição fixa por cargo.
        </Callout>
      </div>
    ),
  },
  {
    id: 'problemas-comuns',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable
        headers={['Sintoma', 'Causa provável', 'Solução']}
        rows={[
          ['Importei a planilha e o total do Painel continua menor que o esperado', 'Parte das linhas não casou com colaboradores e foi para a fila de conciliação.', 'Abra a aba "Pendências", escolha o colaborador de cada item e clique em "Resolver".'],
          ['A importação avisou que não há nada para importar', 'Todas as linhas do arquivo já estavam no banco.', 'Comportamento esperado da trava anti-duplicação. Confira na aba "Lançamentos" se os valores realmente estão lá.'],
          ['Um nome aparece como "Ambíguo — escolha" na importação', 'Existe mais de um colaborador com o mesmo nome ou o mesmo primeiro nome no cadastro.', 'Selecione manualmente a pessoa correta na coluna "Colaborador (Hub)" antes de salvar.'],
          ['O colaborador não aparece na lista para vincular', 'A pessoa não está cadastrada no módulo de Recursos Humanos.', 'Cadastre a pessoa em RH e refaça a importação, ou resolva depois pela aba "Pendências". Colaboradores inativos aparecem na lista com a marcação (inativo).'],
          ['A planilha de PJ entrou com o ano errado', 'Essa planilha só informa o mês pelo nome da aba; o ano vem do campo "Ano de referência".', 'Reabra a importação, ajuste o "Ano de referência" antes de escolher o arquivo e importe de novo.'],
          ['A coluna Horas mostra 0:00', 'O formato de origem não trouxe a quantidade de horas, apenas o valor.', 'Comportamento esperado. Use o valor como métrica de comparação ou complete por lançamento manual.'],
          ['O cartão "Último mês fechado" está zerado', 'Ainda não há lançamentos em nenhum mês já encerrado do período filtrado.', 'Importe o mês fechado ou troque o filtro de ano. O mês em andamento nunca entra nesse cartão.'],
          ['Filtrei na aba Lançamentos e o gráfico não mudou', 'Os filtros da aba Lançamentos valem só para a tabela.', 'Para mudar os gráficos, use os filtros de Ano e Mês na aba "Painel".'],
          ['O botão "Exportar" está desabilitado', 'Não há lançamentos no período selecionado.', 'Ajuste os filtros de Ano e Mês no Painel até que existam lançamentos.'],
          ['A área do lançamento antigo está diferente do cadastro atual', 'Regime e área são congelados no momento do lançamento.', 'É o comportamento correto: preserva o histórico. Para refletir a mudança, faça o lançamento do novo período.'],
        ]}
      />
    ),
  },
];

export default function HelpOvertimePage() {
  return (
    <HelpArticle
      title="Adm Horas Extras"
      description="Importação, lançamento manual, conciliação e análise de horas extras"
      icon={Clock}
      sections={sections}
    />
  );
}
