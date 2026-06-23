import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { reportTemplateConfigFromDb, reportTemplateConfigToDb } from '@/lib/dbMappers';
import { SECTION_META } from '@/lib/reportSectionSchemas';
import type { ReportTemplateConfig } from '@/types';

export default function ReportTemplateConfigPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { contracts, getClient } = useData();
  const { toast } = useToast();

  const [config, setConfig] = useState<Partial<ReportTemplateConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');
  const [milvusNamesText, setMilvusNamesText] = useState('');
  const [azureTagsText, setAzureTagsText] = useState('');

  const allowed = userRole === 'c-level' || userRole === 'superadmin';

  useEffect(() => {
    if (!allowed) {
      navigate('/relatorios', { replace: true });
      return;
    }
    if (!contractId) return;
    (async () => {
      const { data } = await supabase
        .from('report_template_configs').select('*').eq('contract_id', contractId).maybeSingle();
      if (data) {
        const c = reportTemplateConfigFromDb(data);
        setConfig(c);
        setKeywordsText((c.firefliesKeywords ?? []).join(', '));
        setMilvusNamesText((c.milvusClientNames ?? []).join('\n'));
        setAzureTagsText((c.azureTags ?? []).join(', '));
      } else {
        const defaults: Partial<ReportTemplateConfig> = {
          contractId,
          showHistoricoTr: true, showEvolucaoInovacao: true, showEntregas: true,
          showPriorizadas: true, showDemonstrativoHoras: true, showEficienciaOperacional: true,
          showEficienciaPrevisibilidade: true, showDesempenhoAplicacao: true,
          showEngajamentoUsuario: true, showMaturidadePlataforma: true,
          showTreinamentosReunioes: true, showOportunidadesAtencao: true,
          firefliesKeywords: [],
        };
        setConfig(defaults);
      }
      setLoading(false);
    })();
  }, [contractId, allowed, navigate]);

  const contract = contracts.find((c) => c.id === contractId);
  const client = contract ? getClient(contract.clientId) : undefined;

  const handleSave = async () => {
    if (!contractId) return;
    setSaving(true);
    const keywords = keywordsText.split(',').map((s) => s.trim()).filter(Boolean);
    const milvusNames = milvusNamesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const azureTags = azureTagsText.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = reportTemplateConfigToDb({ ...config, contractId, firefliesKeywords: keywords, milvusClientNames: milvusNames, azureTags });
    const { error } = await supabase
      .from('report_template_configs')
      .upsert(payload as any, { onConflict: 'contract_id' });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configuração salva' });
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const configurable = SECTION_META.filter((m) => m.configurable);

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/relatorios')}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Configuração do Template</h1>
          <p className="text-sm text-muted-foreground">{contract?.nome} · {client?.nomeFantasia || client?.razaoSocial}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Seções ativas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {configurable.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={Boolean((config as any)[m.configFlag!])}
                  onCheckedChange={(v) => setConfig({ ...config, [m.configFlag!]: !!v })}
                />
                {m.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Integrações</h2>
          <div>
            <Label>Asana Project ID</Label>
            <Input value={config.asanaProjectId ?? ''} onChange={(e) => setConfig({ ...config, asanaProjectId: e.target.value })} placeholder="123456789" />
          </div>
          <div>
            <Label>Domínio de e-mail do cliente</Label>
            <Input value={config.clientEmailDomain ?? ''} onChange={(e) => setConfig({ ...config, clientEmailDomain: e.target.value })} placeholder="prefeitura.sp.gov.br" />
          </div>
          <div>
            <Label>Palavras-chave Fireflies (separadas por vírgula)</Label>
            <Textarea value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} rows={2} placeholder="treinamento, daily, alinhamento" />
          </div>
          <div>
            <Label>Clientes Milvus (um por linha)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Nomes dos clientes no Milvus vinculados a este contrato. Um nome por linha.
            </p>
            <Textarea
              value={milvusNamesText}
              onChange={(e) => setMilvusNamesText(e.target.value)}
              rows={6}
              placeholder={"CLIENTE A\nCLIENTE B\nCLIENTE C"}
            />
            {milvusNamesText && (
              <p className="text-xs text-muted-foreground mt-1">
                {milvusNamesText.split('\n').filter(Boolean).length} cliente(s) configurado(s)
              </p>
            )}
          </div>
       <div>
            <Label>🔷 Azure DevOps — Nome do Projeto</Label>
            <Input
              value={config.azureProject ?? ''}
              onChange={(e) => setConfig({ ...config, azureProject: e.target.value })}
              placeholder="ex: SMC"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Nome exato do projeto em dev.azure.com/bnpdesenvolvimento</p>
          </div>
          <div>
            <Label>🔷 Azure DevOps — Tags de filtro (separadas por vírgula)</Label>
            <Input
              value={azureTagsText}
              onChange={(e) => setAzureTagsText(e.target.value)}
              placeholder="ex: SMC, Todos"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Deixe vazio para buscar todos os work items sem filtro de tag.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
