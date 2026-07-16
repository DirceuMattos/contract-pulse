// v1 - módulo Requisição de Vagas: dialog de CRUD
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useJobSkills } from '@/hooks/useJobSkills';
import { toast } from 'sonner';
import type { JobRequest } from '@/hooks/useJobRequests';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: JobRequest | null;
  onSaved: () => void;
}

const SEM_PERFIL = '__sem_perfil__';

export function JobRequestDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { user } = useAuth();
  const { profiles } = useJobSkills();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [perfilId, setPerfilId] = useState<string>(SEM_PERFIL);
  const [nivel, setNivel] = useState('');
  const [anosExp, setAnosExp] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitulo(editing.titulo);
      setDescricao(editing.descricao ?? '');
      setPerfilId(editing.job_skill_profile_id ?? SEM_PERFIL);
      setNivel(editing.nivel ?? '');
      setAnosExp(editing.anos_experiencia?.toString() ?? '');
      setQuantidade(editing.quantidade?.toString() ?? '1');
      setObservacoes(editing.observacoes ?? '');
    } else {
      setTitulo(''); setDescricao(''); setPerfilId(SEM_PERFIL);
      setNivel(''); setAnosExp(''); setQuantidade('1'); setObservacoes('');
    }
  }, [open, editing]);

  // Ao escolher um perfil de skill, pré-preenche campos a partir dele.
  const onPerfilChange = (id: string) => {
    setPerfilId(id);
    if (id === SEM_PERFIL) return;
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    if (!titulo.trim()) setTitulo(p.jobTitleLabel + (p.nivel ? ` (${p.nivel})` : ''));
    if (p.nivel) setNivel(p.nivel);
    if (p.anos_experiencia != null) setAnosExp(String(p.anos_experiencia));
  };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Informe o título da vaga'); return; }
    // vaga sem perfil exige preenchimento manual mínimo
    if (perfilId === SEM_PERFIL && !descricao.trim()) {
      toast.error('Vaga sem perfil de skill exige uma descrição'); return;
    }
    setSaving(true);
    try {
      const perfil = perfilId !== SEM_PERFIL ? profiles.find((x) => x.id === perfilId) : null;
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        job_skill_profile_id: perfil?.id ?? null,
        job_title_id: perfil?.job_title_id ?? null,
        nivel: nivel.trim() || null,
        anos_experiencia: anosExp ? Number(anosExp) : null,
        quantidade: quantidade ? Number(quantidade) : 1,
        observacoes: observacoes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from('job_requests').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('job_requests')
          .insert({ ...payload, status: 'solicitado', solicitante_id: user?.id ?? null });
        if (error) throw error;
      }
      toast.success(editing ? 'Vaga atualizada' : 'Vaga criada');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar vaga' : 'Nova vaga'}</DialogTitle>
          <DialogDescription>
            Escolha um perfil de skill para pré-preencher, ou crie uma vaga avulsa sem cargo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Perfil de skill</Label>
            <Select value={perfilId} onValueChange={onPerfilChange}>
              <SelectTrigger><SelectValue placeholder="Selecione um perfil…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_PERFIL}>Sem perfil (vaga avulsa)</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.jobTitleLabel}{p.nivel ? ` — ${p.nivel}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Título da vaga *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Desenvolvedor Backend Sênior" />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição {perfilId === SEM_PERFIL && <span className="text-destructive">*</span>}</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
              placeholder={perfilId === SEM_PERFIL ? 'Descreva a vaga (obrigatório para vaga sem perfil)' : 'Detalhes adicionais…'} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Input value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Pleno" />
            </div>
            <div className="space-y-1.5">
              <Label>Anos de exp.</Label>
              <Input type="number" value={anosExp} onChange={(e) => setAnosExp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
