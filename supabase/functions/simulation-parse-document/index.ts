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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um analista sênior especializado em licitações, contratos de TI e estimativas de custo do setor público e privado brasileiro, com mais de 15 anos de experiência em análise de Termos de Referência e Editais.

Sua tarefa é realizar uma ANÁLISE EXAUSTIVA E DETALHISTA do documento fornecido, extraindo TODAS as informações relevantes para a simulação de um contrato de serviços de TI.

## DIRETRIZES DE EXTRAÇÃO

### Identificação do Contrato
- Extraia o objeto/título COMPLETO do edital ou TR
- Identifique o órgão/empresa contratante com nome completo
- Determine se é governo (municipal, estadual, federal) ou privado com base no contexto (presença de CNPJ público, menção a licitação, pregão, etc.)
- Extraia o prazo de vigência EXATO mencionado no documento
- Crie um resumo do escopo que cubra TODOS os serviços descritos, não apenas o principal

### Complexidade e Questionário Técnico
- **Tipo de demanda**: Se o TR cobre TANTO sustentação quanto evolução (ou implantação + sustentação), retorne um ARRAY com todos os tipos aplicáveis
- **Criticidade**: Avalie com base em: natureza do sistema (saúde, segurança = alta), penalidades previstas, SLAs exigidos, volume de usuários
- **Integrações**: Conte TODAS as integrações mencionadas (APIs, webservices, barramento ESB, integrações com outros sistemas, importação/exportação de dados)
- **Módulos**: Conte módulos, subsistemas, funcionalidades macro descritas
- **Volume de usuários**: Procure referências a "usuários simultâneos", "usuários cadastrados", "postos de trabalho", "unidades atendidas" × estimativa de usuários por unidade
- **SLA**: Identifique janelas de atendimento (8x5, 12x5, 24x7), tempo máximo de resposta, disponibilidade mínima
- **Ritmo de entrega**: Avalie prazos de implantação, cronogramas, sprints, entregas parciais
- **Dependência de campo**: Verifique se há necessidade de presença física, visitas técnicas, escritório local, deslocamentos

### Perfis Profissionais (HR)
ESTA É A SEÇÃO MAIS IMPORTANTE. Seja EXTREMAMENTE detalhista:
- Identifique CADA perfil profissional mencionado no documento (Gerente de Projetos, Scrum Master, Product Owner, Arquiteto de Software, DBA, Analista de Sistemas, Desenvolvedor Frontend, Desenvolvedor Backend, Analista de Testes/QA, Analista de Requisitos, DevOps/SRE, Analista de Dados, Designer UX/UI, Analista de Suporte N1/N2/N3, Analista de Segurança, etc.)
- Para cada perfil, considere: cargo exato, formação exigida, certificações requeridas, experiência mínima
- Estime salários com base no mercado brasileiro de TI 2024/2025, considerando senioridade e região
- Se o documento menciona "equipe mínima" ou "postos de trabalho", extraia a quantidade exata
- Se NÃO menciona perfis explicitamente, INFIRA a equipe necessária com base no escopo descrito (ex: sistema web complexo = pelo menos dev frontend + backend + QA + GP)
- Use CLT para perfis que exigem presença ou vínculo formal (suporte, campo), PJ para perfis técnicos especializados
- Inclua na descrição do cargo as certificações e requisitos quando mencionados (ex: "Gerente de Projetos - PMP, mín. 5 anos")

### Custos Adicionais
Identifique TODOS os custos implícitos e explícitos:
- Licenças de software (IDEs, ferramentas de gestão, monitoramento, CI/CD)
- Infraestrutura cloud (servidores, storage, CDN, banco de dados gerenciado)
- Viagens e deslocamentos (frequência estimada × custo médio)
- Treinamentos e capacitação (da equipe e do cliente/usuários finais)
- Transição de conhecimento (período inicial sem faturamento pleno)
- Garantia contratual (seguro garantia, caução)
- Equipamentos (notebooks, monitores, periféricos para equipe)
- Ferramentas de comunicação e colaboração
- Custos de acessibilidade (WCAG, testes de acessibilidade)
- Segurança da informação (pentest, certificações, ferramentas)

