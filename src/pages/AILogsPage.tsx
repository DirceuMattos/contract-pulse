import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, ChevronDown, RefreshCw, FileText, Loader2 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface AIRun {
  id: string;
  run_type: string;
  user_id: string;
  input_json: any;
  redaction_level: string;
  internal_docs_used: any[];
  external_sources_used: any[];
  output_text: string | null;
  output_structured: any;
  status: string;
  error_message: string | null;
  model: string | null;
  created_at: string;
}

const runTypeLabels: Record<string, string> = {
  draft_contract: 'Minuta de Contrato',
  draft_tr: 'Termo de Referência',
  contracts_analysis: 'Análise de Contratos',
  resources_analysis: 'Análise de Recursos',
};

export default function AILogsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [runs, setRuns] = useState<AIRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [reindexing, setReindexing] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setRuns(data as unknown as AIRun[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRuns(); }, []);

  const filtered = runs.filter(r => {
    if (filterType !== 'all' && r.run_type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const handleReindex = async () => {
    setReindexing(true);
    try {
      // Get all documents without extraction
      const { data: docs } = await supabase
        .from('document_attachments')
        .select('id')
        .limit(100);

      if (!docs || docs.length === 0) {
        toast({ title: 'Nenhum documento para reindexar' });
        setReindexing(false);
        return;
      }

      const { data: extractions } = await supabase
        .from('doc_text_extractions')
        .select('document_id')
        .in('status', ['done', 'no_text']);

      const extractedIds = new Set((extractions || []).map((e: any) => e.document_id));
      const pending = docs.filter((d: any) => !extractedIds.has(d.id));

      if (pending.length === 0) {
        toast({ title: 'Todos os documentos já estão indexados' });
        setReindexing(false);
        return;
      }

      let processed = 0;
      for (const doc of pending.slice(0, 20)) {
        try {
          await supabase.functions.invoke('doc-extract', { body: { document_id: doc.id } });
          processed++;
        } catch { /* continue */ }
      }

      toast({ title: `${processed} documento(s) processado(s)` });
    } catch {
      toast({ title: 'Erro ao reindexar', variant: 'destructive' });
    }
    setReindexing(false);
  };

  const isAdmin = user?.role === 'c-level';

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Fontes e Logs"
        description="Registro de fontes de dados e logs das análises realizadas"
        actions={
          isAdmin && (
            <Button variant="outline" onClick={handleReindex} disabled={reindexing} className="gap-2">
              {reindexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reindexar documentos
            </Button>
          )
        }
      />
      <AIPageLayout>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="draft_contract">Minuta de Contrato</SelectItem>
              <SelectItem value="draft_tr">Termo de Referência</SelectItem>
              <SelectItem value="contracts_analysis">Análise Contratos</SelectItem>
              <SelectItem value="resources_analysis">Análise Recursos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={fetchRuns}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Nenhum log encontrado"
            description="Os logs aparecerão aqui quando você gerar minutas ou análises com IA."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(run => (
              <Collapsible key={run.id}>
                <Card>
                  <CardContent className="p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {runTypeLabels[run.run_type] || run.run_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(run.created_at).toLocaleString('pt-BR')}
                              {run.model && ` • ${run.model}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                            {run.status}
                          </Badge>
                          {(run.internal_docs_used as any[])?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {(run.internal_docs_used as any[]).length} doc(s)
                            </Badge>
                          )}
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3 border-t pt-3">
                      {/* Input */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Entrada</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(run.input_json, null, 2)}
                        </pre>
                      </div>

                      {/* Docs used */}
                      {(run.internal_docs_used as any[])?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Documentos usados</p>
                          <div className="space-y-1">
                            {(run.internal_docs_used as any[]).map((d: any, i: number) => (
                              <p key={i} className="text-xs">
                                📄 {d.file_name || d.document_id}
                                {d.page_start && ` (p. ${d.page_start})`}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence */}
                      {run.output_structured?.evidences?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Evidências</p>
                          {run.output_structured.evidences.map((ev: any, i: number) => (
                            <p key={i} className="text-xs">
                              [{ev.ref_index}] {ev.document_name}{ev.page ? ` p.${ev.page}` : ''}: {ev.excerpt?.slice(0, 100)}...
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Output */}
                      {run.output_text && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Saída (prévia)</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {run.output_text.slice(0, 1000)}...
                          </pre>
                        </div>
                      )}

                      {run.error_message && (
                        <div>
                          <p className="text-xs font-medium text-destructive mb-1">Erro</p>
                          <p className="text-xs text-destructive">{run.error_message}</p>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Redação: {run.redaction_level} • ID: {run.id}
                      </p>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </AIPageLayout>
    </motion.div>
  );
}
