// Notificações persistidas (I1): carrega do banco + realtime. Separado das
// notificações de alerta (localStorage) para não acoplar as duas naturezas.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DbNotification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  entidade: string | null;
  entidade_id: string | null;
  lida: boolean;
  created_at: string;
}

export function useDbNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<DbNotification[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setItems((data ?? []) as DbNotification[]);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime: nova notificação para este usuário aparece na hora.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as DbNotification, ...prev]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = items.filter((n) => !n.lida).length;

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await supabase.from('notifications').update({ lida: true }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const ids = items.filter((n) => !n.lida).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase.from('notifications').update({ lida: true }).in('id', ids);
  }, [items]);

  return { items, unreadCount, markAsRead, markAllAsRead, reload: load };
}
