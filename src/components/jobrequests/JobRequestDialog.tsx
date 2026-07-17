// v2 - vaga: skills selecionaveis + historico de status
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useJobSkills, type Skill } from '@/hooks/useJobSkills';
import { SkillSelector } from '@/components/jobskills/SkillSelector';
import { JobRequestHistory } from '@/components/jobrequests/JobRequestHistory';
import { toast } from 'sonner';
import type { JobRequest } from '@/hooks/useJobRequests';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { resolveSkillIds } from '@/lib/jobSkillResolver';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: JobRequest | null;
  onSaved: () => void;
}

const SEM_PERFIL = '__sem_perfil__';
const SEM_MODALIDADE = '__sem_modalidade__';

export function JobRequestDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { user } = useAuth();
  const { profiles, skills: allSkills } = useJobSkills();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [perfilId, setPerfilId] = useState<string>(SEM_PERFIL);
  const [nivel, setNivel] = useState('');
  const [anosExp, setAnosExp] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [modalidadeTrabalho, setModalidadeTrabalho] = useState<string>(SEM_MODALIDADE);
  const [presencaClienteRequerida, setPresencaClienteRequerida] = useState(false);
  const [diasPresencaCliente, setDiasPresencaCliente] = useState('');
  const [viagensRequeridas, setViagensRequeridas] = useState(false);
  const [beneficios, setBeneficios] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);
  const [saving, setSaving] = useState(false);
  const profileOptions = useMemo(
    () => [
      { value: SEM_PERFIL, label: 'Sem perfil (vaga avulsa)' },
      ...profiles.map((p) => ({
        value: p.id,
        label: `${p.jobTitleLabel}${p.nivel ? ` — ${p.nivel}` : ''}`,
        searchText: `${p.jobTitleLabel} ${p.nivel ?? ''}`,
      })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })),
    ],
    [profiles],
  );

  const toggleSkill = (id: string) => setSelectedSkillIds((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const addLocal = (s: Skill) => { setLocalSkills((p) => [...p, s]); setSelectedSkillIds((p) => new Set(p).add(s.id)); };

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitulo(editing.titulo);
      setDescricao(editing.descricao ?? '');
      setPerfilId(editing.job_skill_profile_id ?? SEM_PERFIL);
      setNivel(editing.nivel ?? '');
      setAnosExp(editing.anos_experiencia?.toString() ?? '');
      setQuantidade(editing.quantidade?.toString() ?? '1');
      setModalidadeTrabalho(editing.modalidade_trabalho ?? SEM_MODALIDADE);
      setPresencaClienteRequerida(Boolean(editing.presenca_cliente_requerida));
      setDiasPresencaCliente(editing.dias_presenca_cliente ?? '');
      setViagensRequeridas(Boolean(editing.viagens_requeridas));
      setBeneficios(editing.beneficios ?? '');
      setObservacoes(editing.observacoes ?? '');
      const av = Array.isArray(editing.skills_avulsas)
        ? editing.skills_avulsas as Array<{ id?: unknown }>
        : [];
      setSelectedSkillIds(new Set(av.map((s) => s.id).filter((id): id is string => typeof id === 'string')));
    } else {
      setTitulo(''); setDescricao(''); setPerfilId(SEM_PERFIL);
      setNivel(''); setAnosExp(''); setQuantidade('1');
      setModalidadeTrabalho(SEM_MODALIDADE);
      setPresencaClienteRequerida(false);
      setDiasPresencaCliente('');
      setViagensRequeridas(false);
      setBeneficios('');
      setObservacoes('');
      setSelectedSkillIds(new Set());
    }
    setLocalSkills([]);
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
    // herda as skills do perfil para a vaga
    setSelectedSkillIds(new Set((p.skills ?? []).map((s) => s.id)));
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
      // Resolve ids (persiste skills novas) e monta o snapshot para skills_avulsas.
      const finalIds = await resolveSkillIds(supabase, selectedSkillIds, localSkills);
      const pool = [...allSkills, ...localSkills];
      const skillsSnapshot = finalIds.length > 0
        ? finalIds.map((id) => {
            const found = pool.find((s) => s.id === id) ?? localSkills.find((s) => s.nome && s.id === id);
            return found ? { id, nome: found.nome, tipo: found.tipo } : { id };
          })
        : null;
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        job_skill_profile_id: perfil?.id ?? null,
        job_title_id: perfil?.job_title_id ?? null,
        skills_avulsas: skillsSnapshot,
        nivel: nivel.trim() || null,
        anos_experiencia: anosExp ? Number(anosExp) : null,
        quantidade: quantidade ? Number(quantidade) : 1,
        modalidade_trabalho: modalidadeTrabalho === SEM_MODALIDADE ? null : modalidadeTrabalho,
        presenca_cliente_requerida: presencaClienteRequerida,
        dias_presenca_cliente: presencaClienteRequerida ? (diasPresencaCliente.trim() || null) : null,
        viagens_requeridas: viagensRequeridas,
        beneficios: beneficios.trim() || null,
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
            <SearchableSelect
              value={perfilId}
              onValueChange={onPerfilChange}
              options={profileOptions}
              placeholder="Selecione um perfil..."
              searchPlaceholder="Buscar perfil ou nível..."
            />
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

          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-xs text-muted-foreground">Condições de trabalho</Label>

            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select value={modalidadeTrabalho} onValueChange={setModalidadeTrabalho}>
                <SelectTrigger><SelectValue placeholder="Selecione a modalidade…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_MODALIDADE}>Não informado</SelectItem>
                  <SelectItem value="remoto">Home office</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="hibrido">Híbrida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="space-y-0.5">
                <Label>Dias presenciais no cliente</Label>
                <p className="text-xs text-muted-foreground">Informe se a vaga exige presença recorrente no cliente.</p>
              </div>
              <Switch checked={presencaClienteRequerida} onCheckedChange={setPresencaClienteRequerida} />
            </div>

            {presencaClienteRequerida && (
              <div className="space-y-1.5">
                <Label>Dias da semana no cliente</Label>
                <Input
                  value={diasPresencaCliente}
                  onChange={(e) => setDiasPresencaCliente(e.target.value)}
                  placeholder="Ex.: segunda e quarta, ou 3 dias a combinar"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="space-y-0.5">
                <Label>Exige viagens</Label>
                <p className="text-xs text-muted-foreground">Marque quando a posição exigir deslocamentos do candidato.</p>
              </div>
              <Switch checked={viagensRequeridas} onCheckedChange={setViagensRequeridas} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Skills da vaga</Label>
            <SkillSelector
              allSkills={allSkills}
              localSkills={localSkills}
              selectedIds={selectedSkillIds}
              onToggle={toggleSkill}
              onAddLocal={addLocal}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Benefícios</Label>
            <Textarea
              value={beneficios}
              onChange={(e) => setBeneficios(e.target.value)}
              rows={2}
              placeholder="Ex.: vale refeição, plano de saúde, auxílio home office, bônus..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>

          {editing && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs text-muted-foreground">Histórico de status</Label>
              <JobRequestHistory jobRequestId={editing.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
