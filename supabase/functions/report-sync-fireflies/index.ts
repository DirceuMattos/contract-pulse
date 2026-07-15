// v2 - merge-preserva-manual: treinamentos_reunioes (nao apaga itens/rodape manuais)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/fireflies';

// ── merge-preserva-manual (espelho de src/lib/reportMergeManual.ts) ──
function deriveSyncKey(item: Record<string, unknown>): string {
  const gid = item.gid ?? item.id ?? item.task_id;
  if (gid != null && String(gid).trim() !== '') return `gid:${String(gid)}`;
  const desc = (item.descricao ?? item.tarefa ?? item.nome ?? '') as string;
  const data = (item.data ?? '') as string;
  return `nome:${desc.trim().toLowerCase()}|${data}`;
}
function mergeLinhas(
  currentContent: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  const cur = (currentContent?.linhas ?? []) as any[];
  const manualItems = cur
    .filter((it) => it?.origem === 'manual')
    .map((it) => ({ ...it, origem: 'manual', syncKey: it.syncKey ?? deriveSyncKey(it) }));
  const seen = new Set<string>();
  const syncItems: any[] = [];
  for (const it of incoming) {
    const k = deriveSyncKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    syncItems.push({ ...it, origem: 'sync', syncKey: k });
  }
  const norm = (it: any) => String(it.descricao ?? it.tarefa ?? it.nome ?? '').trim().toLowerCase();
  const order: string[] = [];
  const byName = new Map<string, any[]>();
  const push = (it: any) => { const n = norm(it); if (!byName.has(n)) { byName.set(n, []); order.push(n); } byName.get(n)!.push(it); };
  manualItems.forEach(push);
  syncItems.forEach(push);
  const result: any[] = [];
  for (const n of order) {
    const g = byName.get(n)!;
    g.sort((a, b) => (a.origem === 'manual' ? -1 : 1) - (b.origem === 'manual' ? -1 : 1));
    result.push(...g);
  }
  return result;
}
function mergeScalar(
  currentContent: Record<string, unknown> | null | undefined,
  field: string,
  incomingValue: unknown,
): Record<string, unknown> {
  const mf = Array.isArray(currentContent?._manualFields) ? (currentContent!._manualFields as string[]) : [];
  if (mf.includes(field)) {
    return { [field]: currentContent?.[field], [`${field}__sync`]: incomingValue };
  }
  return { [field]: incomingValue };
}

interface Body {
  reportId: string;
  clientEmailDomain?: string;
  firefliesKeywords?: string[];
  month: number;
  year: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reportId, clientEmailDomain, firefliesKeywords = [], month, year } = (await req.json()) as Body;
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const firefliesKey = Deno.env.get('FIREFLIES_API_KEY');
    if (!lovableKey || !firefliesKey) {
      const msg = 'Conector Fireflies não está vinculado. A seção pode ser preenchida manualmente.';
      const now = new Date().toISOString();
      if (reportId) {
        await supabase.from('report_sync_logs').insert({
          report_id: reportId,
          source: 'fireflies',
          status: 'skipped',
          records_fetched: 0,
          error_message: msg,
          synced_at: now,
        });
      }
      return new Response(JSON.stringify({ ok: true, skipped: true, count: 0, message: msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const toDate = new Date(Date.UTC(year, month, 1)).toISOString();

    const query = `
      query($from: DateTime, $to: DateTime) {
        transcripts(fromDate: $from, toDate: $to, limit: 100) {
          id title date duration
          participants
          summary { short_summary }
        }
      }
    `;
    const resp = await fetch(`${GATEWAY_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': firefliesKey,
      },
      body: JSON.stringify({ query, variables: { from: fromDate, to: toDate } }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Fireflies ${resp.status}: ${text.slice(0, 300)}`);
    }
    const json = await resp.json();
    const transcripts: Array<{ title: string; date: number; participants?: string[]; summary?: { short_summary?: string } }> =
      json?.data?.transcripts ?? [];

    const domain = (clientEmailDomain ?? '').toLowerCase().trim();
    const kws = firefliesKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    const filtered = transcripts.filter((t) => {
      const titleLc = (t.title ?? '').toLowerCase();
      const titleMatch = kws.some((k) => titleLc.includes(k));
      const domainMatch = domain && (t.participants ?? []).some((p) => p.toLowerCase().endsWith(`@${domain}`));
      return titleMatch || domainMatch || (!domain && kws.length === 0);
    });

    const linhas = filtered.map((t) => ({
      tipo: 'Reunião',
      data: new Date(t.date).toISOString().slice(0, 10),
      descricao: `${t.title}${t.summary?.short_summary ? ' — ' + t.summary.short_summary : ''}`,
    }));

    const now = new Date().toISOString();

    // Merge-preserva-manual: lê o content atual, preserva itens/rodape manuais.
    const { data: trAtual } = await supabase
      .from('report_sections').select('content')
      .eq('report_id', reportId).eq('section_key', 'treinamentos_reunioes').maybeSingle();
    const trContent = (trAtual?.content ?? {}) as Record<string, unknown>;
    const trMerged = {
      ...trContent,
      linhas: mergeLinhas(trContent, linhas),
      ...mergeScalar(trContent, 'rodape', (trContent.rodape as string) ?? ''),
    };
    await supabase.from('report_sections')
      .update({ content: trMerged, synced_at: now, source: 'fireflies', updated_at: now })
      .eq('report_id', reportId).eq('section_key', 'treinamentos_reunioes');

    await supabase.from('report_sync_logs').insert({
      report_id: reportId, source: 'fireflies', status: 'success',
      records_fetched: filtered.length, synced_at: now,
    });

    return new Response(JSON.stringify({ ok: true, count: filtered.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
