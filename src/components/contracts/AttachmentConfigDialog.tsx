import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowUp, ArrowDown } from 'lucide-react';

interface AttachmentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AttachmentConfigDialog({ open, onOpenChange }: AttachmentConfigDialogProps) {
  const { attachmentDescriptionConfigs, addDescriptionConfig, updateDescriptionConfig } = useData();
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState('');

  const sorted = [...attachmentDescriptionConfigs].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const maxOrder = sorted.length > 0 ? Math.max(...sorted.map(c => c.sortOrder)) : 0;
    addDescriptionConfig({ label: newLabel.trim(), isActive: true, sortOrder: maxOrder + 1 });
    setNewLabel('');
    toast({ title: 'Tipo adicionado' });
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const idx = sorted.findIndex(c => c.id === id);
    if (direction === 'up' && idx > 0) {
      const prevOrder = sorted[idx - 1].sortOrder;
      const currOrder = sorted[idx].sortOrder;
      updateDescriptionConfig(sorted[idx].id, { sortOrder: prevOrder });
      updateDescriptionConfig(sorted[idx - 1].id, { sortOrder: currOrder });
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const nextOrder = sorted[idx + 1].sortOrder;
      const currOrder = sorted[idx].sortOrder;
      updateDescriptionConfig(sorted[idx].id, { sortOrder: nextOrder });
      updateDescriptionConfig(sorted[idx + 1].id, { sortOrder: currOrder });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar tipos de documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {sorted.map((config, idx) => (
            <div key={config.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <Switch
                checked={config.isActive}
                onCheckedChange={(v) => updateDescriptionConfig(config.id, { isActive: v })}
              />
              <span className="flex-1 text-sm font-medium">{config.label}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => handleMove(config.id, 'up')}>
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === sorted.length - 1} onClick={() => handleMove(config.id, 'down')}>
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Novo tipo de documento"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button onClick={handleAdd} disabled={!newLabel.trim()} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
