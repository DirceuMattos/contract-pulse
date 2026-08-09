// v2 - tutorial revisado e ampliado (agosto/2026)
import { Activity } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'O que são os Logs de Acesso?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>Logs de Acesso</strong> é o histórico de sessões e módulos acessados pelos usuários do BNPHub. Cada
          vez que alguém entra no sistema, é criada uma <strong>sessão</strong>, e o sistema vai registrando por onde
          essa pessoa passou até o encerramento.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A tela responde perguntas de auditoria e de suporte, por exemplo:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>Quando foi a última vez que determinada pessoa usou o sistema?</li>
          <li>Alguém abriu um módulo sensível fora do horário esperado?</li>
          <li>Há acessos partindo de um endereço de rede incomum?</li>
          <li>O usuário realmente esteve na tela em que diz ter estado?</li>
        </ul>
        <Callout type="info">
          Os logs mostram <strong>onde a pessoa navegou</strong>, e não o que ela alterou. Para saber o que mudou em um
          cadastro, use a linha do tempo da pessoa em Recursos Humanos ou o histórico do próprio módulo.
        </Callout>
      </>
    ),
  },
  {
    id: 'como-abrir',
    label: 'Como abrir',
    title: 'Como chegar à tela',
    content: (
      <>
        <Steps items={[
          { title: 'Acesse pela área de Usuários', body: 'A trilha exibida no topo da tela é Admin > Usuários > Logs.' },
          { title: 'Ou abra já filtrado por uma pessoa', body: 'Na lista de Usuários do Sistema, use o menu de três pontos da linha e escolha "Logs de acessos". A tela abre com o nome do usuário no título e o filtro dele já aplicado.' },
          { title: 'Ajuste os filtros', body: 'Reduza o período e o usuário antes de sair lendo linha a linha. Sem filtro, a tela mostra todas as sessões, da mais recente para a mais antiga.' },
          { title: 'Abra os Detalhes da Sessão', body: 'Clique em "Detalhes" no fim da linha para ver rotas, horários e informações técnicas completas.' },
        ]} />
        <Callout type="warn">
          Esta tela é restrita a usuários <strong>C-Level</strong>. Quem não tem esse perfil vê a mensagem{' '}
          <strong>Acesso Restrito</strong> com o aviso de que apenas usuários C-Level podem visualizar logs de acesso —{' '}
          isso vale inclusive para o Super Admin. Veja a seção Permissões.
        </Callout>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Filtros e busca',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A linha de filtros fica logo abaixo do título. Todos funcionam em conjunto: o resultado é a interseção do que
          você selecionou.
        </p>
        <DataTable headers={['Filtro', 'Como usar']} rows={[
          ['Usuário', 'Lista todos os usuários do sistema. A opção padrão é "Todos".'],
          ['Status', 'Todas, "Ativa" (sessão ainda aberta) ou "Encerrada" (sessão já finalizada).'],
          ['De', 'Data inicial. Enquanto vazio, mostra o rótulo "Início".'],
          ['Até', 'Data final. Enquanto vazio, mostra o rótulo "Fim".'],
          ['Busca', 'Campo livre com o texto "IP, módulo, user agent...". Procura também pelo nome do usuário registrado na sessão.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Quando existe qualquer filtro aplicado, aparece o botão <strong>Limpar filtros</strong>. Ele devolve tudo ao
          estado inicial — mas, se você entrou pela opção <strong>Logs de acessos</strong> de um usuário específico, o
          filtro daquele usuário é mantido.
        </p>
        <Callout type="tip">
          Para investigar um incidente, o caminho mais rápido é: filtrar pelo usuário, restringir <strong>De</strong> e{' '}
          <strong>Até</strong> ao dia em questão e depois usar a Busca com o nome do módulo suspeito.
        </Callout>
      </>
    ),
  },
  {
    id: 'tabela',
    label: 'A tabela',
    title: 'Como ler a lista de sessões',
    content: (
      <>
        <DataTable headers={['Coluna', 'O que significa']} rows={[
          ['Usuário', 'Nome registrado no momento da sessão. Fica preservado mesmo que o cadastro mude depois.'],
          ['IP', 'Endereço de rede de onde partiu o acesso. Útil para identificar origem incomum.'],
          ['Início', 'Data e hora em que a sessão começou.'],
          ['Fim', 'Data e hora do encerramento. Sessões em aberto mostram a etiqueta "Ativa".'],
          ['Duração', 'Tempo total da sessão, em segundos, minutos ou horas. Sessões abertas mostram "Em andamento".'],
          ['Módulos', 'Etiquetas com os módulos visitados. São exibidos três; o restante aparece como "+N", e o número mostra a lista completa ao passar o mouse.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          A lista vem sempre ordenada da sessão mais recente para a mais antiga. Quando nenhum registro atende aos
          filtros, aparece a mensagem <strong>Nenhum log encontrado</strong> com a orientação de ajustar os filtros ou
          aguardar novas sessões.
        </p>
        <Callout type="info">
          Uma sessão marcada como <strong>Ativa</strong> nem sempre significa que a pessoa está usando o sistema agora:
          pode ser uma sessão que ficou aberta sem encerramento formal. Para avaliar isso, veja o campo{' '}
          <strong>Última atividade</strong> nos detalhes.
        </Callout>
      </>
    ),
  },
  {
    id: 'detalhes',
    label: 'Detalhes da Sessão',
    title: 'O painel Detalhes da Sessão',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Detalhes</strong>, no fim de cada linha, abre o painel lateral{' '}
          <strong>Detalhes da Sessão</strong>, descrito como informações completas da sessão de acesso. É a visão que
          realmente serve para auditoria.
        </p>
        <DataTable headers={['Informação', 'Para que serve']} rows={[
          ['Nome e ID do usuário', 'Identifica com precisão a conta, mesmo em caso de nomes parecidos.'],
          ['IP', 'Endereço de rede de origem do acesso.'],
          ['Início e Fim', 'Data e hora completas, com segundos. Sessões abertas mostram "Em andamento" no fim.'],
          ['Duração', 'Tempo total da sessão.'],
          ['Última atividade', 'Momento da última interação registrada. Ajuda a distinguir sessão em uso de sessão esquecida aberta.'],
          ['Módulos acessados', 'Lista completa dos módulos visitados, com a contagem total.'],
          ['Rotas acessadas', 'Endereços internos de cada tela aberta durante a sessão. É o nível mais detalhado do rastro.'],
          ['User Agent', 'Navegador e sistema operacional usados. Útil para identificar equipamento ou acesso atípico.'],
        ]} />
        <Callout type="tip">
          Ao registrar uma apuração, copie do painel o nome, o ID do usuário, o IP e os horários de início e fim. Esses
          quatro dados sustentam qualquer relato posterior.
        </Callout>
      </>
    ),
  },
  {
    id: 'manutencao',
    label: 'Limpar e exportar',
    title: 'Limpar logs e exportação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          No topo da tela existem dois botões, e eles se comportam de forma bem diferente:
        </p>
        <DataTable headers={['Botão', 'Situação', 'O que acontece']} rows={[
          ['Exportar CSV (Em breve)', 'Desabilitado', 'Funcionalidade ainda não disponível. O próprio rótulo indica isso; por enquanto, registre as informações a partir do painel Detalhes da Sessão.'],
          ['Limpar logs', 'Disponível', 'Abre a confirmação "Limpar todos os logs?", avisando que a ação remove permanentemente todos os logs de acesso e não pode ser desfeita.'],
        ]} />
        <Callout type="warn">
          <strong>Limpar logs apaga tudo, e não apenas o que está filtrado.</strong> Não existe limpeza parcial nem
          desfazer. Só use essa ação em uma limpeza planejada de base — nunca durante uma apuração em andamento.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Enquanto a exportação não está disponível, o fluxo recomendado para guardar evidência é filtrar o período,
          abrir os <strong>Detalhes da Sessão</strong> relevantes e registrar os dados em um documento próprio de
          auditoria.
        </p>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode o quê nos Logs de Acesso',
    content: (
      <>
        <DataTable headers={['Ação', 'Quem pode']} rows={[
          ['Abrir a tela Logs de Acesso', 'Somente o perfil C-Level. Todos os demais perfis veem "Acesso Restrito".'],
          ['Abrir Logs de acessos pelo menu de um usuário', 'O atalho existe em Usuários, mas a tela de destino continua restrita a C-Level.'],
          ['Usar filtros, busca e Detalhes da Sessão', 'C-Level, dentro da própria tela.'],
          ['Limpar logs', 'C-Level, com confirmação obrigatória.'],
          ['Exportar CSV', 'Ninguém no momento: o botão está desabilitado e marcado como "Em breve".'],
        ]} />
        <Callout type="warn">
          Vale reforçar porque costuma causar dúvida: <strong>Super Admin não abre esta tela</strong>. A restrição está
          fixada no sistema e não é uma configuração de Gestão de Perfis — habilitar o módulo Logs de Acesso em um
          perfil não contorna essa regra.
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
        ['Aparece "Acesso Restrito" ao abrir a tela', 'A tela é exclusiva do perfil C-Level.', 'Peça a consulta a um usuário C-Level; habilitar o módulo em Gestão de Perfis não resolve.'],
        ['Super Admin não consegue ver os logs', 'Restrição fixa do sistema, que libera apenas C-Level.', 'Solicite a um C-Level ou trate a mudança dessa regra como demanda de evolução do sistema.'],
        ['Mensagem "Nenhum log encontrado"', 'Filtros muito restritos ou período sem sessões.', 'Clique em "Limpar filtros" e amplie o intervalo em "De" e "Até".'],
        ['O filtro de usuário volta sempre para a mesma pessoa', 'A tela foi aberta pelo atalho "Logs de acessos" de um usuário.', 'Volte pela trilha Admin > Usuários > Logs ou selecione "Todos" no filtro Usuário.'],
        ['A sessão aparece como Ativa há muito tempo', 'A sessão não foi encerrada formalmente, por fechamento do navegador ou queda de conexão.', 'Confira o campo "Última atividade" nos Detalhes da Sessão para saber quando houve uso real.'],
        ['A coluna Módulos mostra "+N" e não vejo a lista', 'A tabela exibe apenas três etiquetas por linha.', 'Passe o mouse sobre o "+N" ou abra "Detalhes" para ver a lista completa.'],
        ['O botão Exportar CSV não funciona', 'A funcionalidade ainda não foi liberada e o botão está desabilitado.', 'Use o painel Detalhes da Sessão para registrar as informações manualmente.'],
        ['Apaguei os logs por engano', '"Limpar logs" remove todos os registros de forma permanente.', 'Não há recuperação pela tela. Acione o suporte imediatamente para avaliar backup do banco.'],
        ['O nome no log está diferente do cadastro atual', 'O nome é gravado no momento da sessão e preservado.', 'Comportamento esperado; use o ID do usuário nos Detalhes da Sessão para confirmar a identidade.'],
        ['Não encontro registro de uma alteração de dado', 'Os logs registram navegação, não edição de conteúdo.', 'Consulte a linha do tempo da pessoa em RH ou o histórico do módulo correspondente.'],
      ]} />
    ),
  },
];

export default function HelpAccessLogsPage() {
  return <HelpArticle title="Logs de Acesso" description="Sessões, módulos acessados e auditoria" icon={Activity} sections={sections} />;
}
