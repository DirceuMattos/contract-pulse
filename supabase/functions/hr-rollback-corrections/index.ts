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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "c-level",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { runId } = await req.json();
    if (!runId) {
      return new Response(JSON.stringify({ error: "runId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify run exists and is not already rolled back
    const { data: run, error: runErr } = await supabaseAdmin
      .from("hr_correction_runs")
      .select("*")
      .eq("id", runId)
      .single();
    if (runErr || !run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (run.status === "rolled_back") {
      return new Response(JSON.stringify({ error: "Run already rolled back" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all items for this run
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("hr_correction_items")
      .select("*")
      .eq("run_id", runId);
    if (itemsErr) throw itemsErr;

    let restored = 0;
    for (const item of (items || [])) {
      const snapshot = item.snapshot_before as Record<string, any>;
      if (!snapshot || !item.person_id) continue;

      // Extract only the fields that were changed to restore them
      const changes = item.fields_changed as Array<{ field: string; before: any; after: any }>;
      const restoreFields: Record<string, any> = {};
      for (const ch of changes) {
        restoreFields[ch.field] = ch.before;
      }

      if (Object.keys(restoreFields).length > 0) {
        await supabaseAdmin
          .from("hr_people")
          .update(restoreFields)
          .eq("id", item.person_id);
        restored++;
      }
    }

    // Mark run as rolled back
    await supabaseAdmin
      .from("hr_correction_runs")
      .update({ status: "rolled_back" })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ success: true, restored }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("hr-rollback-corrections error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
