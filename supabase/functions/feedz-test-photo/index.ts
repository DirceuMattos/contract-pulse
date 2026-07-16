import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AuthError, requireAnyRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toRecords(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<
      Record<string, unknown>
    >;
  }

  const data = asRecord(body).data;
  if (!Array.isArray(data)) return [];

  return data.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<
    Record<string, unknown>
  >;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase environment not configured" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      await requireAnyRole(req, adminClient, ["c-level", "superadmin"]);
    } catch (authError) {
      if (authError instanceof AuthError) {
        return json({ error: authError.message }, authError.status);
      }
      console.error("Auth check failed:", authError);
      return json({ error: "Unauthorized" }, 401);
    }

    const feedzToken = Deno.env.get("FEEDZ_API_TOKEN");
    if (!feedzToken) {
      return json({ error: "FEEDZ_API_TOKEN not configured" }, 500);
    }
    const url = new URL(req.url);
    const targetId = Number(url.searchParams.get("id") ?? "2051079");

    const statuses = ["Ativo", "Desligado", "Desativado"];
    const statusParams = statuses.map((s) => `status[]=${encodeURIComponent(s)}`).join("&");
    const next = `https://app.feedz.com.br/v2/integracao/employees?${statusParams}`;
    let pages = 0;
    let found: unknown = null;
    let sampleKeys: string[] = [];

    // Single request — no retries (avoid timeout). The /employees endpoint without
    // pagination params returns ALL employees in one response (per feedz-sync usage).
    const resp = await fetch(next, {
      headers: {
        Authorization: `Bearer ${feedzToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "BNP-Contratos/1.0",
      },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: "feedz error", status: resp.status, body: txt.slice(0, 800) }, 502);
    }
    const body = await resp.json();
    const records = toRecords(body);
    if (records.length && !sampleKeys.length) sampleKeys = Object.keys(records[0]);
    found =
      records.find((record) => {
        const profile = asRecord(record.profile);
        return Number(record.id) === targetId || Number(profile.id) === targetId;
      }) ?? null;
    pages = 1;

    return json({
      pagesScanned: pages,
      sampleTopLevelKeys: sampleKeys,
      found,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
