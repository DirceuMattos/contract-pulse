// v2 - Skills de Vagas: dialog aceita prefillCargo
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import type { ProfileWithMeta, Skill, SkillType } from '@/hooks/useJobSkills';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ProfileWithMeta | null;
  prefillCargo?: string | null;
  allSkills: Skill[];
  onSaved: () => void;
}

export function JobSkillProfileDialog({ open, onOpenChange, editing, prefillCargo, allSkills, onSaved }: Props) {
  const { jobTitles, addJobTitle } = useData();

  const [cargoLabel, setCargoLabel] = useState('');
  const [nivel, setNivel] = useState('');
  const [descricao, setDescricao] = useState('');
  const [atribuicoes, setAtribuicoes] = useState('');
  const [hardDesc, setHardDesc] = useState('');
  const [softDesc, setSoftDesc] = useState('');
  const [anosExp, setAnosExp] = useState('');
  const [idadeMin, setIdadeMin] = useState('');
  const [idadeMax, setIdadeMax] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [newSkillNome, setNewSkillNome] = useState('');
  const [newSkillTipo, setNewSkillTipo] = useState<SkillType>('hard');
  const [saving, setSaving] = useState(false);
  // skills criadas localmente nesta sessão do dialog (ainda não persistidas)
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCargoLabel(editing.jobTitleLabel === '—' ? '' : editing.jobTitleLabel);
      setNivel(editing.nivel ?? '');
      setDescricao(editing.descricao ?? '');
      setAtribuicoes(editing.atribuicoes ?? '');
      setHardDesc(editing.hard_skills_desc ?? '');
      setSoftDesc(editing.soft_skills_desc ?? '');
      setAnosExp(editing.anos_experiencia?.toString() ?? '');
      setIdadeMin(editing.idade_min?.toString() ?? '');
      setIdadeMax(editing.idade_max?.toString() ?? '');
      setIsActive(editing.is_active);
      setSelectedSkillIds(new Set((editing.skills ?? []).map((s) => s.id)));
    } else {
      setCargoLabel(prefillCargo ?? ''); setNivel(''); setDescricao(''); setAtribuicoes('');
      setHardDesc(''); setSoftDesc(''); setAnosExp(''); setIdadeMin(''); setIdadeMax('');
      setIsActive(true); setSelectedSkillIds(new Set());
    }
    setLocalSkills([]); setNewSkillNome(''); setNewSkillTipo('hard');
  }, [open, editing, prefillCargo]);

  const skillsPool = [...allSkills, ...localSkills];
  const hardSkills = skillsPool.filter((s) => s.tipo === 'hard');
  const softSkills = skillsPool.filter((s) => s.tipo === 'soft');

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addLocalSkill = () => {
    const nome = newSkillNome.trim();
    if (!nome) return;
    // evita duplicar (mesmo nome+tipo já existente)
    const existing = skillsPool.find((s) => s.nome.toLowerCase() === nome.toLowerCase() && s.tipo === newSkillTipo);
    if (existing) {
      toggleSkill(existing.id);
      setNewSkillNome('');
      return;
    }
    const tempId = `new:${Date.now()}`;
    const skill: Skill = { id: tempId, nome, tipo: newSkillTipo, origem: 'manual', descricao: null };
    setLocalSkills((prev) => [...prev, skill]);
    setSelectedSkillIds((prev) => new Set(prev).add(tempId));
    setNewSkillNome('');
  };

  const handleSave = async () => {
    if (!cargoLabel.trim()) { toast.error('Informe o cargo/função'); return; }
    setSaving(true);
    try {
      // 1. Resolve o cargo: usa existente (case-insensitive) ou cria novo em job_titles.
      let jobTitleId: string;
      const existingCargo = jobTitles.find((jt) => jt.label.trim().toLowerCase() === cargoLabel.trim().toLowerCase());
      if (existingCargo) {
        jobTitleId = existingCargo.id;
      } else {
        const created = await addJobTitle(cargoLabel.trim());
        jobTitleId = created.id;
      }

      // 2. Persiste as skills criadas localmente e resolve os ids finais.
      const finalSkillIds: string[] = [];
      for (const id of selectedSkillIds) {
        if (id.startsWith('new:')) {
          const local = localSkills.find((s) => s.id === id);
          if (!local) continue;
          const { data, error } = await supabase
            .from('skills')
            .insert({ nome: local.nome, tipo: local.tipo, origem: 'manual' })
            .select('id')
            .single();
          if (error) {
            // pode já existir (unique nome+tipo) — busca o existente
            const { data: found } = await supabase
              .from('skills').select('id').eq('nome', local.nome).eq('tipo', local.tipo).single();
            if (found) finalSkillIds.push(found.id);
          } else if (data) {
            finalSkillIds.push(data.id);
          }
        } else {
          finalSkillIds.push(id);
        }
      }

      // 3. Salva/atualiza o perfil.
      const profilePayload = {
        job_title_id: jobTitleId,
        nivel: nivel.trim() || null,
        descricao: descricao.trim() || null,
        atribuicoes: atribuicoes.trim() || null,
        hard_skills_desc: hardDesc.trim() || null,
        soft_skills_desc: softDesc.trim() || null,
        anos_experiencia: anosExp ? Number(anosExp) : null,
        idade_min: idadeMin ? Number(idadeMin) : null,
        idade_max: idadeMax ? Number(idadeMax) : null,
        is_active: isActive,
      };

      let profileId: string;
      if (editing) {
        const { error } = await supabase.from('job_skill_profiles').update(profilePayload).eq('id', editing.id);
        if (error) throw error;
        profileId = editing.id;
      } else {
        const { data, error } = await supabase.from('job_skill_profiles').insert(profilePayload).select('id').single();
        if (error) throw error;
        profileId = data.id;
      }

      // 4. Reconcilia as associações perfil↔skill (apaga e reinsere — simples e seguro).
      await supabase.from('job_skill_profile_skills').delete().eq('job_skill_profile_id', profileId);
      if (finalSkillIds.length > 0) {
        const rows = finalSkillIds.map((sid) => ({ job_skill_profile_id: profileId, skill_id: sid, obrigatoria: true }));
        const { error } = await supabase.from('job_skill_profile_skills').insert(rows);
        if (error) throw error;
      }

      toast.success(editing ? 'Perfil atualizado' : 'Perfil criado');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const SkillGroup = ({ label, list, color }: { label: string; list: Skill[]; color: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {list.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma skill deste tipo ainda</span> :
          list.map((s) => {
            const sel = selectedSkillIds.has(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggleSkill(s.id)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${sel ? color + ' font-medium' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {s.nome}
              </button>
            );
          })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar perfil de skill' : 'Novo perfil de skill'}</DialogTitle>
          <DialogDescription>
            Cargos inexistentes são criados automaticamente no cadastro de cargos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo / função *</Label>
              <Input list="cargos-list" value={cargoLabel} onChange={(e) => setCargoLabel(e.target.value)} placeholder="Ex.: Desenvolvedor Backend" />
              <datalist id="cargos-list">
                {jobTitles.map((jt) => <option key={jt.id} value={jt.label} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Input value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Ex.: Júnior, Pleno, Sênior" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Atribuições</Label>
            <Textarea value={atribuicoes} onChange={(e) => setAtribuicoes(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Anos de experiência</Label>
              <Input type="number" value={anosExp} onChange={(e) => setAnosExp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Idade mín.</Label>
              <Input type="number" value={idadeMin} onChange={(e) => setIdadeMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Idade máx.</Label>
              <Input type="number" value={idadeMax} onChange={(e) => setIdadeMax(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <SkillGroup label="Hard skills (tags)" list={hardSkills} color="border-blue-400 text-blue-600 bg-blue-50" />
            <SkillGroup label="Soft skills (tags)" list={softSkills} color="border-emerald-400 text-emerald-600 bg-emerald-50" />
            <div className="flex items-end gap-2 pt-1">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Adicionar nova skill</Label>
                <Input value={newSkillNome} onChange={(e) => setNewSkillNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocalSkill(); } }}
                  placeholder="Nome da skill" />
              </div>
              <select value={newSkillTipo} onChange={(e) => setNewSkillTipo(e.target.value as SkillType)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="hard">Hard</option>
                <option value="soft">Soft</option>
              </select>
              <Button type="button" variant="outline" onClick={addLocalSkill}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descritor livre — hard skills</Label>
              <Textarea value={hardDesc} onChange={(e) => setHardDesc(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descritor livre — soft skills</Label>
              <Textarea value={softDesc} onChange={(e) => setSoftDesc(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="ativo" />
            <Label htmlFor="ativo">Perfil ativo</Label>
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
