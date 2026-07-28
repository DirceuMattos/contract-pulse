// Helper de notificações de vaga (I1). Chama a RPC notify_roles_and_users.
import { supabase } from '@/integrations/supabase/client';
import type { JobRequestStatus } from '@/hooks/useJobRequests';
import { STATUS_META } from '@/hooks/useJobRequests';

// Destinatários fixos definidos pelo Dirceu: RH + administrativo + c-level + superadmin
// (+ o solicitante, passado em extraUsers).
const ROLES_VAGAS = ['rh', 'administrativo', 'c-level', 'superadmin'] as const;
const LINK_VAGAS = '/requisicao-vagas';

async function dispatch(
  tipo: string,
  titulo: string,
  mensagem: string,
  entidadeId: string | null,
  extraUsers: (string | null | undefined)[] = [],
) {
  try {
    await supabase.rpc('notify_roles_and_users', {
      _roles: [...ROLES_VAGAS],
      _extra_users: extraUsers.filter(Boolean) as string[],
      _tipo: tipo,
      _titulo: titulo,
      _mensagem: mensagem,
      _link: LINK_VAGAS,
      _entidade: 'job_request',
      _entidade_id: entidadeId,
    });
  } catch {
    // Notificação é acessória: nunca deve quebrar a ação principal.
  }
}

export function notifyVagaAberta(titulo: string, vagaId: string | null, solicitanteNome: string | null, solicitanteId?: string | null) {
  return dispatch(
    'vaga_aberta',
    'Nova vaga solicitada',
    `${solicitanteNome ?? 'Um líder'} abriu a vaga: ${titulo}.`,
    vagaId,
    [solicitanteId],
  );
}

export function notifyVagaStatus(titulo: string, vagaId: string | null, novo: JobRequestStatus, solicitanteId?: string | null) {
  return dispatch(
    'vaga_status',
    'Vaga movimentada',
    `A vaga "${titulo}" mudou para: ${STATUS_META[novo].label}.`,
    vagaId,
    [solicitanteId],
  );
}
