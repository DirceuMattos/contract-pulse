/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * I10 Fase 4 — Devoluções pendentes por desligamento.
 *
 * A pendência nasce por gatilho no banco (três vias de desligamento) e morre
 * pela RPC resolve_equipment_return_pending(). Este hook só lê e chama a RPC:
 * não existe INSERT/UPDATE direto na tabela — a RLS não permite, de propósito.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentReturnPending, EquipmentReturnOutcome } from '@/types/equipment';
import { toast } from 'sonner';

const BUCKET = 'equipment-evidence';
const DIAS_ALERTA_PADRAO = 15;

export function useEquipmentReturns() {
  const [pendings, setPendings] = useState<EquipmentReturnPending[]>([]);
  const [diasAlerta, setDiasAlerta] = useState(DIAS_ALERTA_PADRAO);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [retRes, cfgRes] = await Promise.all([
        (supabase as any)
          .from('equipment_return_pendings_view')
          .select('*')
          // mais antigas primeiro
          .order('termination_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
        (supabase as any).from('settings').select('dias_alerta_devolucao').limit(1).maybeSingle(),
      ]);

      if (retRes.error) throw retRes.error;
      setPendings((retRes.data || []) as EquipmentReturnPending[]);

      const dias = Number(cfgRes?.data?.dias_alerta_devolucao);
      setDiasAlerta(Number.isFinite(dias) && dias > 0 ? dias : DIAS_ALERTA_PADRAO);
    } catch (e: any) {
      toast.error('Erro ao carregar devoluções pendentes: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Sobe a foto da avaria no bucket privado e devolve a chave (não a URL). */
  const uploadEvidence = useCallback(async (pendingId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const key = `${pendingId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, { upsert: false });
    if (error) throw error;
    return key;
  }, []);

  /** URL assinada de curta duração para ver a evidência. */
  const evidenceUrl = useCallback(async (key: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 60 * 5);
    if (error) { toast.error('Erro ao abrir a evidência: ' + error.message); return null; }
    return data?.signedUrl ?? null;
  }, []);

  /**
   * Resolve o desfecho. Quem move o item é o banco: a RPC chama
   * register_equipment_movement() e grava o movement_id na pendência.
   */
  const resolve = useCallback(async (args: {
    pendingId: string;
    outcome: EquipmentReturnOutcome;
    notes?: string | null;
    evidenceKey?: string | null;
    occurredAt?: string | null;
    identification?: string | null;
  }) => {
    const { error } = await (supabase as any).rpc('resolve_equipment_return_pending', {
      _pending_id: args.pendingId,
      _outcome: args.outcome,
      _notes: args.notes?.trim() || null,
      _evidence_url: args.evidenceKey || null,
      _occurred_at: args.occurredAt || null,
      _identification: args.identification?.trim() || null,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const abertas = pendings.filter((p) => p.status === 'pending');

  return {
    pendings,
    abertas,
    countAbertas: abertas.length,
    countAtrasadas: abertas.filter((p) => p.dias_em_aberto > diasAlerta).length,
    diasAlerta,
    loading,
    reload: load,
    resolve,
    uploadEvidence,
    evidenceUrl,
  };
}
