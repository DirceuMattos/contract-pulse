import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VINCULO_MAP: Record<string, string> = {
  "clt": "clt",
  "pj": "pj",
  "cooperado": "cooperado",
  "sócio": "socio",
  "socio": "socio",
  "estágio": "estagio",
  "estagio": "estagio",
};

const SITUACAO_MAP: Record<string, string> = {
  "ativo": "ativo",
  "inativo": "inativo",
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

    // Verify user role
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

    const { records, dryRun } = await req.json();
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "No records provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load lookup tables
    const [{ data: hrPeople }, { data: jobTitles }, { data: teamsData }] = await Promise.all([
      supabaseAdmin.from("hr_people").select("*"),
      supabaseAdmin.from("job_titles").select("id, label"),
      supabaseAdmin.from("teams").select("id, name"),
    ]);

    const peopleByName = new Map<string, any>();
    for (const p of (hrPeople || [])) {
      peopleByName.set((p.nome as string).trim().toLowerCase(), p);
    }

    const jobTitleByLabel = new Map<string, string>();
    for (const jt of (jobTitles || [])) {
      jobTitleByLabel.set((jt.label as string).trim().toLowerCase(), jt.id as string);
    }

    const teamByName = new Map<string, string>();
    for (const t of (teamsData || [])) {
      teamByName.set((t.name as string).trim().toLowerCase(), t.id as string);
    }

    // Create run record (only if not dry run)
    let runId: string | null = null;
    if (!dryRun) {
      const { data: runRow, error: runErr } = await supabaseAdmin
        .from("hr_correction_runs")
        .insert({ initiated_by: user.id, status: "running" })
        .select("id")
        .single();
      if (runErr) throw runErr;
      runId = runRow.id;
    }

    const results: any[] = [];
    let totalChanged = 0;
    let totalNotFound = 0;
    let totalNoDiff = 0;

    for (const rec of records) {
      const nome = (rec.Nome || "").trim();
      if (!nome) continue;

      const person = peopleByName.get(nome.toLowerCase());
      if (!person) {
        totalNotFound++;
        results.push({ nome, status: "not_found" });
        continue;
      }

      // Build update object from CSV fields
      const updates: Record<string, any> = {};
      const changes: Array<{ field: string; before: any; after: any }> = [];

      const checkField = (csvKey: string, dbKey: string, transform?: (v: string) => any) => {
        const csvVal = rec[csvKey];
        if (csvVal === undefined || csvVal === null || csvVal === "") return;
        const newVal = transform ? transform(csvVal) : csvVal;
        if (newVal === undefined || newVal === null) return;
        const currentVal = person[dbKey];
        // Compare as strings for consistency
        const cur = currentVal === null || currentVal === undefined ? "" : String(currentVal);
        const nw = String(newVal);
        if (cur !== nw) {
          updates[dbKey] = newVal;
          changes.push({ field: dbKey, before: currentVal, after: newVal });
        }
      };

      checkField("Tipo_Vinculo", "tipo_vinculo", (v) => VINCULO_MAP[v.toLowerCase()]);
      checkField("Cargo_Funcao", "cargo_id", (v) => jobTitleByLabel.get(v.trim().toLowerCase()));
      checkField("Departamento", "team_id", (v) => teamByName.get(v.trim().toLowerCase()));
      checkField("Local_Atuacao", "local_atuacao");
      checkField("Data_Admissao", "data_admissao");
      checkField("Situacao", "situacao", (v) => SITUACAO_MAP[v.toLowerCase()]);
      checkField("Data_Desligamento", "data_desligamento");
      checkField("Tipo_Motivo_Desligamento", "observacoes_desligamento");
      checkField("Nivel", "nivel");
      checkField("Trilha", "trilha");
      checkField("Projeto", "projeto");
      checkField("Cargo_Antigo", "cargo_antigo");
      checkField("Email", "email");
      checkField("Celular", "celular");
      checkField("ID_Externo", "id_externo");
      checkField("Centro_Custo", "centro_custo");
      checkField("Observacoes", "observacoes");
      checkField("Comite_Gestor", "comite_gestor");
      checkField("Remuneracao_Mensal", "remuneracao_mensal", (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? undefined : n;
      });
      checkField("Remuneracao_II", "remuneracao_ii", (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? undefined : n;
      });
      checkField("Beneficios", "beneficios", (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? undefined : n;
      });

      if (changes.length === 0) {
        totalNoDiff++;
        results.push({ nome, status: "no_diff" });
        continue;
      }

      totalChanged++;
      results.push({
        nome,
        status: "changed",
        personId: person.id,
        changes,
      });

      if (!dryRun && runId) {
        // Save snapshot and apply update
        await supabaseAdmin.from("hr_correction_items").insert({
          run_id: runId,
          person_id: person.id,
          person_name: person.nome,
          snapshot_before: person,
          fields_changed: changes,
        });

        await supabaseAdmin
          .from("hr_people")
          .update(updates)
          .eq("id", person.id);
      }
    }

    // Finalize run
    if (!dryRun && runId) {
      await supabaseAdmin
        .from("hr_correction_runs")
        .update({
          status: "success",
          ended_at: new Date().toISOString(),
          total_processed: records.length,
          total_changed: totalChanged,
          total_not_found: totalNotFound,
          total_no_diff: totalNoDiff,
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        runId,
        dryRun: !!dryRun,
        totalProcessed: records.length,
        totalChanged,
        totalNotFound,
        totalNoDiff,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("hr-apply-corrections error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
