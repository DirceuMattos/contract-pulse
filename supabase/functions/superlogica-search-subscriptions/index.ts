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

  while (page <= 20) {
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

function isEmptyDate(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s === "0000-00-00" || s === "";
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

    const clientId = await findClientByCnpj(cnpjNorm);
    if (!clientId) {
      return json({ ok: true, cnpj: cnpjNorm, subscriptions: [] });
    }

    const data = await superlogicaGet(
      `/v2/financeiro/assinaturas?idSacado=${clientId}&itensPorPagina=100`
    );

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    console.log(`[superlogica] Found ${items.length} raw item(s) for client ${clientId}`);

    // Group items by id_planocliente_plc and sum values
    // API fields discovered from raw payload:
    //   total / mrr = subscription value
    //   dt_cancelamento_plc = cancellation date (empty = active)
    //   dt_congelamento_sac = freeze date (client level, but only indicator available)
    //   id_planocliente_plc = subscription ID
    //   st_nome_pla = plan name
    //   fl_periodicidade_pla = periodicity

    const groups: Record<string, {
      id: string;
      label: string;
      amount: number;
      periodicity: string;
      cancelled: boolean;
    }> = {};

    for (const s of items) {
      const subId = String(s.id_planocliente_plc ?? "");
      if (!subId) continue;

      const cancelled = !isEmptyDate(s.dt_cancelamento_plc);
      // Use "total" or "mrr" field for the subscription value
      const amount = Number(s.total ?? s.mrr ?? s.vl_aproxrenovacao_plc ?? 0);

      if (!groups[subId]) {
        groups[subId] = {
          id: subId,
          label: s.st_nome_pla ?? s.st_identificador_plc ?? "Assinatura",
          amount: 0,
          periodicity: String(s.fl_periodicidade_pla ?? ""),
          cancelled,
        };
      }

      // The API returns one row per subscription (not per service item within it)
      // so we take the max amount (in case of duplicates) rather than summing
      if (amount > groups[subId].amount) {
        groups[subId].amount = amount;
      }

      // If any row for this subId is NOT cancelled, mark group as active
      if (!cancelled) {
        groups[subId].cancelled = false;
      }
    }

    const allSubscriptions = Object.values(groups).map((g) => {
      const periodicityMap: Record<string, string> = {
        "0": "Mensal",
        "1": "Bimestral",
        "2": "Trimestral",
        "3": "Semestral",
        "4": "Anual",
      };

      return {
        superlogica_subscription_id: g.id,
        label: g.label,
        status: g.cancelled ? "cancelada" : "ativa",
        amount: g.amount,
        periodicity: periodicityMap[g.periodicity] ?? g.periodicity,
        cnpj: cnpjNorm,
      };
    });

    console.log(`[superlogica] Grouped into ${allSubscriptions.length} subscription(s): ${allSubscriptions.map(s => `${s.label}=R$${s.amount}(${s.status})`).join(', ')}`);

    // Filter: only active subscriptions with total amount > 0
    const subscriptions = allSubscriptions
      .filter((s) => s.status === "ativa" && s.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    console.log(`[superlogica] Filtered to ${subscriptions.length} active subscriptions with amount > 0`);

    return json({ ok: true, cnpj: cnpjNorm, subscriptions });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
