const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function onlyDigits(x: string) {
  return (x || "").replace(/\D/g, "");
}

function normalizeBase(raw: string): string {
  // If the value doesn't look like a URL, use the default
  if (!raw || !raw.startsWith("http")) {
    return "https://api.superlogica.net";
  }
  let b = raw.replace(/\/+$/, "");
  if (b.endsWith("/v2/financeiro")) {
    b = b.slice(0, -"/v2/financeiro".length);
  }
  return b;
}

async function superlogicaGet(path: string) {
  const API_BASE = normalizeBase(Deno.env.get("SUPERLOGICA_API_BASE")!);
  const APP_TOKEN = Deno.env.get("SUPERLOGICA_APP_TOKEN")!;
  const ACCESS_TOKEN = Deno.env.get("SUPERLOGICA_ACCESS_TOKEN")!;

  const url = `${API_BASE}${path}`;
  console.log(`[superlogica] GET ${url}`);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      app_token: APP_TOKEN,
      access_token: ACCESS_TOKEN,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[superlogica] HTTP ${res.status}: ${body}`);
    throw new Error(`Superlógica HTTP ${res.status}: ${body}`);
  }
  return await res.json();
}

async function findClientByCnpj(cnpjDigits: string): Promise<string | null> {
  let page = 1;
  const perPage = 50;

  while (page <= 20) { // safety limit
    const data = await superlogicaGet(
      `/v2/financeiro/clientes?apenasColunasPrincipais=1&itensPorPagina=${perPage}&pagina=${page}`
    );

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (!items.length) break;

    for (const c of items) {
      const cgc = onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? "");
      if (cgc === cnpjDigits) {
        const id = String(c.id_sacado_sac ?? "");
        console.log(`[superlogica] Found client id=${id} for CNPJ ${cnpjDigits}`);
        return id;
      }
    }

    if (items.length < perPage) break;
    page++;
  }

  console.log(`[superlogica] No client found for CNPJ ${cnpjDigits} after ${page} pages`);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const { cnpj } = await req.json().catch(() => ({}));
    const cnpjNorm = onlyDigits(cnpj);
    if (!cnpjNorm) return json({ error: "cnpj required" }, 400);

    console.log(`[superlogica] Searching subscriptions for CNPJ ${cnpjNorm}`);

    // Step 1: Find client by CNPJ
    const clientId = await findClientByCnpj(cnpjNorm);
    if (!clientId) {
      return json({ ok: true, cnpj: cnpjNorm, subscriptions: [] });
    }

    // Step 2: Fetch subscriptions for that client
    const data = await superlogicaGet(
      `/v2/financeiro/assinaturas?idSacado=${clientId}&itensPorPagina=100`
    );

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    console.log(`[superlogica] Found ${items.length} subscription(s) for client ${clientId}`);

    const subscriptions = items.map((s: any) => {
      const deactivated = !!s.dt_desativacao_sac;
      const frozen = !!s.dt_congelamento_sac;
      let status = "ativa";
      if (deactivated) status = "cancelada";
      else if (frozen) status = "congelada";

      return {
        superlogica_subscription_id: String(s.id_planocliente_plc ?? s.id ?? ""),
        label: s.st_nome_pla ?? s.st_descricao_plc ?? "Assinatura",
        status,
        amount: Number(s.fl_valor_plc ?? s.fl_valor_pla ?? 0),
        periodicity: s.st_periodicidade_pla ?? "",
        cnpj: cnpjNorm,
      };
    });

    return json({ ok: true, cnpj: cnpjNorm, subscriptions });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
