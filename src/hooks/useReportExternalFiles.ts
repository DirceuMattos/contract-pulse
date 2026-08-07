import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportExternalFile {
  id: string;
  reportId: string;
  storageKey: string;
  fileName: string;
  fileSize: number | null;
  fileMime: string | null;
  version: number;
  uploadedBy: string | null;
  uploadedAt: string;
}

const BUCKET = 'report-external';

function fromRow(r: Record<string, unknown>): ReportExternalFile {
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    storageKey: r.storage_key as string,
    fileName: r.file_name as string,
    fileSize: (r.file_size as number) ?? null,
    fileMime: (r.file_mime as string) ?? null,
    version: r.version as number,
    uploadedBy: (r.uploaded_by as string) ?? null,
    uploadedAt: r.uploaded_at as string,
  };
}

export function useReportExternalFiles(reportId: string | undefined) {
  const [files, setFiles] = useState<ReportExternalFile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!reportId) { setFiles([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('report_external_files')
        .select('*')
        .eq('report_id', reportId)
        .order('version', { ascending: false });
      setFiles((data ?? []).map(fromRow));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  // Upload de uma nova versão do arquivo externo.
  const upload = useCallback(async (file: File): Promise<void> => {
    if (!reportId) throw new Error('Relatório inválido');
    const nextVersion = files.length > 0 ? Math.max(...files.map(f => f.version)) + 1 : 1;
    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const storageKey = `${reportId}/v${nextVersion}_${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) throw upErr;

    const { data: userData } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from('report_external_files').insert({
      report_id: reportId,
      storage_key: storageKey,
      file_name: file.name,
      file_size: file.size,
      file_mime: file.type || null,
      version: nextVersion,
      uploaded_by: userData?.user?.id ?? null,
    });
    if (insErr) {
      // rollback do arquivo se o insert falhar
      await supabase.storage.from(BUCKET).remove([storageKey]);
      throw insErr;
    }
    await load();
  }, [reportId, files, load]);

  // Baixar um arquivo (URL assinada temporária).
  const getDownloadUrl = useCallback(async (f: ReportExternalFile): Promise<string | null> => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.storageKey, 60 * 5);
    return data?.signedUrl ?? null;
  }, []);

  // Remover UMA versão.
  const removeOne = useCallback(async (f: ReportExternalFile): Promise<void> => {
    await supabase.storage.from(BUCKET).remove([f.storageKey]);
    await supabase.from('report_external_files').delete().eq('id', f.id);
    await load();
  }, [load]);

  // Reverter importação: remove TODAS as versões (card volta ao normal).
  const removeAll = useCallback(async (): Promise<void> => {
    if (!reportId || files.length === 0) return;
    await supabase.storage.from(BUCKET).remove(files.map(f => f.storageKey));
    await supabase.from('report_external_files').delete().eq('report_id', reportId);
    await load();
  }, [reportId, files, load]);

  return {
    files,
    loading,
    isImported: files.length > 0,
    latest: files[0] ?? null,
    upload,
    getDownloadUrl,
    removeOne,
    removeAll,
    reload: load,
  };
}
