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
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrlAuth = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrlAuth, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      type,         // 'contract' | 'tr'
      variant,      // 'govtech' | 'privado'
      answers,      // questionnaire answers
      doc_ids,      // selected document IDs
      search_query, // optional keywords for chunk retrieval
      replay_of_run_id, // optional: ID of original run being replayed
    } = await req.json();

    if (!type || !answers) {
      return new Response(
        JSON.stringify({ error: "type and answers are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always derive identity and role from verified JWT, never from request body
    const user_id = callerId;
    const { data: roleRow } = await authClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "c-level")
      .maybeSingle();
    const redactionLevel = roleRow ? "full" : "aggregated";

    // Retrieve relevant chunks from selected documents
    let contextChunks: { chunk_text: string; document_id: string; chunk_index: number; page_start: number | null; file_name?: string }[] = [];

    if (doc_ids && doc_ids.length > 0) {
      // Build search keywords from answers
      const keywords = type === "contract"
        ? [answers.objeto, answers.contratante, answers.contratada].filter(Boolean).join(" ")
        : [answers.objetoEscopo, answers.contextoJustificativa].filter(Boolean).join(" ");

      const searchTerms = search_query || keywords;

      if (searchTerms?.trim()) {
        // Use full-text search
        const { data: ftsResults } = await supabase.rpc("match_chunks_fts", {
          query_text: searchTerms,
          doc_ids: doc_ids,
          match_count: 15,
        });

        if (ftsResults && ftsResults.length > 0) {
          contextChunks = ftsResults.map((r: any) => ({
            chunk_text: r.chunk_text,
            document_id: r.document_id,
            chunk_index: r.chunk_index,
            page_start: r.page_start,
          }));
        }
      }

      // If FTS returned nothing, get first chunks from each document
      if (contextChunks.length === 0) {
        const { data: fallbackChunks } = await supabase
          .from("doc_chunks")
          .select("chunk_text, document_id, chunk_index, page_start")
          .in("document_id", doc_ids)
          .order("chunk_index", { ascending: true })
          .limit(15);

        if (fallbackChunks) {
          contextChunks = fallbackChunks;
        }
      }

      // Get document names for evidence
      const { data: docMeta } = await supabase
        .from("document_attachments")
        .select("id, file_name")
        .in("id", doc_ids);

      const docNameMap = new Map((docMeta || []).map((d: any) => [d.id, d.file_name]));
      contextChunks = contextChunks.map((c) => ({
        ...c,
        file_name: docNameMap.get(c.document_id) || "Documento",
      }));

      // Apply redaction for non-admin users
      if (redactionLevel === "aggregated") {
        contextChunks = contextChunks.map((c) => ({
          ...c,
          chunk_text: c.chunk_text
            .replace(/R\$\s*[\d.,]+/g, "R$ [VALOR REDACTED]")
            .replace(/remuneração[^.]*\./gi, "[INFORMAÇÃO REDACTED]"),
        }));
      }
    }

    // Build context text
    const contextText = contextChunks.length > 0
      ? contextChunks
          .map(
            (c, i) =>
              `[Ref ${i + 1} - ${c.file_name}${c.page_start ? ` p.${c.page_start}` : ""}]\n${c.chunk_text}`
          )
          .join("\n\n")
      : "";

    // Build the prompt
    const typeLabel = type === "contract"
      ? `Contrato ${variant === "govtech" ? "Administrativo (GovTech)" : "Privado"}`
      : "Termo de Referência";

    const systemPrompt = `Você é um especialista jurídico em contratos de tecnologia e prestação de serviços no Brasil.
Sua tarefa é gerar uma minuta de ${typeLabel} em português brasileiro (PT-BR).

REGRAS:
1. Gere o texto completo da minuta, bem estruturado e formal.
2. Use os dados do questionário fornecido para preencher todos os campos.
3. Se houver documentos de referência, use trechos relevantes e CITE a fonte entre colchetes [Ref X].
4. Se faltar algum dado obrigatório, mantenha um placeholder como [DADO PENDENTE] e liste na seção de pendências.
5. A minuta deve seguir padrões legais brasileiros.
${type === "contract" && variant === "govtech" ? "6. Para contratos GovTech, referencie a Lei nº 14.133/2021 (Nova Lei de Licitações) quando aplicável." : ""}

FORMATO DE SAÍDA:
Use a ferramenta 'format_draft' para retornar o resultado estruturado.`;

    const userPrompt = `Dados do questionário:
${JSON.stringify(answers, null, 2)}

${contextText ? `\nDocumentos de referência:\n${contextText}` : "\nNenhum documento de referência selecionado."}

Gere a minuta completa de ${typeLabel}.`;

    // Call Lovable AI Gateway with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "format_draft",
              description: "Return the generated draft with evidence and gaps",
              parameters: {
                type: "object",
                properties: {
                  draft_text: {
                    type: "string",
                    description: "The complete draft text in PT-BR",
                  },
                  evidences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ref_index: { type: "number" },
                        document_name: { type: "string" },
                        page: { type: "string" },
                        excerpt: { type: "string" },
                      },
                      required: ["ref_index", "document_name", "excerpt"],
                    },
                    description: "List of document references used in the draft",
                  },
                  gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["field", "description"],
                    },
                    description: "Missing data that needs to be filled",
                  },
                },
                required: ["draft_text", "evidences", "gaps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "format_draft" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao gerar minuta via IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();

    let draftText = "";
    let evidences: any[] = [];
    let gaps: any[] = [];

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        draftText = parsed.draft_text || "";
        evidences = parsed.evidences || [];
        gaps = parsed.gaps || [];
      } catch {
        // Fallback: use content directly
        draftText = aiData.choices?.[0]?.message?.content || "";
      }
    } else {
      draftText = aiData.choices?.[0]?.message?.content || "";
    }

    // Build internal_docs_used
    const internalDocsUsed = contextChunks.map((c) => ({
      document_id: c.document_id,
      chunk_index: c.chunk_index,
      page_start: c.page_start,
      file_name: c.file_name,
    }));

    // Determine template_type
    const templateType = type === "contract"
      ? (variant === "govtech" ? "contrato_govtech" : "contrato_privado")
      : (variant === "completo" ? "tr_completo" : "tr_padrao");

    // Save ai_run
    const { data: aiRun, error: runErr } = await supabase
      .from("ai_runs")
      .insert({
        run_type: type === "contract" ? "draft_contract" : "draft_tr",
        template_type: templateType,
        user_id,
        input_json: { type, variant, answers, doc_ids },
        redaction_level: redactionLevel,
        internal_docs_used: internalDocsUsed,
        output_text: draftText,
        output_structured: { evidences, gaps },
        status: "success",
        model: "google/gemini-3-flash-preview",
        template_version: "v1",
        replay_of_run_id: replay_of_run_id || null,
      })
      .select("id")
      .single();

    if (runErr) {
      console.error("Failed to save ai_run:", runErr);
    }

    return new Response(
      JSON.stringify({
        draft_text: draftText,
        evidences,
        gaps,
        run_id: aiRun?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-draft-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
