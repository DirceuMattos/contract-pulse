import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/asana';

interface Body {
  reportId: string;
  asanaProjectId: string;
  month: number;
  year: number;
  sectionKey?: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  completed_at: string | null;
  permalink_url?: string;
  assignee?: { name?: string };
  memberships?: { section?: { name?: string } }[];
  tags?: { name: string }[];
}

const INNOVATION_TAGS = ['Novas Funcionalidades', 'Evolução', 'Integrações'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reportId, asanaProjectId, month, year } = (await req.json()) as Body;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const asanaKey = Deno.env.get('ASANA_API_KEY');
    if (!lovableKey || !asanaKey) {
      throw new Error('Conector Asana não está vinculado. Vincule via Connectors.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString();

    const url = `${GATEWAY_URL}/tasks?project=${encodeURIComponent(asanaProjectId)}&limit=100&opt_fields=gid,name,completed,completed_at,permalink_url,assignee.name,memberships.section.name,tags.name`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': asanaKey,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Asana ${resp.status}: ${text.slice(0, 300)}`);
    }
    const payload = await resp.json();
    const tasks: AsanaTask[] = payload.data ?? [];

    const inMonth = (t: AsanaTask) => t.completed_at && t.completed_at >= monthStart && t.completed_at < monthEnd;
    const concluidas = tasks.filter((t) => t.completed && inMonth(t));
    const ativas = tasks.filter((t) => !t.completed);

    const toRow = (t: AsanaTask) => ({
      tarefa: t.name,
      status: t.completed ? 'Concluída' : (t.memberships?.[0]?.section?.name ?? 'Em Andamento'),
      categoria: t.tags?.[0]?.name ?? '',
      assignee: t.assignee?.name ?? '',
      url: t.permalink_url,
    });

    const entregas = { linhas: concluidas.map(toRow) };
    const priorizadas = { linhas: ativas.map(toRow) };

    const tagCounts: Record<string, number> = { 'Novas Funcionalidades': 0, 'Evolução': 0, 'Integrações': 0, 'Outros': 0 };
    concluidas.forEach((t) => {
      const tag = (t.tags ?? []).map((x) => x.name).find((n) => INNOVATION_TAGS.includes(n));
      if (tag) tagCounts[tag] += 1; else tagCounts['Outros'] += 1;
    });
    const total = concluidas.length || 1;
    const innovCount = tagCounts['Novas Funcionalidades'] + tagCounts['Evolução'] + tagCounts['Integrações'];
    const evolucao = {
      tags: tagCounts,
      percentualInovacao: Math.round((innovCount / total) * 100),
      status: '',
      analise: '',
    };

    const previsibilidade = {
      frequenciaDeploy: String(concluidas.length),
      leadTime: '',
      pbiTestedRatio: '',
      efficiencyRatio: '',
      demandas: String(tasks.length),
      falhasEvitadas: '',
      status: '',
      analise: '',
    };

    const now = new Date().toISOString();
    const updates: Array<{ key: string; content: unknown }> = [
      { key: 'entregas', content: entregas },
      { key: 'priorizadas', content: priorizadas },
      { key: 'evolucao_inovacao', content: evolucao },
      { key: 'eficiencia_previsibilidade', content: previsibilidade },
    ];
    for (const u of updates) {
      await supabase.from('report_sections')
        .update({ content: u.content, synced_at: now, source: 'asana', updated_at: now })
        .eq('report_id', reportId).eq('section_key', u.key);
    }

    await supabase.from('report_sync_logs').insert({
      report_id: reportId, source: 'asana', status: 'success',
      records_fetched: tasks.length, synced_at: now,
    });

    return new Response(JSON.stringify({ ok: true, tasks: tasks.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
