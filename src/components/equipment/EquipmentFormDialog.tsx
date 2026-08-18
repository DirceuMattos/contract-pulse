/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  EquipmentItem, EquipmentSupplier, EQUIPMENT_TYPES, TYPE_LABELS, EquipmentType,
  EquipmentOwnership,
} from '@/types/equipment';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  item: EquipmentItem | null;
  suppliers: EquipmentSupplier[];
  canViewValues: boolean;
  onSave: (payload: Partial<EquipmentItem>) => Promise<void>;
}

const EMPTY: Partial<EquipmentItem> = {
  serial_number: '', asset_tag: '', hostname: '', equipment_type: 'notebook',
  manufacturer: '', model: '', cpu_model: '', ram_gb: null, storage_gb: null,
  storage_type: '', ownership: 'proprio', supplier_id: null,
  purchase_date: null, purchase_value: null, invoice_number: null,
  rental_monthly_value: null, rental_start: null, rental_end: null,
  warranty_end: null, location: '', notes: '',
};

export function EquipmentFormDialog({ open, onClose, item, suppliers, canViewValues, onSave }: Props) {
  const [form, setForm] = useState<Partial<EquipmentItem>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(item ? { ...item } : { ...EMPTY });
  }, [open, item]);

  function set<K extends keyof EquipmentItem>(key: K, value: EquipmentItem[K] | null) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function num(v: string): number | null {
    if (v === '' || v === null) return null;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (!form.equipment_type) { toast.error('Informe o tipo do equipamento'); return; }
    setSaving(true);
    try {
      const payload: Partial<EquipmentItem> = {
        ...form,
        serial_number: form.serial_number?.trim() || null,
        asset_tag: form.asset_tag?.trim() || null,
        hostname: form.hostname?.trim() || null,
        supplier_id: form.supplier_id || null,
      };
      await onSave(payload);
      toast.success(item ? 'Equipamento atualizado' : 'Equipamento cadastrado');
      onClose();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('equipment_items_serial_unique')) {
        toast.error('Já existe equipamento com este número de série');
      } else if (msg.includes('equipment_items_asset_tag_unique')) {
        toast.error('Já existe equipamento com este número de patrimônio');
      } else {
        toast.error('Erro ao salvar: ' + msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const locado = form.ownership === 'locado';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
          <DialogDescription>
            {item
              ? 'Estado e detentor não se alteram aqui — use "Movimentar", para o histórico ficar registrado.'
              : 'O equipamento nasce em estoque. A cessão é registrada depois, em "Movimentar".'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Identificação</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sn">Número de série (SN)</Label>
                <Input id="sn" value={form.serial_number ?? ''} onChange={(e) => set('serial_number', e.target.value)} placeholder="Ex.: 89684844B" />
                <p className="text-[11px] text-muted-foreground">Identificador do item. Deixe vazio se a etiqueta estiver ilegível.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="host">Hostname</Label>
                <Input id="host" value={form.hostname ?? ''} onChange={(e) => set('hostname', e.target.value)} placeholder="Ex.: BNP-879" />
                <p className="text-[11px] text-muted-foreground">Muda com reinstalação. O histórico fica guardado.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tag">Patrimônio</Label>
                <Input id="tag" value={form.asset_tag ?? ''} onChange={(e) => set('asset_tag', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.equipment_type} onValueChange={(v) => set('equipment_type', v as EquipmentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fab">Fabricante</Label>
                <Input id="fab" value={form.manufacturer ?? ''} onChange={(e) => set('manufacturer', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod">Modelo</Label>
                <Input id="mod" value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuração</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cpu">Processador</Label>
                <Input id="cpu" value={form.cpu_model ?? ''} onChange={(e) => set('cpu_model', e.target.value)} placeholder="Ex.: Intel Core i7-13700H" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ram">Memória (GB)</Label>
                <Input id="ram" type="number" min={1} value={form.ram_gb ?? ''} onChange={(e) => set('ram_gb', num(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disk">Disco (GB)</Label>
                <Input id="disk" type="number" min={1} value={form.storage_gb ?? ''} onChange={(e) => set('storage_gb', num(e.target.value))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propriedade</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={form.ownership} onValueChange={(v) => set('ownership', v as EquipmentOwnership)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprio">Próprio</SelectItem>
                    <SelectItem value="locado">Locado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Fornecedor</Label>
                <Select
                  value={form.supplier_id ?? '__none__'}
                  onValueChange={(v) => set('supplier_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {locado && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Equipamento locado não pode ser vendido, doado, descartado nem transferido ao grupo — a saída dele é a devolução ao fornecedor.</span>
              </div>
            )}

            {canViewValues && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dtc">Data de aquisição</Label>
                  <Input id="dtc" type="date" value={form.purchase_date ?? ''} onChange={(e) => set('purchase_date', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="val">Valor de aquisição</Label>
                  <Input id="val" type="number" step="0.01" min={0} value={form.purchase_value ?? ''} onChange={(e) => set('purchase_value', num(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nf">Nota fiscal</Label>
                  <Input id="nf" value={form.invoice_number ?? ''} onChange={(e) => set('invoice_number', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gar">Fim da garantia</Label>
                  <Input id="gar" type="date" value={form.warranty_end ?? ''} onChange={(e) => set('warranty_end', e.target.value || null)} />
                </div>
              </div>
            )}

            {canViewValues && locado && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mens">Valor mensal da locação</Label>
                  <Input id="mens" type="number" step="0.01" min={0} value={form.rental_monthly_value ?? ''} onChange={(e) => set('rental_monthly_value', num(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ini">Início da locação</Label>
                  <Input id="ini" type="date" value={form.rental_start ?? ''} onChange={(e) => set('rental_start', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fim">Fim da locação</Label>
                  <Input id="fim" type="date" value={form.rental_end ?? ''} onChange={(e) => set('rental_end', e.target.value || null)} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loc">Localização física</Label>
                <Input id="loc" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="Ex.: Sede — sala 2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="obs">Observações</Label>
                <Textarea id="obs" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
