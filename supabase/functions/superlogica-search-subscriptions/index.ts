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
    console.log(`[superlogica] Found ${items.length} raw item(s) for client ${clientId}`);

    // Debug: log first 2 items' status fields to identify correct field names
    for (let i = 0; i < Math.min(2, items.length); i++) {
      const s = items[i];
      console.log(`[superlogica] Item ${i} fields: id_planocliente_plc=${s.id_planocliente_plc}, fl_valor_plc=${s.fl_valor_plc}, st_nome_pla=${s.st_nome_pla}, dt_desativacao_plc=${s.dt_desativacao_plc}, dt_congelamento_plc=${s.dt_congelamento_plc}, fl_ativo_plc=${s.fl_ativo_plc}, dt_desativacao_sac=${s.dt_desativacao_sac}`);
    }

    // Step 3: Group items by subscription ID (id_planocliente_plc) and sum values
    const groups: Record<string, {
      id: string;
      label: string;
      amount: number;
      periodicity: string;
      deactivated: boolean;
      frozen: boolean;
    }> = {};

    for (const s of items) {
      const subId = String(s.id_planocliente_plc ?? s.id ?? "");
      if (!subId) continue;

      // Use _plc (plan/subscription) fields, NOT _sac (client) fields
      const deactivated = !!(s.dt_desativacao_plc && s.dt_desativacao_plc !== "0000-00-00");
      const frozen = !!(s.dt_congelamento_plc && s.dt_congelamento_plc !== "0000-00-00");
      // Also check fl_ativo_plc as fallback (0 = inactive)
      const explicitlyInactive = s.fl_ativo_plc !== undefined && String(s.fl_ativo_plc) === "0";

      const amount = Number(s.fl_valor_plc ?? s.fl_valor_pla ?? 0);

      if (!groups[subId]) {
        groups[subId] = {
          id: subId,
          label: s.st_nome_pla ?? s.st_descricao_plc ?? "Assinatura",
          amount: 0,
          periodicity: s.st_periodicidade_pla ?? "",
          deactivated: deactivated || explicitlyInactive,
          frozen,
        };
      }

      // Sum amounts for all items in the same subscription
      groups[subId].amount += amount;

      // If any item in the group is active, consider the group active
      if (!deactivated && !explicitlyInactive) {
        groups[subId].deactivated = false;
      }
    }

    const allSubscriptions = Object.values(groups).map((g) => {
      let status = "ativa";
      if (g.deactivated) status = "cancelada";
      else if (g.frozen) status = "congelada";

      return {
        superlogica_subscription_id: g.id,
        label: g.label,
        status,
        amount: g.amount,
        periodicity: g.periodicity,
        cnpj: cnpjNorm,
      };
    });

    console.log(`[superlogica] Grouped into ${allSubscriptions.length} subscription(s): ${allSubscriptions.map(s => `${s.label}=${s.amount}(${s.status})`).join(', ')}`);

    // Filter: only active subscriptions with total amount > 0
    const subscriptions = allSubscriptions
      .filter((s) => s.status === "ativa" && s.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    console.log(`[superlogica] Filtered to ${subscriptions.length} active subscriptions with amount > 0 (from ${allSubscriptions.length} grouped)`);

    return json({ ok: true, cnpj: cnpjNorm, subscriptions });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
