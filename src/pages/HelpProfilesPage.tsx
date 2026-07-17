import { ShieldCheck } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é a Gestão de Perfis?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">A Gestão de Perfis define quais módulos cada perfil acessa e quais ações pode executar dentro de cada módulo.</p>
        <Callout type="info">Acesso ao módulo e permissão de ação são controles separados: sem acesso ao módulo, todas as ações daquele módulo ficam bloqueadas.</Callout>
      </>
    ),
  },
  {
    id: 'grade',
    label: 'Grade de Permissões',
    title: 'Como ler a grade de permissões',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">Cada linha representa um módulo. As colunas representam ações permitidas.</p>
        <DataTable headers={['Coluna', 'Uso']} rows={[
          ['Módulo', 'Liga ou desliga o acesso ao módulo.'],
          ['Editar', 'Permite alterar registros existentes.'],
          ['Criar', 'Permite criar novos registros.'],
          ['Excluir', 'Permite remover registros quando o sistema permitir.'],
          ['Exportar', 'Permite exportação de dados.'],
          ['Ver valores', 'Permite visualizar valores financeiros.'],
          ['Custos RH', 'Permite visualizar salários, encargos e custos de RH.'],
          ['Alocar', 'Permite ações operacionais de alocação, como em Squads.'],
        ]} />
      </>
    ),
  },
  {
    id: 'editar',
    label: 'Editar Perfil',
    title: 'Alterar permissões de um perfil',
    content: (
      <Steps items={[
        { title: 'Abra Setup > Perfis', body: 'Apenas SuperAdmin acessa a gestão de perfis.' },
        { title: 'Clique em Configurar', body: 'Escolha o perfil desejado e abra a grade de permissões.' },
        { title: 'Ajuste módulo e ações', body: 'Ligue o acesso ao módulo e marque somente as ações necessárias.' },
        { title: 'Salve', body: 'As permissões passam a valer para usuários daquele perfil após recarregar a sessão ou a tela.' },
      ]} />
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas Práticas',
    title: 'Cuidados recomendados',
    content: (
      <>
        <DataTable headers={['Situação', 'Recomendação']} rows={[
          ['Líder de Tribo', 'Liberar Squads > Alocar; evitar Clientes/Contratos/RH > Editar.'],
          ['Valores financeiros', 'Manter apenas para C-Level, SuperAdmin e Administrativo.'],
          ['Custos RH', 'Manter apenas para perfis autorizados a ver salários e encargos.'],
          ['Alteração ampla', 'Testar com usuário real do perfil antes de considerar concluído.'],
        ]} />
        <Callout type="warn">Permissões excessivas podem expor dados sensíveis ou permitir alteração de cadastros mestres.</Callout>
      </>
    ),
  },
];

export default function HelpProfilesPage() {
  return <HelpArticle title="Gestão de Perfis" description="Configuração de acesso e ações por módulo" icon={ShieldCheck} sections={sections} />;
}
