// v2 - tutorial revisado e ampliado (agosto/2026)
import { ShieldCheck } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'O que é a Gestão de Perfis?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>Gestão de Perfis</strong> é onde se define, para cada perfil de usuário, <strong>quais módulos ele
          acessa</strong> e <strong>o que pode fazer dentro de cada módulo</strong>. A própria tela resume assim:
          configure módulos e permissões por perfil de usuário.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A diferença em relação à tela de Usuários é importante: lá você mexe em <strong>uma pessoa</strong>; aqui você
          mexe em <strong>todo mundo que tem aquele perfil</strong>. Uma alteração salva vale imediatamente para os
          usuários existentes daquele perfil e para os que vierem depois.
        </p>
        <Callout type="warn">
          Antes de ligar qualquer chave, faça a pergunta certa: essa função precisa apenas <strong>consultar</strong> a
          informação ou também <strong>alterar</strong> o cadastro? Liberar edição para quem só precisa consultar é a
          origem mais comum de dado inconsistente.
        </Callout>
      </>
    ),
  },
  {
    id: 'tela',
    label: 'A tela',
    title: 'Os cartões de perfil',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela abre com um cartão para cada perfil do sistema. Cada cartão traz o nome do perfil, uma etiqueta com o
          código técnico dele e a contagem de <strong>módulos habilitados</strong>. Para abrir a configuração, clique no
          cartão ou no botão <strong>Configurar</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">Os perfis disponíveis são:</p>
        <DataTable headers={['Perfil', 'Uso típico na BNP']} rows={[
          ['C-Level / Admin', 'Direção e administração geral, com visão financeira ampla.'],
          ['Super Admin', 'Manutenção, configuração e suporte do sistema. É o único que configura perfis.'],
          ['Intermediário', 'Operação com edição de dados, mas sem valores financeiros.'],
          ['Administrativo', 'Gestão administrativa e financeira do dia a dia.'],
          ['Líder de Tribo', 'Gestão de equipe e alocação, sem valores financeiros.'],
          ['Coordenação Suporte', 'Coordenação de atendimento e suporte.'],
          ['Projetos-Produtos', 'Acompanhamento de projetos e produtos.'],
          ['RH', 'Gestão de pessoas, vagas e movimentações.'],
          ['Jurídico', 'Consulta de clientes e contratos.'],
          ['Comercial', 'Prospecção, contratos e simulações.'],
          ['Demonstração', 'Apresentações e treinamentos.'],
          ['Leitor', 'Somente leitura de dashboard, clientes e contratos.'],
        ]} />
        <Callout type="tip">
          O número de módulos no cartão é um bom termômetro. Se um perfil operacional aparece com quase todos os módulos
          habilitados, provavelmente ele foi ampliado para resolver um caso pontual e nunca voltou ao normal.
        </Callout>
      </>
    ),
  },
  {
    id: 'grade',
    label: 'A grade',
    title: 'Como ler a grade de permissões',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Ao abrir um perfil, o painel <strong>Configurar perfil</strong> mostra os módulos organizados em cinco grupos:{' '}
          <strong>Geral</strong>, <strong>Clientes e Contratos</strong>, <strong>Recursos e Pessoas</strong>,{' '}
          <strong>Setup</strong> e <strong>IA</strong>. Em cada grupo há uma tabela: a primeira coluna é o{' '}
          <strong>Módulo</strong>, com uma caixa de seleção que liga ou desliga o acesso; as demais colunas são as
          ações.
        </p>
        <p className="text-sm text-muted-foreground mb-3">A lógica é em dois níveis:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>
            <strong>Caixa do módulo desmarcada</strong> — o perfil não entra naquela tela. Todas as chaves de ação da
            linha ficam desabilitadas, porque não teriam efeito.
          </li>
          <li>
            <strong>Caixa do módulo marcada</strong> — o perfil entra na tela, e cada chave define o que ele pode fazer
            lá dentro.
          </li>
        </ul>
        <Callout type="info">
          Ao marcar um módulo, o sistema já preenche as ações com o padrão daquele perfil. Vale conferir linha por linha
          em vez de aceitar o padrão sem olhar.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Algumas linhas aparecem esmaecidas e não podem ser marcadas. Ao passar o mouse, surge a explicação{' '}
          <strong>Restrito pelo sistema</strong>: aquele módulo simplesmente não é permitido para esse perfil, por regra
          fixa do BNPHub. É o caso, por exemplo, de <strong>Gestão de Perfis</strong>, que só existe para Super Admin, e
          de <strong>Usuários</strong>, limitado a C-Level, Super Admin e Demonstração. Não há como liberar essas linhas
          pela tela — a saída é atribuir ao usuário um perfil que já tenha esse direito.
        </p>
      </>
    ),
  },
  {
    id: 'acoes',
    label: 'As ações',
    title: 'O que cada ação libera',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          As sete ações são as mesmas em todos os módulos, mas o efeito prático muda conforme a tela. Elas são sempre
          aplicadas <strong>dentro</strong> do módulo correspondente.
        </p>
        <DataTable headers={['Ação', 'O que libera', 'Exemplo prático']} rows={[
          ['Editar', 'Alterar registros já existentes.', 'Editar o cadastro de uma pessoa em Recursos Humanos.'],
          ['Criar', 'Cadastrar registros novos.', 'Usar o botão Nova Pessoa em RH ou criar um contrato.'],
          ['Excluir', 'Remover registros, quando a tela permite.', 'Apagar um evento da linha do tempo de uma pessoa.'],
          ['Exportar', 'Baixar dados em planilha ou arquivo.', 'Exportar a lista de pessoas filtrada em RH.'],
          ['Ver valores', 'Exibir valores financeiros de contratos, receitas, margens e recebíveis.', 'Ver o valor de um contrato em vez de campos ocultos.'],
          ['Custos RH', 'Exibir remuneração, benefícios, encargos e custo total das pessoas.', 'Abrir a aba Financeiro da ficha e ver a coluna Custo Total na lista de RH.'],
          ['Alocar', 'Executar ações de alocação, principalmente em Squads.', 'Colocar alguém em um contrato sem poder mexer no cadastro mestre.'],
        ]} />
        <Callout type="warn">
          <strong>Ver valores</strong> e <strong>Custos RH</strong> são as duas permissões mais sensíveis do sistema:
          uma expõe o financeiro dos contratos, a outra expõe salários. Trate ambas como exceção, não como padrão.
        </Callout>
        <Callout type="info">
          A combinação mais útil para perfis operacionais é <strong>Alocar</strong> ligado em Squads com{' '}
          <strong>Editar</strong> desligado em Recursos Humanos: a pessoa monta equipe sem alterar o cadastro mestre.
        </Callout>
      </>
    ),
  },
  {
    id: 'editar',
    label: 'Alterar um perfil',
    title: 'Como alterar as permissões de um perfil',
    content: (
      <>
        <Steps items={[
          { title: 'Abra Gestão de Perfis', body: 'A tela fica na área de Setup e é acessível apenas ao Super Admin.' },
          { title: 'Escolha o perfil', body: 'Clique no cartão do perfil ou no botão Configurar. O painel abre com o título "Configurar perfil" seguido do nome do perfil.' },
          { title: 'Ligue e desligue módulos', body: 'Percorra os cinco grupos e deixe marcados apenas os módulos que a função realmente usa. Linhas esmaecidas são "Restrito pelo sistema" e não podem ser alteradas.' },
          { title: 'Ajuste as ações de cada módulo', body: 'Nas linhas marcadas, defina Editar, Criar, Excluir, Exportar, Ver valores, Custos RH e Alocar. Cuidado redobrado com as duas últimas ações financeiras.' },
          { title: 'Salve', body: 'Clique em "Salvar alterações". O sistema grava o perfil e propaga a mudança para os usuários existentes, informando quantos foram afetados.' },
          { title: 'Teste com um usuário real', body: 'Peça a alguém daquele perfil que recarregue a página e confirme se as telas certas aparecem — e se as erradas sumiram.' },
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          No rodapé do painel existem três botões. <strong>Cancelar</strong> fecha sem gravar.{' '}
          <strong>Salvar alterações</strong> grava e propaga. E <strong>Resetar para padrão</strong> recarrega a
          configuração original de fábrica daquele perfil — atenção: ele apenas carrega os valores na tela, com o aviso{' '}
          <strong>Valores padrão carregados (não salvos)</strong>. Nada muda de verdade enquanto você não clicar em{' '}
          <strong>Salvar alterações</strong>.
        </p>
        <Callout type="tip">
          Se você se perdeu no meio dos ajustes, use <strong>Resetar para padrão</strong> e recomece de uma base
          conhecida, em vez de tentar lembrar o que estava marcado antes.
        </Callout>
      </>
    ),
  },
  {
    id: 'propagacao',
    label: 'Propagação',
    title: 'A propagação automática para os usuários',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Este é o comportamento mais importante — e o mais surpreendente — desta tela. Ao clicar em{' '}
          <strong>Salvar alterações</strong>, o sistema faz três coisas em sequência:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>grava a configuração do perfil;</li>
          <li>grava as permissões de ação de cada módulo para aquele perfil;</li>
          <li>
            <strong>regrava as permissões de módulo de todos os usuários que têm aquele perfil</strong>, substituindo o
            que estava lá pela nova lista.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          Ao final, aparece a confirmação informando que o perfil foi atualizado e para quantos usuários a mudança foi
          propagada.
        </p>
        <Callout type="warn">
          A propagação <strong>sobrescreve ajustes individuais</strong> feitos no formulário de cada usuário, na tela de
          Usuários. Se alguém tinha um módulo extra liberado à mão, esse extra desaparece quando o perfil é salvo.
        </Callout>
        <Callout type="tip">
          Conclusão prática: exceções pontuais em um único usuário tendem a não durar. Quando uma necessidade se repete,
          o certo é ajustá-la no perfil — ou mover a pessoa para um perfil que já atenda.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Quem já estava logado no momento da mudança continua com as permissões antigas em memória até recarregar a
          página. Por isso, sempre avise a equipe para atualizar o navegador depois de uma alteração de perfil.
        </p>
      </>
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas práticas',
    title: 'Configurações recomendadas por perfil',
    content: (
      <>
        <DataTable headers={['Perfil', 'Configuração recomendada']} rows={[
          ['Líder de Tribo', 'Squads com Alocar ligado e RH somente leitura. Sem Ver valores e sem Custos RH.'],
          ['RH', 'Recursos Humanos, Dashboard RH e Requisição de Vagas com Editar e Criar. Custos RH apenas se a política interna permitir.'],
          ['Administrativo', 'Acesso amplo de gestão, com Ver valores e Custos RH conforme a necessidade financeira e operacional.'],
          ['Coordenação Suporte e Projetos-Produtos', 'Acesso operacional a contratos e squads, preferencialmente sem valores e sem edição de cadastros mestres.'],
          ['Comercial', 'Clientes, Contratos, Squads e Simulador de Contratos, sem edição de cadastro mestre de pessoas.'],
          ['Jurídico e Leitor', 'Apenas consulta de dashboard, clientes e contratos, sem ações e sem valores.'],
          ['Demonstração', 'Somente o necessário para apresentar o sistema, sem ações de escrita.'],
          ['C-Level / Admin e Super Admin', 'Acesso amplo. Usar com parcimônia e revisar periodicamente quem tem esses perfis.'],
        ]} />
        <Callout type="info">
          Revise os perfis pelo menos a cada ciclo de mudança organizacional. É comum que uma permissão liberada
          &quot;só por hoje&quot; permaneça ligada por meses.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode o quê em Gestão de Perfis',
    content: (
      <>
        <DataTable headers={['Ação', 'Quem pode']} rows={[
          ['Abrir a tela Gestão de Perfis', 'Somente Super Admin. Outros perfis são redirecionados para o Dashboard ao tentar acessar.'],
          ['Configurar módulos e ações de qualquer perfil', 'Somente Super Admin.'],
          ['Usar Resetar para padrão', 'Somente Super Admin, dentro do painel de configuração.'],
          ['Salvar e propagar mudanças para os usuários', 'Somente Super Admin.'],
          ['Ajustar módulos de um único usuário', 'C-Level / Admin e Super Admin, na tela Usuários — sujeito a ser sobrescrito pela propagação.'],
          ['Habilitar linhas marcadas como "Restrito pelo sistema"', 'Ninguém. É uma trava fixa do sistema, não uma configuração.'],
        ]} />
        <Callout type="warn">
          Como esta tela redefine o acesso de todos, evite configurá-la em horário de pico. Prefira um momento de baixa
          utilização e avise os envolvidos antes de salvar.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable headers={['Sintoma', 'Causa provável', 'Solução']} rows={[
        ['Sou redirecionado ao Dashboard ao abrir a tela', 'A tela é exclusiva do Super Admin.', 'Solicite a configuração a um Super Admin.'],
        ['Uma linha de módulo está esmaecida e não marca', 'Aviso "Restrito pelo sistema": o módulo não é permitido para esse perfil.', 'Atribua ao usuário um perfil que já tenha direito ao módulo; a trava não pode ser removida na tela.'],
        ['As chaves de ação estão desabilitadas', 'A caixa do módulo está desmarcada.', 'Marque primeiro o módulo; as ações só valem para módulos habilitados.'],
        ['Cliquei em Resetar para padrão e nada mudou para os usuários', 'O reset apenas carrega os valores na tela, sem gravar.', 'Confira a grade e clique em "Salvar alterações" para efetivar.'],
        ['O ajuste individual de um usuário sumiu', 'O perfil foi salvo e a propagação regravou as permissões de todos daquele perfil.', 'Faça o ajuste no perfil, ou mova o usuário para um perfil adequado.'],
        ['Salvei o perfil e o usuário não viu diferença', 'A sessão dele continua com as permissões antigas em memória.', 'Peça que recarregue a página ou saia e entre novamente.'],
        ['Liberei o módulo mas a pessoa não consegue editar', 'O módulo foi habilitado, porém a ação Editar ficou desligada.', 'Reabra o perfil e ligue a ação correspondente na linha do módulo.'],
        ['Um perfil enxerga valores que não deveria', 'As ações Ver valores ou Custos RH estão ligadas em algum módulo.', 'Reabra o perfil, desligue essas ações módulo a módulo e salve.'],
        ['Erro ao carregar ou ao salvar perfis', 'Falha de comunicação com o banco de dados.', 'Recarregue a tela e tente de novo; persistindo, acione o suporte com o texto da mensagem de erro.'],
      ]} />
    ),
  },
];

export default function HelpProfilesPage() {
  return <HelpArticle title="Gestão de Perfis" description="Módulos, ações por módulo e propagação para usuários" icon={ShieldCheck} sections={sections} />;
}
