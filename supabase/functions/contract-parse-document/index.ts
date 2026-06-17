// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractTextFromDOCX(buffer: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) matches.push(m[1]);
  return matches.join(" ").slice(0, 200000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileName, mimeType } = await req.json();
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 e fileName são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (fileName.toLowerCase().split(".").pop() || "").trim();
    const isPDF = ext === "pdf" || mimeType === "application/pdf";
    const isDOCX = ext === "docx";
    const isImage = mimeType?.startsWith("image/") || ["png","jpg","jpeg","webp"].includes(ext);

    if (!isPDF && !isDOCX && !isImage) {
      return new Response(JSON.stringify({ error: "Formato não suportado. Use PDF, DOCX ou imagem." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let docText = "";
    if (isDOCX) {
      const binaryStr = atob(fileBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      docText = extractTextFromDOCX(bytes);
      if (docText.trim().length < 50) {
        return new Response(JSON.stringify({ error: "Não foi possível extrair texto do DOCX." }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch clients (only readable to this user — uses anon client with their JWT)
    const { data: clientsList } = await supabase
      .from("clients")
      .select("id, razao_social, nome_fantasia, cnpj, segmento")
      .order("razao_social");

    const clientsCsv = (clientsList ?? [])
      .slice(0, 500)
      .map((c: any) => `${c.id} | ${c.razao_social}${c.nome_fantasia ? " ("+c.nome_fantasia+")" : ""} | CNPJ:${c.cnpj || "-"} | ${c.segmento}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em contratos brasileiros (TI, GovTech e setor privado).
Sua tarefa é ler o documento de contrato fornecido e extrair informações para pré-preencher um cadastro.

REGRAS:
- Retorne null para qualquer campo que NÃO esteja claramente no documento. Não invente.
- Datas no formato ISO YYYY-MM-DD.
- Valores numéricos como número puro (sem "R$", sem pontos de milhar, vírgula vira ponto decimal).
- Para clientId, escolha um id da lista abaixo SOMENTE se houver correspondência clara (razão social, nome fantasia ou CNPJ). Caso contrário, retorne null e preencha clientNameDetected.

CLIENTES CADASTRADOS (id | razão social | CNPJ | segmento):
${clientsCsv || "(nenhum)"}
`;

    const userContent: Array<Record<string, unknown>> = [];
    const instruction = "Analise o documento de contrato e extraia os campos solicitados via a função fill_contract.";

    if (isPDF) {
      userContent.push({ type: "file", file: { filename: fileName, file_data: `data:application/pdf;base64,${fileBase64}` } });
      userContent.push({ type: "text", text: instruction });
    } else if (isImage) {
      const mt = mimeType || (ext === "png" ? "image/png" : "image/jpeg");
      userContent.push({ type: "image_url", image_url: { url: `data:${mt};base64,${fileBase64}` } });
      userContent.push({ type: "text", text: instruction });
    } else {
      userContent.push({ type: "text", text: `${instruction}\n\nDOCUMENTO:\n---\n${docText.slice(0, 150000)}\n---` });
    }

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_contract",
        description: "Preenche o cadastro de contrato com dados extraídos do documento.",
        parameters: {
          type: "object",
          properties: {
            codigo: { type: ["string", "null"], description: "Código/número do contrato." },
            nome: { type: ["string", "null"], description: "Nome ou título do contrato." },
            clientId: { type: ["string", "null"], description: "ID do cliente da lista (UUID), ou null." },
            clientNameDetected: { type: ["string", "null"], description: "Nome do contratante encontrado, se nenhum cliente da lista bateu." },
            tipo: { type: ["string", "null"], enum: ["sistema", "infraestrutura", "hibrido", null] },
            segmento: { type: ["string", "null"], enum: ["govtech", "privado", null] },
            govSphere: { type: ["string", "null"], enum: ["municipal", "estadual", "federal", null] },
            unidade: { type: ["string", "null"] },
            centroCusto: { type: ["string", "null"] },

            dataInicio: { type: ["string", "null"], description: "YYYY-MM-DD" },
            dataFim: { type: ["string", "null"], description: "YYYY-MM-DD" },
            renovacaoAutomatica: { type: ["boolean", "null"] },
            periodicidadeRenovacao: { type: ["string", "null"], description: "Mensal/Trimestral/Semestral/Anual/Bienal" },
            renewalTermMonths: { type: ["number", "null"], description: "Prazo de renovação em meses." },

            indiceReajuste: { type: ["string", "null"], description: "IPCA/IGPM/INPC/IPCA-E/Outro" },
            dataBaseReajuste: { type: ["string", "null"], description: "YYYY-MM-DD" },

            modeloReceita: { type: ["string", "null"], enum: ["mrr", "media-mensal", null] },
            valorMensalReferencia: { type: ["number", "null"] },
            valorTotalContrato: { type: ["number", "null"] },
            percentualImpostosFaturamento: { type: ["number", "null"] },
            moeda: { type: ["string", "null"], enum: ["BRL", "USD", null] },
            observacoesFinanceiras: { type: ["string", "null"] },

            objeto: { type: ["string", "null"], description: "Objeto do contrato (até 5000 chars)." },
            escopoOperacional: { type: ["string", "null"] },
            slas: { type: ["string", "null"], description: "Resumo dos SLAs / níveis de serviço." },
            riscosPendencias: { type: ["string", "null"], description: "Multas, penalidades, garantias, riscos relevantes." },

            responsavelInterno: { type: ["string", "null"], description: "Gestor pelo contratado." },
            responsavelCliente: { type: ["string", "null"], description: "Gestor pelo cliente." },
            responsavelClienteEmail: { type: ["string", "null"] },
            responsavelClienteTelefone: { type: ["string", "null"] },

            tags: { type: "array", items: { type: "string" } },
            notes: { type: ["string", "null"], description: "Observações curtas sobre o que ficou ambíguo ou não foi encontrado." },
          },
          required: [],
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
          { role: "user", content: userContent },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "fill_contract" } },
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
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Sem tool_call na resposta da IA");

    const fields = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ fields, model: "google/gemini-2.5-flash" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("contract-parse-document error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
