import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, X } from 'lucide-react';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z'];
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

interface AttachmentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export default function AttachmentUploadDialog({ open, onOpenChange, contractId }: AttachmentUploadDialogProps) {
  const { addAttachment, getActiveDescriptionConfigs, addHistoryEvent } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [descriptionType, setDescriptionType] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [createHistoryEvent, setCreateHistoryEvent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const configs = getActiveDescriptionConfigs();

  const isOutroSelected = descriptionType === 'Outros';

  const validateFile = (f: File): string | null => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Tipo de arquivo não permitido (.${ext}). Tipos aceitos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, 7Z.`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande (${(f.size / 1024 / 1024).toFixed(1)}MB). Tamanho máximo: 15MB.`;
    }
    // Allow if extension is valid even if MIME is generic
    if (!ALLOWED_MIMES.includes(f.type) && f.type !== '' && f.type !== 'application/octet-stream') {
      // Still allow if extension matches
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return 'Tipo MIME do arquivo não reconhecido.';
      }
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      toast({ title: 'Arquivo inválido', description: error, variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!descriptionType || !file) return;
    if (isOutroSelected && !descriptionText.trim()) return;

    setSaving(true);
    try {
      const storageKey = `att-${crypto.randomUUID()}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      await saveBlob(storageKey, file);

      const attachment = addAttachment({
        contractId,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileTypeMime: file.type || 'application/octet-stream',
        fileExtension: ext,
        descriptionType,
        descriptionText: isOutroSelected ? descriptionText : undefined,
        notes: notes || undefined,
        uploadedAt: new Date().toISOString(),
        storageKey,
      });

      if (createHistoryEvent) {
        addHistoryEvent({
          contractId,
          eventDate: new Date().toISOString().split('T')[0],
          eventType: 'outro',
          title: `Documento anexado: ${descriptionType}`,
          description: `Arquivo: ${file.name}`,
          impactArea: 'operacional',
          severity: 'info',
        });
      }

      toast({ title: 'Documento anexado com sucesso' });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar o arquivo no armazenamento local.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDescriptionType('');
    setDescriptionText('');
    setNotes('');
    setFile(null);
    setCreateHistoryEvent(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSave = descriptionType && file && (!isOutroSelected || descriptionText.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anexar documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo/Descrição do documento *</Label>
            <Select value={descriptionType} onValueChange={setDescriptionType}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {configs.map(c => (
                  <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOutroSelected && (
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={descriptionText} onChange={e => setDescriptionText(e.target.value)} placeholder="Descreva o tipo de documento" maxLength={120} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Arquivo *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-2" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Arraste um arquivo ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, 7Z — até 15MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-history"
              checked={createHistoryEvent}
              onCheckedChange={(v) => setCreateHistoryEvent(v === true)}
            />
            <Label htmlFor="create-history" className="text-sm font-normal cursor-pointer">
              Criar evento no histórico
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Salvando...' : 'Anexar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
