// v2 - tutorial revisado e ampliado (agosto/2026)
import { Receipt } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o módulo Recebíveis',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>Recebíveis</strong> mostra a posição mensal de pagamentos por contrato: o que era esperado, o que já
          entrou, o que está em aberto e o que está atrasado. Ele responde à pergunta “esse cliente está pagando em
          dia?” sem precisar abrir o sistema financeiro.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Os dados de cobrança vêm da integração com o <strong>Superlógica</strong>. Por isso vale a regra mais
          importante do módulo: <strong>um contrato só aparece na lista se estiver vinculado a uma assinatura do
          Superlógica</strong>. Contrato sem vínculo não aparece, mesmo que esteja ativo e faturando.
        </p>
        <Callout type="info">
          O status de cada linha é calculado a partir das faturas: existindo qualquer fatura em atraso, o contrato fica
          {' '}<strong>Atrasado</strong>; caso contrário, fica <strong>Em dia</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'sincronizar',
    label: 'Sincronizar',
    title: 'Sincronizar agora',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          No topo da tela, o botão <strong>Sincronizar agora</strong> busca no Superlógica a posição atualizada das
          faturas. Enquanto roda, o botão muda para <strong>Sincronizando...</strong>. Ao terminar, o sistema informa
          quantos contratos foram atualizados.
        </p>
        <Callout type="warn">
          A própria mensagem de conclusão pede para <strong>recarregar a página</strong>. Faça isso: sem recarregar, a
          tabela pode continuar exibindo os números anteriores.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Sincronize antes de fechar uma análise de inadimplência ou antes de levar os números para uma reunião. Se o
          botão retornar erro, é sinal de indisponibilidade da integração — tente de novo mais tarde e, se persistir,
          acione o time responsável.
        </p>
      </>
    ),
  },
  {
    id: 'kpis',
    label: 'Indicadores',
    title: 'O que cada indicador significa',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A faixa de cinco cartões considera <strong>apenas os contratos vinculados</strong> e o <strong>mês atual</strong>.
        </p>
        <DataTable
          headers={['Indicador', 'Como é calculado', 'Como ler']}
          rows={[
            ['Total Previsto', 'Soma do valor do mês atual de todos os contratos vinculados.', 'É a receita esperada do mês.'],
            ['Total Recebido', 'Soma do valor dos contratos cuja fatura do mês já está paga.', 'Quanto do previsto já entrou.'],
            ['Em Aberto', 'Total Previsto menos Total Recebido.', 'O que ainda falta receber no mês, inclusive o que ainda nem venceu.'],
            ['Em Atraso', 'Soma do saldo das faturas com situação de atraso, de qualquer competência.', 'Não se limita ao mês atual: é o acumulado vencido e não pago.'],
            ['% Inadimplência', 'Em Atraso dividido pelo Total Previsto.', 'Percentual de referência para acompanhar a evolução mês a mês.'],
          ]}
        />
        <Callout type="tip">
          <strong>Em Aberto</strong> e <strong>Em Atraso</strong> medem coisas diferentes. Um contrato com fatura que
          vence daqui a dez dias entra em Em Aberto, mas não em Em Atraso.
        </Callout>
      </>
    ),
  },
  {
    id: 'tabela',
    label: 'Tabela e filtros',
    title: 'Lendo a tabela e usando os filtros',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Cada linha é um contrato vinculado. Linhas em atraso ficam com fundo destacado, e o ícone à direita abre o
          contrato correspondente.
        </p>
        <DataTable
          headers={['Coluna', 'O que mostra']}
          rows={[
            ['Cliente / Contrato', 'Nome do cliente, nome do contrato e, abaixo, o código do contrato.'],
            ['Status', 'Etiqueta Em dia ou Atrasado, calculada pelo saldo de faturas vencidas.'],
            ['Data Pgto Mês Anterior', 'Data em que a fatura do mês passado foi paga. Um traço significa que não há pagamento registrado.'],
            ['Valor Pago (mês anterior)', 'Valor efetivamente pago no mês passado.'],
            ['Data Vcto Mês Atual', 'Vencimento da fatura do mês corrente.'],
            ['Data Pgto Mês Atual', 'Data do pagamento do mês corrente, quando já ocorreu.'],
            ['Valor Pago / à Pagar', 'Valor do mês atual. Se ainda não foi pago, aparece a marcação “à pagar”; se foi pago, o valor aparece destacado.'],
            ['Valores em Atraso', 'Saldo acumulado vencido e não pago do contrato.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Acima da tabela há três filtros combináveis: o campo
          {' '}<strong>Buscar cliente, contrato ou código...</strong>, a lista de clientes
          {' '}(<strong>Todos os clientes</strong>) e o filtro de situação, com as opções <strong>Todos</strong>,
          {' '}<strong>Em dia</strong> e <strong>Em atraso</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No fim da página, o bloco <strong>Inadimplentes</strong> lista os <strong>10 maiores</strong> contratos em
          atraso, do maior para o menor valor devido, com atalho <strong>Abrir contrato</strong>. É o ponto de partida
          da rotina de cobrança — mas não é a lista completa: para ver todos, use o filtro de situação{' '}
          <strong>Em atraso</strong> na tabela.
        </p>
      </>
    ),
  },
  {
    id: 'conciliacao',
    label: 'Conciliar assinaturas',
    title: 'Conciliação de assinaturas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Quando existem contratos ativos sem ligação com o Superlógica, aparece no topo da tela uma faixa amarela
          informando quantos contratos estão <strong>sem vínculo com Superlógica</strong>, com o botão
          {' '}<strong>Conectar assinaturas</strong>. O mesmo destino é alcançado pelo botão
          {' '}<strong>Conciliar assinaturas</strong>, no cabeçalho.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Conciliação de Assinaturas</strong> lista, em <strong>Contratos sem Vínculo</strong>, as
          colunas Cliente, CNPJ, Contrato e Complemento. Entram nessa lista apenas contratos nos status de implantação e
          operação.
        </p>
        <Steps
          items={[
            { title: 'Clique em Buscar assinaturas', body: 'O sistema procura no Superlógica pelo CNPJ do cliente do contrato e abre a janela Assinaturas Encontradas.' },
            { title: 'Escolha a assinatura certa', body: 'Cada opção mostra a descrição, o valor, a periodicidade e a situação. Assinaturas canceladas não podem ser vinculadas.' },
            { title: 'Clique em Vincular', body: 'O contrato passa a ser acompanhado no painel de Recebíveis e some da lista de pendentes.' },
            { title: 'Confira o resumo da sessão', body: 'O bloco Vinculados nesta sessão mostra tudo o que você acabou de conectar.' },
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Se o cliente não for localizado pelo CNPJ, a janela avisa quantos cadastros foram varridos e oferece
          {' '}<strong>Sugestões por similaridade de nome</strong>. Confira o CNPJ e o identificador antes de clicar em
          {' '}<strong>Usar este cliente</strong> — a partir daí a busca de assinaturas é refeita para aquele cadastro.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Havendo muitos contratos pendentes, o botão <strong>Auto-vincular todos</strong> tenta resolver em lote:
          agrupa os contratos por CNPJ e liga cada grupo à assinatura de maior valor encontrada. Ao final, o sistema
          informa quantos foram vinculados, quantos ficaram para revisão manual e quantos não tiveram assinatura
          encontrada.
        </p>
        <Callout type="warn">
          Use <strong>Auto-vincular todos</strong> com atenção quando o mesmo cliente tem vários contratos: como a
          regra escolhe a assinatura de maior valor do CNPJ, contratos diferentes do mesmo cliente podem acabar
          apontando para a mesma assinatura. Nesses casos, prefira vincular um a um.
        </Callout>
      </>
    ),
  },
  {
    id: 'rotina',
    label: 'Rotina sugerida',
    title: 'Uma rotina que funciona',
    content: (
      <Steps
        items={[
          { title: 'Sincronize e recarregue', body: 'Clique em Sincronizar agora e recarregue a página para trabalhar com dados atuais.' },
          { title: 'Zere os contratos sem vínculo', body: 'Se a faixa amarela aparecer, resolva a conciliação antes de olhar os números: contrato não vinculado não entra em nenhum indicador.' },
          { title: 'Leia os cinco indicadores', body: 'Comece por % Inadimplência e Em Atraso; são os que indicam se há um problema a tratar.' },
          { title: 'Filtre por Em atraso', body: 'Use o filtro de situação para isolar os contratos com pendência e priorizar a cobrança.' },
          { title: 'Ataque a lista de Inadimplentes', body: 'Ela traz os 10 maiores devedores, já ordenados. Use Abrir contrato para chegar ao responsável interno — e a tabela filtrada por Em atraso para ver o restante.' },
        ]}
      />
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode fazer o quê',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo <strong>Recebíveis</strong> não é restrito a um perfil específico: o acesso é definido pela
          liberação do módulo para o seu perfil. O item continua visível no menu com um cadeado; quem não tem a
          liberação recebe o aviso de acesso restrito e é levado de volta a uma tela permitida.
        </p>
        <DataTable
          headers={['Recurso', 'Quem enxerga', 'Observação']}
          rows={[
            ['Tabela de contratos, status e datas', 'Todos os perfis com acesso ao módulo.', 'As colunas de data e o status são sempre exibidos.'],
            ['Cartões Total Previsto, Total Recebido, Em Aberto, Em Atraso e % Inadimplência', 'Apenas perfis com permissão de ver valores.', 'Sem a permissão, a faixa de indicadores não é exibida.'],
            ['Colunas de valores da tabela', 'Apenas perfis com permissão de ver valores.', 'As colunas de valor pago, a pagar e em atraso simplesmente não aparecem.'],
            ['Bloco Inadimplentes', 'Apenas perfis com permissão de ver valores.', 'Depende dos mesmos valores financeiros.'],
            ['Sincronizar agora e Conciliar assinaturas', 'Todos os perfis com acesso ao módulo.', 'A conciliação altera o cadastro do contrato: use com critério.'],
          ]}
        />
        <Callout type="info">
          Na prática, a permissão de ver valores hoje está associada aos perfis C-Level, Administrativo, Superadmin e
          Demo. Perfis sem ela usam o módulo como acompanhamento de situação — em dia ou atrasado — sem enxergar
          montantes.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable
        headers={['Sintoma', 'Causa provável', 'Solução']}
        rows={[
          ['Um contrato ativo não aparece na lista', 'Ele não está vinculado a uma assinatura do Superlógica.', 'Abra Conciliar assinaturas, busque a assinatura do cliente e vincule o contrato.'],
          ['A tela mostra “Nenhum recebível encontrado”', 'Nenhum contrato vinculado atende aos filtros aplicados.', 'Limpe a busca, volte o filtro de cliente para Todos os clientes e o de situação para Todos.'],
          ['Sincronizei e os números não mudaram', 'A página não foi recarregada após a sincronização.', 'Recarregue a página, como a própria mensagem de conclusão orienta.'],
          ['Não vejo nenhum valor, só datas e status', 'Seu perfil não tem permissão de ver valores financeiros.', 'Comportamento esperado. Solicite os valores a um perfil autorizado.'],
          ['Total Previsto muito menor que o faturamento real', 'Vários contratos ainda estão sem vínculo e ficam fora do cálculo.', 'Resolva a faixa de contratos sem vínculo antes de analisar os indicadores.'],
          ['“Cliente não encontrado no Superlógica pelo CNPJ”', 'O CNPJ cadastrado aqui difere do cadastrado lá, ou o cliente ainda não existe no Superlógica.', 'Confira as sugestões por nome, corrija o CNPJ no cadastro do cliente ou peça a criação do cliente no Superlógica.'],
          ['“Cliente encontrado, mas sem assinaturas ativas com valor”', 'O cliente existe, mas não há assinatura ativa com valor associada a ele.', 'Verifique com o financeiro se a assinatura foi criada e está ativa.'],
          ['O botão Vincular está desabilitado', 'A assinatura selecionada está cancelada.', 'Escolha outra assinatura ou peça a reativação no Superlógica.'],
          ['Contratos diferentes do mesmo cliente ficaram na mesma assinatura', 'Foi usado Auto-vincular todos, que liga o grupo do CNPJ à assinatura de maior valor.', 'Refaça a vinculação contrato a contrato usando Buscar assinaturas.'],
          ['Em Atraso é maior que o Total Previsto do mês', 'Em Atraso acumula competências anteriores; Total Previsto é só do mês atual.', 'Comportamento esperado — indica dívida antiga, não erro de cálculo.'],
        ]}
      />
    ),
  },
];

export default function HelpReceivablesPage() {
  return (
    <HelpArticle
      title="Recebíveis"
      description="Posição de pagamentos, inadimplência e conciliação com o Superlógica"
      icon={Receipt}
      sections={sections}
    />
  );
}
