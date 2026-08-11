// v1 - notificações do módulo de Relatórios Mensais.
// Disparadas na mudança de status: "Em Revisão" avisa quem precisa conferir,
// "Liberado" avisa quem precisa entregar/acompanhar. Espelha o padrão de notifyVagas.ts.
import { supabase } from '@/integrations/supabase/client';

// Superadmin entra na lista para que o aviso apareça também no topo das telas para ele
// (o banner global se alimenta das notificações do próprio usuário).
const ROLES_RELATORIOS = ['lider_tribo', 'administrativo', 'projetos_produtos', 'superadmin'] as const;

export const REPORT_NOTIFICATION_TYPES = ['relatorio_revisao', 'relatorio_liberado'] as const;
export type ReportNotificationType = (typeof REPORT_NOTIFICATION_TYPES)[number];

async function dispatch(
  tipo: ReportNotificationType,
  titulo: string,
  mensagem: string,
  reportId: string,
  extraUsers: (string | undefined)[] = [],
): Promise<void> {
  try {
    await supabase.rpc('notify_roles_and_users', {
      _roles: [...ROLES_RELATORIOS],
      _extra_users: extraUsers.filter(Boolean) as string[],
      _tipo: tipo,
      _titulo: titulo,
      _mensagem: mensagem,
      _link: `/relatorios/${reportId}`,
      _entidade: 'monthly_report',
      _entidade_id: reportId,
    });
  } catch {
    // Notificação é acessória: nunca deve impedir a mudança de status.
  }
}

interface ReportRef {
  id: string;
  contrato: string;
  cliente?: string;
  periodo: string;
  autor?: string;
  criadoPor?: string;
}

/** Relatório enviado para conferência. */
export async function notifyRelatorioEmRevisao(ref: ReportRef): Promise<void> {
  const onde = ref.cliente ? `${ref.contrato} · ${ref.cliente}` : ref.contrato;
  await dispatch(
    'relatorio_revisao',
    'Relatório aguardando revisão',
    `${onde} — ${ref.periodo} foi enviado para revisão${ref.autor ? ` por ${ref.autor}` : ''}.`,
    ref.id,
    [ref.criadoPor],
  );
}

/** Relatório liberado para entrega ao cliente. */
export async function notifyRelatorioLiberado(ref: ReportRef): Promise<void> {
  const onde = ref.cliente ? `${ref.contrato} · ${ref.cliente}` : ref.contrato;
  await dispatch(
    'relatorio_liberado',
    'Relatório liberado',
    `${onde} — ${ref.periodo} foi liberado${ref.autor ? ` por ${ref.autor}` : ''} e está pronto para entrega.`,
    ref.id,
    [ref.criadoPor],
  );
}
