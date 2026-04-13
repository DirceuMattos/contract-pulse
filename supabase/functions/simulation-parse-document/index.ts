import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractTextFromPDF(buffer: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(buffer);
  const matches: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEtRegex.exec(text)) !== null) {
    const block = m[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) {
      matches.push(tj[1]);
    }
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja: RegExpExecArray | null;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1];
      const parts = inner.match(/\(([^)]*)\)/g);
      if (parts) {
        matches.push(parts.map((p) => p.slice(1, -1)).join(""));
      }
    }
  }
  if (matches.length === 0) {
    const readable = text.match(/[\x20-\x7E\xC0-\xFF]{10,}/g);
    if (readable) return readable.join(" ").slice(0, 100000);
    return "";
  }
  return matches.join(" ").slice(0, 100000);
}

function extractTextFromDOCX(buffer: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[1]);
  }
  return matches.join(" ").slice(0, 100000);
}

serve(async (req) => {
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

    const { fileBase64, fileName } = await req.json();
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 and fileName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode file
    const binaryStr = atob(fileBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // Extract text
    const ext = fileName.toLowerCase().split(".").pop();
    let extractedText = "";
    if (ext === "pdf") {
      extractedText = extractTextFromPDF(bytes);
    } else if (ext === "docx") {
      extractedText = extractTextFromDOCX(bytes);
    } else {
      return new Response(JSON.stringify({ error: "Formato não suportado. Use PDF ou DOCX." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair texto suficiente do documento. Verifique se o PDF não é escaneado (imagem)." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to ~100k chars
    const docText = extractedText.slice(0, 100000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um analista especializado em licitações e contratos de TI do setor público e privado brasileiro.
Analise o documento fornecido (Termo de Referência, Edital ou similar) e extraia as informações para preencher uma simulação de contrato.

Regras:
- Infira os valores com base no contexto do documento. Se não encontrar informação direta, faça a melhor estimativa.
- Para campos enum, use APENAS os valores listados.
- Para perfis de RH, sugira os cargos e quantidades que seriam necessários para executar o escopo descrito.
- Estime salários baseados no mercado brasileiro de TI.
- Para custos adicionais, identifique despesas como viagens, infraestrutura, licenças, etc.
- Responda SEMPRE em português brasileiro.`;

    const userPrompt = `Analise o seguinte documento e extraia os dados para simulação de contrato:\n\n${docText}`;

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_simulation",
        description: "Preenche os campos da simulação de contrato com dados extraídos do documento.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome/título da simulação baseado no objeto do edital" },
            clientName: { type: "string", description: "Nome do órgão/empresa contratante" },
            contractType: { type: "string", enum: ["gov", "private"], description: "Tipo de contrato" },
            govSphere: { type: "string", enum: ["municipal", "estadual", "federal"], description: "Esfera governamental (se gov)" },
            termMonths: { type: "number", description: "Prazo em meses" },
            description: { type: "string", description: "Resumo do escopo (até 500 caracteres)" },
            complexityLevel: { type: "string", enum: ["baixa", "media", "alta"] },
            questionnaire: {
              type: "object",
              properties: {
                demandType: { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] },
                criticality: { type: "string", enum: ["baixa", "media", "alta"] },
                integrations: { type: "string", enum: ["nenhuma", "1-2", "3-5", "mais-5"] },
                modules: { type: "string", enum: ["1-2", "3-5", "6-10", "mais-10"] },
                userVolume: { type: "string", enum: ["menos-200", "200-2k", "2k-20k", "mais-20k"] },
                slaLevel: { type: "string", enum: ["comercial", "12x5", "24x7"] },
                deliveryPace: { type: "string", enum: ["flexivel", "moderado", "agressivo"] },
                fieldDependency: { type: "boolean" },
              },
              required: ["demandType", "criticality", "integrations", "modules", "userVolume", "slaLevel", "deliveryPace", "fieldDependency"],
            },
            hrProfiles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Cargo (ex: Analista de Sistemas, Gerente de Projetos)" },
                  hiringType: { type: "string", enum: ["clt", "pj"] },
                  quantity: { type: "number" },
                  grossMonthly: { type: "number", description: "Salário bruto mensal estimado em R$" },
                  chargesPercent: { type: "number", description: "Percentual de encargos (ex: 80 para CLT, 6 para PJ)" },
                },
                required: ["role", "hiringType", "quantity", "grossMonthly", "chargesPercent"],
              },
            },
            otherCosts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", description: "Categoria (ex: infraestrutura, viagem, licenca, treinamento)" },
                  description: { type: "string" },
                  valueMonthly: { type: "number", description: "Valor mensal estimado em R$" },
                },
                required: ["category", "description", "valueMonthly"],
              },
            },
            responsavelCliente: { type: "string", description: "Nome do responsável no cliente, se mencionado" },
            consultancyCost: { type: "number", description: "Custo de consultoria mensal, se aplicável" },
          },
          required: ["name", "clientName", "contractType", "termMonths", "description", "complexityLevel", "questionnaire", "hrProfiles", "otherCosts"],
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("simulation-parse-document error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
