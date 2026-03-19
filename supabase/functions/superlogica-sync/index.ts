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
        "id, codigo, superlogica_subscription_id, superlogica_subscription_label, superlogica_customer_cnpj"
      )
      .not("superlogica_subscription_id", "is", null);
    if (cErr) throw new Error(cErr.message);

    const linked = (contracts ?? []).filter(
      (c: ContractRow) => String(c.superlogica_subscription_id || "").trim()
    );

    console.log(`[superlogica-sync] ${linked.length} linked contracts`);

    // 3) Group contracts by CNPJ to minimize API calls
    const byBnpj: Record<string, ContractRow[]> = {};
    for (const c of linked as ContractRow[]) {
      const cnpj = onlyDigits(c.superlogica_customer_cnpj ?? "");
      if (!cnpj) {
        errorsCount++;
        errors.push(`Contrato ${c.codigo || c.id}: sem CNPJ vinculado`);
        continue;
      }
      if (!byBnpj[cnpj]) byBnpj[cnpj] = [];
      byBnpj[cnpj].push(c);
    }

    // 4) For each CNPJ group: resolve customer ID, fetch invoices, distribute
    for (const [cnpj, groupContracts] of Object.entries(byBnpj)) {
      try {
        // Resolve CNPJ → customer ID
        const customerId = await findClientByCnpj(cnpj);
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
          `/v2/financeiro/cobrancas?idSacado=${customerId}&itensPorPagina=100`
        );

        const allItems = inv?.data ?? inv ?? [];
        console.log(`[superlogica-sync] Got ${Array.isArray(allItems) ? allItems.length : 0} invoice(s) for customer ${customerId}`);

        // Build a set of subscription IDs we care about
        const subIdToContract: Record<string, ContractRow> = {};
        for (const c of groupContracts) {
          const subId = String(c.superlogica_subscription_id).trim();
          subIdToContract[subId] = c;
        }

        // Parse and distribute invoices to their contracts
        const invoicesByContract: Record<string, any[]> = {};

        for (const x of (Array.isArray(allItems) ? allItems : [])) {
          // Try to match invoice to a subscription
          const invoiceSubId = String(x.id_planocliente_plc ?? "").trim();

          // Find the contract this invoice belongs to
          let contractId: string | null = null;
          if (invoiceSubId && subIdToContract[invoiceSubId]) {
            contractId = subIdToContract[invoiceSubId].id;
          } else if (groupContracts.length === 1) {
            // If there's only one contract for this CNPJ, assign all invoices to it
            contractId = groupContracts[0].id;
          } else {
            // Can't determine which contract — skip
            continue;
          }

          const status = normalizeInvoiceStatus(x.st_status_recb ?? x.status ?? "");
          const amount = Number(x.fl_valor_recb ?? x.amount ?? 0);
          const paidAmount = Number(x.fl_valorpago_recb ?? x.paid_amount ?? 0);
          const dueDate = x.dt_vencimento_recb ?? x.due_date ?? null;
          const paidAt = x.dt_liquidacao_recb ?? x.paid_at ?? null;
          const competence = x.st_competencia_recb ?? x.competence ?? null;
          const externalId = String(x.id_recebimento_recb ?? x.id ?? "");
          const daysOverdue = Number(x.qt_diasatraso ?? x.days_overdue ?? 0);

          const subId = invoiceSubId || String(groupContracts[0].superlogica_subscription_id).trim();

          const item = {
            contract_id: contractId,
            superlogica_subscription_id: subId,
            external_invoice_id: externalId || null,
            competence: competence || null,
            due_date: dueDate,
            status,
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
