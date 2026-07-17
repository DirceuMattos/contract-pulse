// v1 - módulo Requisição de Vagas: hook de dados
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type JobRequestStatus =
  | 'solicitado'
  | 'em_avaliacao'
  | 'aprovado_em_contratacao'
  | 'preenchida'
  | 'suspenso';

export interface JobRequest {
  id: string;
  titulo: string;
  descricao: string | null;
  job_title_id: string | null;
  job_skill_profile_id: string | null;
  skills_avulsas: unknown | null;
  nivel: string | null;
  anos_experiencia: number | null;
  quantidade: number;
  modalidade_trabalho: 'remoto' | 'presencial' | 'hibrido' | null;
  presenca_cliente_requerida: boolean;
  dias_presenca_cliente: string | null;
  viagens_requeridas: boolean;
  beneficios: string | null;
  status: JobRequestStatus;
  pending_replacement_id: string | null;
  contract_id: string | null;
  solicitante_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // derivados
  jobTitleLabel?: string;
}

type JobRequestRow = JobRequest & {
  job_titles?: { label: string | null } | null;
};

export const STATUS_META: Record<JobRequestStatus, { label: string; color: string }> = {
  solicitado:              { label: 'Solicitado',            color: '#2563EB' },
  em_avaliacao:            { label: 'Em avaliação',          color: '#D97706' },
  aprovado_em_contratacao: { label: 'Aprovado em contratação', color: '#16A34A' },
  preenchida:              { label: 'Preenchida',            color: '#0EA5A4' },
  suspenso:                { label: 'Suspenso',              color: '#6B7280' },
};

// Transições permitidas do fluxo de status.
// Suspenso é alcançável de qualquer estado; de suspenso volta-se a solicitado.
export const STATUS_FLOW: Record<JobRequestStatus, JobRequestStatus[]> = {
  solicitado:              ['em_avaliacao', 'suspenso'],
  em_avaliacao:            ['aprovado_em_contratacao', 'suspenso'],
  aprovado_em_contratacao: ['preenchida', 'suspenso'],
  preenchida:              ['suspenso'],
  suspenso:                ['solicitado'],
};

export function useJobRequests() {
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('job_requests')
        .select('*, job_titles(label)')
        .order('created_at', { ascending: false });
      if (e) throw e;
      const rows = (data ?? []) as JobRequestRow[];
      const mapped: JobRequest[] = rows.map((r) => ({
        ...r,
        jobTitleLabel: r.job_titles?.label ?? null,
      }));
      setRequests(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vagas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { requests, loading, error, reload: load };
}
