/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MODULE_CATALOG } from '@/types/moduleAccess';
import { toast } from 'sonner';

interface ProfileOption {
  role: string;
  label: string;
}

interface PreviewRow {
  module_key: string;
  current_access: boolean;
  new_access: boolean;
  change: 'ganha_acesso' | 'perde_acesso' | 'altera_acoes' | 'sem_mudanca';
}

interface Props {
  open: boolean;
  onClose: () => void;
  profiles: ProfileOption[];
  onCopied: () => void;
}

const CHANGE_META: Record<PreviewRow['change'], { label: string; className: string }> = {
  ganha_acesso: { label: 'Ganha acesso', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  perde_acesso: { label: 'Perde acesso', className: 'bg-red-500/10 text-red-700 border-red-500/20' },
  altera_acoes: { label: 'Altera ações', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  sem_mudanca: { label: 'Sem mudança', className: 'bg-muted text-muted-foreground border-border' },
};

function moduleLabel(key: string) {
  return MODULE_CATALOG.find((m) => m.key === key)?.label || key;
}

export function CopyPermissionsDialog({ open, onClose, profiles, onCopied }: Props) {
  const [source, setSource] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const changes = useMemo(
    () => (preview || []).filter((r) => r.change !== 'sem_mudanca'),
    [preview],
  );
  const gains = changes.filter((r) => r.change === 'ganha_acesso').length;
  const losses = changes.filter((r) => r.change === 'perde_acesso').length;

  function reset() {
    setSource(''); setTarget(''); setPreview(null);
  }

  async function loadPreview() {
    if (!source || !target) return;
    if (source === target) {
      toast.error('Escolha perfis diferentes');
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await (supabase as any).rpc('preview_copy_role_permissions', {
        _source_role: source,
        _target_role: target,
      });
      if (error) throw error;
      setPreview((data || []) as PreviewRow[]);
    } catch (e: any) {
      toast.error('Erro ao pré-visualizar: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    setApplying(true);
    try {
      const { error } = await (supabase as any).rpc('copy_role_permissions', {
        _source_role: source,
        _target_role: target,
      });
      if (error) throw error;
      toast.success(`Direitos copiados para ${profiles.find((p) => p.role === target)?.label || target}`);
      reset();
      onCopied();
      onClose();
    } catch (e: any) {
      toast.error('Erro ao copiar direitos: ' + (e.message || String(e)));
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Copiar direitos entre perfis</DialogTitle>
          <DialogDescription>
            As permissões do perfil de origem substituem as do destino. Confira a
            pré-visualização antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Copiar de</label>
            <Select value={source} onValueChange={(v) => { setSource(v); setPreview(null); }}>
              <SelectTrigger><SelectValue placeholder="Perfil de origem" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.role} value={p.role}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-4 w-4 mb-3 text-muted-foreground shrink-0" />

          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Para</label>
            <Select value={target} onValueChange={(v) => { setTarget(v); setPreview(null); }}>
              <SelectTrigger><SelectValue placeholder="Perfil de destino" /></SelectTrigger>
              <SelectContent>
                {profiles.filter((p) => p.role !== source).map((p) => (
                  <SelectItem key={p.role} value={p.role}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={loadPreview} disabled={!source || !target || loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pré-visualizar'}
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 text-sm">
              {changes.length === 0 ? (
                <span className="text-muted-foreground">
                  Nenhuma diferença — os perfis já têm os mesmos direitos.
                </span>
              ) : (
                <>
                  <Badge variant="outline" className={CHANGE_META.ganha_acesso.className}>
                    +{gains} ganha{gains === 1 ? '' : 'm'} acesso
                  </Badge>
                  <Badge variant="outline" className={CHANGE_META.perde_acesso.className}>
                    −{losses} perde{losses === 1 ? '' : 'm'} acesso
                  </Badge>
                  <span className="text-muted-foreground">
                    {changes.length} módulo{changes.length === 1 ? '' : 's'} alterado
                    {changes.length === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </div>

            {gains > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <span>
                  Este perfil passará a acessar {gains} módulo{gains === 1 ? '' : 's'} que hoje
                  não enxerga. Confirme se isso é intencional.
                </span>
              </div>
            )}

            {changes.length > 0 && (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs">Módulo</TableHead>
                      <TableHead className="text-xs w-[150px]">Mudança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((r) => (
                      <TableRow key={r.module_key}>
                        <TableCell className="py-2 text-sm">{moduleLabel(r.module_key)}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={CHANGE_META[r.change].className}>
                            {CHANGE_META[r.change].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={apply} disabled={!preview || changes.length === 0 || applying}>
            {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar cópia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
