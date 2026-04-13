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

async function fetchSalaryTable(supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data: resources } = await supabaseAdmin
      .from("resources")
      .select("cargo, tipo, custo_base")
      .not("cargo", "is", null)
      .neq("cargo", "");

    if (!resources || resources.length === 0) return "Nenhum dado salarial disponível.";

    const grouped: Record<string, { tipo: string; values: number[] }> = {};
    resources.forEach((r: Record<string, unknown>) => {
      const key = `${r.cargo}|${r.tipo}`;
      if (!grouped[key]) grouped[key] = { tipo: r.tipo as string, values: [] };
      grouped[key].values.push(r.custo_base as number);
    });

    const lines = Object.entries(grouped)
      .sort((a, b) => b[1].values.length - a[1].values.length)
      .map(([key, data]) => {
        const cargo = key.split("|")[0];
        const avg = Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length);
        const min = Math.round(Math.min(...data.values));
        const max = Math.round(Math.max(...data.values));
        return `  ${cargo} (${data.tipo}) | Média: R$ ${avg} | Min: R$ ${min} | Max: R$ ${max} | Qtd: ${data.values.length}`;
      });

    return lines.join("\n");
  } catch (err) {
    console.error("Error fetching salary table:", err);
    return "Não foi possível carregar tabela salarial.";
  }
}

