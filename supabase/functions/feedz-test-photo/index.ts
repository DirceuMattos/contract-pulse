const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const feedzToken = Deno.env.get('FEEDZ_API_TOKEN');
    if (!feedzToken) {
      return new Response(JSON.stringify({ error: 'FEEDZ_API_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const url = new URL(req.url);
    const targetId = Number(url.searchParams.get('id') ?? '2051079');

    const statuses = ['Ativo', 'Desligado', 'Desativado'];
    const statusParams = statuses.map(s => `status[]=${encodeURIComponent(s)}`).join('&');
    let next: string | null = `https://app.feedz.com.br/v2/integracao/employees?${statusParams}`;
    let pages = 0;
    let found: unknown = null;
    let sampleKeys: string[] = [];

    // Single request — no retries (avoid timeout). The /employees endpoint without
    // pagination params returns ALL employees in one response (per feedz-sync usage).
    const resp = await fetch(next, {
      headers: {
        'Authorization': `Bearer ${feedzToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BNP-Contratos/1.0',
      },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: 'feedz error', status: resp.status, body: txt.slice(0, 800) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await resp.json();
    const records: any[] = Array.isArray(body) ? body : (body.data ?? []);
    if (records.length && !sampleKeys.length) sampleKeys = Object.keys(records[0]);
    found = records.find((r: any) => Number(r?.id) === targetId || Number(r?.profile?.id) === targetId) ?? null;
    pages = 1;

    return new Response(JSON.stringify({
      pagesScanned: pages,
      sampleTopLevelKeys: sampleKeys,
      found,
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
