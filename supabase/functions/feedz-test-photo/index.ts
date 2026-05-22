const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const feedzToken = Deno.env.get('FEEDZ_API_TOKEN');
    if (!feedzToken) {
      return new Response(JSON.stringify({ error: 'FEEDZ_API_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get('id') ?? '2051079';
    const response = await fetch(`https://app.feedz.com.br/v2/integracao/employees/${id}`, {
      headers: {
        'Authorization': `Bearer ${feedzToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BNP-Contratos/1.0',
      },
    });
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return new Response(JSON.stringify({ status: response.status, data }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
