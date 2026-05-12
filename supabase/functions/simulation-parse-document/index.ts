import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── DOCX fallback extraction (XML-based, works well) ──

function extractTextFromDOCX(buffer: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) matches.push(m[1]);
  return matches.join(" ").slice(0, 200000);
}

// ── Context fetching ──

interface SalaryEntry {
  cargo: string;
  tipo: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

async function fetchSalaryTable(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ text: string; entries: SalaryEntry[] }> {
  try {
    const { data: resources } = await supabaseAdmin
      .from("resources")
      .select("cargo, tipo, custo_base")
      .not("cargo", "is", null)
      .neq("cargo", "");

    if (!resources || resources.length === 0) return { text: "Nenhum dado salarial disponível.", entries: [] };

    const grouped: Record<string, { tipo: string; values: number[] }> = {};
    resources.forEach((r: Record<string, unknown>) => {
      const key = `${r.cargo}|${r.tipo}`;
      if (!grouped[key]) grouped[key] = { tipo: r.tipo as string, values: [] };
      grouped[key].values.push(r.custo_base as number);
    });

    const entries: SalaryEntry[] = [];
    const lines = Object.entries(grouped)
      .sort((a, b) => b[1].values.length - a[1].values.length)
      .map(([key, data]) => {
        const cargo = key.split("|")[0];
        const avg = Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length);
        const min = Math.round(Math.min(...data.values));
        const max = Math.round(Math.max(...data.values));
        entries.push({ cargo, tipo: data.tipo, avg, min, max, count: data.values.length });
        return `  ${cargo} (${data.tipo}) | Média: R$ ${avg} | Min: R$ ${min} | Max: R$ ${max} | Qtd: ${data.values.length}`;
      });

    return { text: lines.join("\n"), entries };
  } catch (err) {
    console.error("Error fetching salary table:", err);
    return { text: "Não foi possível carregar tabela salarial.", entries: [] };
  }
}

async function fetchContractContext(supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data: contracts } = await supabaseAdmin
      .from("contracts")
      .select("id, nome, tipo, segmento, valor_mensal_referencia, status, objeto")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!contracts || contracts.length === 0) return "Nenhum contrato cadastrado ainda.";

    const contractIds = contracts.map((c: Record<string, unknown>) => c.id as string).filter(Boolean);

    const { data: resources } = await supabaseAdmin
      .from("resources")
      .select("nome, cargo, custo_base, tipo, percentual_dedicacao, contract_id")
      .in("contract_id", contractIds);

    const resourcesByContract: Record<string, Array<{ nome: string; cargo: string; custo: number; tipo: string; dedicacao: number }>> = {};
    (resources ?? []).forEach((r: Record<string, unknown>) => {
      const cid = r.contract_id as string;
      if (!resourcesByContract[cid]) resourcesByContract[cid] = [];
      resourcesByContract[cid].push({
        nome: r.nome as string,
        cargo: (r.cargo as string) || "",
        custo: r.custo_base as number,
        tipo: r.tipo as string,
        dedicacao: r.percentual_dedicacao as number,
      });
    });

    return contracts.map((c: Record<string, unknown>) => {
      const id = c.id as string;
      const res = resourcesByContract[id] || [];
      const resStr = res.length > 0
        ? res.map(r => `    - ${r.cargo || r.nome} (${r.tipo}): R$ ${r.custo} | Dedicação: ${r.dedicacao}%`).join("\n")
        : "    (sem recursos cadastrados)";
      const objeto = ((c.objeto as string) || "").slice(0, 200);
      return `• ${c.nome} | Tipo: ${c.tipo} | Segmento: ${c.segmento} | Valor ref: R$ ${c.valor_mensal_referencia || "N/A"} | Status: ${c.status}\n  Objeto: ${objeto}\n  Recursos:\n${resStr}`;
    }).join("\n\n");
  } catch (err) {
    console.error("Error fetching contract context:", err);
    return "Não foi possível carregar contratos de referência.";
  }
}

