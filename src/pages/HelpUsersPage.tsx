import { UserCog } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visao Geral',
    title: 'Para que serve o modulo de Usuarios?',
    content: (
      <p className="text-sm text-muted-foreground">
        O modulo de Usuarios permite cadastrar, consultar, ativar, desativar e controlar acessos ao sistema.
        Ele deve ser usado com cuidado, pois uma alteracao incorreta pode bloquear um usuario ou liberar acesso indevido.
      </p>
    ),
  },
  {
    id: 'criar',
    label: 'Criar',
    title: 'Criar um usuario',
    content: (
      <Steps items={[
        { title: 'Abra Setup > Usuarios', body: 'A tela lista nome, e-mail, perfil, status e data de criacao.' },
        { title: 'Clique em Novo Usuario', body: 'Informe nome, e-mail e perfil adequado para a funcao da pessoa.' },
        { title: 'Confira o perfil', body: 'Antes de salvar, valide se o perfil tem acesso apenas aos modulos necessarios.' },
        { title: 'Salve', body: 'Depois de salvar, oriente o usuario a acessar o sistema e recarregar a sessao se ja estiver logado.' },
      ]} />
    ),
  },
  {
    id: 'editar',
    label: 'Editar',
    title: 'Editar usuario existente',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A edicao de usuario deve ser usada para corrigir nome, perfil ou status. Mudancas de perfil podem alterar
          imediatamente a experiencia do usuario no sistema.
        </p>
        <DataTable headers={['Campo', 'Cuidado']} rows={[
          ['Nome', 'Usado para identificacao visual.'],
          ['E-mail', 'Deve corresponder ao login usado no Supabase/Auth.'],
          ['Perfil', 'Controla modulos, acoes e visibilidade de valores.'],
          ['Status', 'Ativo permite acesso; inativo bloqueia.'],
        ]} />
      </>
    ),
  },
  {
    id: 'status',
    label: 'Ativar/Inativar',
    title: 'Ativar e desativar usuarios',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Desativar um usuario bloqueia o acesso. Reativar remove o bloqueio aplicado pelo sistema.
          Use essa acao para desligamentos, afastamentos ou bloqueios temporarios.
        </p>
        <Callout type="warn">Nunca desative a propria conta Superadmin durante manutencao. Mantenha pelo menos um acesso administrativo valido.</Callout>
      </>
    ),
  },
  {
    id: 'manutencao',
    label: 'Manutencao',
    title: 'Modo de manutencao',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O modo de manutencao permite ao Superadmin bloquear temporariamente usuarios ativos para fazer ajustes no sistema.
          O proprio Superadmin logado nao deve ser bloqueado.
        </p>
        <DataTable headers={['Acao', 'Resultado']} rows={[
          ['Desativar usuarios', 'Bloqueia usuarios ativos para impedir acesso durante a manutencao.'],
          ['Reativar usuarios', 'Reativa apenas os usuarios bloqueados por esse modo.'],
          ['Status atual', 'Informa se ha bloqueio de manutencao ativo.'],
          ['Falha parcial', 'A tela informa quantos usuarios foram processados e quantos falharam.'],
        ]} />
        <Callout type="info">Se a reativacao nao refletir imediatamente, atualize a pagina e confira se os usuarios continuam com bloqueio no Auth.</Callout>
      </>
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas Praticas',
    title: 'Boas praticas de administracao',
    content: (
      <DataTable headers={['Situacao', 'Recomendacao']} rows={[
        ['Novo colaborador', 'Crie o usuario com o menor perfil necessario para iniciar.'],
        ['Mudanca de funcao', 'Revise perfil e permissoes assim que a funcao mudar.'],
        ['Saida da empresa', 'Desative o usuario e revise registros vinculados.'],
        ['Manutencao do sistema', 'Avise os usuarios antes, ative manutencao, teste, depois reative.'],
        ['Acesso indevido', 'Bloqueie o usuario e revise logs de acesso.'],
      ]} />
    ),
  },
];

export default function HelpUsersPage() {
  return <HelpArticle title="Usuarios" description="Cadastro, status e modo de manutencao" icon={UserCog} sections={sections} />;
}
