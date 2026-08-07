import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileWarning, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useReportExternalFiles, ReportExternalFile } from '@/hooks/useReportExternalFiles';

interface Props {
  reportId: string;
  canManage: boolean;   // pode importar
  canRevert: boolean;   // pode remover (reverter)
  onChanged?: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportExternalImport({ reportId, canManage, canRevert, onChanged }: Props) {
  const { files, isImported, upload, getDownloadUrl, removeAll } = useReportExternalFiles(reportId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await upload(file);
      toast.success('Relatório importado');
      onChanged?.();
    } catch (e) {
      toast.error('Erro ao importar', { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (f: ReportExternalFile) => {
    const url = await getDownloadUrl(f);
    if (url) window.open(url, '_blank');
    else toast.error('Não foi possível gerar o link');
  };

  const handleRevert = async () => {
    try {
      await removeAll();
      toast.success('Importação removida — o relatório voltou ao modo normal');
      onChanged?.();
    } catch (e) {
      toast.error('Erro ao remover', { description: (e as Error).message });
    } finally {
      setConfirmRevert(false);
    }
  };

  // Estado NÃO importado: só o botão de importar (discreto).
  if (!isImported) {
    if (!canManage) return null;
    return (
      <>
        <input ref={inputRef} type="file" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <Button variant="outline" size="sm" className="gap-1.5"
          disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="w-4 h-4" /> {uploading ? 'Importando...' : 'Importar relatório'}
        </Button>
      </>
    );
  }

  // Estado IMPORTADO: aviso + versões + ações.
  return (
    <Card className="border-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-amber-600" />
          Relatório importado de fonte externa
          <Badge variant="outline" className="border-amber-400 text-amber-600">
            v{files[0]?.version}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Este mês usa um arquivo enviado manualmente. As seções automáticas e a sincronização
          ficam desativadas aqui. Para voltar ao relatório normal, remova a importação.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {canManage && (
            <Button variant="outline" size="sm" className="gap-1.5"
              disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Enviar nova versão'}
            </Button>
          )}
          {canRevert && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive"
              onClick={() => setConfirmRevert(true)}>
              <Trash2 className="w-4 h-4" /> Remover importação
            </Button>
          )}
        </div>

        <div className="border-t pt-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
            <History className="w-3.5 h-3.5" /> Versões ({files.length})
          </div>
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="shrink-0">v{f.version}</Badge>
                <span className="truncate">{f.fileName}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.fileSize)}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 gap-1 shrink-0" onClick={() => handleDownload(f)}>
                <Download className="w-3.5 h-3.5" /> Baixar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <ConfirmDeleteDialog
        open={confirmRevert}
        onOpenChange={setConfirmRevert}
        onConfirm={handleRevert}
        title="Remover importação"
        description="Isto remove TODAS as versões do arquivo importado e devolve o relatório ao modo normal (seções e sincronização voltam a funcionar). Deseja continuar?"
      />
    </Card>
  );
}
