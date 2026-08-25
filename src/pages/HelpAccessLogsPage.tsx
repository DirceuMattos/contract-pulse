// v3 - reescrito em 24/08/2026, quando o modulo entrou em operacao de fato.
// A versao anterior descrevia comportamentos que nao existiam: dizia que o
// IP era registrado (ia '0.0.0.0' fixo), que "Limpar logs" apagava tudo de
// forma permanente (nao apagava nada) e que a tela era exclusiva do C-Level
// (o proprio Superadmin ficava de fora). Nada disso vale mais.
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
          vez que alguém entra no sistema é criada uma <strong>sessão</strong>, e o sistema registra por onde essa
          pessoa passou até o encerramento.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A tela responde perguntas de auditoria e de suporte, por exemplo:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>Quando foi a última vez que determinada pessoa usou o sistema?</li>
          <li>Alguém abriu um módulo sensível fora do horário esperado?</li>
          <li>O usuário realmente esteve na tela em que diz ter estado?</li>
        </ul>
        <Callout type="info">
          Os logs mostram <strong>onde a pessoa navegou</strong>, e não o que ela alterou. Para saber o que mudou em um
          cadastro, use a linha do tempo da pessoa em Recursos Humanos ou o histórico do próprio módulo.
        </Callout>
        <Callout type="warn">
          Esta tela contém <strong>dado pessoal de colaborador</strong>: nome, horários de uso e rotas navegadas. Use
          apenas para auditoria, e trate o que sair daqui — inclusive o CSV exportado — como informação interna
          restrita.
        </Callout>
      </>
    ),
  },
  {
    id: 'quem-acessa',
    label: 'Quem acessa',
    title: 'Permissões',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo é <strong>exclusivo do Superadmin</strong>. Nenhum outro perfil abre a tela, e conceder o módulo em
          Gestão de Perfis não muda isso — a restrição está no catálogo de módulos e também na regra de leitura do
          banco.
        </p>
        <DataTable headers={['Ação', 'Quem pode']} rows={[
          ['Abrir a tela Logs de Acesso', 'Somente Superadmin.'],
          ['Ver o item no menu, em Setup', 'Somente Superadmin; para os demais o item nem aparece.'],
          ['Abrir "Logs de acessos" pelo menu de um usuário', 'Somente Superadmin; o atalho fica oculto para os demais.'],
          ['Exportar CSV', 'Somente Superadmin, respeitando os filtros aplicados.'],
          ['Expurgar registros antigos', 'Somente Superadmin, com confirmação.'],
        ]} />
        <Callout type="info">
          A gravação do log é diferente da leitura: <strong>todo usuário registra a própria sessão</strong>, senão não
          haveria o que auditar. O que o Superadmin detém com exclusividade é a leitura e o expurgo.
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
          { title: 'Pelo menu lateral', body: 'Bloco Setup > Logs de Acesso.' },
          { title: 'Ou já filtrado por uma pessoa', body: 'Na lista de Usuários do Sistema, use o menu de três pontos da linha e escolha "Logs de acessos". A tela abre com o filtro daquela pessoa aplicado.' },
          { title: 'Ou pela busca rápida', body: 'Ctrl+K e digite "Logs".' },
          { title: 'Ajuste o período antes de ler', body: 'A tela abre com as sessões mais recentes. Reduza o intervalo em "De" e "Até" antes de sair lendo linha a linha.' },
        ]} />
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Como filtrar',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os filtros são aplicados <strong>no banco</strong>, não sobre o que está na tela. Isso significa que o
          contador de sessões encontradas reflete o total real do recorte, e não apenas a página atual.
        </p>
        <DataTable headers={['Filtro', 'O que faz']} rows={[
          ['De / Até', 'Data e hora de início da sessão. Aceita o horário, não só o dia — útil para apurar um intervalo específico.'],
          ['Usuário', 'Uma pessoa por vez, pela lista de usuários do sistema.'],
          ['Módulos acessados', 'Traz as sessões que passaram por qualquer um dos módulos marcados. A lista vem do que já foi efetivamente registrado.'],
          ['Nome do usuário', 'Busca pelo nome gravado no momento da sessão. Espera você parar de digitar antes de consultar.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3">
          Havendo qualquer filtro, aparece <strong>Limpar filtros</strong>, que devolve a tela ao estado inicial.
        </p>
      </>
    ),
  },
  {
    id: 'colunas',
    label: 'Colunas',
    title: 'O que cada coluna mostra',
    content: (
      <>
        <DataTable headers={['Coluna', 'Significado']} rows={[
          ['Usuário', 'Nome gravado no momento da sessão. Se a pessoa for renomeada depois, o log preserva o nome da época.'],
          ['Início', 'Data e hora de abertura da sessão.'],
          ['Fim', 'Quando a sessão foi encerrada. Traço significa que não houve encerramento registrado.'],
          ['Duração', 'Diferença entre início e fim. Só existe quando há fim registrado.'],
          ['Situação', 'Em andamento, Encerrada ou Sem atividade — veja abaixo.'],
          ['Módulos', 'Módulos distintos visitados na sessão. Acima de três, o excedente aparece ao passar o mouse.'],
        ]} />
        <Callout type="info">
          <strong>Sem atividade</strong> quer dizer que a sessão não foi encerrada formalmente e não registra
          movimento há mais de 30 minutos. Acontece quando a pessoa fecha a aba direto: o navegador nem sempre dá tempo
          de avisar o sistema. É diferente de <strong>Em andamento</strong>, que indica uso recente de verdade.
        </Callout>
      </>
    ),
  },
  {
    id: 'detalhes',
    label: 'Detalhes',
    title: 'Painel de detalhes da sessão',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Detalhes</strong> abre o painel lateral com duração, situação, última atividade, encerramento,
          a lista completa de módulos, todas as rotas visitadas (até 50 por sessão) e o navegador utilizado.
        </p>
        <Callout type="warn">
          <strong>O endereço de IP não é registrado.</strong> O navegador não conhece o próprio IP público, e capturá-lo
          exigiria uma função no servidor, ainda não implementada. Até lá, não use origem de rede como evidência em
          nenhuma apuração — a informação simplesmente não existe.
        </Callout>
      </>
    ),
  },
  {
    id: 'exportar-expurgar',
    label: 'Exportar e expurgar',
    title: 'Exportação e expurgo',
    content: (
      <>
        <DataTable headers={['Ação', 'O que faz']} rows={[
          ['Exportar CSV', 'Gera um arquivo com as sessões do recorte filtrado, incluindo módulos, rotas e navegador. Limitado a 5.000 registros por vez — se atingir o teto, a tela avisa e basta estreitar o período.'],
          ['Expurgar antigos', 'Remove definitivamente as sessões iniciadas há mais tempo que o prazo informado em dias. Ao final, informa quantos registros saíram.'],
          ['Atualizar', 'Recarrega o recorte atual sem perder os filtros.'],
        ]} />
        <Callout type="warn">
          O expurgo é <strong>definitivo e não tem cópia em outro lugar</strong>. Ele apaga por idade, não por filtro:
          o que estiver na tela não influencia o que será removido. E o prazo de retenção precisa ser uma decisão
          formal da empresa, não um número escolhido na hora do clique.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas',
    title: 'Situações comuns',
    content: (
      <DataTable headers={['Situação', 'Por que acontece', 'O que fazer']} rows={[
        ['Aparece "Acesso Restrito"', 'A tela é exclusiva do Superadmin.', 'Solicite a consulta a quem tem o perfil; habilitar o módulo em Gestão de Perfis não resolve.'],
        ['Nenhuma sessão neste recorte', 'Filtros muito estreitos ou período sem uso.', 'Clique em "Limpar filtros" e amplie o intervalo em "De" e "Até".'],
        ['Sessão parada em "Sem atividade"', 'A pessoa fechou a aba e o encerramento não chegou ao sistema.', 'Comportamento esperado. Use a última atividade como referência de fim.'],
        ['Várias sessões do mesmo usuário no mesmo dia', 'Cada novo login, ou uso em outra aba ou dispositivo, abre uma sessão.', 'Comportamento esperado. Recarregar a página, porém, não abre sessão nova.'],
        ['O nome no log está diferente do cadastro atual', 'O nome é gravado no momento da sessão e preservado.', 'Comportamento esperado; é assim que o registro histórico se mantém fiel.'],
        ['Não encontro registro de uma alteração de dado', 'Os logs registram navegação, não edição de conteúdo.', 'Consulte a linha do tempo da pessoa em RH ou o histórico do módulo correspondente.'],
        ['A exportação veio cortada', 'O teto por exportação é de 5.000 registros.', 'Estreite o período e exporte em partes.'],
      ]} />
    ),
  },
];

export default function HelpAccessLogsPage() {
  return <HelpArticle title="Logs de Acesso" description="Sessões, módulos acessados e auditoria" icon={Activity} sections={sections} />;
}
