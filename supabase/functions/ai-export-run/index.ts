import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { run_id } = await req.json();

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: "run_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the run
    const { data: run, error: runErr } = await supabase
      .from("ai_runs")
      .select("*")
      .eq("id", run_id)
      .single();

    if (runErr || !run) {
      return new Response(
        JSON.stringify({ error: "Run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch external search logs
    const { data: extLogs } = await supabase
      .from("ai_external_search_logs")
      .select("*")
      .eq("run_id", run_id);

    // Build JSON export
    const exportData = {
      run_id: run.id,
      run_type: run.run_type,
      template_type: run.template_type,
      user_id: run.user_id,
      created_at: run.created_at,
      status: run.status,
      model: run.model,
      template_version: run.template_version,
      prompt_hash: run.prompt_hash,
      redaction_level: run.redaction_level,
      tokens_in: run.tokens_in,
      tokens_out: run.tokens_out,
      approved_status: run.approved_status,
      approved_by: run.approved_by,
      approved_at: run.approved_at,
      approved_reason: run.approved_reason,
      replay_of_run_id: run.replay_of_run_id,
      input_json: run.input_json,
      output_text: run.output_text,
      output_structured: run.output_structured,
      internal_docs_used: run.internal_docs_used,
      external_sources_used: run.external_sources_used,
      external_search_logs: extLogs || [],
      error_message: run.error_message,
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonKey = `exports/${run_id}/${timestamp}.json`;

    // Upload JSON to storage
    const { error: uploadErr } = await supabase.storage
      .from("ai-exports")
      .upload(jsonKey, new Blob([jsonContent], { type: "application/json" }), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: "Failed to upload export" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (1 hour)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("ai-exports")
      .createSignedUrl(jsonKey, 3600);

    if (signErr) {
      console.error("Signed URL error:", signErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record in ai_run_exports
    await supabase.from("ai_run_exports").insert({
      run_id,
      storage_key: jsonKey,
      file_type: "json",
    });

    // Build CSV of internal evidences
    let csvUrl = null;
    const internalDocs = run.internal_docs_used || [];
    const evidences = run.output_structured?.evidences || [];

    if (internalDocs.length > 0 || evidences.length > 0) {
      const csvRows = ["document_id,file_name,chunk_index,page_start,ref_index,excerpt"];

      for (const doc of internalDocs) {
        csvRows.push(
          `"${doc.document_id || ""}","${(doc.file_name || "").replace(/"/g, '""')}",${doc.chunk_index ?? ""},${doc.page_start ?? ""},"",""`
        );
      }

      for (const ev of evidences) {
        csvRows.push(
          `"","${(ev.document_name || "").replace(/"/g, '""')}","","",${ev.ref_index ?? ""},"${(ev.excerpt || "").replace(/"/g, '""').slice(0, 200)}"`
        );
      }

      const csvContent = csvRows.join("\n");
      const csvKey = `exports/${run_id}/${timestamp}-evidences.csv`;

      const { error: csvUpErr } = await supabase.storage
        .from("ai-exports")
        .upload(csvKey, new Blob([csvContent], { type: "text/csv" }), {
          contentType: "text/csv",
          upsert: true,
        });

      if (!csvUpErr) {
        const { data: csvSigned } = await supabase.storage
          .from("ai-exports")
          .createSignedUrl(csvKey, 3600);

        csvUrl = csvSigned?.signedUrl || null;

        await supabase.from("ai_run_exports").insert({
          run_id,
          storage_key: csvKey,
          file_type: "csv",
        });
      }
    }

    return new Response(
      JSON.stringify({
        json_url: signedData.signedUrl,
        csv_url: csvUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-export-run error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