### Observações Importantes (aiNotes)
Capture em texto livre TODAS as informações relevantes que não cabem nos campos estruturados:
- Exigências de seguro garantia e percentuais
- Penalidades e multas previstas (glosas por descumprimento de SLA, multas por atraso)
- Indicadores de desempenho (KPIs) e metas contratuais
- Exigência de escritório local ou equipe residente
- Requisitos de sigilo e LGPD
- Condições de pagamento e reajuste
- Subcontratação permitida ou vedada
- Propriedade intelectual do código
- Período de garantia pós-contrato
- Qualquer cláusula atípica ou risco identificado
- Estimativa de complexidade técnica (tecnologias específicas, legado, migração)
- Requisitos de transferência de conhecimento

Seja EXTREMAMENTE detalhista nas aiNotes. Este campo é crucial para a análise de riscos posterior.`;

    const userPrompt = `Analise o seguinte documento de forma EXAUSTIVA e extraia TODOS os dados para simulação de contrato. Não omita nenhuma informação relevante:\n\n${docText}`;

    const toolSchema = {
      type: "function",
      function: {
        name: "fill_simulation",
        description: "Preenche os campos da simulação de contrato com dados extraídos do documento de forma detalhada e completa.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome/título completo da simulação baseado no objeto do edital" },
            clientName: { type: "string", description: "Nome completo do órgão/empresa contratante" },
            contractType: { type: "string", enum: ["gov", "private"], description: "Tipo de contrato" },
            govSphere: { type: "string", enum: ["municipal", "estadual", "federal"], description: "Esfera governamental (se gov)" },
            termMonths: { type: "number", description: "Prazo em meses conforme documento" },
            description: { type: "string", description: "Resumo detalhado do escopo cobrindo TODOS os serviços (até 1000 caracteres)" },
            complexityLevel: { type: "string", enum: ["baixa", "media", "alta"] },
            questionnaire: {
              type: "object",
              properties: {
                demandType: {
                  oneOf: [
                    { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] },
                    { type: "array", items: { type: "string", enum: ["sustentacao", "evolucao", "novo-sistema", "implantacao"] } },
                  ],
                  description: "Tipo(s) de demanda. Use array quando o TR cobre múltiplos tipos (ex: sustentação + evolução).",
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
              description: "Lista COMPLETA de todos os perfis profissionais necessários, com cargos específicos e detalhados",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Cargo específico com requisitos (ex: 'Gerente de Projetos - PMP, 5+ anos', 'Dev Backend Sênior - Java/Spring')" },
                  hiringType: { type: "string", enum: ["clt", "pj"] },
                  quantity: { type: "number" },
                  grossMonthly: { type: "number", description: "Salário bruto mensal estimado em R$ baseado no mercado 2024/2025" },
                  chargesPercent: { type: "number", description: "Percentual de encargos (ex: 80 para CLT, 6 para PJ)" },
                },
                required: ["role", "hiringType", "quantity", "grossMonthly", "chargesPercent"],
              },
            },
            otherCosts: {
              type: "array",
              description: "Lista COMPLETA de todos os custos adicionais identificados (licenças, infra, viagens, treinamento, garantias, etc.)",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", description: "Categoria (infraestrutura, licenca, viagem, treinamento, garantia, equipamento, seguranca, acessibilidade, outro)" },
                  description: { type: "string", description: "Descrição detalhada do custo" },
                  valueMonthly: { type: "number", description: "Valor mensal estimado em R$" },
                },
                required: ["category", "description", "valueMonthly"],
              },
            },
            aiNotes: {
              type: "string",
              description: "Observações detalhadas sobre riscos, exigências contratuais, penalidades, SLAs específicos, requisitos de segurança, LGPD, garantias, e qualquer informação relevante não coberta pelos campos estruturados. Seja MUITO detalhista.",
            },
            responsavelCliente: { type: "string", description: "Nome do responsável no cliente, se mencionado" },
            consultancyCost: { type: "number", description: "Custo de consultoria mensal, se aplicável" },
          },
          required: ["name", "clientName", "contractType", "termMonths", "description", "complexityLevel", "questionnaire", "hrProfiles", "otherCosts", "aiNotes"],
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
