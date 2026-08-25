// v3 - vaga: sem perfil de skill, cargo com sugestão + campos de requisição (08/2026)
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
import { useData } from '@/contexts/DataContext';
import { useJobSkills, type Skill } from '@/hooks/useJobSkills';
import { SkillSelector } from '@/components/jobskills/SkillSelector';
import { JobRequestHistory } from '@/components/jobrequests/JobRequestHistory';
import { notifyVagaAberta } from '@/lib/notifyVagas';
import { toast } from 'sonner';
import { PRAZO_META, MOTIVO_META, REGIME_META, type JobRequest } from '@/hooks/useJobRequests';
import { resolveSkillIds, type SkillSupabaseClient } from '@/lib/jobSkillResolver';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: JobRequest | null;
  onSaved: () => void;
}

const SEM_MODALIDADE = '__sem_modalidade__';
const SEM_PRAZO = '__sem_prazo__';
const SEM_MOTIVO = '__sem_motivo__';
const SEM_REGIME = '__sem_regime__';
const SEM_EQUIPAMENTO = '__sem_equipamento__';

// Perfis autorizados a ver/editar o valor previsto (budget) da vaga.
const ROLES_BUDGET = ['c-level', 'administrativo', 'rh', 'superadmin'];

// Compara textos ignorando caixa e acentuação, para casar o cargo digitado
// com um cargo já cadastrado.
const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function JobRequestDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { user, userRole, canEdit } = useAuth();
  const { jobTitles } = useData();
  const { skills: allSkills } = useJobSkills();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nivel, setNivel] = useState('');
  const [anosExp, setAnosExp] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [regimeContratacao, setRegimeContratacao] = useState<string>(SEM_REGIME);
  const [prazoContratacao, setPrazoContratacao] = useState<string>(SEM_PRAZO);
  const [motivoAbertura, setMotivoAbertura] = useState<string>(SEM_MOTIVO);
  const [valorPrevisto, setValorPrevisto] = useState('');
  const [modalidadeTrabalho, setModalidadeTrabalho] = useState<string>(SEM_MODALIDADE);
  const [presencaClienteRequerida, setPresencaClienteRequerida] = useState(false);
  const [diasPresencaCliente, setDiasPresencaCliente] = useState('');
  const [viagensRequeridas, setViagensRequeridas] = useState(false);
  const [equipamentoBnp, setEquipamentoBnp] = useState<string>(SEM_EQUIPAMENTO);
  const [formacaoRequerida, setFormacaoRequerida] = useState(false);
  const [formacaoDetalhe, setFormacaoDetalhe] = useState('');
  const [diferenciais, setDiferenciais] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);
  const [saving, setSaving] = useState(false);

  const podeVerBudget = userRole != null && ROLES_BUDGET.includes(userRole);

  const cargoOptions = useMemo(
    () => [...jobTitles].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })),
    [jobTitles],
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
      setNivel(editing.nivel ?? '');
      setAnosExp(editing.anos_experiencia?.toString() ?? '');
      setQuantidade(editing.quantidade?.toString() ?? '1');
      setAreaAtuacao(editing.area_atuacao ?? '');
      setRegimeContratacao(editing.regime_contratacao ?? SEM_REGIME);
      setPrazoContratacao(editing.prazo_contratacao ?? SEM_PRAZO);
      setMotivoAbertura(editing.motivo_abertura ?? SEM_MOTIVO);
      setValorPrevisto(editing.valor_previsto?.toString() ?? '');
      setModalidadeTrabalho(editing.modalidade_trabalho ?? SEM_MODALIDADE);
      setPresencaClienteRequerida(Boolean(editing.presenca_cliente_requerida));
      setDiasPresencaCliente(editing.dias_presenca_cliente ?? '');
      setViagensRequeridas(Boolean(editing.viagens_requeridas));
      setEquipamentoBnp(
        editing.equipamento_bnp == null ? SEM_EQUIPAMENTO : (editing.equipamento_bnp ? 'sim' : 'nao'),
      );
      setFormacaoRequerida(Boolean(editing.formacao_requerida));
      setFormacaoDetalhe(editing.formacao_detalhe ?? '');
      setDiferenciais(editing.diferenciais ?? '');
      setBeneficios(editing.beneficios ?? '');
      setObservacoes(editing.observacoes ?? '');
      const av = Array.isArray(editing.skills_avulsas)
        ? editing.skills_avulsas as Array<{ id?: unknown }>
        : [];
      setSelectedSkillIds(new Set(av.map((s) => s.id).filter((id): id is string => typeof id === 'string')));
    } else {
      setTitulo(''); setDescricao('');
      setNivel(''); setAnosExp(''); setQuantidade('1');
      setAreaAtuacao('');
      setRegimeContratacao(SEM_REGIME);
      setPrazoContratacao(SEM_PRAZO);
      setMotivoAbertura(SEM_MOTIVO);
      setValorPrevisto('');
      setModalidadeTrabalho(SEM_MODALIDADE);
      setPresencaClienteRequerida(false);
      setDiasPresencaCliente('');
      setViagensRequeridas(false);
      setEquipamentoBnp(SEM_EQUIPAMENTO);
      setFormacaoRequerida(false);
      setFormacaoDetalhe('');
      setDiferenciais('');
      setBeneficios('');
      setObservacoes('');
      setSelectedSkillIds(new Set());
    }
    setLocalSkills([]);
  }, [open, editing]);

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Informe o cargo da vaga'); return; }
    setSaving(true);
    try {
      // Só vincula job_title_id quando o texto casa com um cargo já cadastrado;
      // cargos novos não são criados a partir da vaga.
      const cargoExistente = cargoOptions.find((jt) => normalizar(jt.label) === normalizar(titulo));
      // Resolve ids (persiste skills novas) e monta o snapshot para skills_avulsas.
      const finalIds = await resolveSkillIds(supabase as unknown as SkillSupabaseClient, selectedSkillIds, localSkills);
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
        // Sem o seletor de perfil, mantém o vínculo que a vaga já tinha ao editar.
        job_skill_profile_id: editing?.job_skill_profile_id ?? null,
        job_title_id: cargoExistente?.id ?? null,
        skills_avulsas: skillsSnapshot,
        nivel: nivel.trim() || null,
        anos_experiencia: anosExp ? Number(anosExp) : null,
        quantidade: quantidade ? Number(quantidade) : 1,
        area_atuacao: areaAtuacao.trim() || null,
        regime_contratacao: regimeContratacao === SEM_REGIME ? null : regimeContratacao,
        prazo_contratacao: prazoContratacao === SEM_PRAZO ? null : prazoContratacao,
        motivo_abertura: motivoAbertura === SEM_MOTIVO ? null : motivoAbertura,
        modalidade_trabalho: modalidadeTrabalho === SEM_MODALIDADE ? null : modalidadeTrabalho,
        presenca_cliente_requerida: presencaClienteRequerida,
        dias_presenca_cliente: presencaClienteRequerida ? (diasPresencaCliente.trim() || null) : null,
        viagens_requeridas: viagensRequeridas,
        equipamento_bnp: equipamentoBnp === SEM_EQUIPAMENTO ? null : equipamentoBnp === 'sim',
        formacao_requerida: formacaoRequerida,
        formacao_detalhe: formacaoRequerida ? (formacaoDetalhe.trim() || null) : null,
        diferenciais: diferenciais.trim() || null,
        beneficios: beneficios.trim() || null,
        observacoes: observacoes.trim() || null,
        // Budget é restrito: quem não vê o campo também não o sobrescreve.
        ...(podeVerBudget ? { valor_previsto: valorPrevisto ? Number(valorPrevisto) : null } : {}),
      };

      if (editing) {
        const { error } = await supabase.from('job_requests').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: nova, error } = await supabase.from('job_requests')
          .insert({ ...payload, status: 'solicitado', solicitante_id: user?.id ?? null, solicitante_nome: user?.name ?? null })
          .select('id')
          .single();
        if (error) throw error;
        notifyVagaAberta(payload.titulo, nova?.id ?? null, user?.name ?? null, user?.id);
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar vaga' : 'Nova vaga'}</DialogTitle>
          <DialogDescription>
            Informe o cargo, as condições de trabalho e o que a vaga exige e oferece.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-xs text-muted-foreground">Sobre a vaga</Label>

            <div className="space-y-1.5">
              <Label>Cargo da Vaga *</Label>
              <Input
                list="job-request-cargos-list"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Desenvolvedor Backend Sênior"
              />
              <datalist id="job-request-cargos-list">
                {cargoOptions.map((jt) => <option key={jt.id} value={jt.label} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
                placeholder="Detalhes adicionais…" />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Área de atuação</Label>
                <Input value={areaAtuacao} onChange={(e) => setAreaAtuacao(e.target.value)} placeholder="Ex.: Tecnologia, Financeiro" />
              </div>
              <div className="space-y-1.5">
                <Label>Regime de contratação</Label>
                <Select value={regimeContratacao} onValueChange={setRegimeContratacao}>
                  <SelectTrigger><SelectValue placeholder="Selecione o regime…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_REGIME}>Não informado</SelectItem>
                    {Object.entries(REGIME_META).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo para contratação</Label>
                <Select value={prazoContratacao} onValueChange={setPrazoContratacao}>
                  <SelectTrigger><SelectValue placeholder="Selecione o prazo…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_PRAZO}>Não informado</SelectItem>
                    {Object.entries(PRAZO_META).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Motivo da abertura</Label>
                <Select value={motivoAbertura} onValueChange={setMotivoAbertura}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_MOTIVO}>Não informado</SelectItem>
                    {Object.entries(MOTIVO_META).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valor previsto é informação interna: visível apenas a perfis autorizados. */}
            {podeVerBudget && (
              <div className="space-y-1.5">
                <Label>Valor previsto (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorPrevisto}
                  onChange={(e) => setValorPrevisto(e.target.value)}
                  placeholder="Ex.: 12000"
                />
                <p className="text-xs text-muted-foreground">Uso interno — não aparece no anúncio da vaga.</p>
              </div>
            )}
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

            <div className="space-y-1.5">
              <Label>Equipamento fornecido pela BNP?</Label>
              <Select value={equipamentoBnp} onValueChange={setEquipamentoBnp}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_EQUIPAMENTO}>Não informado</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Skills da Vaga</Label>
            <SkillSelector
              allSkills={allSkills}
              localSkills={localSkills}
              selectedIds={selectedSkillIds}
              onToggle={toggleSkill}
              onAddLocal={addLocal}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-xs text-muted-foreground">Requisitos e oferta</Label>

            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div className="space-y-0.5">
                <Label>Formação acadêmica requerida?</Label>
                <p className="text-xs text-muted-foreground">Marque quando a vaga exigir formação específica.</p>
              </div>
              <Switch checked={formacaoRequerida} onCheckedChange={setFormacaoRequerida} />
            </div>

            {formacaoRequerida && (
              <div className="space-y-1.5">
                <Label>Quais?</Label>
                <Input
                  value={formacaoDetalhe}
                  onChange={(e) => setFormacaoDetalhe(e.target.value)}
                  placeholder="Ex.: Ciência da Computação, Engenharia ou áreas correlatas"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Diferenciais desejáveis</Label>
              <Textarea
                value={diferenciais}
                onChange={(e) => setDiferenciais(e.target.value)}
                rows={2}
                placeholder="Ex.: certificações, inglês avançado, experiência com o setor do cliente…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>O que Oferecemos (Benefícios)</Label>
              <Textarea
                value={beneficios}
                onChange={(e) => setBeneficios(e.target.value)}
                rows={2}
                placeholder="Ex.: vale refeição, plano de saúde, auxílio home office, bônus..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>O que buscamos e como será o seu dia a dia</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
            </div>
          </div>

          {editing && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs text-muted-foreground">Histórico de status</Label>
              <JobRequestHistory jobRequestId={editing.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {canEdit ? 'Cancelar' : 'Fechar'}
          </Button>
          {/* Segunda camada: mesmo que algo abra este dialogo sem permissao, nao
              existe botao para gravar. O banco tambem barra (jr_write), mas a
              tela nao deve oferecer o que nao pode cumprir. */}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
