import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAIDrafts } from '@/hooks/useAIDrafts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Draft, DraftType, ContractVariant, DraftContractAnswers, DraftTRAnswers,
  emptyContractAnswers, emptyTRAnswers, DraftDocReference,
} from '@/types/aiDrafts';
import {
  generateContractGovtech, generateContractPrivado, generateTRPadrao, generateTRCompleto,
} from '@/lib/draftTemplates';
import { FileText, ScrollText, Sparkles, Copy, Trash2, FilePlus, Plus, Minus, Loader2, BookOpen, AlertTriangle, Wand2 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

type WizardStep = 'select-type' | 'context' | 'questionnaire' | 'editor';

interface AIEvidence {
  ref_index: number;
  document_name: string;
  page?: string;
  excerpt: string;
}

interface AIGap {
  field: string;
  description: string;
}

export default function AIDraftsPage() {
  const { clients, contracts, attachments } = useData();
  const { user } = useAuth();
  const { drafts, addDraft, updateDraft, deleteDraft, duplicateDraft } = useAIDrafts();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'new' | 'drafts'>('new');
  const [step, setStep] = useState<WizardStep>('select-type');
  const [draftType, setDraftType] = useState<DraftType | null>(null);
  const [variant, setVariant] = useState<ContractVariant>('govtech');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [useDocRefs, setUseDocRefs] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [contractAnswers, setContractAnswers] = useState<DraftContractAnswers>({ ...emptyContractAnswers });
  const [trAnswers, setTRAnswers] = useState<DraftTRAnswers>({ ...emptyTRAnswers });
  const [generatedText, setGeneratedText] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [evidences, setEvidences] = useState<AIEvidence[]>([]);
  const [gaps, setGaps] = useState<AIGap[]>([]);
  const [showEvidence, setShowEvidence] = useState(false);

  // DB templates cache
  const [dbTemplates, setDbTemplates] = useState<Record<string, { body: string; version: string }>>({});

  const isAdmin = user?.role === 'c-level';

  // Fetch active templates from DB on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('doc_templates')
          .select('template_key, body_markdown, version')
          .eq('is_active', true);
        if (data) {
          const map: Record<string, { body: string; version: string }> = {};
          (data as any[]).forEach((t: any) => {
            map[t.template_key] = { body: t.body_markdown, version: t.version };
          });
          setDbTemplates(map);
        }
      } catch { /* fallback to local templates */ }
    })();
  }, []);

  const availableDocs = useMemo(() => {
    return attachments.filter(a => {
      if (selectedContractId) return a.contractId === selectedContractId;
      if (selectedClientId) {
        const contractIds = contracts.filter(c => c.clientId === selectedClientId).map(c => c.id);
        return contractIds.includes(a.contractId);
      }
      return false;
    });
  }, [attachments, selectedClientId, selectedContractId, contracts]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const autoFillFromContract = () => {
    if (!selectedContract || draftType !== 'contract') return;
    const client = clients.find(c => c.id === selectedContract.clientId);
    setContractAnswers(prev => ({
      ...prev,
      contratante: client?.razaoSocial || prev.contratante,
      objeto: selectedContract.objeto || prev.objeto,
      vigenciaInicio: selectedContract.dataInicio || prev.vigenciaInicio,
      vigenciaFim: selectedContract.dataFim || prev.vigenciaFim,
      valorMensal: selectedContract.valorMensalReferencia?.toString() || prev.valorMensal,
      valorTotal: selectedContract.valorTotalContrato?.toString() || prev.valorTotal,
      reajusteIndice: selectedContract.indiceReajuste || prev.reajusteIndice,
      renovacaoAutomatica: selectedContract.renovacaoAutomatica ?? prev.renovacaoAutomatica,
    }));
    if (selectedContract.segmento === 'govtech') setVariant('govtech');
    else setVariant('privado');
  };

  const handleGenerate = () => {
    const docRefs: DraftDocReference[] = useDocRefs
      ? availableDocs.filter(d => selectedDocs.includes(d.id)).map(d => ({
          id: d.id, fileName: d.fileName, descriptionType: d.descriptionType, uploadedAt: d.uploadedAt,
        }))
      : [];

    let text = '';
    if (draftType === 'contract') {
      text = variant === 'govtech'
        ? generateContractGovtech(contractAnswers, docRefs)
        : generateContractPrivado(contractAnswers, docRefs);
    } else {
      text = generateTRPadrao(trAnswers, docRefs);
    }
    setGeneratedText(text);
    setEvidences([]);
    setGaps([]);
    setStep('editor');
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setEvidences([]);
    setGaps([]);

    try {
      const answers = draftType === 'contract' ? contractAnswers : trAnswers;
      const docIds = useDocRefs ? selectedDocs : [];

      // First extract text from selected docs
      if (docIds.length > 0) {
        for (const docId of docIds) {
          try {
            await supabase.functions.invoke('doc-extract', { body: { document_id: docId } });
          } catch { /* continue */ }
        }
      }

      // Generate with AI
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Resolve template key for version tracking
      const templateKey = draftType === 'contract'
        ? (variant === 'govtech' ? 'contrato_govtech' : 'contrato_privado')
        : 'tr_padrao';
      const templateVersion = dbTemplates[templateKey]?.version || '1.0.0';

      const { data, error } = await supabase.functions.invoke('ai-draft-generate', {
        body: {
          type: draftType,
          variant,
          answers,
          doc_ids: docIds,
          user_id: userId,
          user_role: user?.role || 'leitor',
          template_version: templateVersion,
        },
      });

      if (error) {
        toast({ title: 'Erro ao gerar minuta', description: error.message, variant: 'destructive' });
        setAiLoading(false);
        return;
      }

      if (data?.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
        setAiLoading(false);
        return;
      }

      setGeneratedText(data.draft_text || '');
      setEvidences(data.evidences || []);
      setGaps(data.gaps || []);
      setShowEvidence(true);
      setStep('editor');
      toast({ title: 'Minuta gerada com IA!' });
    } catch (e) {
      toast({ title: 'Erro ao gerar minuta', description: 'Tente novamente.', variant: 'destructive' });
    }
    setAiLoading(false);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const draft: Draft = {
      id: editingDraftId || crypto.randomUUID(),
      type: draftType!,
      variant: draftType === 'contract' ? variant : undefined,
      clientId: selectedClientId || undefined,
      clientName: selectedClient?.razaoSocial,
      contractId: selectedContractId || undefined,
      contractName: selectedContract?.nome,
      answers: draftType === 'contract' ? contractAnswers : trAnswers,
      documentReferences: useDocRefs
        ? availableDocs.filter(d => selectedDocs.includes(d.id)).map(d => ({
            id: d.id, fileName: d.fileName, descriptionType: d.descriptionType, uploadedAt: d.uploadedAt,
          }))
        : [],
      generatedText,
      status: 'rascunho',
      createdAt: editingDraftId ? (drafts.find(d => d.id === editingDraftId)?.createdAt || now) : now,
      updatedAt: now,
    };
    if (editingDraftId) {
      updateDraft(editingDraftId, draft);
    } else {
      addDraft(draft);
    }
    toast({ title: 'Salvo!', description: 'Rascunho salvo com sucesso.' });
    resetWizard();
    setActiveTab('drafts');
  };

  const resetWizard = () => {
    setStep('select-type');
    setDraftType(null);
    setContractAnswers({ ...emptyContractAnswers });
    setTRAnswers({ ...emptyTRAnswers });
    setGeneratedText('');
    setSelectedClientId('');
    setSelectedContractId('');
    setUseDocRefs(false);
    setSelectedDocs([]);
    setEditingDraftId(null);
    setEvidences([]);
    setGaps([]);
    setShowEvidence(false);
  };

  const openDraft = (draft: Draft) => {
    setDraftType(draft.type);
    setVariant(draft.variant || 'govtech');
    setSelectedClientId(draft.clientId || '');
    setSelectedContractId(draft.contractId || '');
    if (draft.type === 'contract') setContractAnswers(draft.answers as DraftContractAnswers);
    else setTRAnswers(draft.answers as DraftTRAnswers);
    setGeneratedText(draft.generatedText);
    setEditingDraftId(draft.id);
    setSelectedDocs(draft.documentReferences.map(d => d.id));
    setUseDocRefs(draft.documentReferences.length > 0);
    setStep('editor');
    setActiveTab('new');
  };

  const updateListField = (field: 'requisitosFuncionais' | 'requisitosNaoFuncionais' | 'entregaveis' | 'criteriosAceitacao', index: number, value: string) => {
    setTRAnswers(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };
  const addListItem = (field: 'requisitosFuncionais' | 'requisitosNaoFuncionais' | 'entregaveis' | 'criteriosAceitacao') => {
    setTRAnswers(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };
  const removeListItem = (field: 'requisitosFuncionais' | 'requisitosNaoFuncionais' | 'entregaveis' | 'criteriosAceitacao', index: number) => {
    setTRAnswers(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const renderListField = (label: string, field: 'requisitosFuncionais' | 'requisitosNaoFuncionais' | 'entregaveis' | 'criteriosAceitacao') => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {trAnswers[field].map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={e => updateListField(field, i, e.target.value)} placeholder={`Item ${i + 1}`} />
          {trAnswers[field].length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => removeListItem(field, i)}><Minus className="w-4 h-4" /></Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => addListItem(field)} className="gap-1"><Plus className="w-3 h-3" /> Adicionar</Button>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Minutas"
        description="Gere minutas de contratos e termos de referência a partir de templates ou com IA"
        actions={
          step !== 'select-type' && (
            <Button variant="outline" onClick={resetWizard}>Nova minuta</Button>
          )
        }
      />
      <AIPageLayout>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'new' | 'drafts')}>
          <TabsList>
            <TabsTrigger value="new">Nova Minuta</TabsTrigger>
            <TabsTrigger value="drafts">Rascunhos ({drafts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6 mt-4">
            {/* Step 1: Select Type */}
            {step === 'select-type' && (
              <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setDraftType('contract'); setStep('context'); }}>
                  <CardContent className="p-6 text-center">
                    <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h3 className="text-lg font-semibold">Minuta de Contrato</h3>
                    <p className="text-sm text-muted-foreground mt-1">GovTech ou Privado</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setDraftType('tr'); setStep('context'); }}>
                  <CardContent className="p-6 text-center">
                    <ScrollText className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h3 className="text-lg font-semibold">Termo de Referência</h3>
                    <p className="text-sm text-muted-foreground mt-1">Padrão ou Completo</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Context */}
            {step === 'context' && (
              <motion.div variants={itemVariants} className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Contexto</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {draftType === 'contract' && (
                      <div className="space-y-2">
                        <Label>Variante</Label>
                        <Select value={variant} onValueChange={v => setVariant(v as ContractVariant)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="govtech">GovTech</SelectItem>
                            <SelectItem value="privado">Privado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cliente (opcional)</Label>
                        <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setSelectedContractId(''); }}>
                          <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                          <SelectContent>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razaoSocial}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contrato (opcional)</Label>
                        <Select value={selectedContractId} onValueChange={v => setSelectedContractId(v)}>
                          <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
                          <SelectContent>
                            {contracts.filter(c => !selectedClientId || c.clientId === selectedClientId).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="use-docs" checked={useDocRefs} onCheckedChange={setUseDocRefs} />
                      <Label htmlFor="use-docs">Usar documentos anexados como referência</Label>
                    </div>
                    {useDocRefs && availableDocs.length > 0 && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {availableDocs.map(doc => (
                          <label key={doc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={checked => {
                                setSelectedDocs(prev => checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id));
                              }}
                            />
                            {doc.fileName} <span className="text-muted-foreground">({doc.descriptionType})</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {useDocRefs && availableDocs.length === 0 && (
                      <p className="text-sm text-muted-foreground pl-4">Nenhum documento disponível para o contexto selecionado.</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep('select-type')}>Voltar</Button>
                      <Button onClick={() => { if (selectedContractId) autoFillFromContract(); setStep('questionnaire'); }}>Próximo</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Questionnaire */}
            {step === 'questionnaire' && (
              <motion.div variants={itemVariants} className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{draftType === 'contract' ? 'Dados do Contrato' : 'Dados do TR'}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {draftType === 'contract' ? (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contratante *</Label>
                            <Input value={contractAnswers.contratante} onChange={e => setContractAnswers(p => ({ ...p, contratante: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Contratada</Label>
                            <Input value={contractAnswers.contratada} onChange={e => setContractAnswers(p => ({ ...p, contratada: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Objeto *</Label>
                          <Textarea value={contractAnswers.objeto} onChange={e => setContractAnswers(p => ({ ...p, objeto: e.target.value }))} rows={3} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Data de início</Label>
                            <Input type="date" value={contractAnswers.vigenciaInicio} onChange={e => setContractAnswers(p => ({ ...p, vigenciaInicio: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Data final</Label>
                            <Input type="date" value={contractAnswers.vigenciaFim} onChange={e => setContractAnswers(p => ({ ...p, vigenciaFim: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Valor mensal (R$)</Label>
                            <Input value={contractAnswers.valorMensal} onChange={e => setContractAnswers(p => ({ ...p, valorMensal: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor total (R$)</Label>
                            <Input value={contractAnswers.valorTotal} onChange={e => setContractAnswers(p => ({ ...p, valorTotal: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Índice de reajuste</Label>
                            <Select value={contractAnswers.reajusteIndice} onValueChange={v => setContractAnswers(p => ({ ...p, reajusteIndice: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IPCA">IPCA</SelectItem>
                                <SelectItem value="IGPM">IGP-M</SelectItem>
                                <SelectItem value="INPC">INPC</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Periodicidade do reajuste</Label>
                            <Select value={contractAnswers.reajustePeriodicidade} onValueChange={v => setContractAnswers(p => ({ ...p, reajustePeriodicidade: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={contractAnswers.renovacaoAutomatica} onCheckedChange={v => setContractAnswers(p => ({ ...p, renovacaoAutomatica: v }))} />
                          <Label>Renovação automática</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Cláusulas</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                              { key: 'confidencialidade' as const, label: 'Confidencialidade' },
                              { key: 'lgpd' as const, label: 'LGPD' },
                              { key: 'multaPenalidades' as const, label: 'Multa/Penalidades' },
                              { key: 'rescisao' as const, label: 'Rescisão' },
                              { key: 'sla' as const, label: 'SLA' },
                            ].map(cl => (
                              <label key={cl.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={contractAnswers.clausulas[cl.key]}
                                  onCheckedChange={v => setContractAnswers(p => ({ ...p, clausulas: { ...p.clausulas, [cl.key]: !!v } }))}
                                />
                                {cl.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        {contractAnswers.clausulas.sla && (
                          <div className="space-y-2">
                            <Label>Resumo do SLA</Label>
                            <Textarea value={contractAnswers.slaResumo} onChange={e => setContractAnswers(p => ({ ...p, slaResumo: e.target.value }))} rows={2} />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Observações adicionais</Label>
                          <Textarea value={contractAnswers.observacoes} onChange={e => setContractAnswers(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Contexto e Justificativa *</Label>
                          <Textarea value={trAnswers.contextoJustificativa} onChange={e => setTRAnswers(p => ({ ...p, contextoJustificativa: e.target.value }))} rows={3} />
                        </div>
                        <div className="space-y-2">
                          <Label>Objeto e Escopo *</Label>
                          <Textarea value={trAnswers.objetoEscopo} onChange={e => setTRAnswers(p => ({ ...p, objetoEscopo: e.target.value }))} rows={3} />
                        </div>
                        {renderListField('Requisitos Funcionais', 'requisitosFuncionais')}
                        {renderListField('Requisitos Não Funcionais', 'requisitosNaoFuncionais')}
                        {renderListField('Entregáveis', 'entregaveis')}
                        <div className="space-y-2">
                          <Label>Prazo e Cronograma</Label>
                          <Textarea value={trAnswers.prazoCronograma} onChange={e => setTRAnswers(p => ({ ...p, prazoCronograma: e.target.value }))} rows={2} />
                        </div>
                        {renderListField('Critérios de Aceitação', 'criteriosAceitacao')}
                        <div className="space-y-2">
                          <Label>Condições de Execução</Label>
                          <Textarea value={trAnswers.condicoesExecucao} onChange={e => setTRAnswers(p => ({ ...p, condicoesExecucao: e.target.value }))} rows={2} />
                        </div>
                        <div className="space-y-2">
                          <Label>Observações adicionais</Label>
                          <Textarea value={trAnswers.observacoes} onChange={e => setTRAnswers(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
                        </div>
                      </>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep('context')}>Voltar</Button>
                      <Button onClick={handleGenerate} className="gap-2">
                        <Sparkles className="w-4 h-4" /> Gerar minuta (template)
                      </Button>
                      <Button onClick={handleGenerateAI} disabled={aiLoading} variant="default" className="gap-2 bg-gradient-to-r from-primary to-primary/80">
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {aiLoading ? 'Gerando com IA...' : 'Gerar minuta com IA'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Editor */}
            {step === 'editor' && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Main editor */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-lg">
                            {draftType === 'contract' ? `Minuta de Contrato (${variant === 'govtech' ? 'GovTech' : 'Privado'})` : 'Termo de Referência'}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generatedText); toast({ title: 'Copiado!' }); }} className="gap-1">
                              <Copy className="w-3.5 h-3.5" /> Copiar
                            </Button>
                            <Button variant="outline" size="sm" disabled className="gap-1">Exportar PDF <Badge variant="secondary" className="text-[10px] ml-1">Em breve</Badge></Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={generatedText}
                          onChange={e => setGeneratedText(e.target.value)}
                          rows={25}
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setStep('questionnaire')}>Voltar ao questionário</Button>
                          <Button onClick={handleSave} className="gap-2">
                            <FilePlus className="w-4 h-4" /> Salvar rascunho
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Evidence sidebar */}
                  <div className="space-y-4">
                    {evidences.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Evidências usadas
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {evidences.map((ev, i) => (
                            <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                              <p className="font-medium">[Ref {ev.ref_index}] {ev.document_name}</p>
                              {ev.page && <p className="text-muted-foreground">Página {ev.page}</p>}
                              <p className="text-muted-foreground mt-0.5 line-clamp-3">{ev.excerpt}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {gaps.length > 0 && (
                      <Alert className="border-amber-500/50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-sm">Pendências</AlertTitle>
                        <AlertDescription>
                          <ul className="text-xs space-y-1 mt-1">
                            {gaps.map((gap, i) => (
                              <li key={i}>
                                <strong>{gap.field}:</strong> {gap.description}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {evidences.length === 0 && gaps.length === 0 && (
                      <Card>
                        <CardContent className="py-6 text-center text-sm text-muted-foreground">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p>Use "Gerar com IA" para ver evidências e pendências aqui.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4 mt-4">
            {drafts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum rascunho</h3>
                  <p className="text-muted-foreground">Crie uma nova minuta para começar.</p>
                </CardContent>
              </Card>
            ) : (
              drafts.map(draft => (
                <Card key={draft.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {draft.type === 'contract' ? `Contrato (${draft.variant === 'govtech' ? 'GovTech' : 'Privado'})` : 'Termo de Referência'}
                        </p>
                        <Badge variant="secondary" className="text-xs">{draft.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {draft.clientName && `${draft.clientName} • `}
                        {draft.contractName && `${draft.contractName} • `}
                        {new Date(draft.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDraft(draft)}>Abrir</Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicateDraft(draft.id)}>Duplicar</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDraft(draft.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </AIPageLayout>
    </motion.div>
  );
}
