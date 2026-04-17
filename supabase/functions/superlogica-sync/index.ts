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

/** Resolve CNPJ → Superlógica customer ID (id_sacado_sac) */
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
        console.log(`[superlogica-sync] Found customer id=${id} for CNPJ ${cnpjDigits}`);
        return id;
      }
    }

    if (items.length < perPage) break;
    page++;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
