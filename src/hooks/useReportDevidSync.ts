import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useReportDevidSync() {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncDevid = async (
    reportId: string,
    clientEmailDomain?: string,
    firefliesKeywords?: string[],
    month?: number,
    year?: number,
    milvusClientNames?: string[]
  ) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('report-sync-devid', {
        body: { reportId, clientEmailDomain, firefliesKeywords, month, year, milvusClientNames },
      });

      if (error) throw error;

      toast({
        title: 'Milvus e Discord sincronizados!',
        description: `${data.milvus?.tickets ?? 0} tickets e ${data.discord?.reunioes ?? 0} reuniões importados.`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao sincronizar DEVID', description: message, variant: 'destructive' });
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  return { syncDevid, syncing };
}
