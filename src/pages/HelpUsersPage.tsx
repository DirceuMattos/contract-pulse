// v2 - tutorial revisado e ampliado (agosto/2026)
import { UserCog } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'Para que serve o módulo de Usuários?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Usuários do Sistema</strong> controla <strong>quem consegue entrar no BNPHub</strong>. É aqui
          que se cria a conta, se define o perfil de acesso, se bloqueia quem saiu da empresa e se coloca o sistema em
          manutenção.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Vale separar dois conceitos que costumam se confundir:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Usuário</strong> é a conta de login. Vive aqui, em Usuários.</li>
          <li><strong>Pessoa</strong> é o colaborador da BNP, com cargo, salário e alocação. Vive no módulo Recursos Humanos.</li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          Uma pessoa pode existir no RH sem ter usuário, e um usuário pode existir sem ser colaborador. Desativar o
          usuário não desliga a pessoa no RH — e vice-versa. As duas coisas precisam ser feitas nos seus lugares.
        </p>
        <Callout type="warn">
          Toda alteração aqui muda o acesso de alguém imediatamente. Antes de salvar, pergunte-se: essa pessoa precisa
          apenas <strong>consultar</strong> ou também <strong>alterar</strong> dados? O perfil correto é sempre o menor
          que permite fazer o trabalho.
        </Callout>
      </>
    ),
  },
  {
    id: 'lista',
    label: 'A tela',
    title: 'Como ler a tela de usuários',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Logo abaixo do título há o campo <strong>Buscar por nome ou e-mail...</strong> e quatro indicadores:{' '}
          <strong>Total</strong>, <strong>Ativos</strong>, <strong>Inativos</strong> e <strong>Admins</strong> — este
          último conta apenas as contas com perfil C-Level / Admin.
        </p>
        <DataTable headers={['Coluna', 'O que mostra']} rows={[
          ['Usuário', 'Nome da conta. Sua própria conta aparece marcada com a palavra "Você".'],
          ['E-mail', 'Endereço usado no login. Deve ser exatamente o e-mail de autenticação.'],
          ['Perfil', 'Perfil de acesso, exibido como etiqueta colorida (por exemplo C-Level / Admin, RH, Líder de Tribo).'],
          ['Status', 'Ativo ou Inativo. Contas inativas não conseguem entrar no sistema.'],
          ['Criado em', 'Data de criação da conta.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          As colunas <strong>Usuário</strong>, <strong>Perfil</strong> e <strong>Status</strong> são clicáveis e ordenam
          a lista. No fim de cada linha, o botão de três pontos abre o menu com <strong>Editar</strong>,{' '}
          <strong>Desativar</strong> ou <strong>Ativar</strong>, <strong>Logs de acessos</strong> e{' '}
          <strong>Excluir</strong>.
        </p>
        <Callout type="tip">
          <strong>Logs de acessos</strong> abre a tela de Logs de Acesso já filtrada por aquele usuário. É o caminho
          mais rápido quando alguém pergunta &quot;quando fulano entrou pela última vez?&quot;.
        </Callout>
      </>
    ),
  },
  {
    id: 'criar',
    label: 'Criar usuário',
    title: 'Criar um novo usuário',
    content: (
      <>
        <Steps items={[
          { title: 'Clique em Novo Usuário', body: 'O botão fica no canto superior direito da tela Usuários do Sistema.' },
          { title: 'Preencha Nome completo e E-mail', body: 'O e-mail precisa ser o mesmo usado para autenticar. Se já existir uma conta com aquele endereço, o formulário avisa que o e-mail já está cadastrado.' },
          { title: 'Defina a senha', body: 'São exigidos no mínimo 12 caracteres, com letra maiúscula, letra minúscula, número e caractere especial.' },
          { title: 'Escolha o Perfil de acesso', body: 'Ao selecionar o perfil, aparece logo abaixo uma descrição do que ele permite. Trocar o perfil recarrega automaticamente os módulos padrão daquele perfil.' },
          { title: 'Confira Usuário ativo e as Permissões por Módulo', body: 'A chave "Usuário ativo" libera o login. Na tabela abaixo, revise módulo a módulo o que essa pessoa realmente precisa.' },
          { title: 'Clique em Criar usuário', body: 'Oriente a pessoa a acessar o sistema. Se ela já estiver logada, peça que recarregue a página para a mudança valer.' },
        ]} />
        <Callout type="tip">
          Comece sempre pelo perfil mais restrito que resolve. Ampliar acesso depois é simples; descobrir que alguém viu
          o que não devia, não.
        </Callout>
      </>
    ),
  },
  {
    id: 'editar',
    label: 'Editar e módulos',
    title: 'Editar um usuário e ajustar módulos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A opção <strong>Editar</strong> abre o mesmo formulário do cadastro. A diferença é o campo de senha, que passa
          a se chamar <strong>Nova senha (deixe em branco para manter)</strong> — ou seja, não é preciso digitar senha
          para corrigir um nome ou trocar um perfil.
        </p>
        <DataTable headers={['Campo', 'Cuidado ao alterar']} rows={[
          ['Nome completo', 'Serve para identificação nas telas e nos logs. Alteração sem impacto de acesso.'],
          ['E-mail', 'É o login. Alterar aqui sem alterar a autenticação deixa a pessoa sem conseguir entrar.'],
          ['Nova senha', 'Se ficar em branco, a senha atual é mantida. Se preenchida, precisa atender às mesmas regras do cadastro.'],
          ['Perfil de acesso', 'Muda módulos, ações e visibilidade de valores. Ao trocar o perfil, as permissões por módulo voltam ao padrão do novo perfil.'],
          ['Usuário ativo', 'Desligado, a pessoa não consegue fazer login.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Permissões por Módulo</strong> é a lista de módulos que aquela conta enxerga. Ele traz o campo{' '}
          <strong>Buscar módulo...</strong> e três atalhos: <strong>Ativar todos</strong>,{' '}
          <strong>Desativar todos</strong> e <strong>Restaurar padrão</strong> (volta à configuração padrão do perfil
          selecionado). Duas etiquetas explicam por que uma chave está travada:
        </p>
        <DataTable headers={['Etiqueta', 'Significado']} rows={[
          ['Restrito por papel', 'Aquele módulo não é permitido para o perfil escolhido. Para liberar, é preciso mudar o perfil.'],
          ['Anti-lockout', 'Você não pode remover o próprio acesso ao módulo Usuários. É a proteção que impede alguém de se trancar para fora da administração.'],
        ]} />
        <Callout type="info">
          As permissões por módulo do usuário convivem com a configuração do perfil, feita em{' '}
          <strong>Gestão de Perfis</strong>. Quando alguém salva um perfil lá, as permissões de módulo de todos os
          usuários daquele perfil são regravadas — inclusive ajustes individuais feitos aqui.
        </Callout>
      </>
    ),
  },
  {
    id: 'status',
    label: 'Ativar e excluir',
    title: 'Ativar, desativar e excluir contas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Existem duas formas de tirar alguém do sistema, e elas não são equivalentes:
        </p>
        <DataTable headers={['Ação', 'Efeito', 'Quando usar']} rows={[
          ['Desativar', 'Bloqueia o login e mantém a conta e o histórico. Reversível pela opção Ativar.', 'Desligamento, afastamento, férias longas, bloqueio temporário por suspeita de acesso indevido.'],
          ['Excluir', 'Remove a conta do sistema. Pede confirmação e não pode ser desfeito.', 'Cadastro criado por engano ou duplicado.'],
        ]} />
        <Callout type="warn">
          O sistema não deixa você desativar nem excluir a <strong>própria conta</strong>: aparecem os avisos{' '}
          <strong>Você não pode desativar a si mesmo.</strong> e <strong>Você não pode excluir a si mesmo.</strong>{' '}
          Mesmo assim, mantenha sempre pelo menos um acesso administrativo válido de outra pessoa.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Ao desligar alguém da empresa, o roteiro completo é: desativar o usuário aqui, registrar o desligamento no
          módulo Recursos Humanos e resolver as reposições que forem geradas em Squads e Requisição de Vagas.
        </p>
      </>
    ),
  },
  {
    id: 'manutencao',
    label: 'Modo manutenção',
    title: 'Modo de manutenção',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Modo manutenção</strong> serve para esvaziar o sistema durante uma janela de ajuste — migração de
          dados, correção em massa, testes que não podem sofrer interferência. Ele é exclusivo do perfil Super Admin: o
          botão simplesmente não aparece para os demais.
        </p>
        <Steps items={[
          { title: 'Clique em Modo manutenção', body: 'Abre a janela "Modo de manutenção", que informa o Status atual e quantos usuários estão bloqueados por essa ação.' },
          { title: 'Escolha Desativar usuários', body: 'Desativa todos os usuários ativos, exceto você. A partir daí ninguém mais consegue entrar.' },
          { title: 'Faça o ajuste necessário', body: 'Enquanto o modo estiver ligado, a tela mostra a faixa vermelha "Sistema em manutenção" com a quantidade de contas bloqueadas.' },
          { title: 'Clique em Reativar usuários', body: 'Religa apenas as contas que foram bloqueadas por este modo. Quem já estava inativo antes continua inativo.' },
        ]} />
        <DataTable headers={['Situação', 'O que o sistema informa']} rows={[
          ['Manutenção ligada', 'Mensagem de sistema em manutenção com o total de usuários desativados.'],
          ['Reativação completa', 'Mensagem de sistema reativado com o total de usuários religados.'],
          ['Reativação parcial', 'Aviso de reativação parcial, indicando quantos foram religados e quantos falharam.'],
          ['Faixa vermelha na tela', 'Confirma que o modo continua ativo e quantos usuários seguem bloqueados por ele.'],
        ]} />
        <Callout type="warn">
          Avise as pessoas <strong>antes</strong> de ligar a manutenção. Quem estiver com trabalho em andamento perde o
          acesso na hora. E confira a faixa vermelha ao terminar: se ela continuar visível, a reativação não foi
          concluída.
        </Callout>
        <Callout type="info">
          Se algum usuário não voltar após a reativação, ele provavelmente já estava inativo antes da manutenção — ou
          fez parte das falhas informadas na mensagem. Reative essas contas uma a uma pela opção{' '}
          <strong>Ativar</strong> no menu da linha.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode o quê em Usuários',
    content: (
      <>
        <DataTable headers={['Ação', 'Quem pode']} rows={[
          ['Abrir a tela Usuários do Sistema', 'Apenas C-Level / Admin e Super Admin. Outros perfis veem a mensagem "Acesso Restrito".'],
          ['Criar, editar e excluir usuários', 'C-Level / Admin e Super Admin.'],
          ['Ativar e desativar usuários', 'C-Level / Admin e Super Admin, exceto a própria conta.'],
          ['Ajustar Permissões por Módulo no formulário', 'C-Level / Admin e Super Admin, respeitando as travas "Restrito por papel" e "Anti-lockout".'],
          ['Usar o Modo manutenção', 'Somente Super Admin.'],
          ['Abrir Logs de acessos a partir do menu da linha', 'A tela de Logs de Acesso é restrita a C-Level; veja o tutorial de Logs de Acesso.'],
          ['Configurar o que cada perfil enxerga', 'Somente Super Admin, na tela Gestão de Perfis.'],
        ]} />
        <Callout type="info">
          Uma boa rotina: a cada mudança de função na empresa, revise o perfil do usuário no mesmo dia. Perfil antigo
          esquecido é a forma mais silenciosa de acesso indevido.
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
        ['Vejo "Acesso Restrito" ao abrir Usuários', 'Seu perfil não é C-Level / Admin nem Super Admin.', 'Peça a alteração a um administrador; a tela é restrita por regra do sistema.'],
        ['Não encontro o botão Modo manutenção', 'O botão é exclusivo do perfil Super Admin.', 'Solicite a ação a um Super Admin.'],
        ['O usuário não consegue entrar mesmo estando Ativo', 'E-mail diferente do usado na autenticação ou senha fora do padrão exigido.', 'Confira o e-mail na edição e defina uma nova senha com 12+ caracteres, maiúscula, minúscula, número e especial.'],
        ['Mensagem de e-mail já cadastrado ao criar', 'Já existe uma conta com aquele endereço, possivelmente inativa.', 'Busque o e-mail na lista e use Editar/Ativar em vez de criar uma conta nova.'],
        ['Troquei o perfil e as permissões de módulo mudaram sozinhas', 'Ao trocar o perfil, os módulos voltam ao padrão do novo perfil.', 'Reveja a tabela Permissões por Módulo antes de salvar e ajuste o que for necessário.'],
        ['Uma chave de módulo está travada', 'Etiqueta "Restrito por papel" ou "Anti-lockout".', 'Restrito por papel exige mudar o perfil; Anti-lockout impede remover seu próprio acesso a Usuários.'],
        ['Ajustei o módulo de um usuário e a mudança sumiu', 'Alguém salvou o perfil em Gestão de Perfis e a configuração foi propagada.', 'Faça o ajuste no perfil, em Gestão de Perfis, para que valha para todos daquele perfil.'],
        ['Não consigo me desativar ou me excluir', 'Proteção do sistema contra bloqueio da própria conta.', 'Peça a outro administrador, mantendo sempre um acesso administrativo válido.'],
        ['Após a manutenção, alguns usuários seguem bloqueados', 'A reativação foi parcial ou as contas já estavam inativas antes.', 'Leia a mensagem de reativação e religue as contas restantes pela opção Ativar no menu da linha.'],
        ['A mudança de perfil não fez efeito para o usuário', 'A sessão dele ainda está com as permissões antigas em memória.', 'Peça que recarregue a página ou saia e entre novamente.'],
      ]} />
    ),
  },
];

export default function HelpUsersPage() {
  return <HelpArticle title="Usuários" description="Cadastro, perfis, status e modo de manutenção" icon={UserCog} sections={sections} />;
}
