/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EquipmentItem, EquipmentMovement, EquipmentStatus, EquipmentHolderType,
  GroupCompany, EquipmentSupplier,
} from '@/types/equipment';
import { toast } from 'sonner';

interface HrPersonOption {
  id: string;
  nome: string;
  situacao: string | null;
}

export function useEquipment() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [companies, setCompanies] = useState<GroupCompany[]>([]);
  const [suppliers, setSuppliers] = useState<EquipmentSupplier[]>([]);
  const [people, setPeople] = useState<HrPersonOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, compRes, supRes, peopleRes] = await Promise.all([
        (supabase as any).from('equipment_items_view').select('*').order('hostname', { nullsFirst: false }),
        (supabase as any).from('group_companies').select('id, name, active').eq('active', true).order('name'),
        (supabase as any).from('equipment_suppliers').select('id, name, active').eq('active', true).order('name'),
        (supabase as any).from('hr_people').select('id, nome, situacao').order('nome'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      setItems((itemsRes.data || []) as EquipmentItem[]);
      setCompanies((compRes.data || []) as GroupCompany[]);
      setSuppliers((supRes.data || []) as EquipmentSupplier[]);
      setPeople((peopleRes.data || []) as HrPersonOption[]);
    } catch (e: any) {
      toast.error('Erro ao carregar equipamentos: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Cadastro. O estado inicial vem do banco (em_estoque) — não se passa status aqui. */
  const createItem = useCallback(async (payload: Partial<EquipmentItem>) => {
    const { data: userData } = await (supabase as any).auth.getUser();
    const { error } = await (supabase as any)
      .from('equipment_items')
      .insert({ ...payload, created_by: userData?.user?.id ?? null });
    if (error) throw error;
    await load();
  }, [load]);

  /**
   * Edição de cadastro. Estado e detentor são removidos do payload de propósito:
   * quem muda isso é registerMovement, senão o histórico se perde.
   */
  const updateItem = useCallback(async (id: string, payload: Partial<EquipmentItem>) => {
    const { data: userData } = await (supabase as any).auth.getUser();
    const {
      status: _s, holder_type: _ht, holder_person_id: _hp, holder_company_id: _hc,
      holder_person_name: _n, holder_company_name: _c, supplier_name: _sn,
      alerta_colaborador_inativo: _a1, alerta_fora_da_bnp: _a2,
      ultima_movimentacao: _um, holder_person_situacao: _hs,
      id: _id, created_at: _ca, updated_at: _ua,
      ...safe
    } = payload as any;

    const { error } = await (supabase as any)
      .from('equipment_items')
      .update({ ...safe, updated_by: userData?.user?.id ?? null })
      .eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const registerMovement = useCallback(async (args: {
    itemId: string;
    toStatus: EquipmentStatus;
    toHolderType: EquipmentHolderType;
    personId?: string | null;
    companyId?: string | null;
    reason?: string | null;
    occurredAt?: string | null;
    justification?: string | null;
  }) => {
    const { error } = await (supabase as any).rpc('register_equipment_movement', {
      _item_id: args.itemId,
      _to_status: args.toStatus,
      _to_holder_type: args.toHolderType,
      _to_person_id: args.personId ?? null,
      _to_company_id: args.companyId ?? null,
      _reason: args.reason ?? null,
      _occurred_at: args.occurredAt ?? null,
      _authorized_by: null,
      _justification: args.justification ?? null,
      _evidence_url: null,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const softDelete = useCallback(async (id: string, reason: string) => {
    const { error } = await (supabase as any).rpc('soft_delete_equipment_item', {
      _item_id: id,
      _reason: reason,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const loadMovements = useCallback(async (itemId: string): Promise<EquipmentMovement[]> => {
    const { data, error } = await (supabase as any)
      .from('equipment_movements')
      .select('*')
      .eq('equipment_item_id', itemId)
      .order('occurred_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar histórico: ' + error.message);
      return [];
    }
    return (data || []) as EquipmentMovement[];
  }, []);

  return {
    items, companies, suppliers, people, loading,
    reload: load, createItem, updateItem, registerMovement, softDelete, loadMovements,
  };
}