async function fetchContractContext(supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data: contracts } = await supabaseAdmin
      .from("contracts")
      .select("id, nome, tipo, segmento, valor_mensal_referencia, status")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!contracts || contracts.length === 0) return "Nenhum contrato cadastrado ainda.";

    const contractIds = contracts.map((c: Record<string, unknown>) => c.id as string).filter(Boolean);

    const { data: resources } = await supabaseAdmin
      .from("resources")
      .select("nome, cargo, custo_base, tipo, contract_id")
      .in("contract_id", contractIds);

    const resourcesByContract: Record<string, Array<{ nome: string; cargo: string; custo: number; tipo: string }>> = {};
    (resources ?? []).forEach((r: Record<string, unknown>) => {
      const cid = r.contract_id as string;
      if (!resourcesByContract[cid]) resourcesByContract[cid] = [];
      resourcesByContract[cid].push({
        nome: r.nome as string,
        cargo: (r.cargo as string) || "",
        custo: r.custo_base as number,
        tipo: r.tipo as string,
      });
    });

    return contracts.map((c: Record<string, unknown>) => {
      const id = c.id as string;
      const res = resourcesByContract[id] || [];
      const resStr = res.length > 0
        ? res.map(r => `  - ${r.cargo || r.nome} (${r.tipo}): R$ ${r.custo}`).join("\n")
        : "  (sem recursos cadastrados)";
      return `• ${c.nome} | Tipo: ${c.tipo} | Segmento: ${c.segmento} | Valor ref: R$ ${c.valor_mensal_referencia || "N/A"} | Status: ${c.status}\n  Recursos:\n${resStr}`;
    }).join("\n\n");
  } catch (err) {
    console.error("Error fetching contract context:", err);
    return "Não foi possível carregar contratos de referência.";
  }
}

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

    const binaryStr = atob(fileBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

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

    const docText = extractedText.slice(0, 100000);

    // Fetch existing contracts and salary data as real-world context
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const [contractContext, salaryTable] = await Promise.all([
      fetchContractContext(supabaseAdmin),
      fetchSalaryTable(supabaseAdmin),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um analista especializado em licitações e contratos de TI do setor público e privado brasileiro.

## REGRAS FUNDAMENTAIS — SIGA RIGOROSAMENTE

1. **EXTRAIA APENAS** dados que estão **EXPLICITAMENTE** escritos no documento fornecido.
2. Se uma informação **NÃO consta** no texto, retorne **null** (para campos únicos) ou **array vazio []** (para listas). **NUNCA invente.**
3. **NUNCA** invente nomes de órgãos, valores monetários, prazos, perfis profissionais ou quantidades que não estejam no texto.
4. Para **salários/remuneração**: use OBRIGATORIAMENTE a TABELA SALARIAL DA EMPRESA como primeira referência. Os valores da tabela refletem o custo real praticado pela empresa. NUNCA subestime — em caso de dúvida, use o valor MÉDIO ou MÁXIMO da tabela, nunca o mínimo. Se não houver cargo equivalente na tabela, use mercado 2024/2025 mas MARQUE como estimativa.
5. **IMPORTANTE**: Os salários da tabela já são valores reais pagos. Não aplique "desconto" ou "ajuste conservador" sobre eles.
6. Se o documento é **vago sobre quantidade** de profissionais, retorne a quantidade **MÍNIMA** explicitamente mencionada. Se nenhuma quantidade é mencionada, use 1.
7. **NÃO infira** perfis profissionais que não são mencionados ou claramente implícitos no escopo descrito.
8. Cada informação retornada deve poder ser **rastreada** a um trecho específico do documento.

## TABELA SALARIAL DA EMPRESA (custos reais praticados — USE ESTES VALORES)

${salaryTable}

## CONTRATOS DE REFERÊNCIA DA EMPRESA (contexto adicional)

${contractContext}

## O QUE EXTRAIR DO DOCUMENTO

### Identificação
- Nome/objeto completo do edital ou TR — copie do documento, não resuma
- Nome do órgão/empresa contratante — exatamente como escrito
- Tipo (gov/private) — baseado em evidências no texto (presença de pregão, CNPJ público, etc.)
- Prazo de vigência — somente se explicitamente mencionado
- Esfera governamental — somente se aplicável e identificável

### Questionário Técnico
- Tipo de demanda: identifique apenas os tipos EXPLICITAMENTE descritos no escopo
- Criticidade: baseie-se em SLAs, penalidades e natureza do sistema mencionados no documento
- Integrações: conte apenas as EXPLICITAMENTE mencionadas
- Módulos: conte apenas os EXPLICITAMENTE listados
- Volume de usuários: use apenas números do documento
- SLA: extraia o nível descrito no documento
- Ritmo de entrega: baseie-se em cronogramas do documento
- Dependência de campo: somente se houver menção a presença física

### Perfis Profissionais
- Liste APENAS perfis que o documento MENCIONA EXPLICITAMENTE (por nome, por tabela de postos, por descrição de equipe mínima)
- Inclua cargo, qualificações e certificações SOMENTE se descritos no documento
- Para salários: use os Contratos de Referência acima como base. Se não houver referência, estime com mercado 2024/2025 e marque em confidence
- NÃO adicione perfis "porque faz sentido para o escopo" — adicione SOMENTE se o documento os menciona

### Custos Adicionais
- Liste APENAS custos EXPLICITAMENTE mencionados no documento (licenças, infraestrutura, viagens, treinamentos, garantias)
- NÃO invente custos que "normalmente existem" — somente os do documento

### Observações (aiNotes)
- Separe claramente: "EXTRAÍDO DO DOCUMENTO:" e "SUGESTÕES ADICIONAIS:"
- Na seção extraída: penalidades, SLAs específicos, garantias, exigências de segurança, LGPD, condições de pagamento — tudo COM referência ao trecho do documento
- Na seção sugestões: riscos potenciais e recomendações que você identifica, claramente marcados como opinião analítica`;

    const userPrompt = `Analise o documento abaixo e extraia SOMENTE as informações que estão EXPLICITAMENTE presentes no texto. Não adicione nada que não esteja escrito no documento.\n\n${docText}`;

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_simulation",
        description: "Preenche os campos da simulação SOMENTE com dados extraídos do documento. Campos não encontrados devem ser null ou array vazio.",
        parameters: {
          type: "object",
          properties: {
            name: { type: ["string", "null"], description: "Nome/título EXATO do objeto, copiado do documento. Null se não encontrado." },
            clientName: { type: ["string", "null"], description: "Nome EXATO do contratante conforme escrito no documento. Null se não encontrado." },
            contractType: { type: ["string", "null"], enum: ["gov", "private", null], description: "Tipo de contrato baseado em evidências do texto." },
            govSphere: { type: ["string", "null"], enum: ["municipal", "estadual", "federal", null], description: "Esfera governamental. Null se não identificável." },
            termMonths: { type: ["number", "null"], description: "Prazo em meses EXATO conforme documento. Null se não mencionado." },
            description: { type: ["string", "null"], description: "Resumo do escopo usando APENAS informações do documento (até 1000 chars)." },
            complexityLevel: { type: ["string", "null"], enum: ["baixa", "media", "alta", null], description: "Nível de complexidade baseado nos requisitos do documento." },
            questionnaire: {
              type: "object",
              properties: {
                demandType: {
                  oneOf: [
                    { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] },
                    { type: "array", items: { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] } },
                  ],
                },
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
              description: "SOMENTE perfis EXPLICITAMENTE mencionados no documento. Array vazio se nenhum perfil é descrito.",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Cargo EXATO conforme descrito no documento" },
                  hiringType: { type: "string", enum: ["clt", "pj"] },
                  quantity: { type: "number", description: "Quantidade EXATA mencionada no documento. Se não mencionada, use 1." },
                  grossMonthly: { type: "number", description: "Salário bruto mensal. Use contratos de referência como base, ou mercado 2024/2025." },
                  chargesPercent: { type: "number", description: "Percentual de encargos (ex: 80 para CLT, 6 para PJ)" },
                },
                required: ["role", "hiringType", "quantity", "grossMonthly", "chargesPercent"],
              },
            },
            otherCosts: {
              type: "array",
              description: "SOMENTE custos EXPLICITAMENTE mencionados no documento. Array vazio se nenhum custo adicional é descrito.",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string", description: "Descrição do custo conforme o documento" },
                  valueMonthly: { type: "number", description: "Valor mensal estimado em R$" },
                },
                required: ["category", "description", "valueMonthly"],
              },
            },
            aiNotes: {
              type: ["string", "null"],
              description: "Formato obrigatório:\n\nEXTRAÍDO DO DOCUMENTO:\n- [item com referência ao trecho]\n\nSUGESTÕES ADICIONAIS:\n- [recomendação analítica claramente marcada como sugestão]",
            },
            confidence: {
              type: "object",
              description: "Indica a origem de cada dado: 'documento' (extraído diretamente), 'referencia' (calibrado com contratos da empresa), 'estimativa' (estimado sem base no documento/referência).",
              properties: {
                name: { type: "string", enum: ["documento", "estimativa"] },
                clientName: { type: "string", enum: ["documento", "estimativa"] },
                contractType: { type: "string", enum: ["documento", "estimativa"] },
                termMonths: { type: "string", enum: ["documento", "estimativa"] },
                hrProfiles: { type: "string", enum: ["documento", "referencia", "estimativa"] },
                otherCosts: { type: "string", enum: ["documento", "referencia", "estimativa"] },
                salaries: { type: "string", enum: ["documento", "referencia", "estimativa"] },
              },
            },
            responsavelCliente: { type: ["string", "null"], description: "Nome do responsável no cliente, SOMENTE se mencionado no documento." },
            consultancyCost: { type: ["number", "null"], description: "Custo de consultoria mensal, SOMENTE se mencionado no documento." },
          },
          required: ["name", "clientName", "contractType", "termMonths", "description", "complexityLevel", "questionnaire", "hrProfiles", "otherCosts", "aiNotes", "confidence"],
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
