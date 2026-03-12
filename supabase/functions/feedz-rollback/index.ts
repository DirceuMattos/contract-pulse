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

    const body = await req.json();
    const { runId, itemId, force } = body;

    // ─── PER-ITEM ROLLBACK ───────────────────────────────────────────────
    if (itemId) {
      return await rollbackSingleItem(admin, itemId, userId);
    }

    // ─── PER-RUN ROLLBACK ────────────────────────────────────────────────
    if (!runId) {
      return new Response(JSON.stringify({ error: "runId ou itemId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await rollbackRun(admin, runId, userId, force);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── SINGLE ITEM ROLLBACK ──────────────────────────────────────────────────
async function rollbackSingleItem(admin: any, itemId: string, userId: string) {
  const { data: item, error } = await admin
    .from("feedz_sync_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error || !item) {
    return jsonResponse({ error: "Item não encontrado" }, 404);
  }

  if (item.reverted_at) {
    return jsonResponse({ error: "Este item já foi revertido" }, 400);
  }

  if (item.action !== "INSERT" && item.action !== "UPDATE") {
    return jsonResponse({ error: "Apenas itens INSERT ou UPDATE podem ser revertidos" }, 400);
  }

  let reverted = false;

  if (item.action === "INSERT" && item.matched_hr_person_id) {
    // Check if person has allocations
    const { data: allocations } = await admin
      .from("subproject_allocations")
      .select("id")
      .eq("hr_person_id", item.matched_hr_person_id)
      .limit(1);

    const { data: resources } = await admin
      .from("resources")
      .select("id")
      .eq("hr_person_id", item.matched_hr_person_id)
      .limit(1);

    const hasRefs = (allocations?.length || 0) > 0 || (resources?.length || 0) > 0;

    if (hasRefs) {
      // Logical inactivation
      await admin.from("hr_people").update({
        situacao: "inativo",
        observacoes: `Revertido do sync run ${item.sync_run_id}. Inativado por ter alocações vinculadas.`,
        updated_at: new Date().toISOString(),
      }).eq("id", item.matched_hr_person_id);
    } else {
      // Physical delete (no references)
      await admin.from("hr_timeline").delete().eq("person_id", item.matched_hr_person_id);
      await admin.from("hr_people").delete().eq("id", item.matched_hr_person_id);
    }
    reverted = true;
  }

  if (item.action === "UPDATE" && item.matched_hr_person_id) {
    const changedFields = (item.fields_changed_json as any[]) || [];
    const restorePayload: Record<string, any> = {};
    for (const change of changedFields) {
      if (change.field && change.before !== undefined) {
        restorePayload[change.field] = change.before;
      }
    }
    // Fallback to full snapshot
    if (Object.keys(restorePayload).length === 0 && item.snapshot_before) {
      const snapshot = item.snapshot_before as Record<string, any>;
      for (const key of Object.keys(snapshot)) {
        restorePayload[key] = snapshot[key];
      }
    }
    if (Object.keys(restorePayload).length > 0) {
      restorePayload.updated_at = new Date().toISOString();
      await admin.from("hr_people").update(restorePayload).eq("id", item.matched_hr_person_id);
      reverted = true;
    }
  }

  // Rollback timeline events from this run for this person
  if (item.matched_hr_person_id && item.sync_run_id) {
    await admin.from("hr_timeline")
      .delete()
      .eq("person_id", item.matched_hr_person_id)
      .eq("source", "feedz")
      .eq("sync_run_id", item.sync_run_id);
  }

  // Mark item as reverted
  if (reverted) {
    await admin.from("feedz_sync_items").update({
      reverted_at: new Date().toISOString(),
      reverted_by: userId,
    }).eq("id", itemId);
  }

  return jsonResponse({ success: true, reverted });
}

// ─── FULL RUN ROLLBACK ─────────────────────────────────────────────────────
async function rollbackRun(admin: any, runId: string, userId: string, force: boolean) {
  const { data: run } = await admin
    .from("feedz_sync_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!run) {
    return jsonResponse({ error: "Run não encontrado" }, 404);
  }

  if (run.status !== "success") {
    return jsonResponse({ error: "Apenas runs com status 'success' podem ser revertidos" }, 400);
  }

  // Load sync items for this run
  const { data: syncItems } = await admin
    .from("feedz_sync_items")
    .select("*")
    .eq("sync_run_id", runId);

  const items = (syncItems || []).filter((i: any) => !i.reverted_at);

  // If no sync_items (legacy run), fallback to old behavior
  if (items.length === 0 && !syncItems?.length) {
    return await legacyRollback(admin, runId);
  }

  // Safety check: subsequent runs that touched same records
  if (!force) {
    const affectedPersonIds = items
      .filter((i: any) => i.matched_hr_person_id)
      .map((i: any) => i.matched_hr_person_id);

    if (affectedPersonIds.length > 0) {
      const { data: newerItems } = await admin
        .from("feedz_sync_items")
        .select("sync_run_id, matched_hr_person_id")
        .in("matched_hr_person_id", affectedPersonIds)
        .neq("sync_run_id", runId)
        .in("action", ["UPDATE", "INSERT"]);

      if (newerItems && newerItems.length > 0) {
        const newerRunIds = [...new Set(newerItems.map((i: any) => i.sync_run_id))];
        const { data: newerRuns } = await admin
          .from("feedz_sync_runs")
          .select("id, started_at")
          .in("id", newerRunIds)
          .gt("started_at", run.started_at)
          .eq("status", "success");

        if (newerRuns && newerRuns.length > 0) {
          return jsonResponse({
            error: "Existem syncs posteriores que modificaram os mesmos registros. Use force=true para forçar.",
            conflicting_runs: newerRuns.map((r: any) => r.id),
            affected_records: newerItems.length,
          }, 409);
        }
      }
    }
  }

  let removedCount = 0;
  let restoredCount = 0;

  // Process INSERTs: logical inactivation or delete
  const insertItems = items.filter((i: any) => i.action === "INSERT" && i.matched_hr_person_id);
  for (const item of insertItems) {
    const pid = item.matched_hr_person_id;
    const { data: allocations } = await admin
      .from("subproject_allocations")
      .select("id")
      .eq("hr_person_id", pid)
      .limit(1);
    const { data: resources } = await admin
      .from("resources")
      .select("id")
      .eq("hr_person_id", pid)
      .limit(1);
    const hasRefs = (allocations?.length || 0) > 0 || (resources?.length || 0) > 0;

    if (hasRefs) {
      await admin.from("hr_people").update({
        situacao: "inativo",
        observacoes: `Revertido do sync run ${runId}`,
        updated_at: new Date().toISOString(),
      }).eq("id", pid);
    } else {
      await admin.from("hr_timeline").delete().eq("person_id", pid);
      await admin.from("hr_people").delete().eq("id", pid);
    }
    removedCount++;
  }

  // Process UPDATEs: restore snapshot_before
  const updateItems = items.filter((i: any) => i.action === "UPDATE" && i.snapshot_before && i.matched_hr_person_id);
  for (const item of updateItems) {
    const changedFields = (item.fields_changed_json as any[]) || [];
    const restorePayload: Record<string, any> = {};
    for (const change of changedFields) {
      if (change.field && change.before !== undefined) {
        restorePayload[change.field] = change.before;
      }
    }
    if (Object.keys(restorePayload).length === 0 && item.snapshot_before) {
      const snapshot = item.snapshot_before as Record<string, any>;
      for (const key of Object.keys(snapshot)) {
        restorePayload[key] = snapshot[key];
      }
    }
    if (Object.keys(restorePayload).length > 0) {
      restorePayload.updated_at = new Date().toISOString();
      const { error } = await admin.from("hr_people").update(restorePayload).eq("id", item.matched_hr_person_id);
      if (!error) restoredCount++;
    }
  }

  // Rollback timeline events from this run
  await admin.from("hr_timeline")
    .delete()
    .eq("source", "feedz")
    .eq("sync_run_id", runId);

  // Mark all items as reverted
  const now = new Date().toISOString();
  for (const item of items) {
    await admin.from("feedz_sync_items").update({
      reverted_at: now,
      reverted_by: userId,
    }).eq("id", item.id);
  }

  // Mark run as rolled back
  await admin
    .from("feedz_sync_runs")
    .update({ status: "rolled_back" })
    .eq("id", runId);

  return jsonResponse({ success: true, removed: removedCount, restored: restoredCount });
}

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

  return jsonResponse({ success: true, removed: removedCount, restored: 0 });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
