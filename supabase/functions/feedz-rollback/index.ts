import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service role client for bypassing RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check c-level role
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "c-level")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a C-Level" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { runId } = await req.json();
    if (!runId) {
      return new Response(JSON.stringify({ error: "runId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the run exists and is the latest success
    const { data: run } = await admin
      .from("feedz_sync_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (!run) {
      return new Response(JSON.stringify({ error: "Run não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (run.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Apenas runs com status 'success' podem ser revertidos" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get create events for this run
    const { data: events } = await admin
      .from("feedz_sync_events")
      .select("external_id")
      .eq("sync_run_id", runId)
      .eq("event_type", "create");

    const externalIds = (events || [])
      .map((e: any) => e.external_id)
      .filter(Boolean);

    let removedCount = 0;

    if (externalIds.length > 0) {
      // Find hr_people by external ids
      const { data: people } = await admin
        .from("hr_people")
        .select("id")
        .in("id_externo", externalIds);

      const personIds = (people || []).map((p: any) => p.id);

      if (personIds.length > 0) {
        // Delete timeline entries first (FK constraint)
        await admin.from("hr_timeline").delete().in("person_id", personIds);

        // Delete people
        const { count } = await admin
          .from("hr_people")
          .delete()
          .in("id", personIds)
          .select("id", { count: "exact", head: true });

        removedCount = count || personIds.length;
      }
    }

    // Mark run as rolled back
    await admin
      .from("feedz_sync_runs")
      .update({ status: "rolled_back" })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ success: true, removed: removedCount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
