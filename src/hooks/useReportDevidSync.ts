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

      // O Fireflies deixou de ser sincronizado aqui (passou a ter um único dono,
      // a função report-sync-fireflies). Este toast agora reporta só o Milvus.
      const avisos: string[] = [...(data?.milvus_avisos ?? []), ...(data?.milvus_erros ?? [])];
      toast({
        title: avisos.length > 0 ? 'Milvus sincronizado com ressalvas' : 'Milvus sincronizado!',
        description: `${data?.milvus?.tickets ?? 0} chamado(s) importado(s).${avisos.length > 0 ? ` ${avisos.slice(0, 2).join(' · ')}` : ''}`,
        variant: avisos.length > 0 ? 'destructive' : undefined,
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
