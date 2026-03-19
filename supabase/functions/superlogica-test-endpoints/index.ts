const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeBase(raw: string): string {
  if (!raw || !raw.startsWith("http")) return "https://api.superlogica.net";
  let b = raw.replace(/\/+$/, "");
  if (b.endsWith("/v2/financeiro")) b = b.slice(0, -"/v2/financeiro".length);
  return b;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const API_BASE = normalizeBase(Deno.env.get("SUPERLOGICA_API_BASE") || "");
  const APP_TOKEN = Deno.env.get("SUPERLOGICA_APP_TOKEN")!;
  const ACCESS_TOKEN = Deno.env.get("SUPERLOGICA_ACCESS_TOKEN")!;

  const { path } = await req.json().catch(() => ({ path: "" }));

  // Test multiple endpoints to find the right one for cobranças
  const testPaths = path ? [path] : [
    "/v2/financeiro/cobrancas?pagina=1&itensPorPagina=2",
    "/v2/financeiro/cobranca?pagina=1&itensPorPagina=2",
    "/v2/financeiro/recebimentos?pagina=1&itensPorPagina=2",
    "/v2/financeiro/recebimento?pagina=1&itensPorPagina=2",
    "/v2/financeiro/inadimplencia?pagina=1&itensPorPagina=2",
    "/v2/financeiro/faturas?pagina=1&itensPorPagina=2",
  ];

  const results: any[] = [];
  for (const p of testPaths) {
    const url = `${API_BASE}${p}`;
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          app_token: APP_TOKEN,
          access_token: ACCESS_TOKEN,
        },
      });
      const body = await res.json().catch(() => null);
      results.push({
        path: p,
        status: res.status,
        keys: Array.isArray(body) && body[0] ? Object.keys(body[0]) : null,
        recebimentoKeys: Array.isArray(body) && body[0]?.recebimento?.[0] ? Object.keys(body[0].recebimento[0]) : null,
        recebimentoSample: Array.isArray(body) && body[0]?.recebimento?.[0] ? body[0].recebimento[0] : null,
        itemCount: Array.isArray(body) ? body.length : null,
        recebimentoCount: Array.isArray(body) && body[0]?.recebimento ? body[0].recebimento.length : null,
      });
    } catch (e) {
      results.push({ path: p, error: String(e) });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
