import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatPhoneInput } from '@/lib/utils';
import { FileUp, Loader2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ContractSimulation } from '@/types';

interface Props {
  data: ContractSimulation;
  onChange: (updates: Partial<ContractSimulation>) => void;
  onDocumentAnalysis?: (result: Record<string, unknown>) => void;
}

function ConfidenceBadge({ level }: { level?: string }) {
  if (!level) return null;
  if (level === 'documento') return <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-700 dark:text-green-400">📄 documento</Badge>;
  if (level === 'referencia') return <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-700 dark:text-blue-400">📊 referência</Badge>;
  if (level === 'nao_identificado') return <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-700 dark:text-orange-400">❓ pendente</Badge>;
  return <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">⚡ estimativa</Badge>;
}

export function Step1Identification({ data, onChange, onDocumentAnalysis }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      toast({ title: 'Formato inválido', description: 'Use PDF ou DOCX.', variant: 'destructive' });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20MB.', variant: 'destructive' });
      return;
    }

    setAnalyzing(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      const { data: result, error } = await supabase.functions.invoke('simulation-parse-document', {
        body: { fileBase64, fileName: file.name },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      onDocumentAnalysis?.(result);
      toast({ title: 'Documento analisado!', description: 'Os campos foram preenchidos com base no documento.' });
    } catch (err: unknown) {
      console.error('Document analysis error:', err);
      toast({
        title: 'Erro na análise',
        description: err instanceof Error ? err.message : 'Não foi possível analisar o documento.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confidence = data.aiConfidence;
  const coverage = data.aiCoverage;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Identificação e Contexto</h3>
        <p className="text-sm text-muted-foreground">Informações básicas da simulação.</p>
      </div>

      {/* AI Document Import */}
      <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">📄 Importar TR/Edital com IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Faça upload de um PDF ou DOCX e a IA preencherá os campos com base no documento.
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileSelect}
              disabled={analyzing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Selecionar arquivo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis Coverage Card */}
      {coverage && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {coverage.overallQuality === 'completa' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {coverage.overallQuality === 'parcial' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {coverage.overallQuality === 'limitada' && <XCircle className="w-5 h-5 text-red-600" />}
            <h4 className="font-medium text-foreground text-sm">
              Cobertura da análise: <span className="capitalize">{coverage.overallQuality}</span>
            </h4>
            <Badge variant="outline" className="text-xs">
              {coverage.fieldsFound.length} encontrados / {coverage.fieldsNotFound.length} pendentes
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{coverage.qualitySummary}</p>

          {coverage.fieldsNotFound.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-amber-700 dark:text-amber-400">Campos pendentes de revisão: </span>
                <span className="text-muted-foreground">{coverage.fieldsNotFound.join(', ')}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-2">
            <Label>Nome da simulação *</Label>
            <ConfidenceBadge level={confidence?.name} />
          </div>
          <Input value={data.name} onChange={e => onChange({ name: e.target.value })} placeholder="Ex.: Prefeitura XPTO — Sistema de Iluminação" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Cliente *</Label>
            <ConfidenceBadge level={confidence?.clientName} />
          </div>
          <Input value={data.clientName} onChange={e => onChange({ clientName: e.target.value })} placeholder="Nome do cliente" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Tipo de contrato *</Label>
            <ConfidenceBadge level={confidence?.contractType} />
          </div>
          <Select value={data.contractType} onValueChange={v => onChange({ contractType: v as ContractSimulation['contractType'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gov">Governo</SelectItem>
              <SelectItem value="private">Privado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.contractType === 'gov' && (
          <div className="space-y-2">
            <Label>Esfera</Label>
            <Select value={data.govSphere || ''} onValueChange={v => onChange({ govSphere: v as ContractSimulation['govSphere'] })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="municipal">Municipal</SelectItem>
                <SelectItem value="estadual">Estadual</SelectItem>
                <SelectItem value="federal">Federal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Prazo (meses) *</Label>
            <ConfidenceBadge level={confidence?.termMonths} />
          </div>
          <Input type="number" min={1} value={data.termMonths || ''} onChange={e => onChange({ termMonths: parseInt(e.target.value) || 0 })} />
        </div>

        <div className="space-y-2">
          <Label>Data estimada de início</Label>
          <DatePickerInput value={data.expectedStartDate || ''} onChange={v => onChange({ expectedStartDate: v })} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Descrição do escopo *</Label>
          <Textarea rows={3} value={data.description} onChange={e => onChange({ description: e.target.value })} placeholder="Descreva brevemente o escopo do projeto..." />
        </div>
      </div>

      {/* Complexity justification */}
      {data.aiComplexityJustification && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Justificativa de complexidade ({data.complexityLevel}): </span>
            <span className="text-muted-foreground">{data.aiComplexityJustification}</span>
          </div>
        </div>
      )}

      {/* Responsável no Cliente */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Responsável no Cliente</span>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={data.responsavelCliente ?? ''}
              onChange={e => onChange({ responsavelCliente: e.target.value || undefined })}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              type="email"
              value={data.responsavelClienteEmail ?? ''}
              onChange={e => onChange({ responsavelClienteEmail: e.target.value || undefined })}
              placeholder="email@cliente.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              value={data.responsavelClienteTelefone ?? ''}
              onChange={e => onChange({ responsavelClienteTelefone: formatPhoneInput(e.target.value) || undefined })}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </div>

      {/* Custo de consultoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Custo de consultoria previsto (mensal)</Label>
          <CurrencyInput
            value={data.consultancyCost}
            onChange={v => onChange({ consultancyCost: v })}
            placeholder="R$ 0,00 — incluso automaticamente em Outros Custos"
          />
          <p className="text-xs text-muted-foreground">Se informado, será adicionado automaticamente à composição de custos.</p>
        </div>
      </div>
    </div>
  );
}
