import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function superlogicaGet(path: string) {
  const API_BASE = Deno.env.get("SUPERLOGICA_API_BASE")!;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const { cnpj, hint } = await req.json().catch(() => ({}));
    const cnpjNorm = onlyDigits(cnpj);
    if (!cnpjNorm) return json({ error: "cnpj required" }, 400);

    // Adjust endpoint per Superlógica Assinaturas API docs
    const data = await superlogicaGet(
      `/v2/financeiro/clientes?apenasColunasPrincipais=1&itensPorPagina=50&cpfCnpj=${cnpjNorm}`
    );

    const subscriptions = (data?.data ?? data ?? []).map((s: any) => ({
      superlogica_subscription_id: String(s.id_sacado_sac ?? s.id ?? ""),
      label: s.st_nome_sac ?? s.st_nomeref_sac ?? "Assinatura",
      status: s.st_status_sac ?? "",
      amount: Number(s.fl_valor_sac ?? 0),
      periodicity: s.st_periodicidade_pla ?? "",
      cnpj: s.st_cpf_sac ?? s.st_cnpj_sac ?? "",
    }));

    return json({ ok: true, cnpj: cnpjNorm, subscriptions });
  } catch (err) {
    console.error("superlogica-search-subscriptions error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
