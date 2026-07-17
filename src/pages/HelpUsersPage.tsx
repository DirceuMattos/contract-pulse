import { UserCog } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o módulo de Usuários?',
    content: <p className="text-sm text-muted-foreground">O módulo de Usuários permite cadastrar, editar, ativar, desativar e acompanhar usuários do sistema.</p>,
  },
  {
    id: 'criar-editar',
    label: 'Criar e Editar',
    title: 'Criar ou editar usuários',
    content: (
      <Steps items={[
        { title: 'Abra Setup > Usuários', body: 'A tela lista usuários, e-mail, perfil, status e data de criação.' },
        { title: 'Use Novo Usuário ou Editar', body: 'Preencha nome, e-mail, perfil e permissões específicas quando necessário.' },
        { title: 'Salve e valide o acesso', body: 'Após salvar, teste o login ou peça ao usuário para recarregar a sessão.' },
      ]} />
    ),
  },
  {
    id: 'status',
    label: 'Ativar/Inativar',
    title: 'Ativar e desativar usuários',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">A desativação bloqueia o acesso do usuário pelo Supabase Auth. A reativação remove esse bloqueio.</p>
        <Callout type="warn">Um SuperAdmin não deve desativar a própria conta.</Callout>
      </>
    ),
  },
  {
    id: 'manutencao',
    label: 'Modo Manutenção',
    title: 'Modo de manutenção',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">O modo de manutenção permite ao SuperAdmin bloquear temporariamente os usuários ativos, exceto o próprio SuperAdmin logado.</p>
        <DataTable headers={['Ação', 'Resultado']} rows={[
          ['Desativar usuários', 'Bloqueia usuários ativos para manutenção.'],
          ['Reativar usuários', 'Reativa usuários bloqueados e limpa os registros de manutenção.'],
          ['Falha parcial', 'A tela informa quantos foram reativados e quantos falharam.'],
        ]} />
        <Callout type="info">Se a reativação não refletir na tela, atualize a lista de usuários e verifique se ainda existem registros em auth.users.banned_until.</Callout>
      </>
    ),
  },
];

export default function HelpUsersPage() {
  return <HelpArticle title="Usuários" description="Cadastro, status e modo de manutenção" icon={UserCog} sections={sections} />;
}
