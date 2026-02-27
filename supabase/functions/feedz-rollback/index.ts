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
    const userId = user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check c-level role
    const { data: roleCheck } = await admin.rpc('has_role', { _user_id: userId, _role: 'c-level' });
    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a C-Level" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { runId, force } = await req.json();
    if (!runId) {
      return new Response(JSON.stringify({ error: "runId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the run
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load sync items for this run
    const { data: syncItems } = await admin
      .from("feedz_sync_items")
      .select("*")
      .eq("sync_run_id", runId);

    const items = syncItems || [];

    // If no sync_items (legacy run), fallback to old behavior using feedz_sync_events
    if (items.length === 0) {
      return await legacyRollback(admin, runId);
    }

    // Safety check: subsequent runs that touched same records
    if (!force) {
      const affectedPersonIds = items
        .filter((i: any) => i.matched_hr_person_id)
        .map((i: any) => i.matched_hr_person_id);

      if (affectedPersonIds.length > 0) {
        // Check for newer runs that touched same people
        const { data: newerItems } = await admin
          .from("feedz_sync_items")
          .select("sync_run_id, matched_hr_person_id")
          .in("matched_hr_person_id", affectedPersonIds)
          .neq("sync_run_id", runId)
          .in("action", ["UPDATE", "INSERT"]);

        if (newerItems && newerItems.length > 0) {
          // Check if any of those runs are newer
          const newerRunIds = [...new Set(newerItems.map((i: any) => i.sync_run_id))];
          const { data: newerRuns } = await admin
            .from("feedz_sync_runs")
            .select("id, started_at")
            .in("id", newerRunIds)
            .gt("started_at", run.started_at)
            .eq("status", "success");

          if (newerRuns && newerRuns.length > 0) {
            return new Response(
              JSON.stringify({
                error: "Existem syncs posteriores que modificaram os mesmos registros. Use force=true para forçar.",
                conflicting_runs: newerRuns.map((r: any) => r.id),
                affected_records: newerItems.length,
              }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    let removedCount = 0;
    let restoredCount = 0;

    // Process INSERTs: delete the created records
    const insertItems = items.filter((i: any) => i.action === "INSERT" && i.matched_hr_person_id);
    if (insertItems.length > 0) {
      const personIds = insertItems.map((i: any) => i.matched_hr_person_id);
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

    // Process UPDATEs: restore snapshot_before
    const updateItems = items.filter((i: any) => i.action === "UPDATE" && i.snapshot_before && i.matched_hr_person_id);
    for (const item of updateItems) {
      const snapshot = item.snapshot_before as Record<string, any>;
      // Only restore the fields that were changed
      const changedFields = (item.fields_changed_json as any[]) || [];
      const restorePayload: Record<string, any> = {};
      for (const change of changedFields) {
        if (change.field && change.before !== undefined) {
          restorePayload[change.field] = change.before;
        }
      }
      // Also restore from snapshot for safety
      if (Object.keys(restorePayload).length === 0 && snapshot) {
        // Fallback: use full snapshot keys that differ
        for (const key of Object.keys(snapshot)) {
          restorePayload[key] = snapshot[key];
        }
      }

      if (Object.keys(restorePayload).length > 0) {
        restorePayload.updated_at = new Date().toISOString();
        const { error } = await admin
          .from("hr_people")
          .update(restorePayload)
          .eq("id", item.matched_hr_person_id);
        if (!error) restoredCount++;
      }
    }

    // Mark run as rolled back
    await admin
      .from("feedz_sync_runs")
      .update({ status: "rolled_back" })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ success: true, removed: removedCount, restored: restoredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Legacy rollback for runs without feedz_sync_items
async function legacyRollback(admin: any, runId: string) {
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
    const { data: people } = await admin
      .from("hr_people")
      .select("id")
      .in("id_externo", externalIds);

    const personIds = (people || []).map((p: any) => p.id);

    if (personIds.length > 0) {
      await admin.from("hr_timeline").delete().in("person_id", personIds);
      const { count } = await admin
        .from("hr_people")
        .delete()
        .in("id", personIds)
        .select("id", { count: "exact", head: true });
      removedCount = count || personIds.length;
    }
  }

  await admin
    .from("feedz_sync_runs")
    .update({ status: "rolled_back" })
    .eq("id", runId);

  return new Response(
    JSON.stringify({ success: true, removed: removedCount, restored: 0 }),
    { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
  );
}
