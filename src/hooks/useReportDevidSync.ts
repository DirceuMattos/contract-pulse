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
    milvusClientNames?: string[],
    azureProject?: string,
    azureTags?: string[]
  ) => {
    setSyncing(true);
    try {
      // Sync Milvus / Fireflies
      const { data, error } = await supabase.functions.invoke('report-sync-devid', {
        body: { reportId, clientEmailDomain, firefliesKeywords, month, year, milvusClientNames },
      });

      if (error) throw error;

      toast({
        title: 'Milvus e Fireflies sincronizados!',
        description: `${data.milvus?.tickets ?? 0} tickets e ${data.fireflies?.reunioes ?? 0} reuniões importados.`,
      });

      // Sync Azure DevOps — independente do resultado anterior
      if (azureProject) {
        try {
          await supabase.functions.invoke('report-sync-azuredevops', {
            body: { reportId, azureProject, azureTags: azureTags ?? [], month, year },
          });
          console.log('[AzureDevOps] Sync concluído');
        } catch (e) {
          console.warn('[AzureDevOps] Sync falhou:', e);
        }
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao sincronizar', description: message, variant: 'destructive' });
      // Tentar Azure mesmo se Milvus falhou
      if (azureProject) {
        try {
          await supabase.functions.invoke('report-sync-azuredevops', {
            body: { reportId, azureProject, azureTags: azureTags ?? [], month, year },
          });
        } catch (e) {
          console.warn('[AzureDevOps] Sync falhou:', e);
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  return { syncDevid, syncing };
}
