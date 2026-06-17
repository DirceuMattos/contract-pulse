import React, { useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Sparkles, Upload, Loader2, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContractFormData } from '@/lib/validators';

interface ContractDocumentImportProps {
  form: UseFormReturn<ContractFormData>;
}

// Fields the AI may suggest — mapped to form keys
const STRING_FIELDS = [
  'codigo','nome','clientId','unidade','centroCusto','periodicidadeRenovacao',
  'indiceReajuste','dataBaseReajuste','dataInicio','dataFim','renewalBaseDate',
  'observacoesFinanceiras','objeto','escopoOperacional','slas','riscosPendencias',
  'responsavelInterno','responsavelCS','responsavelComercial','responsavelCliente',
  'responsavelClienteEmail','responsavelClienteTelefone',
] as const;

const ENUM_FIELDS: Record<string, string[]> = {
  tipo: ['sistema','infraestrutura','hibrido'],
  segmento: ['govtech','privado'],
  govSphere: ['municipal','estadual','federal'],
  modeloReceita: ['mrr','media-mensal'],
  moeda: ['BRL','USD'],
};

const NUMBER_FIELDS = ['valorMensalReferencia','valorTotalContrato','percentualImpostosFaturamento','renewalTermMonths'] as const;
const BOOL_FIELDS = ['renovacaoAutomatica'] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ContractDocumentImport({ form }: ContractDocumentImportProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedFields, setAppliedFields] = useState<string[]>([]);
  const [notes, setNotes] = useState<string | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const okType = /pdf|word|officedocument|image\//.test(f.type) ||
      /\.(pdf|docx|png|jpe?g|webp)$/i.test(f.name);
    if (!okType) {
      toast({ title: 'Formato não suportado', description: 'Envie PDF, DOCX ou imagem.', variant: 'destructive' });
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo 15MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setAppliedFields([]);
    setNotes(null);
  };

  const applySuggestions = (fields: Record<string, any>): string[] => {
    const current = form.getValues();
    const applied: string[] = [];
    const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

    // Strings
    for (const key of STRING_FIELDS) {
      const val = fields[key];
      if (typeof val === 'string' && val.trim() && isEmpty((current as any)[key])) {
        form.setValue(key as any, val.trim(), { shouldDirty: true, shouldValidate: false });
        applied.push(key);
      }
    }

    // Enums (validate against allowed values)
    for (const [key, allowed] of Object.entries(ENUM_FIELDS)) {
      const val = fields[key];
      if (typeof val === 'string' && allowed.includes(val) && isEmpty((current as any)[key])) {
        form.setValue(key as any, val, { shouldDirty: true, shouldValidate: false });
        applied.push(key);
      }
    }

    // Numbers
    for (const key of NUMBER_FIELDS) {
      const val = fields[key];
      if (typeof val === 'number' && Number.isFinite(val) && isEmpty((current as any)[key])) {
        form.setValue(key as any, val, { shouldDirty: true, shouldValidate: false });
        applied.push(key);
      }
    }

    // Booleans
    for (const key of BOOL_FIELDS) {
      const val = fields[key];
      if (typeof val === 'boolean' && (current as any)[key] === false) {
        form.setValue(key as any, val, { shouldDirty: true, shouldValidate: false });
        applied.push(key);
      }
    }

    // Tags (merge)
    if (Array.isArray(fields.tags)) {
      const incoming = fields.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim().toLowerCase());
      const merged = Array.from(new Set([...(current.tags || []), ...incoming]));
      if (merged.length !== (current.tags?.length || 0)) {
        form.setValue('tags', merged, { shouldDirty: true });
        applied.push('tags');
      }
    }

    return applied;
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('contract-parse-document', {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const applied = applySuggestions(data?.fields || {});
      setAppliedFields(applied);
      setNotes(data?.fields?.notes || null);

      if (applied.length === 0) {
        toast({
          title: 'Nada foi pré-preenchido',
          description: 'A IA não encontrou campos novos para sugerir, ou todos já estavam preenchidos.',
        });
      } else {
        toast({
          title: 'Pré-preenchimento concluído',
          description: `${applied.length} campo(s) sugerido(s). Revise antes de salvar.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao analisar documento',
        description: err?.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" />
          Preencher a partir de documento (IA)
        </CardTitle>
        <CardDescription>
          Envie o contrato (PDF, DOCX ou imagem) e a IA tentará preencher os campos automaticamente.
          Você revisa tudo antes de salvar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,image/*"
          className="hidden"
          onChange={handleSelect}
        />

        {!file ? (
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isAnalyzing}>
            <Upload className="w-4 h-4 mr-2" />
            Selecionar documento
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="truncate max-w-[260px]">{file.name}</span>
              <button
                type="button"
                onClick={() => { setFile(null); setAppliedFields([]); setNotes(null); }}
                disabled={isAnalyzing}
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label="Remover arquivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isAnalyzing ? 'Analisando...' : 'Analisar e preencher'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} disabled={isAnalyzing}>
              Trocar arquivo
            </Button>
          </div>
        )}

        {appliedFields.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
            {appliedFields.length} campo(s) sugerido(s) pela IA. Revise os valores destacados nas seções abaixo.
          </p>
        )}
        {notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
            {notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
