// v2 - tutorial revisado e ampliado (agosto/2026)
import { Settings } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que são as Configurações',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Configurações</strong> guarda os parâmetros globais que o sistema usa para calcular custos,
          classificar a saúde dos contratos e disparar alertas. Ela não é uma tela de consulta: quase tudo aqui muda o
          número que aparece no Dashboard, nos Contratos, nos Relatórios e no Simulador.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A página é dividida em blocos, na ordem em que aparecem na tela:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Encargos e Impostos</strong> — percentuais aplicados sobre pessoas e faturamento.</li>
          <li><strong>Overhead Central (mensal)</strong> — o bolo de custos da estrutura que será rateado entre contratos.</li>
          <li><strong>Câmbio</strong> — cotação do dólar usada em contratos em USD.</li>
          <li><strong>Limiares de Saúde</strong> — o que é margem saudável, em atenção ou crítica.</li>
          <li><strong>Configuração de Alertas</strong> — com quantos dias de antecedência os alertas aparecem.</li>
          <li><strong>Recursos Humanos</strong> — o limite que define quem está subocupado.</li>
          <li><strong>Fonte de Dados</strong>, atalhos para <strong>Cargos (RH)</strong> e <strong>Equipes</strong>, e a <strong>Integração Feedz (TOTVS)</strong>.</li>
        </ul>
        <Callout type="warn">
          Os campos do formulário só são gravados quando você clica em <strong>Salvar Configurações</strong>, no fim da
          página. Sair da tela antes disso descarta o que foi digitado.
        </Callout>
      </>
    ),
  },
  {
    id: 'encargos',
    label: 'Encargos e Impostos',
    title: 'Encargos e Impostos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          São os três percentuais que transformam salário e receita em custo real. Eles valem para todo o sistema, a
          menos que um recurso específico tenha um valor próprio informado no contrato.
        </p>
        <DataTable
          headers={['Campo', 'O que é', 'Onde impacta']}
          rows={[
            ['Encargos CLT (%)', 'INSS, FGTS, férias, 13º e demais encargos sobre um colaborador CLT.', 'Custo dos recursos CLT nos contratos e valor padrão do Simulador.'],
            ['Impostos PJ (%)', 'Percentual aplicado sobre contratos de prestadores PJ.', 'Custo dos recursos PJ e valor padrão do Simulador.'],
            ['Impostos s/ Faturamento (%)', 'ISS, PIS, COFINS, CSLL e IR incidentes sobre a receita.', 'Receita líquida, margem e classificação de saúde dos contratos.'],
          ]}
        />
        <Callout type="info">
          Alterar qualquer um desses percentuais recalcula margens de todos os contratos. Se o objetivo é corrigir um
          caso isolado, use o campo de exceção no próprio recurso em vez de mexer no percentual global.
        </Callout>
      </>
    ),
  },
  {
    id: 'overhead',
    label: 'Overhead Central',
    title: 'Overhead Central (mensal) e o rateio',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Overhead Central (mensal)</strong> reúne os custos que a empresa tem independentemente de um
          contrato específico. Você informa cinco valores em reais e o sistema mostra o <strong>Total Mensal</strong>
          {' '}somado automaticamente:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Custos Administrativos</strong></li>
          <li><strong>Custos de Infraestrutura (geral)</strong></li>
          <li><strong>Governança / Sócios</strong></li>
          <li><strong>Custos Indiretos</strong></li>
          <li><strong>Consultoria</strong></li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          Esse bloco tem botão próprio: <strong>Salvar Overhead</strong>. Ele é independente do
          {' '}<strong>Salvar Configurações</strong> do formulário principal.
        </p>
        <Steps
          items={[
            { title: 'Preencha os cinco valores', body: 'Use o valor mensal de cada natureza de custo. Campos em branco contam como zero.' },
            { title: 'Confira o Total Mensal', body: 'É esse total que será distribuído entre os contratos. Se ele estiver errado, o rateio inteiro fica errado.' },
            { title: 'Clique em Salvar Overhead', body: 'A confirmação aparece como a mensagem “Overhead Central atualizado!”.' },
            { title: 'Abra Ver detalhamento do rateio', body: 'O botão leva à página Detalhamento do Rateio, onde você confere contrato a contrato como o total foi distribuído.' },
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Na página <strong>Detalhamento do Rateio</strong> o overhead é dividido entre os contratos
          {' '}<strong>proporcionalmente à receita mensal</strong> de cada um. No topo há três indicadores:
          {' '}<strong>Total Pool Overhead</strong>, <strong>Receita Total Considerada</strong> e
          {' '}<strong>Soma Overhead Alocado</strong>. A tabela mostra Cliente, Contrato, Valor Mensal (R$),
          Percentual (%), Overhead Alocado (R$) e Status, e você pode filtrar por cliente ou usar o campo
          {' '}<strong>Buscar cliente ou contrato...</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Abaixo da tabela pode aparecer o bloco <strong>Pendências do Rateio</strong>: são os contratos que ficaram de
          fora e o motivo. Os motivos possíveis são contrato não vigente (só entram os status Em operação e
          Implantação), <strong>Valor mensal = 0</strong> e <strong>Valor mensal ausente</strong>. O botão
          {' '}<strong>Editar</strong> na linha abre o contrato para você corrigir o dado.
        </p>
        <Callout type="tip">
          Quando a <strong>Soma Overhead Alocado</strong> bate com o <strong>Total Pool Overhead</strong>, aparece um
          sinal verde de confirmação ao lado do valor. Pequenas diferenças de centavos são ajustes de arredondamento,
          identificados na linha pelo símbolo <strong>±</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'cambio-saude',
    label: 'Câmbio e Saúde',
    title: 'Câmbio e Limiares de Saúde',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Câmbio</strong> existe um único campo, <strong>Valor do Dólar (R$)</strong>. Ele é a cotação de
          referência usada para converter contratos registrados em USD. Como é um valor fixo, e não uma cotação
          automática, vale combinar com a área financeira com que frequência ele será atualizado.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Limiares de Saúde</strong> você define a régua que pinta os contratos de verde, amarelo ou
          vermelho no Dashboard e nas listas:
        </p>
        <DataTable
          headers={['Classificação', 'Regra', 'Campo que controla']}
          rows={[
            ['Saudável', 'Margem maior ou igual ao limiar saudável.', 'Margem Saudável (%)'],
            ['Atenção', 'Margem entre o limiar de atenção e o limiar saudável.', 'Margem Atenção (%)'],
            ['Crítico', 'Margem abaixo do limiar de atenção.', 'Margem Atenção (%)'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          O quadro <strong>Critérios de Classificação</strong>, logo abaixo dos campos, mostra em tempo real como ficou
          a regra com os números que você acabou de digitar — use-o para conferir antes de salvar.
        </p>
        <Callout type="warn">
          O campo <strong>Margem Atenção (%)</strong> aceita valores negativos. Isso é proposital: em alguns modelos de
          contrato, uma margem levemente negativa ainda é tolerada. Só use negativo se essa for a política acordada.
        </Callout>
      </>
    ),
  },
  {
    id: 'alertas',
    label: 'Alertas e RH',
    title: 'Configuração de Alertas e parâmetro de RH',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Configuração de Alertas</strong> define com quanta antecedência, em dias, o sistema começa a
          avisar. Prazos curtos demais tiram o tempo de reação; prazos longos demais geram ruído e as pessoas param de
          olhar os alertas.
        </p>
        <DataTable
          headers={['Campo', 'Dispara quando', 'Para quem serve']}
          rows={[
            ['Alerta de Reajuste', 'Faltam X dias para a data-base de reajuste do contrato.', 'Quem negocia reajuste com o cliente.'],
            ['Alerta de Vigência', 'Faltam X dias para o fim do contrato.', 'Quem conduz renovação.'],
            ['Alerta de Desatualização', 'O contrato ficou X dias sem atualização de recursos.', 'Quem responde pela qualidade do cadastro.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Recursos Humanos</strong> tem um único campo: <strong>Threshold de Subocupação (%)</strong>.
          Colaboradores cuja dedicação total somada estiver abaixo desse percentual passam a ser sinalizados como
          subocupados nas telas de RH.
        </p>
        <Callout type="tip">
          Se a lista de subocupados vier grande demais ou vazia demais, na maioria das vezes o problema não é o
          threshold: é alocação não lançada. Confira primeiro os percentuais de dedicação dos recursos.
        </Callout>
      </>
    ),
  },
  {
    id: 'cadastros',
    label: 'Cargos e Equipes',
    title: 'Cargos (RH) e Equipes',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          No fim da página existem dois atalhos em formato de cartão, que já mostram quantos registros existem:
          {' '}<strong>Cargos (RH)</strong> e <strong>Equipes</strong>. As mesmas telas também podem ser abertas a
          partir do módulo Recursos Humanos — o conteúdo é o mesmo, muda só o caminho de volta.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Na tela <strong>Cargos (RH)</strong> você usa <strong>Adicionar Cargo</strong> para criar. O cadastro pede
          {' '}<strong>Nome do Cargo</strong> (obrigatório) e, opcionalmente, uma <strong>Equipe</strong>. Cada linha
          tem uma chave para ativar ou desativar, um lápis para editar e uma lixeira para excluir. Cargos inativos
          aparecem riscados e deixam de ser oferecidos no formulário de recursos.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Na tela <strong>Equipes</strong>, o botão <strong>Adicionar Equipe</strong> pede <strong>Índice</strong>
          {' '}(que define a ordem de exibição), <strong>Nome da Equipe</strong> e <strong>Descrição</strong>. Cada
          equipe mostra o número de cargos vinculados e pode ser marcada como <strong>Inativa</strong>.
        </p>
        <DataTable
          headers={['Situação', 'O que acontece']}
          rows={[
            ['Excluir um cargo', 'O cargo sai da lista, mas recursos já cadastrados com ele não são afetados.'],
            ['Excluir uma equipe com cargos vinculados', 'A exclusão é bloqueada e o sistema orienta a desativar a equipe em vez de excluí-la.'],
            ['Nome de equipe repetido', 'O sistema recusa com a mensagem “Já existe uma equipe com esse nome”.'],
            ['Desativar em vez de excluir', 'Preserva o histórico e apenas tira o item das listas de seleção. É a opção mais segura.'],
          ]}
        />
        <Callout type="tip">
          Prefira sempre <strong>desativar</strong> a excluir. Cargos e equipes são usados em filtros e relatórios; ao
          excluir, você perde a leitura histórica desses agrupamentos.
        </Callout>
      </>
    ),
  },
  {
    id: 'feedz',
    label: 'Integração Feedz',
    title: 'Integração Feedz (TOTVS)',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Esse bloco traz os colaboradores do Feedz para o cadastro de RH do BNPHub, sem digitação manual. Ele aparece
          apenas para os perfis C-Level e Superadmin.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Antes de sincronizar, escolha o <strong>Modo</strong> na chave do cabeçalho:
        </p>
        <DataTable
          headers={['Modo', 'Comportamento', 'Quando usar']}
          rows={[
            ['Estrito', 'Cargos e departamentos sem mapeamento geram pendência em vez de serem criados.', 'Rotina normal, quando você quer controle sobre o cadastro.'],
            ['Permissivo', 'Cargos e departamentos que não existem são criados automaticamente.', 'Cargas iniciais, quando ainda não há mapeamento montado.'],
          ]}
        />
        <Steps
          items={[
            { title: 'Clique em Sincronizar agora', body: 'Ao terminar, o sistema informa quantos registros foram criados, atualizados, desligados e quantas inconsistências ocorreram.' },
            { title: 'Confira a tabela Últimas sincronizações', body: 'Ela lista Status, Data, Proc., Criados, Atual., Desl., Incons. e Modo das últimas execuções.' },
            { title: 'Abra os detalhes', body: 'A seta na linha leva à tela Conciliação Feedz, com as abas Criados, Alterados, Desligados e Inconsistências.' },
            { title: 'Exporte quando precisar de evidência', body: 'O ícone de planilha na linha gera o relatório da execução em XLSX; na tela de conciliação há Exportar XLSX e Exportar CSV das inconsistências.' },
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Atualizar Datas Deslig.</strong> faz uma correção pontual: procura colaboradores inativos sem
          data de desligamento registrada e preenche essa data. Não é uma sincronização completa.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Mapeamento de Aliases (Cargo / Departamento)</strong> você ensina ao sistema que um texto vindo do
          Feedz corresponde a um registro interno. Clique em <strong>Novo Alias</strong>, escolha o <strong>Tipo</strong>
          {' '}(Cargo ou Departamento), digite o <strong>Valor Feedz (texto exato)</strong> e selecione o
          {' '}<strong>Registro Interno</strong>. O filtro acima da lista permite ver Todos, apenas Cargo ou apenas
          Departamento.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Se uma sincronização trouxe dados errados, é possível desfazê-la. Na tabela de execuções, o ícone de seta
          curva abre a confirmação <strong>Reverter sincronização?</strong>, que informa quantas inserções serão
          removidas e quantas atualizações voltarão ao estado anterior. Na tela de conciliação também é possível
          reverter <strong>um registro por vez</strong>, marcando a caixa
          {' '}<strong>Confirmo a reversão deste registro</strong>.
        </p>
        <Callout type="warn">
          A reversão não pode ser desfeita. Antes de reverter uma execução inteira, exporte o relatório dela — assim
          você mantém a evidência do que existia antes.
        </Callout>
      </>
    ),
  },
  {
    id: 'manutencao',
    label: 'Fonte e Restauração',
    title: 'Fonte de Dados e Restaurar Demo',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Fonte de Dados</strong> indica a origem dos dados do sistema. Hoje a única opção ativa é
          {' '}<strong>Local (padrão)</strong>; a opção <strong>API (Em breve)</strong> ainda não está disponível e, se
          selecionada, o sistema avisa que o modo não está liberado nesta etapa.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No canto superior direito da página existe o botão <strong>Restaurar Demo</strong>. Ele repõe a base de
          demonstração: contratos, clientes, recursos e configurações voltam ao conteúdo original de exemplo. A
          confirmação aparece como <strong>Restaurar dados de demonstração?</strong> e deixa claro que a ação não pode
          ser desfeita.
        </p>
        <Callout type="warn">
          <strong>Restaurar Demo</strong> não é um botão de “desfazer”. Ele substitui os dados atuais pelos dados de
          demonstração. Use apenas em ambiente de treinamento ou demonstração, nunca com dados reais em produção.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode fazer o quê',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O acesso ao módulo <strong>Configurações</strong> é restrito: apenas os perfis <strong>C-Level</strong>,
          {' '}<strong>Superadmin</strong> e <strong>Demo</strong> conseguem abrir a tela. Para os demais, o item
          continua visível no menu com um cadeado e o sistema devolve o usuário a uma tela permitida.
        </p>
        <DataTable
          headers={['Recurso', 'Quem enxerga', 'Observação']}
          rows={[
            ['Formulário de parâmetros (encargos, câmbio, limiares, alertas, RH)', 'C-Level, Superadmin e Demo.', 'Sem permissão de edição, os campos aparecem bloqueados e o botão Salvar Configurações não é exibido.'],
            ['Overhead Central (mensal) e Ver detalhamento do rateio', 'Perfis com permissão de edição.', 'Salvo separadamente, pelo botão Salvar Overhead.'],
            ['Atalhos Cargos (RH) e Equipes', 'Perfis com permissão de edição.', 'As telas também são alcançáveis pelo módulo Recursos Humanos.'],
            ['Botão Restaurar Demo', 'Perfis com permissão de edição.', 'Ação destrutiva: substitui os dados atuais.'],
            ['Integração Feedz (TOTVS)', 'Somente C-Level e Superadmin.', 'Inclui sincronização, aliases, exportação e reversão.'],
            ['Fonte de Dados', 'Perfis com permissão de edição.', 'Somente leitura na prática: só a opção Local está ativa.'],
          ]}
        />
        <Callout type="info">
          Nas telas de <strong>Cargos</strong> e <strong>Equipes</strong>, quem não tem permissão de edição continua
          vendo a lista, mas sem os botões Adicionar, editar, excluir e sem as chaves de ativar/desativar.
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
          ['Alterei um percentual e nada mudou nos contratos', 'O formulário não foi salvo.', 'Role até o fim da página e clique em Salvar Configurações.'],
          ['Salvei o formulário mas o overhead continuou zerado', 'Overhead Central tem botão próprio.', 'Preencha os valores e clique em Salvar Overhead.'],
          ['O detalhamento do rateio mostra Total Pool Overhead igual a zero', 'O Overhead Central nunca foi salvo.', 'Volte a Configurações, preencha os cinco campos e clique em Salvar Overhead.'],
          ['Um contrato importante não aparece no rateio', 'Ele está listado em Pendências do Rateio.', 'Veja o motivo na coluna correspondente: status não vigente, valor mensal zerado ou ausente. Use Editar para corrigir.'],
          ['Todos os contratos ficaram vermelhos de repente', 'Os Limiares de Saúde foram alterados para valores mais exigentes.', 'Confira o quadro Critérios de Classificação e volte aos limiares acordados.'],
          ['A caixa de alertas ficou cheia de avisos', 'Antecedência em dias muito alta.', 'Reduza os dias em Configuração de Alertas até um horizonte em que dê para agir.'],
          ['Não consigo excluir uma equipe', 'Existem cargos vinculados a ela.', 'Desative a equipe, ou primeiro mude os cargos para outra equipe.'],
          ['A sincronização do Feedz gerou muitas inconsistências', 'Modo Estrito com cargos ou departamentos sem mapeamento.', 'Cadastre os aliases correspondentes em Mapeamento de Aliases e sincronize de novo.'],
          ['Cargos estranhos apareceram depois de sincronizar', 'A sincronização rodou em Modo Permissivo, que cria o que não existe.', 'Volte a chave para Estrito, reverta a execução se necessário e corrija os aliases.'],
          ['Não vejo o bloco Integração Feedz', 'Seu perfil não é C-Level nem Superadmin.', 'Solicite a sincronização a quem tem esse perfil.'],
        ]}
      />
    ),
  },
];

export default function HelpSettingsPage() {
  return (
    <HelpArticle
      title="Configurações"
      description="Parâmetros globais, overhead, cadastros auxiliares e integração Feedz"
      icon={Settings}
      sections={sections}
    />
  );
}
