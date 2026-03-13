import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await admin.rpc('has_role', { _user_id: userId, _role: 'c-level' });
    if (!roleCheck) return jsonResponse({ error: "Acesso restrito a C-Level" }, 403);

    const body = await req.json();
    const { runId, itemId, force } = body;

    if (itemId) return await rollbackSingleItem(admin, itemId, userId, runId);
    if (!runId) return jsonResponse({ error: "runId ou itemId é obrigatório" }, 400);
    return await rollbackRun(admin, runId, userId, force);
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Erro interno" }, 500);
  }
});

// ─── SINGLE ITEM ROLLBACK ──────────────────────────────────────────────────
async function rollbackSingleItem(admin: any, itemId: string, userId: string, _runId?: string) {
  const { data: item, error } = await admin
    .from("feedz_sync_change")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error || !item) return jsonResponse({ error: "Item não encontrado" }, 404);
  if (item.reverted_at) return jsonResponse({ error: "Este item já foi revertido" }, 400);

  const validActions = ["created", "updated", "terminated"];
  if (!validActions.includes(item.action)) {
    return jsonResponse({ error: "Apenas itens created/updated/terminated podem ser revertidos" }, 400);
  }

  let reverted = false;

  if (item.action === "created" && item.hr_people_id) {
    // Check for dependencies
    const { data: allocations } = await admin.from("subproject_allocations").select("id").eq("hr_person_id", item.hr_people_id).limit(1);
    const { data: resources } = await admin.from("resources").select("id").eq("hr_person_id", item.hr_people_id).limit(1);
    const hasRefs = (allocations?.length || 0) > 0 || (resources?.length || 0) > 0;

    if (hasRefs) {
      await admin.from("hr_people").update({
        situacao: "inativo",
        observacoes: `Revertido do sync (matrícula criada). Inativado por ter alocações vinculadas.`,
        updated_at: new Date().toISOString(),
      }).eq("id", item.hr_people_id);
    } else {
      await admin.from("hr_timeline").delete().eq("person_id", item.hr_people_id);
      await admin.from("hr_people").delete().eq("id", item.hr_people_id);
    }
    reverted = true;
  }

  if ((item.action === "updated" || item.action === "terminated") && item.hr_people_id) {
    const restorePayload: Record<string, any> = {};

    // Prefer changed_fields for granular restore
    const changedFields = (item.changed_fields as any[]) || [];
    for (const change of changedFields) {
      if (change.field && change.before !== undefined) {
        restorePayload[change.field] = change.before;
      }
    }

    // Fallback to full snapshot
    if (Object.keys(restorePayload).length === 0 && item.before_snapshot) {
      const snapshot = item.before_snapshot as Record<string, any>;
      for (const key of Object.keys(snapshot)) {
        restorePayload[key] = snapshot[key];
      }
    }

    if (Object.keys(restorePayload).length > 0) {
      restorePayload.updated_at = new Date().toISOString();
      await admin.from("hr_people").update(restorePayload).eq("id", item.hr_people_id);
      reverted = true;
    }
  }

  // Remove timeline events from this run for this person
  if (item.hr_people_id && item.run_id) {
    await admin.from("hr_timeline")
      .delete()
      .eq("person_id", item.hr_people_id)
      .eq("source", "feedz")
      .eq("sync_run_id", item.run_id);
  }

  if (reverted) {
    await admin.from("feedz_sync_change").update({
      reverted_at: new Date().toISOString(),
      reverted_by: userId,
    }).eq("id", itemId);
  }

  return jsonResponse({ success: true, reverted });
}

