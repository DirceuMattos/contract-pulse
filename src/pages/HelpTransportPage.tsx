// v2 - tutorial revisado e ampliado (agosto/2026)
import { Truck } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Para que serve o módulo de deslocamentos',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo concentra os gastos com corridas de aplicativo dos colaboradores. Ele responde
          perguntas que antes exigiam planilhas soltas: quanto gastamos no período, quem mais usa, para
          onde as pessoas vão, quanto isso deve custar até o fim do ano e se valeria a pena ter um veículo
          próprio no lugar do aplicativo.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No menu lateral, o módulo fica no grupo <strong>Adm Recursos e Pessoas</strong> com o nome{' '}
          <strong>Adm Deslocamentos (Aplicativo)</strong>. O endereço da tela é{' '}
          <strong>/adm-transportes</strong> e o título exibido no topo é{' '}
          <strong>Adm Deslocamento por Aplicativo</strong>.
        </p>
        <Callout type="info">
          Todo o conteúdo da tela vem das planilhas importadas. Se um mês não foi importado, ele
          simplesmente não existe nos gráficos e nos totais — nada é estimado a partir do nada, exceto a
          linha de projeção, que é claramente identificada.
        </Callout>
      </div>
    ),
  },
  {
    id: 'importar',
    label: 'Importar planilha',
    title: 'Importar planilha (99Corp e Uber for Business)',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Importar planilha</strong>, no topo da tela, abre um menu com os dois formatos
          aceitos: <strong>99Corp</strong> e <strong>Uber for Business</strong>. Escolha o formato que
          corresponde ao relatório que você baixou — a leitura do arquivo é diferente em cada caso.
        </p>
        <Steps
          items={[
            { title: 'Escolha o formato', body: 'Clique em Importar planilha e selecione 99Corp ou Uber for Business. O título da janela confirma o formato escolhido.' },
            { title: 'Envie o arquivo', body: 'Arraste o arquivo para a área indicada ou use Selecionar arquivo. O formato 99Corp aceita CSV e XLSX; o formato Uber aceita apenas o CSV exportado do painel.' },
            { title: 'Confira a leitura', body: 'A janela mostra o nome do arquivo e quantas linhas foram detectadas. Se o número parecer errado, provavelmente o formato escolhido não corresponde ao arquivo.' },
            { title: 'Importe', body: 'Clique em Importar e acompanhe a barra de progresso. Ao final aparece um resumo com quantas corridas foram importadas, atualizadas e ignoradas.' },
          ]}
        />
        <DataTable
          headers={['Formato', 'Arquivo aceito', 'Observações']}
          rows={[
            ['99Corp', 'CSV exportado do app ou planilha XLSX no mesmo formato', 'Quando o arquivo é XLSX, a aba preferida é MatrizMovimentoTotal. Traz distância percorrida e dados de supervisor.'],
            ['Uber for Business', 'CSV exportado do painel', 'O relatório da Uber não inclui distância percorrida nem informações de supervisor — esses campos ficam vazios.'],
          ]}
        />
        <Callout type="tip">
          Reimportar o mesmo arquivo é seguro. Cada corrida tem um identificador próprio: as já existentes
          são atualizadas em vez de duplicadas. Linhas sem identificador (linhas em branco, totais e
          rodapés da planilha) são contabilizadas como <strong>ignoradas</strong> no resumo final.
        </Callout>
      </div>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Filtros de Ano e Mês',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Logo abaixo do título ficam os filtros <strong>Ano</strong> e <strong>Mês</strong>. Eles comandam
          quase tudo na tela: indicadores, gráficos e rankings são recalculados a cada mudança.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>
            <strong>Ano</strong> lista apenas os anos que já têm corridas importadas, mais a opção{' '}
            <strong>Todos os anos</strong>.
          </li>
          <li>
            <strong>Mês</strong> permite isolar um mês específico ou manter <strong>Todos os meses</strong>.
          </li>
          <li>
            <strong>Limpar filtros</strong> devolve a tela ao padrão: ano corrente e todos os meses.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          Escolher <strong>Todos os anos</strong> muda a leitura de alguns blocos: o gráfico de gastos passa
          a comparar ano a ano em vez de mês a mês, por exemplo. Os títulos dos cartões sempre indicam qual
          recorte está sendo mostrado.
        </p>
      </div>
    ),
  },
  {
    id: 'total-projecao',
    label: 'Total e Projeção',
    title: 'Total Gasto no Período e projeção anual',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Total Gasto no Período</strong> mostra o valor do recorte selecionado, com o
          período escrito por extenso logo acima e um selo de variação percentual comparando com o mesmo
          período do ano anterior. Verde significa queda de gasto; vermelho, aumento.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Abaixo vem a tabela por ano, com as colunas <strong>Ano</strong>,{' '}
          <strong>Total Gasto</strong>, <strong>Variação R$</strong> e <strong>Variação %</strong>. Para
          que a comparação seja justa, o ano corrente é contado apenas até o mês vigente, enquanto os anos
          anteriores aparecem completos — a própria tela traz essa nota em rodapé.
        </p>
        <Callout type="info">
          A última linha da tabela, em itálico e com o selo <strong>Projeção</strong>, é uma estimativa: o
          sistema calcula a média mensal do ano corrente e a aplica aos meses que ainda faltam. É um
          indicativo de tendência, não um compromisso orçamentário.
        </Callout>
      </div>
    ),
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    title: 'Cartões de indicadores',
    content: (
      <DataTable
        headers={['Indicador', 'O que significa']}
        rows={[
          ['Total KM Rodado', 'Soma da distância das corridas do período. Depende de a planilha trazer a distância.'],
          ['Custo Médio por KM', 'Valor total dividido pela distância total — bom para comparar meses e identificar rotas caras.'],
          ['Nº de Corridas', 'Quantidade de corridas no período.'],
          ['Colaboradores Usuários', 'Quantas pessoas diferentes usaram o benefício no período.'],
          ['Média por Colaborador', 'Valor total dividido pelo número de colaboradores usuários.'],
        ]}
      />
    ),
  },
  {
    id: 'veiculo',
    label: 'Vale ter veículo?',
    title: 'Vale ter veículo próprio?',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Este bloco compara o gasto médio mensal da BNP com aplicativo (média dos últimos três meses) com
          o custo estimado de manter um veículo e um motorista. O resultado aparece como um selo: ou{' '}
          <strong>Transporte por app é mais econômico</strong>, ou uma recomendação de considerar veículo
          próprio, sempre com a diferença mensal calculada.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Os seis campos editáveis são <strong>Locação/Financiamento</strong>,{' '}
          <strong>Combustível</strong>, <strong>Manutenção</strong>, <strong>Seguro</strong>,{' '}
          <strong>Motorista CLT</strong> e <strong>Outros</strong>. Você pode digitar seus próprios valores
          ou clicar em <strong>Atualizar referências de mercado</strong>, que aciona a IA para buscar
          valores de referência e preencher os campos automaticamente.
        </p>
        <DataTable
          headers={['Selo exibido', 'O que indica']}
          rows={[
            ['Atualizado por IA em (data)', 'Os valores vieram da busca automática de referências de mercado.'],
            ['Valores inseridos manualmente em (data)', 'Alguém digitou os valores diretamente nos campos.'],
            ['Valores padrão (nunca atualizados)', 'Os campos ainda estão com a estimativa inicial do sistema.'],
          ]}
        />
        <Callout type="warn">
          Os valores de custo do veículo ficam salvos no navegador de quem preencheu, e não no banco de
          dados do Hub. Em outro computador, em outro navegador ou em janela anônima, a tela volta a exibir
          os valores padrão. O cálculo de motorista CLT já considera salário mais encargos.
        </Callout>
      </div>
    ),
  },
  {
    id: 'graficos-rankings',
    label: 'Gráficos e rankings',
    title: 'Gráficos, rankings e agrupamentos',
    content: (
      <DataTable
        headers={['Bloco', 'O que mostra', 'Como usar']}
        rows={[
          ['Gastos mensais (ou Gastos por ano)', 'Barras com o gasto de cada mês do ano filtrado. Com Todos os anos, passa a mostrar o total de cada ano.', 'Identificar sazonalidade e picos fora do padrão.'],
          ['Comparativo ano a ano', 'Linhas sobrepostas comparando o ano selecionado com os dois anteriores, mês a mês.', 'Ver se o mês atual está acima ou abaixo do mesmo mês dos anos anteriores.'],
          ['Ranking por colaborador', 'Corridas, KM, total e média por corrida de cada colaborador (até 20 linhas).', 'Clique nos títulos das colunas para ordenar por outro critério.'],
          ['Top 10 destinos', 'Endereços de destino mais frequentes, com quantidade de corridas e valor.', 'Revelar rotas recorrentes que poderiam virar um contrato fixo ou transporte fretado.'],
          ['Totais por supervisor / área', 'Corridas, KM e valor agrupados pelo supervisor informado na planilha.', 'Levar o custo para a conversa com cada área responsável.'],
        ]}
      />
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
            ['Ver o item Adm Deslocamentos (Aplicativo) no menu', 'Todos os usuários que acessam o Hub — este item não é bloqueado por perfil no menu lateral.'],
            ['Abrir a tela e consultar totais, gráficos e rankings', 'Qualquer usuário que consiga abrir o item de menu.'],
            ['Importar planilha (99Corp ou Uber for Business)', 'Qualquer usuário com acesso à tela. A tela não separa consulta de importação.'],
            ['Editar os custos de Vale ter veículo próprio? e usar Atualizar referências de mercado', 'Qualquer usuário com acesso à tela. A alteração vale apenas para o navegador de quem editou.'],
          ]}
        />
        <Callout type="warn">
          Como a importação não é restrita por perfil, combine internamente quem é o responsável por
          carregar as planilhas de cada mês. Importações feitas por pessoas diferentes não corrompem os
          dados (corridas repetidas são atualizadas, não duplicadas), mas geram retrabalho de conferência.
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
          ['As tabelas mostram "Sem dados no período"', 'O ano ou o mês filtrado não tem corridas importadas.', 'Use "Limpar filtros" ou escolha "Todos os anos"; se continuar vazio, importe a planilha do período.'],
          ['"Total KM Rodado" e "Custo Médio por KM" aparecem zerados', 'O período foi carregado com o formato Uber for Business, que não traz distância percorrida.', 'Para acompanhar quilometragem, use o relatório da 99Corp; nos meses de Uber, analise apenas os valores.'],
          ['"Totais por supervisor / área" mostra só um traço', 'A planilha importada não tem coluna de supervisor (caso do relatório Uber).', 'Importe o relatório 99Corp, que inclui nome e e-mail do supervisor.'],
          ['A importação avisou que várias linhas foram ignoradas', 'Linhas sem identificador de corrida, como cabeçalhos repetidos, linhas em branco e totais.', 'Comportamento esperado. Confira apenas se o número de importadas bate com o total de corridas do relatório.'],
          ['Aparece "Erro ao ler arquivo" ao selecionar a planilha', 'O formato escolhido no menu não corresponde ao arquivo, ou o arquivo está em outro layout.', 'Refaça a importação escolhendo o formato correto e exporte o relatório novamente na origem.'],
          ['Os valores do veículo voltaram para o padrão', 'Esses valores ficam salvos no navegador, não no Hub.', 'Preencha novamente no computador que você usa, ou clique em "Atualizar referências de mercado".'],
          ['A mensagem diz que não foi possível buscar valores atualizados', 'O serviço de IA de referências de mercado não respondeu.', 'A tela mantém os últimos valores salvos. Tente de novo mais tarde ou preencha os campos manualmente.'],
          ['A linha de projeção não aparece', 'A projeção só é exibida quando o filtro está no ano corrente ou em "Todos os anos" e há dados do ano atual.', 'Selecione o ano corrente ou "Todos os anos" e importe os meses já fechados.'],
          ['O ano corrente parece menor que o ano anterior', 'O ano corrente é somado apenas até o mês vigente, enquanto os anteriores aparecem completos.', 'Compare pela coluna de variação e pela linha de projeção, que já consideram essa diferença.'],
        ]}
      />
    ),
  },
];

export default function HelpTransportPage() {
  return (
    <HelpArticle
      title="Adm Deslocamentos (Aplicativo)"
      description="Importação, análise de gastos, projeção e comparação com veículo próprio"
      icon={Truck}
      sections={sections}
    />
  );
}
