import { Activity } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Logs de Acesso',
    content: <p className="text-sm text-muted-foreground">Logs de acesso registram sessões, usuários, horários, módulos acessados e informações técnicas úteis para auditoria.</p>,
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    title: 'Uso em auditoria',
    content: (
      <>
        <DataTable headers={['Campo', 'Uso']} rows={[
          ['Usuário', 'Identifica quem acessou o sistema.'],
          ['Início e fim', 'Ajuda a entender duração da sessão.'],
          ['Módulos', 'Mostra áreas visitadas durante o acesso.'],
          ['IP', 'Auxilia análises de segurança.'],
        ]} />
        <Callout type="info">Há demanda para criar relatórios de auditoria dos logs de acesso para SuperAdmin.</Callout>
      </>
    ),
  },
];

export default function HelpAccessLogsPage() {
  return <HelpArticle title="Logs de Acesso" description="Consulta e auditoria de acessos" icon={Activity} sections={sections} />;
}