// ─── FULL RUN ROLLBACK ─────────────────────────────────────────────────────
async function rollbackRun(admin: any, runId: string, userId: string, force: boolean) {
  const { data: run } = await admin.from("feedz_sync_runs").select("*").eq("id", runId).single();
  if (!run) return jsonResponse({ error: "Run não encontrado" }, 404);
  if (run.status !== "success") return jsonResponse({ error: "Apenas runs com status 'success' podem ser revertidos" }, 400);

  // Load changes for this run
  const { data: changes } = await admin.from("feedz_sync_change").select("*").eq("run_id", runId);
  const items = (changes || []).filter((i: any) => !i.reverted_at && ["created", "updated", "terminated"].includes(i.action));

  if (items.length === 0) {
    // Try legacy rollback
    return await legacyRollback(admin, runId);
  }

  // Safety check for subsequent runs
  if (!force) {
    const affectedIds = items.filter((i: any) => i.hr_people_id).map((i: any) => i.hr_people_id);
    if (affectedIds.length > 0) {
      const { data: newerItems } = await admin.from("feedz_sync_change")
        .select("run_id, hr_people_id")
        .in("hr_people_id", affectedIds)
        .neq("run_id", runId)
        .in("action", ["updated", "created", "terminated"]);

      if (newerItems && newerItems.length > 0) {
        const newerRunIds = [...new Set(newerItems.map((i: any) => i.run_id))];
        const { data: newerRuns } = await admin.from("feedz_sync_runs")
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

  let removedCount = 0, restoredCount = 0;

  for (const item of items) {
    if (item.action === "created" && item.hr_people_id) {
      const { data: allocations } = await admin.from("subproject_allocations").select("id").eq("hr_person_id", item.hr_people_id).limit(1);
      const { data: resources } = await admin.from("resources").select("id").eq("hr_person_id", item.hr_people_id).limit(1);
      const hasRefs = (allocations?.length || 0) > 0 || (resources?.length || 0) > 0;

      if (hasRefs) {
        await admin.from("hr_people").update({
          situacao: "inativo", observacoes: `Revertido do sync run ${runId}`, updated_at: new Date().toISOString(),
        }).eq("id", item.hr_people_id);
      } else {
        await admin.from("hr_timeline").delete().eq("person_id", item.hr_people_id);
        await admin.from("hr_people").delete().eq("id", item.hr_people_id);
      }
      removedCount++;
    }

    if ((item.action === "updated" || item.action === "terminated") && item.hr_people_id) {
      const restorePayload: Record<string, any> = {};
      const changedFields = (item.changed_fields as any[]) || [];
      for (const change of changedFields) {
        if (change.field && change.before !== undefined) restorePayload[change.field] = change.before;
      }
      if (Object.keys(restorePayload).length === 0 && item.before_snapshot) {
        for (const key of Object.keys(item.before_snapshot)) restorePayload[key] = item.before_snapshot[key];
      }
      if (Object.keys(restorePayload).length > 0) {
        restorePayload.updated_at = new Date().toISOString();
        const { error } = await admin.from("hr_people").update(restorePayload).eq("id", item.hr_people_id);
        if (!error) restoredCount++;
      }
    }
  }

  // Delete timeline events from this run
  await admin.from("hr_timeline").delete().eq("source", "feedz").eq("sync_run_id", runId);

  // Mark items as reverted
  const now = new Date().toISOString();
  for (const item of items) {
    await admin.from("feedz_sync_change").update({ reverted_at: now, reverted_by: userId }).eq("id", item.id);
  }

  // Mark run as rolled_back
  await admin.from("feedz_sync_runs").update({ status: "rolled_back" }).eq("id", runId);

  return jsonResponse({ success: true, removed: removedCount, restored: restoredCount });
}

// Legacy rollback for runs without feedz_sync_change
async function legacyRollback(admin: any, runId: string) {
  const { data: events } = await admin.from("feedz_sync_events").select("external_id").eq("sync_run_id", runId).eq("event_type", "create");
  const externalIds = (events || []).map((e: any) => e.external_id).filter(Boolean);
  let removedCount = 0;

  if (externalIds.length > 0) {
    const { data: people } = await admin.from("hr_people").select("id").in("id_externo", externalIds);
    const personIds = (people || []).map((p: any) => p.id);
    if (personIds.length > 0) {
      await admin.from("hr_timeline").delete().in("person_id", personIds);
      const { count } = await admin.from("hr_people").delete().in("id", personIds).select("id", { count: "exact", head: true });
      removedCount = count || personIds.length;
    }
  }

  // Also try old feedz_sync_items
  const { data: oldItems } = await admin.from("feedz_sync_items").select("*").eq("sync_run_id", runId);
  const insertItems = (oldItems || []).filter((i: any) => i.action === 'INSERT' && i.matched_hr_person_id && !i.reverted_at);
  for (const item of insertItems) {
    await admin.from("hr_timeline").delete().eq("person_id", item.matched_hr_person_id);
    await admin.from("hr_people").delete().eq("id", item.matched_hr_person_id);
    removedCount++;
  }

  await admin.from("feedz_sync_runs").update({ status: "rolled_back" }).eq("id", runId);
  return jsonResponse({ success: true, removed: removedCount, restored: 0 });
}
