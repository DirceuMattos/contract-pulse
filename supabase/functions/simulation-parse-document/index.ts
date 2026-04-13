import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Robust text extraction ──

function extractTextFromPDF(buffer: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(buffer);
  const matches: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEtRegex.exec(raw)) !== null) {
    const block = m[1];
    // Tj operator
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(block)) !== null) matches.push(tj[1]);
    // TJ array operator
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja: RegExpExecArray | null;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const parts = tja[1].match(/\(([^)]*)\)/g);
      if (parts) matches.push(parts.map((p) => p.slice(1, -1)).join(""));
    }
  }
  if (matches.length === 0) {
    // Fallback: grab readable strings
    const readable = raw.match(/[\x20-\x7E\xC0-\xFF]{10,}/g);
    if (readable) return readable.join(" ").slice(0, 200000);
    return "";
  }
  return matches.join(" ").slice(0, 200000);
}

function extractTextFromDOCX(buffer: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) matches.push(m[1]);
  return matches.join(" ").slice(0, 200000);
}

/** Check if extracted text looks like real content vs PDF metadata garbage */
function validateTextQuality(text: string): { ok: boolean; cleanText: string; warning?: string } {
  if (!text || text.trim().length < 50) {
    return { ok: false, cleanText: "", warning: "Texto extraído muito curto ou vazio." };
  }
  // Count proportion of "readable" Portuguese words vs gibberish
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 20) {
    return { ok: false, cleanText: text, warning: "Texto extraído contém poucas palavras legíveis." };
  }
  // Detect PDF metadata artifacts
  const metadataPatterns = /\/Type\s*\/|\/Page\s|\/Catalog|endobj|startxref|%%EOF|\/Font\s/g;
  const metaMatches = text.match(metadataPatterns);
  if (metaMatches && metaMatches.length > words.length * 0.1) {
    // More than 10% metadata — text is likely garbage
    // Try to clean it
    const cleaned = text
      .replace(/<<[^>]*>>/g, " ")
      .replace(/\/\w+\s/g, " ")
      .replace(/\d+\s+\d+\s+obj/g, " ")
      .replace(/endobj/g, " ")
      .replace(/stream[\s\S]*?endstream/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.split(/\s+/).filter(w => w.length > 2).length < 20) {
      return { ok: false, cleanText: cleaned, warning: "O PDF parece ser escaneado (imagem) ou ter estrutura que impede extração de texto. Considere usar um PDF com texto selecionável." };
    }
    return { ok: true, cleanText: cleaned, warning: "Texto parcialmente extraído — alguns trechos podem estar ilegíveis." };
  }
  return { ok: true, cleanText: text.trim() };
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

    const ext = fileName.toLowerCase().split(".").pop();
    let rawText = "";
    if (ext === "pdf") {
      rawText = extractTextFromPDF(bytes);
    } else if (ext === "docx") {
      rawText = extractTextFromDOCX(bytes);
    } else {
      return new Response(JSON.stringify({ error: "Formato não suportado. Use PDF ou DOCX." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate text quality
    const validation = validateTextQuality(rawText);
    if (!validation.ok) {
      return new Response(JSON.stringify({
        error: validation.warning || "Não foi possível extrair texto suficiente do documento.",
        textQuality: "poor",
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docText = validation.cleanText.slice(0, 150000);
    const textQualityWarning = validation.warning || null;

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

    // ── Multi-stage analysis prompt ──
    const systemPrompt = `Você é um analista sênior especializado em licitações e contratos de TI do setor público e privado brasileiro. Seu trabalho é extrair informações de Termos de Referência (TR) e Editais com máxima precisão.

## PRINCÍPIOS FUNDAMENTAIS

### Sobre Extração de Dados
1. Para CADA campo que você preencher, forneça a EVIDÊNCIA: o trecho exato do documento que sustenta sua resposta.
2. Se uma informação NÃO está no documento, o campo DEVE ser null e o status DEVE ser "nao_identificado".
3. NUNCA invente nomes, valores, prazos ou perfis. Se não encontrou, diga que não encontrou.

### Sobre Valores e Salários  
4. Use a TABELA SALARIAL DA EMPRESA como referência primária para estimar custos de pessoal.
5. Na dúvida entre subestimar e superestimar, use o valor MÉDIO ou MÁXIMO da tabela — NUNCA o mínimo.
6. Se o documento menciona faixas salariais ou valores de referência, USE os valores do documento.

### Sobre Equipe
7. Extraia TODOS os perfis profissionais mencionados no documento, incluindo aqueles em tabelas de postos de trabalho, requisitos de equipe mínima, e descrições de atividades que impliquem papéis específicos.
8. Quando o documento lista "postos de trabalho" ou "categorias profissionais" com quantidades, extraia CADA um com a quantidade especificada.
9. Se o documento menciona um perfil mas não especifica quantidade, use 1.

### Sobre Escopo
10. Identifique TODAS as exigências: SLAs, penalidades, garantias, certificações, LGPD, acessibilidade, qualificações técnicas.
11. Classifique a complexidade baseando-se em: volume de usuários, integrações, módulos, SLAs, penalidades, certificações exigidas.

## TABELA SALARIAL DA EMPRESA (valores reais praticados — USE COMO REFERÊNCIA)

${salaryData.text}

## CONTRATOS DE REFERÊNCIA DA EMPRESA (para contextualizar escopo e preços)

${contractContext}

## ESTRUTURA DA ANÁLISE

Analise o documento em 4 dimensões:
1. **IDENTIFICAÇÃO**: nome, contratante, tipo, prazo, esfera, objeto
2. **ESCOPO TÉCNICO**: tipo de demanda, criticidade, SLA, integrações, módulos, volume, ritmo, dependências
3. **EQUIPE**: todos os perfis mencionados com quantidades, qualificações e estimativas salariais
4. **CUSTOS E CONDIÇÕES**: custos adicionais, penalidades, garantias, condições especiais`;

    const userPrompt = `Analise o documento abaixo. Para CADA informação extraída, indique:
- O VALOR encontrado
- A EVIDÊNCIA (trecho do documento que comprova)
- O STATUS (encontrado_no_documento / inferido_do_contexto / nao_identificado)

Leia o documento INTEIRO. Preste atenção especial a:
- Tabelas de postos de trabalho / equipe mínima
- Requisitos de qualificação técnica
- SLAs e penalidades
- Prazo de vigência e condições de renovação
- Valor estimado do contrato
- Integrações e sistemas mencionados

DOCUMENTO:
---
${docText}
---

${textQualityWarning ? `⚠️ AVISO: ${textQualityWarning}` : ""}`;

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_simulation",
        description: "Preenche a simulação com dados extraídos do documento, incluindo evidências e status de cada campo.",
        parameters: {
          type: "object",
          properties: {
            // ── IDENTIFICATION ──
            name: { type: ["string", "null"], description: "Nome/título EXATO do objeto do edital/TR, copiado do documento." },
            nameEvidence: { type: ["string", "null"], description: "Trecho do documento que contém o nome/objeto." },
            clientName: { type: ["string", "null"], description: "Nome EXATO do contratante conforme escrito no documento." },
            clientNameEvidence: { type: ["string", "null"], description: "Trecho do documento que menciona o contratante." },
            contractType: { type: ["string", "null"], enum: ["gov", "private", null], description: "Tipo baseado em evidências (pregão, licitação = gov)." },
            govSphere: { type: ["string", "null"], enum: ["municipal", "estadual", "federal", null] },
            termMonths: { type: ["number", "null"], description: "Prazo em meses EXATO conforme documento." },
            termMonthsEvidence: { type: ["string", "null"], description: "Trecho que menciona o prazo." },
            description: { type: ["string", "null"], description: "Resumo do escopo usando APENAS informações do documento (até 2000 chars). Inclua: objeto, principais entregas, tecnologias mencionadas, sistemas envolvidos." },
            estimatedContractValue: { type: ["number", "null"], description: "Valor estimado do contrato se mencionado no documento (valor total ou mensal)." },
            estimatedContractValueEvidence: { type: ["string", "null"] },
            estimatedContractValueType: { type: ["string", "null"], enum: ["mensal", "total", "anual", null] },

            // ── QUESTIONNAIRE ──
            complexityLevel: { type: ["string", "null"], enum: ["baixa", "media", "alta", null], description: "Complexidade baseada em SLAs, integrações, módulos, certificações exigidas." },
            complexityJustification: { type: ["string", "null"], description: "Justificativa da classificação de complexidade com base no documento." },
            questionnaire: {
              type: "object",
              properties: {
                demandType: {
                  oneOf: [
                    { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] },
                    { type: "array", items: { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] } },
                    { type: "null" },
                  ],
                  description: "Tipo(s) de demanda identificados. Null se não identificável.",
                },
                criticality: { type: ["string", "null"], enum: ["baixa", "media", "alta", null], description: "Baseado em SLAs e penalidades do documento." },
                integrations: { type: ["string", "null"], enum: ["nenhuma", "1-2", "3-5", "mais-5", null], description: "Quantidade de integrações EXPLICITAMENTE mencionadas." },
                integrationsEvidence: { type: ["string", "null"], description: "Lista das integrações mencionadas." },
                modules: { type: ["string", "null"], enum: ["1-2", "3-5", "6-10", "mais-10", null], description: "Módulos/sistemas EXPLICITAMENTE listados." },
                modulesEvidence: { type: ["string", "null"], description: "Lista dos módulos mencionados." },
                userVolume: { type: ["string", "null"], enum: ["menos-200", "200-2k", "2k-20k", "mais-20k", null] },
                slaLevel: { type: ["string", "null"], enum: ["comercial", "12x5", "24x7", null] },
                slaEvidence: { type: ["string", "null"], description: "Descrição dos SLAs encontrados no documento." },
                deliveryPace: { type: ["string", "null"], enum: ["flexivel", "moderado", "agressivo", null] },
                fieldDependency: { type: ["boolean", "null"] },
              },
            },

            // ── HR PROFILES ──
            hrProfiles: {
              type: "array",
              description: "TODOS os perfis profissionais mencionados no documento. Inclua CADA posto de trabalho listado em tabelas, equipe mínima, ou descrições de atividades. Use a tabela salarial da empresa para estimar valores.",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Cargo/função EXATO conforme descrito no documento." },
                  hiringType: { type: "string", enum: ["clt", "pj"], description: "Tipo de contratação. Se não especificado, use 'pj'." },
                  quantity: { type: "number", description: "Quantidade EXATA mencionada no documento. Se não mencionada, use 1." },
                  grossMonthly: { type: "number", description: "Salário bruto mensal estimado. Use a tabela salarial da empresa como referência primária. Para cargos sem equivalente, estime com mercado 2024/2025." },
                  chargesPercent: { type: "number", description: "Percentual de encargos (CLT: ~68%, PJ: ~10%)." },
                  evidence: { type: ["string", "null"], description: "Trecho do documento que menciona este perfil." },
                  qualifications: { type: ["string", "null"], description: "Qualificações e certificações exigidas para este perfil, conforme documento." },
                  source: { type: "string", enum: ["documento", "referencia", "estimativa"], description: "'documento' se explicitamente mencionado, 'referencia' se baseado em contratos internos, 'estimativa' se inferido." },
                },
                required: ["role", "hiringType", "quantity", "grossMonthly", "chargesPercent", "source"],
              },
            },

            // ── OTHER COSTS ──
            otherCosts: {
              type: "array",
              description: "Custos adicionais EXPLICITAMENTE mencionados no documento (licenças, infra, viagens, treinamentos, garantias, seguros).",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string", description: "Descrição conforme o documento." },
                  valueMonthly: { type: "number", description: "Valor mensal estimado em R$." },
                  evidence: { type: ["string", "null"], description: "Trecho do documento." },
                  source: { type: "string", enum: ["documento", "referencia", "estimativa"] },
                },
                required: ["category", "description", "valueMonthly", "source"],
              },
            },

            // ── AI NOTES ──
            aiNotes: {
              type: ["string", "null"],
              description: `Formato OBRIGATÓRIO com seções separadas:

DADOS IDENTIFICADOS NO DOCUMENTO:
- [cada dado relevante com referência ao trecho]

EXIGÊNCIAS CONTRATUAIS:
- Penalidades: [se encontradas]
- Garantias: [se encontradas]
- SLAs específicos: [se encontrados]
- Certificações exigidas: [se encontradas]
- LGPD/Segurança: [se mencionados]
- Condições de pagamento: [se mencionadas]

CAMPOS NÃO IDENTIFICADOS:
- [listar campos que ficaram como null/não identificado e por quê]

SUGESTÕES DA ANÁLISE:
- [riscos, oportunidades e recomendações baseadas na experiência]`,
            },

            // ── COVERAGE & CONFIDENCE ──
            coverage: {
              type: "object",
              description: "Cobertura da análise: quais campos foram encontrados vs não identificados.",
              properties: {
                fieldsFound: { type: "array", items: { type: "string" }, description: "Lista de campos preenchidos com dados do documento." },
                fieldsNotFound: { type: "array", items: { type: "string" }, description: "Lista de campos que NÃO foram encontrados no documento." },
                overallQuality: { type: "string", enum: ["completa", "parcial", "limitada"], description: "'completa' se >80% dos campos preenchidos, 'parcial' se 50-80%, 'limitada' se <50%." },
                qualitySummary: { type: "string", description: "Resumo de 1-2 frases sobre a qualidade geral da extração." },
              },
              required: ["fieldsFound", "fieldsNotFound", "overallQuality", "qualitySummary"],
            },
            confidence: {
              type: "object",
              description: "Origem de cada dado principal.",
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

            // ── OPTIONAL FIELDS ──
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    // Add text quality metadata
    result._meta = {
      textLength: docText.length,
      textQualityWarning,
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
