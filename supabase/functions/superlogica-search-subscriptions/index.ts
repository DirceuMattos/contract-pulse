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

interface ClientRow {
  id_sacado_sac?: string | number;
  st_nome_sac?: string;
  st_cgc_sac?: string;
  st_cpf_sac?: string;
}

/**
 * Loads ALL clients from Superlógica via pagination.
 * The Superlógica API does not actually filter clients server-side by CNPJ
 * (the `pesquisa` param matches on name only, and `CGC` is ignored), so we
 * cache the full list per request and search locally.
 */
async function loadAllClients(): Promise<ClientRow[]> {
  const all: ClientRow[] = [];
  const perPage = 50;
  const maxPages = 100; // safety cap (5,000 clients)
  let page = 1;
  while (page <= maxPages) {
    const data = await superlogicaGet(
      `/v2/financeiro/clientes?apenasColunasPrincipais=1&itensPorPagina=${perPage}&pagina=${page}`
    );
    const items: ClientRow[] = Array.isArray(data) ? data : (data?.data ?? []);
    if (!items.length) break;
    all.push(...items);
    if (items.length < perPage) break;
    page++;
  }
  console.log(`[superlogica] Loaded ${all.length} client(s) across ${page} page(s)`);
  return all;
}

function findClientByCnpj(clients: ClientRow[], cnpjDigits: string): string | null {
  for (const c of clients) {
    const cgc = onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? "");
    if (cgc === cnpjDigits) {
      const id = String(c.id_sacado_sac ?? "");
      console.log(`[superlogica] ✓ Match by CNPJ: client id=${id} name="${c.st_nome_sac}"`);
      return id;
    }
  }
  return null;
}

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns up to N name suggestions whose normalized name contains any token of the search name. */
function findNameSuggestions(clients: ClientRow[], rawName: string, limit = 8): Array<{ id: string; name: string; cnpj: string }> {
  const norm = normalizeName(rawName);
  if (!norm) return [];
  const tokens = norm.split(" ").filter((t) => t.length >= 3);
  if (!tokens.length) return [];

  const scored: Array<{ id: string; name: string; cnpj: string; score: number }> = [];
  for (const c of clients) {
    const cn = normalizeName(c.st_nome_sac ?? "");
    if (!cn) continue;
    let score = 0;
    for (const t of tokens) {
      if (cn.includes(t)) score += t.length;
    }
    if (score > 0) {
      scored.push({
        id: String(c.id_sacado_sac ?? ""),
        name: c.st_nome_sac ?? "",
        cnpj: onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? ""),
        score,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ id, name, cnpj }) => ({ id, name, cnpj }));
}

function isEmptyDate(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s === "0000-00-00";
}

async function fetchSubscriptionsForClient(clientId: string, cnpjNorm: string) {
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
    if (!cancelled) groups[subId].cancelled = false;
  }

  const periodicityMap: Record<string, string> = {
    "0": "Mensal", "1": "Bimestral", "2": "Trimestral", "3": "Semestral", "4": "Anual",
  };

  const all = Object.values(groups).map((g) => ({
    superlogica_subscription_id: g.id,
    superlogica_client_id: clientId,
    label: g.label,
    status: g.cancelled ? "cancelada" : "ativa",
    amount: g.amount,
    periodicity: periodicityMap[g.periodicity] ?? g.periodicity,
    cnpj: cnpjNorm,
  }));

  return all
    .filter((s) => s.status === "ativa" && s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const cnpj: string = body.cnpj ?? "";
    const clientName: string = body.clientName ?? "";
    const overrideClientId: string = body.superlogicaClientId ?? "";

    const cnpjNorm = onlyDigits(cnpj);
    console.log(`[superlogica] === Search request: CNPJ="${cnpjNorm}" name="${clientName}" override="${overrideClientId}" ===`);

    // If caller already knows the Superlógica client id, skip the lookup.
    if (overrideClientId) {
      const subs = await fetchSubscriptionsForClient(overrideClientId, cnpjNorm);
      return json({
        ok: true,
        cnpj: cnpjNorm,
        subscriptions: subs,
        clientFound: true,
        superlogicaClientId: overrideClientId,
        suggestions: [],
      });
    }

    if (!cnpjNorm && !clientName) {
      return json({ error: "cnpj or clientName required" }, 400);
    }

    // Load full client list once and search locally.
    const allClients = await loadAllClients();

    let clientId: string | null = null;
    if (cnpjNorm) clientId = findClientByCnpj(allClients, cnpjNorm);

    if (!clientId) {
      const suggestions = clientName ? findNameSuggestions(allClients, clientName) : [];
      console.log(`[superlogica] ✗ No CNPJ match for "${cnpjNorm}". Returning ${suggestions.length} name suggestion(s).`);
      return json({
        ok: true,
        cnpj: cnpjNorm,
        subscriptions: [],
        clientFound: false,
        superlogicaClientId: null,
        totalClientsScanned: allClients.length,
        suggestions,
      });
    }

    const subs = await fetchSubscriptionsForClient(clientId, cnpjNorm);
    return json({
      ok: true,
      cnpj: cnpjNorm,
      subscriptions: subs,
      clientFound: true,
      superlogicaClientId: clientId,
      suggestions: [],
    });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
