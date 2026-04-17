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

function formatCnpj(d: string): string {
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
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

/**
 * Try to find the customer using the server-side `pesquisa` filter,
 * which accepts CNPJ in different formats. Tests both digits-only
 * and the formatted CNPJ. Returns the first match (by CNPJ equality).
 */
async function searchClientByPesquisa(cnpjDigits: string): Promise<string | null> {
  const variants = [cnpjDigits, formatCnpj(cnpjDigits)];
  for (const term of variants) {
    try {
      const data = await superlogicaGet(
        `/v2/financeiro/clientes?apenasColunasPrincipais=1&itensPorPagina=50&pesquisa=${encodeURIComponent(term)}`
      );
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      console.log(`[superlogica] pesquisa="${term}" returned ${items.length} candidate(s)`);
      for (const c of items) {
        const cgc = onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? "");
        if (cgc === cnpjDigits) {
          const id = String(c.id_sacado_sac ?? "");
          console.log(`[superlogica] ✓ Match via pesquisa("${term}"): client id=${id}`);
          return id;
        }
      }
    } catch (e) {
      console.warn(`[superlogica] pesquisa="${term}" failed: ${String(e)}`);
    }
  }
  return null;
}

/** Fallback: brute-force pagination (up to 50 pages) when pesquisa fails. */
async function findClientByPagination(cnpjDigits: string): Promise<string | null> {
  let page = 1;
  const perPage = 50;
  const maxPages = 50;

  while (page <= maxPages) {
    const data = await superlogicaGet(
      `/v2/financeiro/clientes?apenasColunasPrincipais=1&itensPorPagina=${perPage}&pagina=${page}`
    );

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (!items.length) break;

    for (const c of items) {
      const cgc = onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? "");
      if (cgc === cnpjDigits) {
        const id = String(c.id_sacado_sac ?? "");
        console.log(`[superlogica] ✓ Match via pagination (page ${page}): client id=${id}`);
        return id;
      }
    }

    if (items.length < perPage) break;
    page++;
  }

  console.log(`[superlogica] ✗ Pagination scanned ${page} page(s), no match for CNPJ ${cnpjDigits}`);
  return null;
}

async function findClientByCnpj(cnpjDigits: string): Promise<string | null> {
  // Strategy 1 (fast): server-side `pesquisa` filter
  const fromSearch = await searchClientByPesquisa(cnpjDigits);
  if (fromSearch) return fromSearch;

  // Strategy 2 (fallback): brute pagination
  console.log(`[superlogica] pesquisa returned no match — falling back to pagination`);
  return await findClientByPagination(cnpjDigits);
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

    console.log(`[superlogica] === Searching subscriptions for CNPJ ${cnpjNorm} ===`);

    const clientId = await findClientByCnpj(cnpjNorm);
    if (!clientId) {
      console.log(`[superlogica] No client found for CNPJ ${cnpjNorm}`);
      return json({ ok: true, cnpj: cnpjNorm, subscriptions: [], clientFound: false });
    }

    const data = await superlogicaGet(
      `/v2/financeiro/assinaturas?idSacado=${clientId}&itensPorPagina=100`
    );

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    console.log(`[superlogica] Found ${items.length} raw item(s) for client ${clientId}`);

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

      groups[subId].amount += amount;

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

    const subscriptions = allSubscriptions
      .filter((s) => s.status === "ativa" && s.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    console.log(`[superlogica] Filtered to ${subscriptions.length} active subscriptions with amount > 0`);

    return json({ ok: true, cnpj: cnpjNorm, subscriptions, clientFound: true });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
