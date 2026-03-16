import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentAttachment } from '@/types';
import { getBlob } from '@/lib/indexedDBStorage';
import AttachmentUploadDialog from './AttachmentUploadDialog';
import AttachmentConfigDialog from './AttachmentConfigDialog';
import PDFViewerDialog from './PDFViewerDialog';
import {
  Paperclip, Plus, Settings2, Search, MoreVertical, Eye, Download,
  Printer, Mail, Share2, Trash2, FileText, CloudUpload, AlertTriangle, CheckCircle2, Clock, FileX,
} from 'lucide-react';

interface ContractDocumentsTabProps {
  contractId: string;
  contractCode?: string;
}

/* ── Migration Banner Component ─────────────────────────────────────────── */
function MigrationBanner({
  legacyCount,
  migrating,
  progress,
  migratedCount,
  failedCount,
  onStart,
}: {
  legacyCount: number;
  migrating: boolean;
  progress: number;
  migratedCount: number;
  failedCount: number;
  onStart: () => void;
}) {
  if (legacyCount === 0) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <CloudUpload className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">
        {migrating ? 'Migrando documentos...' : 'Documentos no armazenamento local'}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        {!migrating && (
          <>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {legacyCount} documento(s) estão salvos apenas neste navegador.
              Migre para a nuvem para acessá-los de qualquer lugar.
            </p>
            <Button size="sm" onClick={onStart} className="gap-2 mt-1">
              <CloudUpload className="w-4 h-4" /> Migrar para a nuvem
            </Button>
          </>
        )}
        {migrating && (
          <>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {migratedCount} migrado(s){failedCount > 0 ? `, ${failedCount} não encontrado(s)` : ''}
            </p>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function ContractDocumentsTab({ contractId, contractCode }: ContractDocumentsTabProps) {
  const { getAttachmentsByContract, deleteAttachment, updateAttachment, getContract } = useData();
  const { canEdit, user } = useAuth();
  const { toast } = useToast();
  const contract = getContract(contractId);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterExt, setFilterExt] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ storageKey: string; fileName: string } | null>(null);
  const [officeDialog, setOfficeDialog] = useState<DocumentAttachment | null>(null);

  // Migration state
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migratedCount, setMigratedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [unavailableKeys, setUnavailableKeys] = useState<Set<string>>(new Set());

  const allAttachments = getAttachmentsByContract(contractId);

  const isLegacy = (a: DocumentAttachment) => a.storageKey.startsWith('att-');
  const isMock = (a: DocumentAttachment) => a.storageKey.startsWith('mock-');
  const legacyAttachments = allAttachments.filter(isLegacy);

  // Extraction status tracking
  const [extractionStatuses, setExtractionStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchExtractionStatuses = async () => {
      if (allAttachments.length === 0) return;
      const ids = allAttachments.map(a => a.id);
      const { data } = await supabase
        .from('doc_text_extractions')
        .select('document_id, status')
        .in('document_id', ids);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { map[d.document_id] = d.status; });
        setExtractionStatuses(map);
      }
    };
    fetchExtractionStatuses();
  }, [allAttachments.length]);

  // Trigger extraction after upload dialog closes
  const handleUploadClose = async (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      // Find new attachments without extraction and trigger
      const freshAttachments = getAttachmentsByContract(contractId);
      for (const att of freshAttachments) {
        if (!extractionStatuses[att.id] && !isLegacy(att) && !isMock(att)) {
          try {
            await supabase.functions.invoke('doc-extract', { body: { document_id: att.id } });
            setExtractionStatuses(prev => ({ ...prev, [att.id]: 'processing' }));
          } catch { /* ignore */ }
        }
      }
    }
  };

  const getExtractionBadge = (attId: string) => {
    const status = extractionStatuses[attId];
    if (!status) return null;
    if (status === 'done') return <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600 dark:text-green-400 gap-1"><CheckCircle2 className="w-3 h-3" />Indexado</Badge>;
    if (status === 'processing' || status === 'queued') return <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400 gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
    if (status === 'no_text') return <Badge variant="outline" className="text-[10px] border-muted-foreground/50 text-muted-foreground gap-1"><FileX className="w-3 h-3" />Sem texto</Badge>;
    return null;
  };

  // Filters
  let filtered = allAttachments;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(a => a.fileName.toLowerCase().includes(q) || a.descriptionType.toLowerCase().includes(q) || a.descriptionText?.toLowerCase().includes(q));
  }
  if (filterType) filtered = filtered.filter(a => a.descriptionType === filterType);
  if (filterExt) filtered = filtered.filter(a => a.fileExtension === filterExt);
  filtered = [...filtered].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const types = [...new Set(allAttachments.map(a => a.descriptionType))];
  const extensions = [...new Set(allAttachments.map(a => a.fileExtension.toUpperCase()))];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getSignedUrl = async (storageKey: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(storageKey, 300);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  /* ── Migration Logic ────────────────────────────────────────────────── */
  const handleMigration = useCallback(async () => {
    if (legacyAttachments.length === 0) return;
    setMigrating(true);
    setMigrationProgress(0);
    setMigratedCount(0);
    setFailedCount(0);

    let migrated = 0;
    let failed = 0;
    const newUnavailable = new Set<string>();

    for (let i = 0; i < legacyAttachments.length; i++) {
      const att = legacyAttachments[i];
      try {
        const blob = await getBlob(att.storageKey);
        if (!blob) {
          failed++;
          newUnavailable.add(att.storageKey);
        } else {
          const newKey = `${contractId}/${crypto.randomUUID()}.${att.fileExtension}`;
          const { error: uploadError } = await supabase.storage
            .from('contract-documents')
            .upload(newKey, blob, { contentType: att.fileTypeMime, upsert: false });
          if (uploadError) {
            failed++;
            newUnavailable.add(att.storageKey);
          } else {
            await updateAttachment(att.id, { storageKey: newKey });
            migrated++;
          }
        }
      } catch {
        failed++;
        newUnavailable.add(att.storageKey);
      }
      setMigrationProgress(Math.round(((i + 1) / legacyAttachments.length) * 100));
      setMigratedCount(migrated);
      setFailedCount(failed);
    }

    setUnavailableKeys(prev => new Set([...prev, ...newUnavailable]));
    setMigrating(false);

    if (migrated > 0) {
      toast({ title: `${migrated} documento(s) migrado(s) com sucesso!` });
    }
    if (failed > 0) {
      toast({
        title: `${failed} documento(s) não encontrado(s)`,
        description: 'Esses arquivos não estão disponíveis neste navegador e precisarão ser re-anexados.',
        variant: 'destructive',
      });
    }
  }, [legacyAttachments, contractId, updateAttachment, toast]);

  /* ── File Actions ───────────────────────────────────────────────────── */
  const isFileUnavailable = (a: DocumentAttachment) =>
    isMock(a) || (isLegacy(a) && unavailableKeys.has(a.storageKey)) || isLegacy(a);

  const handleView = async (a: DocumentAttachment) => {
    if (isMock(a) || isLegacy(a)) {
      const msg = isLegacy(a)
        ? 'Este documento precisa ser migrado para a nuvem antes de ser visualizado. Use o botão "Migrar para a nuvem" acima.'
        : 'Este é um documento de demonstração sem arquivo real.';
      toast({ title: 'Arquivo não disponível', description: msg, variant: 'destructive' });
      return;
    }
    if (a.fileExtension === 'pdf') {
      setPdfViewer({ storageKey: a.storageKey, fileName: a.fileName });
    } else {
      setOfficeDialog(a);
    }
  };

  const handleDownload = async (a: DocumentAttachment) => {
    if (isMock(a) || isLegacy(a)) {
      const msg = isLegacy(a)
        ? 'Este documento precisa ser migrado para a nuvem antes de ser baixado.'
        : 'Este é um documento de demonstração sem arquivo real.';
      toast({ title: 'Arquivo não disponível', description: msg, variant: 'destructive' });
      return;
    }
    const url = await getSignedUrl(a.storageKey);
    if (!url) {
      toast({ title: 'Arquivo não disponível', description: 'Não foi possível gerar o link de download.', variant: 'destructive' });
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = a.fileName;
    link.target = '_blank';
    link.click();
    toast({ title: 'Download iniciado' });
  };

  const handlePrint = async (a: DocumentAttachment) => {
    if (a.fileExtension !== 'pdf') {
      toast({ title: 'Impressão disponível apenas para PDF nesta etapa' });
      return;
    }
    if (isMock(a) || isLegacy(a)) {
      toast({ title: 'Arquivo não disponível', variant: 'destructive' });
      return;
    }
    const url = await getSignedUrl(a.storageKey);
    if (!url) { toast({ title: 'Arquivo não disponível', variant: 'destructive' }); return; }
    const w = window.open(url, '_blank');
    if (w) w.addEventListener('load', () => w.print());
  };

  const handleEmail = (a: DocumentAttachment) => {
    const code = contract?.codigo || contractId;
    const subject = encodeURIComponent(`[ContratoVivo] Documento do contrato ${code}`);
    const body = encodeURIComponent(`Contrato: ${code}\nDocumento: ${a.fileName}\nTipo: ${a.descriptionType}\n\nAnexo deve ser incluído manualmente.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    toast({ title: 'Rascunho de e-mail aberto', description: 'Anexe o arquivo manualmente.' });
  };

  const handleShare = async (a: DocumentAttachment) => {
    const code = contract?.codigo || contractId;
    const text = `Contrato ${code} — Documento: ${a.fileName}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Documento - ${code}`, text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado para a área de transferência' });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAttachment(deleteId);
      toast({ title: 'Documento excluído' });
      setDeleteId(null);
    }
  };

  const isReader = user?.role === 'leitor';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Documentos do contrato</h3>
        <p className="text-sm text-muted-foreground">Anexe e organize arquivos do contrato: contrato, aditivos, reajustes, notificações e outros.</p>
      </div>

      {/* Migration Banner */}
      <MigrationBanner
        legacyCount={legacyAttachments.length}
        migrating={migrating}
        progress={migrationProgress}
        migratedCount={migratedCount}
        failedCount={failedCount}
        onStart={handleMigration}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Anexar documento
          </Button>
        )}
        {user?.role === 'c-level' && (
          <Button variant="outline" onClick={() => setConfigOpen(true)} className="gap-2">
            <Settings2 className="w-4 h-4" /> Gerenciar tipos
          </Button>
        )}
      </div>

      {/* Filters */}
      {allAttachments.length > 0 && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <Badge key={t} variant={filterType === t ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilterType(filterType === t ? null : t)}>
                {t}
              </Badge>
            ))}
            {extensions.map(e => (
              <Badge key={e} variant={filterExt === e.toLowerCase() ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setFilterExt(filterExt === e.toLowerCase() ? null : e.toLowerCase())}>
                .{e}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Table or Empty State */}
      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="hidden md:table-cell">Tamanho</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="w-12">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => {
                  const legacy = isLegacy(a);
                  return (
                    <TableRow key={a.id} className={legacy ? 'opacity-70' : ''}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{a.descriptionType}</Badge>
                        {a.descriptionText && <span className="block text-xs text-muted-foreground mt-0.5">{a.descriptionText}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {legacy ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-sm truncate max-w-48">{a.fileName}</span>
                          {legacy && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 ml-1">
                              local
                            </Badge>
                          )}
                          {!legacy && !isMock(a) && getExtractionBadge(a.id)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatSize(a.fileSizeBytes)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(a.uploadedAt)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(a)}>
                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(a)}>
                                <Download className="w-4 h-4 mr-2" /> Baixar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(a)}>
                                <Printer className="w-4 h-4 mr-2" /> Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEmail(a)}>
                                <Mail className="w-4 h-4 mr-2" /> Enviar por e-mail
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(a)}>
                                <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => setDeleteId(a.id)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Paperclip className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum documento anexado</h3>
            <p className="text-muted-foreground mb-4">Anexe o contrato, aditivos e documentos relevantes para manter o histórico completo.</p>
            {canEdit && (
              <Button onClick={() => setUploadOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Anexar documento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AttachmentUploadDialog open={uploadOpen} onOpenChange={handleUploadClose} contractId={contractId} />
      <AttachmentConfigDialog open={configOpen} onOpenChange={setConfigOpen} />

      {pdfViewer && (
        <PDFViewerDialog
          open={!!pdfViewer}
          onOpenChange={() => setPdfViewer(null)}
          storageKey={pdfViewer.storageKey}
          fileName={pdfViewer.fileName}
        />
      )}

      <Dialog open={!!officeDialog} onOpenChange={() => setOfficeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pré-visualização não disponível</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A pré-visualização está disponível apenas para arquivos PDF nesta etapa. Você pode baixar o arquivo para visualizá-lo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfficeDialog(null)}>Fechar</Button>
            <Button onClick={() => { if (officeDialog) handleDownload(officeDialog); setOfficeDialog(null); }} className="gap-2">
              <Download className="w-4 h-4" /> Baixar arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o arquivo do armazenamento. Essa operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
