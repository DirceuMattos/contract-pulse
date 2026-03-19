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

async function superlogicaGet(path: string) {
  const API_BASE = normalizeBase(Deno.env.get("SUPERLOGICA_API_BASE") || "");
  const APP_TOKEN = Deno.env.get("SUPERLOGICA_APP_TOKEN")!;
  const ACCESS_TOKEN = Deno.env.get("SUPERLOGICA_ACCESS_TOKEN")!;

  const url = `${API_BASE}${path}`;
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

    for (const c of contracts ?? []) {
      const contractId = c.id;
      const subId = String(c.superlogica_subscription_id || "").trim();
      if (!subId) continue;

      try {
        fetchedSubs++;

        // 3) Fetch invoices for subscription — adjust endpoint per API docs
        const inv = await superlogicaGet(
          `/v2/financeiro/cobrancas?idSacado=${subId}&itensPorPagina=100`
        );

        const items = (inv?.data ?? inv ?? []).map((x: any) => {
          const status = normalizeInvoiceStatus(x.st_status_recb ?? x.status ?? "");
          const amount = Number(x.fl_valor_recb ?? x.amount ?? 0);
          const paidAmount = Number(x.fl_valorpago_recb ?? x.paid_amount ?? 0);
          const dueDate = x.dt_vencimento_recb ?? x.due_date ?? null;
          const paidAt = x.dt_liquidacao_recb ?? x.paid_at ?? null;
          const competence = x.st_competencia_recb ?? x.competence ?? null;
          const externalId = String(x.id_recebimento_recb ?? x.id ?? "");
          const daysOverdue = Number(x.qt_diasatraso ?? x.days_overdue ?? 0);

          return {
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
        });

        // Filter items with valid external_invoice_id for upsert
        const itemsWithId = items.filter(
          (it: any) => it.external_invoice_id
        );

        if (itemsWithId.length) {
          const { error: upErr } = await sb
            .from("receivables_invoices")
            .upsert(itemsWithId, {
              onConflict: "superlogica_subscription_id,external_invoice_id",
            });
          if (upErr) throw new Error(upErr.message);
          invoicesUpserted += itemsWithId.length;
        }

        // 4) Compute contract cache
        let overdue = 0;
        let open = 0;
        let lastPaymentAt: string | null = null;

        for (const it of items) {
          const saldo = Math.max(0, (it.amount ?? 0) - (it.paid_amount ?? 0));
          if (it.status === "overdue") overdue += saldo;
          if (it.status === "open") open += saldo;
          if (it.paid_at) {
            if (
              !lastPaymentAt ||
              new Date(it.paid_at) > new Date(lastPaymentAt)
            )
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
          .eq("id", contractId);
        if (updCErr) throw new Error(updCErr.message);

        updatedContracts++;
      } catch (e) {
        errorsCount++;
        errors.push(`Contrato ${c.codigo || contractId}: ${String(e)}`);
      }
    }

    // 5) Finalize run
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
