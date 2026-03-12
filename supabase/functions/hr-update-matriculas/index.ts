import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { records } = (await req.json()) as {
      records: { nome: string; matricula: string }[];
    };

    if (!records || !Array.isArray(records)) {
      return new Response(
        JSON.stringify({ error: "records array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load all hr_people
    const { data: people, error: fetchErr } = await supabase
      .from("hr_people")
      .select("id, nome")
      .order("nome");

    if (fetchErr) throw fetchErr;

    // Build normalized lookup: norm -> [{id, nome}]
    const normMap = new Map<string, { id: string; nome: string }[]>();
    for (const p of people!) {
      const key = normalize(p.nome);
      if (!normMap.has(key)) normMap.set(key, []);
      normMap.get(key)!.push(p);
    }

    const updated: { nome: string; matricula: string; id: string }[] = [];
    const not_found: { nome: string; matricula: string; reason: string }[] = [];
    const skipped: { nome: string; reason: string }[] = [];

    for (const rec of records) {
      if (!rec.matricula) {
        skipped.push({ nome: rec.nome, reason: "sem matrícula" });
        continue;
      }

      const key = normalize(rec.nome);
      const matches = normMap.get(key);

      if (!matches || matches.length === 0) {
        not_found.push({ nome: rec.nome, matricula: rec.matricula, reason: "0 matches" });
        continue;
      }

      if (matches.length > 1) {
        not_found.push({
          nome: rec.nome,
          matricula: rec.matricula,
          reason: `${matches.length} matches: ${matches.map((m) => m.nome).join(", ")}`,
        });
        continue;
      }

      // Exactly 1 match
      const person = matches[0];
      const { error: upErr } = await supabase
        .from("hr_people")
        .update({ matricula: rec.matricula })
        .eq("id", person.id);

      if (upErr) {
        not_found.push({ nome: rec.nome, matricula: rec.matricula, reason: `update error: ${upErr.message}` });
      } else {
        updated.push({ nome: rec.nome, matricula: rec.matricula, id: person.id });
      }
    }

    return new Response(
      JSON.stringify({
        total: records.length,
        updated_count: updated.length,
        not_found_count: not_found.length,
        skipped_count: skipped.length,
        updated,
        not_found,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
