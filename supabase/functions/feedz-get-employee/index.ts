const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function findPhotoLikeFields(obj: unknown, path = ''): Array<{ path: string; value: unknown }> {
  const out: Array<{ path: string; value: unknown }> = [];
  const re = /foto|photo|picture|avatar|image|imagem|url/i;
  function walk(v: unknown, p: string) {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) { v.forEach((item, i) => walk(item, `${p}[${i}]`)); return; }
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const np = p ? `${p}.${k}` : k;
        if (re.test(k)) out.push({ path: np, value: val });
        walk(val, np);
      }
    }
  }
  walk(obj, path);
  return out;
}

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
    const id = url.searchParams.get('id') ?? '2051079';
    const target = `https://app.feedz.com.br/v2/integracao/employees/${id}`;

    const resp = await fetch(target, {
      headers: {
        'Authorization': `Bearer ${feedzToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'BNP-Contratos/1.0',
      },
    });

    const rawText = await resp.text();
    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => { respHeaders[k] = v; });

    let parsed: unknown = null;
    let parseError: string | null = null;
    try { parsed = JSON.parse(rawText); } catch (e) { parseError = (e as Error).message; }

    const photoLikeFields = parsed ? findPhotoLikeFields(parsed) : [];

    return new Response(JSON.stringify({
      requestUrl: target,
      status: resp.status,
      ok: resp.ok,
      responseHeaders: respHeaders,
      parseError,
      photoLikeFields,
      bodyParsed: parsed,
      bodyRaw: parsed ? undefined : rawText.slice(0, 4000),
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
