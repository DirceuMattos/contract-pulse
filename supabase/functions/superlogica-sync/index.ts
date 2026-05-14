import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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

function onlyDigits(x: string) {
  return (x || "").replace(/\D/g, "");
}

async function superlogicaGet(path: string) {
  const API_BASE = normalizeBase(Deno.env.get("SUPERLOGICA_API_BASE") || "");
  const APP_TOKEN = Deno.env.get("SUPERLOGICA_APP_TOKEN")!;
  const ACCESS_TOKEN = Deno.env.get("SUPERLOGICA_ACCESS_TOKEN")!;

  const url = `${API_BASE}${path}`;
  console.log(`[superlogica-sync] GET ${url}`);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      app_token: APP_TOKEN,
      access_token: ACCESS_TOKEN,
    },
  });
  if (!res.ok)
    throw new Error(`Superlógica HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

/** Normalize a string for name matching (lowercase, no accents/punctuation). */
function normalizeNameStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_STOPLIST = new Set([
  "ltda", "me", "eireli", "sa", "s", "comercio", "industria",
  "do", "da", "de", "dos", "das", "e",
]);

/** Resolve CNPJ → Superlógica customer ID (id_sacado_sac), with optional name fallback. */
async function findClientByCnpj(
  cnpjDigits: string,
  razaoSocial?: string
): Promise<string | null> {
  let page = 1;
  const perPage = 50;
  const allClients: Array<{ id: string; name: string }> = [];

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
        console.log(`[superlogica-sync] Found customer id=${id} for CNPJ ${cnpjDigits}`);
        return id;
      }
      allClients.push({
        id: String(c.id_sacado_sac ?? ""),
        name: String(c.st_nome_sac ?? ""),
      });
    }

    if (items.length < perPage) break;
    page++;
  }

  // Fallback: try matching by company name (razão social)
  if (razaoSocial && razaoSocial.trim()) {
    const normRazao = normalizeNameStr(razaoSocial);
    const tokens = normRazao
      .split(" ")
      .filter((t) => t.length >= 4 && !NAME_STOPLIST.has(t));

    if (tokens.length) {
      const matches = allClients.filter((c) => {
        const n = normalizeNameStr(c.name);
        return tokens.every((t) => n.includes(t));
      });

      if (matches.length === 1) {
        console.log(
          `[superlogica-sync] Fallback by name matched id=${matches[0].id} for "${razaoSocial}" (CNPJ ${cnpjDigits} not found)`
        );
        return matches[0].id;
      }
      if (matches.length > 1) {
        console.log(
          `[superlogica-sync] Ambiguous name match for "${razaoSocial}": ${matches.length} candidates`
        );
      }
    }
  }

  console.log(`[superlogica-sync] No customer found for CNPJ ${cnpjDigits}`);
  return null;
}

function normalizeInvoiceStatus(s: string): string {
  const x = (s || "").toLowerCase();
  if (x.includes("paid") || x.includes("pago") || x.includes("liquidado"))
    return "paid";
  if (x.includes("overdue") || x.includes("atras") || x.includes("vencid"))
    return "overdue";
  if (x.includes("cancel")) return "canceled";
  if (x.includes("reneg")) return "renegotiated";
  return "open";
}

interface ContractRow {
  id: string;
  codigo: string;
  superlogica_subscription_id: string;
  superlogica_subscription_label: string | null;
  superlogica_customer_cnpj: string | null;
  superlogica_customer_id: string | null;
  valor_mensal_referencia: number | null;
}

/**
 * Try to disambiguate which contract an invoice belongs to by matching its
 * amount against each candidate contract's `valor_mensal_referencia`.
 * Returns the contract with the closest match within tolerance, or null.
 */
function matchContractByAmount(
  invoiceAmount: number,
  candidates: ContractRow[],
  tolerance = 0.02 // 2%
): ContractRow | null {
  if (!invoiceAmount || invoiceAmount <= 0) return null;
  let best: { contract: ContractRow; diff: number } | null = null;
  for (const c of candidates) {
    const ref = Number(c.valor_mensal_referencia ?? 0);
    if (!ref || ref <= 0) continue;
    const diff = Math.abs(ref - invoiceAmount) / ref;
    if (diff <= tolerance && (!best || diff < best.diff)) {
      best = { contract: c, diff };
    }
  }
  return best ? best.contract : null;
}

/** Inverse of matchContractByAmount: given a subscription amount, find the closest contract by valor_mensal_referencia. */
function findBestContractByAmount(
  subscriptionAmount: number,
  candidates: ContractRow[],
  tolerance = 0.02
): { contract: ContractRow; diff: number } | null {
  if (!subscriptionAmount || subscriptionAmount <= 0) return null;
  let best: { contract: ContractRow; diff: number } | null = null;
  for (const c of candidates) {
    const ref = Number(c.valor_mensal_referencia ?? 0);
    if (!ref || ref <= 0) continue;
    const diff = Math.abs(ref - subscriptionAmount) / ref;
    if (diff <= tolerance && (!best || diff < best.diff)) {
      best = { contract: c, diff };
    }
  }
  return best;
}

const KNOWN_SUBSCRIPTION_IDS = [
  '00cd4eb5-0b4a-4550-8e58-97accaa102b7',
  'ac940ed7-ed2b-4f16-9135-475991c58183',
  '9945029c-f0fc-4c72-9a8d-32203e2b0845',
  'b9188b9a-8c1c-444c-b819-28310ce3168f',
  '357a735f-0ead-46d9-a0cc-28f2361f292e',
  '4b59ab9c-22a4-42ea-ac46-82eec2efa5bb',
  'b5706280-6839-4965-9d3d-f3fe2bf2ae49',
  '9e33bb6d-eb4c-45bf-8df0-bcd2c5ebb7fe',
  '135bc51b-504e-43c6-9fcf-5919607308b8',
];

function isEmptyDate(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || s === "0000-00-00";
}

/** Aggregate active subscriptions for a Superlógica customer. */
async function fetchActiveSubscriptionsForCustomer(customerId: string): Promise<Array<{
  id: string;
  label: string;
  amount: number;
}>> {
  const data = await superlogicaGet(
    `/v2/financeiro/assinaturas?idSacado=${customerId}&itensPorPagina=100`
  );
  const items = Array.isArray(data) ? data : (data?.data ?? []);
  const groups: Record<string, { id: string; label: string; amount: number; cancelled: boolean }> = {};
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
        cancelled,
      };
    }
    groups[subId].amount += amount;
    if (!cancelled) groups[subId].cancelled = false;
  }
  return Object.values(groups)
    .filter((g) => !g.cancelled && g.amount > 0)
    .map(({ id, label, amount }) => ({ id, label, amount }));
}

/** Fetch a single subscription by id (used for KNOWN_SUBSCRIPTION_IDS fallback). */
async function fetchSubscriptionById(subId: string): Promise<{
  id: string;
  label: string;
  amount: number;
  customerId: string | null;
} | null> {
  try {
    const data = await superlogicaGet(
      `/v2/financeiro/assinaturas?id=${encodeURIComponent(subId)}&itensPorPagina=100`
    );
    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (!items.length) return null;
    let amount = 0;
    let label = "Assinatura";
    let customerId: string | null = null;
    let anyActive = false;
    for (const s of items) {
      const cancelled = !isEmptyDate(s.dt_cancelamento_plc);
      if (!cancelled) anyActive = true;
      amount += Number(s.total ?? s.mrr ?? s.vl_aproxrenovacao_plc ?? 0);
      label = s.st_nome_pla ?? s.st_identificador_plc ?? label;
      customerId = String(s.id_sacado_sac ?? customerId ?? "") || customerId;
    }
    if (!anyActive || amount <= 0) return null;
    return { id: subId, label, amount, customerId };
  } catch (e) {
    console.log(`[autolink] fetchSubscriptionById ${subId} failed: ${String(e)}`);
    return null;
  }
}

/** Resolve a Superlógica customer's CNPJ from its id. */
async function fetchCustomerCnpjById(customerId: string): Promise<string | null> {
  try {
    const data = await superlogicaGet(
      `/v2/financeiro/clientes?id=${encodeURIComponent(customerId)}&itensPorPagina=1`
    );
    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (!items.length) return null;
    const c = items[0];
    return onlyDigits(c.st_cgc_sac ?? c.st_cpf_sac ?? "") || null;
  } catch (e) {
    console.log(`[autolink] fetchCustomerCnpjById ${customerId} failed: ${String(e)}`);
    return null;
  }
}

/** Auto-link contracts that don't yet have a superlogica_subscription_id. */
async function autoLinkUnlinkedContracts(): Promise<number> {
  const { data: unlinkedRaw, error } = await sb
    .from("contracts")
    .select("id, codigo, valor_mensal_referencia, superlogica_customer_cnpj, superlogica_customer_id, superlogica_subscription_id, superlogica_subscription_label")
    .is("superlogica_subscription_id", null);
  if (error) {
    console.log(`[autolink] failed to load unlinked contracts: ${error.message}`);
    return 0;
  }
  let unlinked = (unlinkedRaw ?? []) as any[];
  const total = unlinked.length;
  console.log(`[autolink] starting with ${total} unlinked contract(s)`);
  if (!total) return 0;

  let linked = 0;

  // --- Attempt A: by CNPJ already on the contract ---
  // Group unlinked contracts by customerId/CNPJ to avoid duplicate API calls.
  const groups: Record<string, { customerId: string | null; cnpj: string; contracts: any[] }> = {};
  for (const c of unlinked) {
    const customerId = String(c.superlogica_customer_id ?? "").trim() || null;
    const cnpj = onlyDigits(c.superlogica_customer_cnpj ?? "");
    if (!customerId && !cnpj) continue;
    const key = customerId ? `id:${customerId}` : `cnpj:${cnpj}`;
    if (!groups[key]) groups[key] = { customerId, cnpj, contracts: [] };
    groups[key].contracts.push(c);
  }

  for (const [, g] of Object.entries(groups)) {
    try {
      let customerId = g.customerId;
      if (!customerId && g.cnpj) {
        customerId = await findClientByCnpj(g.cnpj);
      }
      if (!customerId) continue;

      const subs = await fetchActiveSubscriptionsForCustomer(customerId);
      if (!subs.length) continue;

      // For each subscription, find the closest still-unlinked contract in this group.
      for (const sub of subs) {
        const candidates = g.contracts.filter((c) => !c._linked);
        if (!candidates.length) break;
        const best = findBestContractByAmount(sub.amount, candidates as ContractRow[]);
        if (!best) continue;
        const c = best.contract as any;
        const update: Record<string, unknown> = {
          superlogica_subscription_id: sub.id,
          superlogica_subscription_label: sub.label,
          superlogica_customer_id: customerId,
        };
        if (!c.superlogica_customer_cnpj && g.cnpj) update.superlogica_customer_cnpj = g.cnpj;
        const { error: upErr } = await sb.from("contracts").update(update).eq("id", c.id);
        if (upErr) {
          console.log(`[autolink] update failed for contract ${c.codigo}: ${upErr.message}`);
          continue;
        }
        c._linked = true;
        linked++;
        console.log(
          `[autolink] contract=${c.codigo} ← subId=${sub.id} (R$${sub.amount} vs ref R$${c.valor_mensal_referencia}, diff ${(best.diff * 100).toFixed(2)}%) [via CNPJ]`
        );
      }
    } catch (e) {
      console.log(`[autolink] group ${g.customerId ?? g.cnpj} failed: ${String(e)}`);
    }
  }

  // --- Attempt B: known subscription IDs fallback ---
  const stillUnlinked = () => unlinked.filter((c) => !c._linked) as ContractRow[];
  for (const subId of KNOWN_SUBSCRIPTION_IDS) {
    const remaining = stillUnlinked();
    if (!remaining.length) break;
    const sub = await fetchSubscriptionById(subId);
    if (!sub) continue;
    const best = findBestContractByAmount(sub.amount, remaining);
    if (!best) {
      console.log(`[autolink] knownSub=${subId} (R$${sub.amount}) no contract match`);
      continue;
    }
    const c = best.contract as any;
    let cnpj = onlyDigits(c.superlogica_customer_cnpj ?? "");
    if (!cnpj && sub.customerId) {
      cnpj = (await fetchCustomerCnpjById(sub.customerId)) ?? "";
    }
    const update: Record<string, unknown> = {
      superlogica_subscription_id: sub.id,
      superlogica_subscription_label: sub.label,
    };
    if (sub.customerId) update.superlogica_customer_id = sub.customerId;
    if (!c.superlogica_customer_cnpj && cnpj) update.superlogica_customer_cnpj = cnpj;
    const { error: upErr } = await sb.from("contracts").update(update).eq("id", c.id);
    if (upErr) {
      console.log(`[autolink] knownSub update failed for contract ${c.codigo}: ${upErr.message}`);
      continue;
    }
    c._linked = true;
    linked++;
    console.log(
      `[autolink] contract=${c.codigo} ← subId=${sub.id} (R$${sub.amount} vs ref R$${c.valor_mensal_referencia}, diff ${(best.diff * 100).toFixed(2)}%) [via KNOWN_SUBSCRIPTION_IDS]`
    );
  }

  console.log(`[superlogica-sync][autolink] vinculados=${linked} total_tentados=${total}`);
  return linked;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth: require c-level ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
  const { data: roleRow } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", claimsData.claims.sub)
    .eq("role", "c-level")
    .maybeSingle();
  if (!roleRow) return json({ error: "Forbidden" }, 403);

  // 1) Create sync run
  const { data: run, error: runErr } = await sb
    .from("superlogica_sync_run")
    .insert({ status: "running" })
    .select("*")
    .single();
  if (runErr) return json({ error: runErr.message }, 500);

  const runId = run.id as string;
  let fetchedSubs = 0;
  let updatedContracts = 0;
  let invoicesUpserted = 0;
  let errorsCount = 0;
  const errors: string[] = [];

  try {
    // 1.5) Auto-link unlinked contracts before main sync
    try {
      await autoLinkUnlinkedContracts();
    } catch (e) {
      console.log(`[superlogica-sync][autolink] step failed: ${String(e)}`);
    }

    // 0) Auto-link: tentar vincular contratos sem superlogica_subscription_id
    const KNOWN_SUBSCRIPTION_IDS = [
      '00cd4eb5-0b4a-4550-8e58-97accaa102b7',
      'ac940ed7-ed2b-4f16-9135-475991c58183',
      '9945029c-f0fc-4c72-9a8d-32203e2b0845',
      'b9188b9a-8c1c-444c-b819-28310ce3168f',
      '357a735f-0ead-46d9-a0cc-28f2361f292e',
      '4b59ab9c-22a4-42ea-ac46-82eec2efa5bb',
      'b5706280-6839-4965-9d3d-f3fe2bf2ae49',
      '9e33bb6d-eb4c-45bf-8df0-bcd2c5ebb7fe',
      '135bc51b-504e-43c6-9fcf-5919607308b8',
    ];

    const { data: unlinked } = await sb
      .from('contracts')
      .select('id, codigo, valor_mensal_referencia')
      .is('superlogica_subscription_id', null);

    if (unlinked && unlinked.length > 0) {
      console.log(`[superlogica-sync] Auto-link: ${unlinked.length} contracts without subscription_id`);

      for (const subId of KNOWN_SUBSCRIPTION_IDS) {
        try {
          // Buscar dados da assinatura no Superlógica
          const subData = await superlogicaGet(`/v2/financeiro/cobranca?idContrato=${subId}&itensPorPagina=5`);
          const items = Array.isArray(subData) ? subData : (subData?.data ?? []);
          if (!items.length) continue;

          // Pegar o valor da primeira cobrança para matching
          const invoiceAmount = Number(items[0]?.vl_total_recb ?? items[0]?.vl_emitido_recb ?? 0);
          const label = items[0]?.st_descricao_cont ?? subId;
          const customerId = String(items[0]?.id_sacado_sac ?? '').trim() || null;

          // Tentar casar com contrato sem vínculo pelo valor (tolerância 5%)
          const stillUnlinked = unlinked.filter((c: any) => !c._linked);
          const matched = matchContractByAmount(invoiceAmount, stillUnlinked as any, 0.05);

          if (matched) {
            await sb.from('contracts').update({
              superlogica_subscription_id: subId,
              superlogica_subscription_label: label,
              superlogica_customer_id: customerId,
            }).eq('id', matched.id);

            (matched as any)._linked = true;
            console.log(`[superlogica-sync] Auto-linked: contract ${matched.codigo} → subscription ${subId} (amount R$${invoiceAmount})`);
          }
        } catch (e) {
          console.log(`[superlogica-sync] Auto-link failed for ${subId}: ${String(e)}`);
        }
      }
    }

    // 2) Load linked contracts
    const { data: contracts, error: cErr } = await sb
      .from("contracts")
      .select(
        "id, codigo, superlogica_subscription_id, superlogica_subscription_label, superlogica_customer_cnpj, superlogica_customer_id, valor_mensal_referencia"
      )
      .not("superlogica_subscription_id", "is", null);
    if (cErr) throw new Error(cErr.message);

    const linked = (contracts ?? []).filter(
      (c: ContractRow) => String(c.superlogica_subscription_id || "").trim()
    );

    console.log(`[superlogica-sync] ${linked.length} linked contracts`);

    // 3) Group contracts by Superlógica customer ID (preferred) or CNPJ (fallback)
    //    The group key is "id:<customerId>" or "cnpj:<digits>" so we never mix them up.
    const groupsMap: Record<string, { customerId: string | null; cnpj: string; contracts: ContractRow[] }> = {};
    for (const c of linked as ContractRow[]) {
      const customerId = String(c.superlogica_customer_id ?? "").trim() || null;
      const cnpj = onlyDigits(c.superlogica_customer_cnpj ?? "");
      if (!customerId && !cnpj) {
        errorsCount++;
        errors.push(`Contrato ${c.codigo || c.id}: sem cliente Superlógica nem CNPJ vinculado`);
        continue;
      }
      const key = customerId ? `id:${customerId}` : `cnpj:${cnpj}`;
      if (!groupsMap[key]) groupsMap[key] = { customerId, cnpj, contracts: [] };
      groupsMap[key].contracts.push(c);
    }

    // 4) For each group: resolve customer ID (use stored, fallback to CNPJ), fetch invoices, distribute
    for (const [, group] of Object.entries(groupsMap)) {
      const groupContracts = group.contracts;
      const cnpj = group.cnpj;
      try {
        // Prefer stored customer ID; only re-discover via CNPJ if absent.
        let customerId: string | null = group.customerId;
        if (!customerId) {
          customerId = await findClientByCnpj(cnpj);
          if (customerId) {
            // Backfill the stored customer_id so future syncs skip the lookup.
            const ids = groupContracts.map((c) => c.id);
            await sb.from("contracts").update({ superlogica_customer_id: customerId }).in("id", ids);
            console.log(`[superlogica-sync] Backfilled superlogica_customer_id=${customerId} for ${ids.length} contract(s)`);
          }
        } else {
          console.log(`[superlogica-sync] Using stored customer id=${customerId} for ${groupContracts.length} contract(s)`);
        }
        if (!customerId) {
          for (const c of groupContracts) {
            errorsCount++;
            errors.push(`Contrato ${c.codigo || c.id}: cliente CNPJ ${cnpj} não encontrado na Superlógica`);
          }
          continue;
        }

        // Fetch all invoices for this customer
        fetchedSubs++;
        console.log(`[superlogica-sync] Fetching invoices for customer ${customerId} (CNPJ ${cnpj})`);
        const inv = await superlogicaGet(
          `/v2/financeiro/cobranca?idSacado=${customerId}&itensPorPagina=200`
        );

        const allItemsRaw = inv?.data ?? inv ?? [];
        const allItems = Array.isArray(allItemsRaw) ? allItemsRaw : [];
        const customerItems = allItems.filter((x: any) =>
          String(x.id_sacado_sac ?? x.idSacado ?? x.id_sacado ?? "").trim() === String(customerId)
        );
        console.log(
          `[superlogica-sync] Got ${allItems.length} invoice(s) total, ${customerItems.length} for customer ${customerId}`
        );

        // Build subscription -> contracts map (can be ambiguous)
        const subIdToContracts: Record<string, ContractRow[]> = {};
        for (const c of groupContracts) {
          const subId = String(c.superlogica_subscription_id).trim();
          if (!subIdToContracts[subId]) subIdToContracts[subId] = [];
          subIdToContracts[subId].push(c);
        }

        // Parse and distribute invoices to their contracts
        const invoicesByContract: Record<string, any[]> = {};
        const reportedAmbiguity = new Set<string>();

        for (const x of customerItems) {
          // Try to match invoice to a subscription via id_contrato_mens or id_adesao_plc
          const invoiceSubId = String(x.id_contrato_mens ?? x.id_planocliente_plc ?? "").trim();

          // Find the contract this invoice belongs to
          let contractId: string | null = null;
          const matches = invoiceSubId ? (subIdToContracts[invoiceSubId] ?? []) : [];

          const invoiceAmount = Number(x.vl_total_recb ?? x.vl_emitido_recb ?? 0);

          if (invoiceSubId && matches.length === 1) {
            contractId = matches[0].id;
          } else if (!invoiceSubId && groupContracts.length === 1) {
            contractId = groupContracts[0].id;
          } else {
            // Ambiguity: try to resolve by matching invoice amount to contract's valor_mensal_referencia
            const candidates = invoiceSubId && matches.length > 0 ? matches : groupContracts;
            const matchedByAmount = matchContractByAmount(invoiceAmount, candidates);

            if (matchedByAmount) {
              contractId = matchedByAmount.id;
              console.log(
                `[superlogica-sync] Ambiguity resolved by amount match: invoice=R$${invoiceAmount} → contract ${matchedByAmount.codigo} (ref=R$${matchedByAmount.valor_mensal_referencia})`
              );
            } else {
              const ambiguityKey = invoiceSubId || "without_subscription_id";
              if (!reportedAmbiguity.has(ambiguityKey)) {
                reportedAmbiguity.add(ambiguityKey);
                errorsCount++;
                errors.push(
                  `CNPJ ${cnpj}: cobrança não vinculada por ambiguidade (subId=${ambiguityKey}, contratos=${candidates.length}, valor=R$${invoiceAmount})`
                );
              }
              continue;
            }
          }

          // fl_status_recb: 0=pending, 1=paid, 2=cancelled, 3=renegotiated
          const rawStatus = String(x.fl_status_recb ?? "");
          const statusMap: Record<string, string> = { "0": "open", "1": "paid", "2": "canceled", "3": "renegotiated" };
          const status = statusMap[rawStatus] ?? normalizeInvoiceStatus(x.st_status_recb ?? "");

          const amount = invoiceAmount;
          const paidAmount = status === "paid" ? amount : 0;
          const dueDate = x.dt_vencimento_recb || null;
          const paidAt = x.dt_liquidacao_recb || (status === "paid" ? (x.dt_recebimento_recb || null) : null);
          const competence = x.dt_competencia_recb || null;
          const externalId = String(x.id_recebimento_recb ?? "");

          // Calculate days overdue for open invoices
          let daysOverdue = 0;
          if (status === "open" && dueDate) {
            const due = new Date(dueDate);
            const now = new Date();
            const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
            daysOverdue = Math.max(0, diff);
          }
          const finalStatus = (status === "open" && daysOverdue > 0) ? "overdue" : status;

          const subId = invoiceSubId || String(groupContracts[0].superlogica_subscription_id).trim();

          const item = {
            contract_id: contractId,
            superlogica_subscription_id: subId,
            external_invoice_id: externalId || null,
            competence: competence || null,
            due_date: dueDate,
            status: finalStatus,
            amount,
            paid_amount: paidAmount,
            paid_at: paidAt,
            days_overdue: daysOverdue,
            raw_payload: x,
            updated_at: new Date().toISOString(),
          };

          if (!invoicesByContract[contractId]) invoicesByContract[contractId] = [];
          invoicesByContract[contractId].push(item);
        }

        // 5) Upsert invoices and update contract cache per contract
        for (const c of groupContracts) {
          const items = invoicesByContract[c.id] ?? [];

          try {
            // Upsert invoices with valid external_invoice_id
            const itemsWithId = items.filter((it: any) => it.external_invoice_id);

            if (itemsWithId.length) {
              const { error: upErr } = await sb
                .from("receivables_invoices")
                .upsert(itemsWithId, {
                  onConflict: "superlogica_subscription_id,external_invoice_id",
                });
              if (upErr) throw new Error(upErr.message);
              invoicesUpserted += itemsWithId.length;
            }

            // Compute contract cache
            let overdue = 0;
            let open = 0;
            let lastPaymentAt: string | null = null;

            for (const it of items) {
              const saldo = Math.max(0, (it.amount ?? 0) - (it.paid_amount ?? 0));
              if (it.status === "overdue") overdue += saldo;
              if (it.status === "open") open += saldo;
              if (it.paid_at) {
                if (!lastPaymentAt || new Date(it.paid_at) > new Date(lastPaymentAt))
                  lastPaymentAt = it.paid_at;
              }
            }

            const receivablesStatus = overdue > 0 ? "atrasado" : "em_dia";

            const { error: updCErr } = await sb
              .from("contracts")
              .update({
                receivables_status: receivablesStatus,
                receivables_overdue_amount: overdue,
                receivables_open_amount: open,
                receivables_last_payment_at: lastPaymentAt,
                receivables_last_sync_at: new Date().toISOString(),
              })
              .eq("id", c.id);
            if (updCErr) throw new Error(updCErr.message);

            updatedContracts++;
            console.log(`[superlogica-sync] Contract ${c.codigo}: ${items.length} invoices, overdue=${overdue}, open=${open}`);
          } catch (e) {
            errorsCount++;
            errors.push(`Contrato ${c.codigo || c.id}: ${String(e)}`);
          }
        }
      } catch (e) {
        errorsCount++;
        errors.push(`CNPJ ${cnpj}: ${String(e)}`);
      }
    }

    // 6) Finalize run
    await sb
      .from("superlogica_sync_run")
      .update({
        finished_at: new Date().toISOString(),
        status: errorsCount > 0 ? "partial" : "success",
        fetched_subscriptions: fetchedSubs,
        updated_contracts: updatedContracts,
        invoices_upserted: invoicesUpserted,
        errors_count: errorsCount,
        error_summary: errors.slice(0, 50).join("\n"),
      })
      .eq("id", runId);

    return json({
      ok: true,
      runId,
      fetchedSubs,
      updatedContracts,
      invoicesUpserted,
      errorsCount,
    });
  } catch (fatal) {
    await sb
      .from("superlogica_sync_run")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        fetched_subscriptions: fetchedSubs,
        updated_contracts: updatedContracts,
        invoices_upserted: invoicesUpserted,
        errors_count: errorsCount + 1,
        error_summary: `FATAL: ${String(fatal)}`,
      })
      .eq("id", runId);

    return json({ ok: false, runId, error: String(fatal) }, 500);
  }
});
