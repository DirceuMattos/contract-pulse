import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/fireflies';

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
    await supabase.from('report_sections')
      .update({ content: { linhas, rodape: '' }, synced_at: now, source: 'fireflies', updated_at: now })
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