// ── Main handler ──

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role check: c-level only
    const adminCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await adminCheck
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.claims.sub)
      .eq("role", "c-level")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileName } = await req.json();
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = fileName.toLowerCase().split(".").pop();
    const isPDF = ext === "pdf";
    const isDOCX = ext === "docx";

    if (!isPDF && !isDOCX) {
      return new Response(JSON.stringify({ error: "Formato não suportado. Use PDF ou DOCX." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For DOCX, extract text. For PDF, we send inline to the model.
    let docText = "";
    if (isDOCX) {
      const binaryStr = atob(fileBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      docText = extractTextFromDOCX(bytes);
      if (docText.trim().length < 50) {
        return new Response(JSON.stringify({ error: "Não foi possível extrair texto suficiente do documento DOCX." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch context in parallel
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const [contractContext, salaryData] = await Promise.all([
      fetchContractContext(supabaseAdmin),
      fetchSalaryTable(supabaseAdmin),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── Prompt ──
    const systemPrompt = `Você é um analista sênior especializado em licitações e contratos de TI do setor público e privado brasileiro.

Sua tarefa é analisar um Termo de Referência (TR) ou Edital e extrair o máximo de informações possível para preencher uma simulação de contrato.

## TABELA SALARIAL DA EMPRESA (valores reais — use como referência para estimar custos de pessoal)

${salaryData.text}

## CONTRATOS DE REFERÊNCIA DA EMPRESA (para contextualizar escopo e preços)

${contractContext}

## INSTRUÇÕES

1. Leia o documento INTEIRO com atenção. Extraia todos os dados relevantes.
2. Preste atenção especial a tabelas de postos de trabalho, equipe mínima, qualificações, SLAs e valores.
3. Para salários, use a tabela salarial da empresa como referência principal. Na dúvida, prefira valores médios ou acima da média.
4. Extraia TODOS os perfis profissionais mencionados, com as quantidades especificadas no documento.
5. Se um campo não está no documento, retorne null — mas tente ao máximo encontrar a informação.
6. Forneça evidências (trechos do documento) para os campos principais.
7. Seja abrangente e completo na análise. Capture tudo que for relevante para a simulação.`;

    // Build user message content based on file type
    const userContent: Array<Record<string, unknown>> = [];

    if (isPDF) {
      // Multimodal: send PDF inline for Gemini to read directly
      userContent.push({
        type: "file",
        file: {
          filename: fileName,
          file_data: `data:application/pdf;base64,${fileBase64}`,
        },
      });
      userContent.push({
        type: "text",
        text: "Analise este documento de licitação/TR acima. Extraia todas as informações relevantes para preencher a simulação de contrato.",
      });
    } else {
      // DOCX: send extracted text
      userContent.push({
        type: "text",
        text: `Analise o documento abaixo. Extraia todas as informações relevantes para preencher a simulação de contrato.\n\nDOCUMENTO:\n---\n${docText.slice(0, 150000)}\n---`,
      });
    }

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_simulation",
        description: "Preenche a simulação com dados extraídos do documento.",
        parameters: {
          type: "object",
          properties: {
            // ── IDENTIFICATION ──
            name: { type: ["string", "null"], description: "Nome/título do objeto do edital/TR." },
            nameEvidence: { type: ["string", "null"], description: "Trecho do documento." },
            clientName: { type: ["string", "null"], description: "Nome do contratante." },
            clientNameEvidence: { type: ["string", "null"] },
            contractType: { type: ["string", "null"], enum: ["gov", "private", null] },
            govSphere: { type: ["string", "null"], enum: ["municipal", "estadual", "federal", null] },
            termMonths: { type: ["number", "null"], description: "Prazo em meses." },
            termMonthsEvidence: { type: ["string", "null"] },
            description: { type: ["string", "null"], description: "Resumo completo do escopo (até 2000 chars). Inclua: objeto, entregas, tecnologias, sistemas." },
            estimatedContractValue: { type: ["number", "null"], description: "Valor estimado se mencionado no documento." },
            estimatedContractValueEvidence: { type: ["string", "null"] },
            estimatedContractValueType: { type: ["string", "null"], enum: ["mensal", "total", "anual", null] },

            // ── QUESTIONNAIRE ──
            complexityLevel: { type: ["string", "null"], enum: ["baixa", "media", "alta", null] },
            complexityJustification: { type: ["string", "null"] },
            questionnaire: {
              type: "object",
              properties: {
                demandType: {
                  oneOf: [
                    { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] },
                    { type: "array", items: { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] } },
                    { type: "null" },
                  ],
                },
                criticality: { type: ["string", "null"], enum: ["baixa", "media", "alta", null] },
                integrations: { type: ["string", "null"], enum: ["nenhuma", "1-2", "3-5", "mais-5", null] },
                integrationsEvidence: { type: ["string", "null"] },
                modules: { type: ["string", "null"], enum: ["1-2", "3-5", "6-10", "mais-10", null] },
                modulesEvidence: { type: ["string", "null"] },
                userVolume: { type: ["string", "null"], enum: ["menos-200", "200-2k", "2k-20k", "mais-20k", null] },
                slaLevel: { type: ["string", "null"], enum: ["comercial", "12x5", "24x7", null] },
                slaEvidence: { type: ["string", "null"] },
                deliveryPace: { type: ["string", "null"], enum: ["flexivel", "moderado", "agressivo", null] },
                fieldDependency: { type: ["boolean", "null"] },
              },
            },

            // ── HR PROFILES ──
            hrProfiles: {
              type: "array",
              description: "TODOS os perfis profissionais mencionados no documento com quantidades e salários estimados.",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Cargo/função conforme o documento." },
                  hiringType: { type: "string", enum: ["clt", "pj"] },
                  quantity: { type: "number" },
                  grossMonthly: { type: "number", description: "Salário bruto mensal. Use a tabela salarial da empresa como referência." },
                  chargesPercent: { type: "number", description: "Encargos (CLT ~68%, PJ ~10%)." },
                  evidence: { type: ["string", "null"] },
                  qualifications: { type: ["string", "null"] },
                  source: { type: "string", enum: ["documento", "referencia", "estimativa"] },
                },
                required: ["role", "hiringType", "quantity", "grossMonthly", "chargesPercent", "source"],
              },
            },

            // ── OTHER COSTS ──
            otherCosts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string" },
                  valueMonthly: { type: "number" },
                  evidence: { type: ["string", "null"] },
                  source: { type: "string", enum: ["documento", "referencia", "estimativa"] },
                },
                required: ["category", "description", "valueMonthly", "source"],
              },
            },

            // ── AI NOTES ──
            aiNotes: {
              type: ["string", "null"],
              description: `Observações da análise com seções:
DADOS IDENTIFICADOS NO DOCUMENTO:
EXIGÊNCIAS CONTRATUAIS (penalidades, garantias, SLAs, certificações, LGPD):
CAMPOS NÃO IDENTIFICADOS:
SUGESTÕES:`,
            },

            // ── COVERAGE & CONFIDENCE ──
            coverage: {
              type: "object",
              properties: {
                fieldsFound: { type: "array", items: { type: "string" } },
                fieldsNotFound: { type: "array", items: { type: "string" } },
                overallQuality: { type: "string", enum: ["completa", "parcial", "limitada"] },
                qualitySummary: { type: "string" },
              },
              required: ["fieldsFound", "fieldsNotFound", "overallQuality", "qualitySummary"],
            },
            confidence: {
              type: "object",
              properties: {
                name: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
                clientName: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
                contractType: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
                termMonths: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
                complexityLevel: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
                hrProfiles: { type: "string", enum: ["documento", "referencia", "estimativa", "nao_identificado"] },
                otherCosts: { type: "string", enum: ["documento", "referencia", "estimativa", "nao_identificado"] },
                questionnaire: { type: "string", enum: ["documento", "estimativa", "nao_identificado"] },
              },
            },

            responsavelCliente: { type: ["string", "null"] },
            consultancyCost: { type: ["number", "null"] },
          },
          required: ["name", "clientName", "contractType", "termMonths", "description", "complexityLevel", "questionnaire", "hrProfiles", "otherCosts", "aiNotes", "coverage", "confidence"],
        },
      },
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "fill_simulation" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    result._meta = {
      fileType: ext,
      multimodal: isPDF,
      extractedAt: new Date().toISOString(),
      model: "google/gemini-2.5-pro",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("simulation-parse-document error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
