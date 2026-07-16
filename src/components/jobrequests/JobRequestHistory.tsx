// v1 - histórico de status da vaga (job_request_status_history)
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_META, type JobRequestStatus } from '@/hooks/useJobRequests';

interface Row {
  id: string;
  status_anterior: JobRequestStatus | null;
  status_novo: JobRequestStatus;
  created_at: string;
}

export function JobRequestHistory({ jobRequestId }: { jobRequestId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('job_request_status_history')
        .select('id, status_anterior, status_novo, created_at')
        .eq('job_request_id', jobRequestId)
        .order('created_at', { ascending: false });
      if (active) { setRows((data ?? []) as Row[]); setLoading(false); }
    })();
    return () => { active = false; };
  }, [jobRequestId]);

  if (loading) return <p className="text-xs text-muted-foreground">Carregando histórico…</p>;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Sem histórico de status.</p>;

  return (
    <ol className="space-y-2">
      {rows.map((r) => {
        const novo = STATUS_META[r.status_novo];
        const ant = r.status_anterior ? STATUS_META[r.status_anterior] : null;
        return (
          <li key={r.id} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: novo.color }} />
            <span className="text-muted-foreground">
              {ant ? `${ant.label} → ` : 'Criada como '}
              <span className="font-medium text-foreground">{novo.label}</span>
            </span>
            <span className="ml-auto text-muted-foreground">
              {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
