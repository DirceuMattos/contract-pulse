import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getBlob } from '@/lib/indexedDBStorage';
import { useToast } from '@/hooks/use-toast';
import { Download, Printer, X } from 'lucide-react';

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageKey: string;
  fileName: string;
}

export default function PDFViewerDialog({ open, onOpenChange, storageKey, fileName }: PDFViewerDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
      setLoading(true);
      setError(false);
      return;
    }

    const loadBlob = async () => {
      setLoading(true);
      const blob = await getBlob(storageKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      } else {
        setError(true);
        toast({ title: 'Arquivo não disponível', description: 'O arquivo não foi encontrado no armazenamento local.', variant: 'destructive' });
      }
      setLoading(false);
    };

    loadBlob();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, storageKey]);

  const handlePrint = () => {
    if (!objectUrl) return;
    const printWindow = window.open(objectUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    toast({ title: 'Download iniciado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base truncate pr-4">{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!objectUrl}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!objectUrl}>
                <Download className="w-4 h-4 mr-1" /> Baixar
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {loading ? (
            <Skeleton className="w-full h-full rounded-lg" />
          ) : error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Arquivo não disponível no armazenamento local.</p>
            </div>
          ) : objectUrl ? (
            <iframe src={objectUrl} className="w-full h-full rounded-lg border" title={fileName} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
