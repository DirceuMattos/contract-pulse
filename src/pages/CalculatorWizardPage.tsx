import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSimulations } from '@/contexts/SimulationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { generateSuggestedResources } from '@/lib/simulationEngine';
import { Button } from '@/components/ui/button';
import { SimulationStepper } from '@/components/calculator/SimulationStepper';
import { Step1Identification } from '@/components/calculator/Step1Identification';
import { Step3Questionnaire } from '@/components/calculator/Step3Questionnaire';
import { Step4Resources } from '@/components/calculator/Step4Resources';
import { Step5Results } from '@/components/calculator/Step5Results';
import { ArrowLeft, ArrowRight, Save, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { ContractSimulation } from '@/types';

const DEFAULT_QUESTIONNAIRE: ContractSimulation['questionnaire'] = {
  demandType: 'sustentacao',
  criticality: 'media',
  integrations: '1-2',
  modules: '3-5',
  userVolume: '200-2k',
  slaLevel: 'comercial',
  deliveryPace: 'moderado',
  fieldDependency: false,
};

function createBlank(userId?: string, chargesCLT?: number, chargesPJ?: number): ContractSimulation {
  const now = new Date().toISOString();
  const suggested = generateSuggestedResources(DEFAULT_QUESTIONNAIRE, 'media', chargesCLT, chargesPJ);
  return {
    id: crypto.randomUUID(),
    name: '',
    clientName: '',
    contractType: 'private',
    termMonths: 12,
    description: '',
    complexityLevel: 'media',
    questionnaire: { ...DEFAULT_QUESTIONNAIRE },
    suggestedHR: suggested.hr,
    suggestedOtherCosts: suggested.otherCosts,
    suggestedOverhead: suggested.overhead,
    customHR: JSON.parse(JSON.stringify(suggested.hr)),
    customOtherCosts: JSON.parse(JSON.stringify(suggested.otherCosts)),
    customOverhead: { ...suggested.overhead },
    usingSuggested: true,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    createdByUserId: userId,
  };
}

export default function CalculatorWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useData();
  const { getSimulation, addSimulation, updateSimulation } = useSimulations();

  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [data, setData] = useState<ContractSimulation>(() => {
    if (id) {
      const existing = getSimulation(id);
      if (existing) return existing;
    }
    return createBlank(user?.id, settings.percentualEncargosCLT, settings.percentualImpostosPJ);
  });
  const [saved, setSaved] = useState(!!id);

  const onChange = useCallback((updates: Partial<ContractSimulation>) => {
    setData(prev => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      if (updates.questionnaire || updates.complexityLevel) {
        const q = updates.questionnaire || next.questionnaire;
        const c = updates.complexityLevel || next.complexityLevel;
        const suggested = generateSuggestedResources(q, c, settings.percentualEncargosCLT, settings.percentualImpostosPJ);
        next.suggestedHR = suggested.hr;
        next.suggestedOtherCosts = suggested.otherCosts;
        next.suggestedOverhead = suggested.overhead;
        if (next.usingSuggested) {
          next.customHR = JSON.parse(JSON.stringify(suggested.hr));
          next.customOtherCosts = JSON.parse(JSON.stringify(suggested.otherCosts));
          next.customOverhead = { ...suggested.overhead };
        }
      }
      return next;
    });
  }, [settings.percentualEncargosCLT, settings.percentualImpostosPJ]);

  const handleDocumentAnalysis = useCallback((result: Record<string, unknown>) => {
    const updates: Partial<ContractSimulation> = {};
    if (result.name) updates.name = result.name as string;
    if (result.clientName) updates.clientName = result.clientName as string;
    if (result.contractType) updates.contractType = result.contractType as ContractSimulation['contractType'];
    if (result.govSphere) updates.govSphere = result.govSphere as ContractSimulation['govSphere'];
    if (result.termMonths) updates.termMonths = result.termMonths as number;
    if (result.description) updates.description = result.description as string;
    if (result.complexityLevel) updates.complexityLevel = result.complexityLevel as ContractSimulation['complexityLevel'];
    if (result.responsavelCliente) updates.responsavelCliente = result.responsavelCliente as string;
    if (result.consultancyCost) updates.consultancyCost = result.consultancyCost as number;
    if (result.questionnaire) {
      updates.questionnaire = result.questionnaire as ContractSimulation['questionnaire'];
    }
    if (Array.isArray(result.hrProfiles) && result.hrProfiles.length > 0) {
      updates.customHR = (result.hrProfiles as Array<Record<string, unknown>>).map(p => ({
        id: crypto.randomUUID(),
        role: (p.role as string) || 'Analista',
        hiringType: (p.hiringType as 'clt' | 'pj') || 'pj',
        quantity: (p.quantity as number) || 1,
        grossMonthly: (p.grossMonthly as number) || 5000,
        chargesPercent: (p.chargesPercent as number) || 6,
      }));
      updates.usingSuggested = false;
    }
    if (Array.isArray(result.otherCosts) && result.otherCosts.length > 0) {
      updates.customOtherCosts = (result.otherCosts as Array<Record<string, unknown>>).map(c => ({
        id: crypto.randomUUID(),
        category: (c.category as string) || 'outro',
        description: (c.description as string) || '',
        valueMonthly: (c.valueMonthly as number) || 0,
      }));
    }
    onChange(updates);
  }, [onChange]);

  const goTo = (s: number) => {
    setStep(s);
    setMaxVisited(prev => Math.max(prev, s));
  };

  const save = useCallback(() => {
    if (!data.name.trim()) {
      toast({ title: 'Preencha o nome da simulação', variant: 'destructive' });
      return;
    }
    if (saved) {
      updateSimulation(data);
    } else {
      addSimulation(data);
      setSaved(true);
    }
    toast({ title: 'Simulação salva!' });
  }, [data, saved, addSimulation, updateSimulation]);

  const next = () => {
    if (step < 3) goTo(step + 1);
  };
  const prev = () => {
    if (step > 0) goTo(step - 1);
  };

  if (user?.role === 'intermediario') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Este módulo está disponível apenas para C-Level e Leitores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/calculadora')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{data.name || 'Nova simulação'}</h1>
          <p className="text-xs text-muted-foreground">{id ? 'Editando simulação' : 'Criando nova simulação'}</p>
        </div>
      </div>

      <SimulationStepper currentStep={step} onStepClick={goTo} maxVisited={maxVisited} />

      <div className="min-h-[400px]">
        {step === 0 && <Step1Identification data={data} onChange={onChange} onDocumentAnalysis={handleDocumentAnalysis} />}
        {step === 1 && <Step3Questionnaire data={data} onChange={onChange} />}
        {step === 2 && <Step4Resources data={data} onChange={onChange} />}
        {step === 3 && <Step5Results data={data} onChange={onChange} />}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
          {step < 3 ? (
            <Button onClick={next}>
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => { save(); navigate('/calculadora'); }}>
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
