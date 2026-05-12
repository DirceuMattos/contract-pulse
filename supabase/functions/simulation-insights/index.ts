import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { simulation } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formatBRL = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    // Build HR profiles section
    const hrProfiles = simulation.hrProfiles || [];
    const hrSection = hrProfiles.length > 0
      ? hrProfiles.map((p: any, i: number) =>
          `  ${i + 1}. ${p.role} — ${p.quantity}x ${p.hiringType?.toUpperCase()} — ${formatBRL(p.grossMonthly)}/mês — Encargos: ${p.chargesPercent}%`
        ).join("\n")
      : "  (Não informado)";

    // Build other costs section
    const otherCosts = simulation.otherCosts || [];
    const costsSection = otherCosts.length > 0
      ? otherCosts.map((c: any, i: number) =>
          `  ${i + 1}. [${c.category}] ${c.description} — ${formatBRL(c.valueMonthly)}/mês`
        ).join("\n")
      : "  (Nenhum custo adicional)";

    // Build scenarios section
    const scenarios = simulation.scenarios || [];
    const scenariosSection = scenarios.length > 0
      ? scenarios.map((s: any) =>
          `  - **${s.label}**: Receita ${formatBRL(s.receitaMensal)} | Custo ${formatBRL(s.custoMensal)} | Overhead ${formatBRL(s.overheadMensal)} | Resultado ${formatBRL(s.resultadoMensal)} | Margem ${s.margemPercent.toFixed(1)}% | Status: ${s.healthStatus}`
        ).join("\n")
      : "";

    // Build overhead section
    const overhead = simulation.overhead || {};
    const overheadSection = `  - Infraestrutura: ${overhead.infraPercent ?? 0}% | Administrativo: ${overhead.adminPercent ?? 0}% | Governança: ${overhead.governancePercent ?? 0}%`;

    // Build aiNotes section
    const aiNotesSection = simulation.aiNotes
      ? `\n### Observações extraídas do documento (IA)\n${simulation.aiNotes}`
      : "";

    const prompt = `Você é um consultor de negócios experiente em contratos de tecnologia e serviços de TI no Brasil, com expertise em precificação, gestão de riscos e análise de viabilidade.

Analise a seguinte simulação de contrato de forma DETALHADA E PROFUNDA, considerando TODOS os dados fornecidos.

## Dados da Simulação

- **Nome:** ${simulation.name}
- **Cliente:** ${simulation.clientName}
- **Tipo:** ${simulation.contractType === "gov" ? "Governo" : "Privado"}${simulation.govSphere ? ` (${simulation.govSphere})` : ""}
- **Prazo informado:** ${simulation.termMonths} meses
- **Prazo sugerido:** ${simulation.suggestedTermMonths} meses
- **Complexidade:** ${simulation.complexityLevel}
- **Descrição:** ${simulation.description}

### Precificação
- **Valor mensal sugerido:** ${formatBRL(simulation.suggestedMonthlyValue)}
- **Valor total sugerido:** ${formatBRL(simulation.suggestedTotalValue)}
- **Custo mensal:** ${formatBRL(simulation.custoMensal)}
- **Break-even mensal:** ${formatBRL(simulation.breakEvenMonthly)}
- **Margem projetada:** ${simulation.margemPercent.toFixed(1)}%
- **Margem-alvo:** ${simulation.targetMarginPercent}%

### Composição da Equipe (RH)
${hrSection}

### Custos Adicionais
${costsSection}

### Overhead
${overheadSection}

### Questionário Técnico
- Tipo de demanda: ${Array.isArray(simulation.questionnaire.demandType) ? simulation.questionnaire.demandType.join(" + ") : simulation.questionnaire.demandType}
- Criticidade: ${simulation.questionnaire.criticality}
- Integrações: ${simulation.questionnaire.integrations}
- Módulos: ${simulation.questionnaire.modules}
- Volume de usuários: ${simulation.questionnaire.userVolume}
- SLA: ${simulation.questionnaire.slaLevel}
- Ritmo de entrega: ${simulation.questionnaire.deliveryPace}
- Dependência de campo: ${simulation.questionnaire.fieldDependency ? "Sim" : "Não"}
${scenariosSection ? `\n### Cenários Calculados\n${scenariosSection}` : ""}
${aiNotesSection}

## Instruções de Análise

Forneça sua análise em português brasileiro, cobrindo OBRIGATORIAMENTE todos os tópicos abaixo com PROFUNDIDADE e ESPECIFICIDADE. Use dados concretos da simulação para embasar cada ponto. Evite generalidades.

### 1. Perfil do Contrato
- Posicionamento estratégico (governo vs privado, implicações)
- Adequação do prazo ao escopo
- Nível de risco geral (baixo/médio/alto) com justificativa

### 2. Análise da Composição de Equipe
- Avaliar se o mix de perfis é adequado ao escopo descrito
- Identificar perfis que podem estar faltando (ex: QA, DevOps, Scrum Master)
- Comentar sobre senioridade e quantidade vs complexidade
- Avaliar custo médio por perfil vs mercado

### 3. Análise de Cenários
${scenariosSection ? "- Comentar CADA cenário individualmente (Conservador, Base, Otimista)" : "- Projetar cenários possíveis baseados nos dados"}
- Indicar qual cenário é mais provável e por quê
- Identificar condições que levariam ao cenário conservador
- Sugerir ações para garantir o cenário otimista

### 4. Riscos e Pontos de Atenção
- Riscos contratuais específicos (SLA, penalidades, multas mencionadas)
- Riscos operacionais (dependência de pessoas-chave, turnover)
- Riscos financeiros (margem apertada, custos não previstos)
- Riscos regulatórios (LGPD, compliance, certificações)
- Para cada risco: probabilidade (alta/média/baixa), impacto e mitigação

### 5. Oportunidades de Otimização
- Sugestões para melhorar margem sem comprometer qualidade
- Possibilidades de automação que reduzam custo operacional
- Estratégias de escalonamento da equipe (ramp-up/ramp-down)
- Oportunidades de upsell ou serviços adicionais

### 6. Benchmark de Mercado
- Comparar margem projetada com referências do setor (TI gov: 8-15%, privado: 15-25%)
- Avaliar se o preço está competitivo para o escopo
- Comentar sobre ticket médio por profissional vs mercado

### 7. Recomendação sobre Prazo e Precificação
- O prazo proposto é adequado? Justifique
- O valor sugerido é viável? Está acima ou abaixo do mercado?
- Sugestão de faixa de preço ideal com justificativa

### 8. Plano de Contingência
- O que fazer se o cenário conservador se materializar
- Ações corretivas para recuperar margem
- Gatilhos de alerta (indicadores para monitorar)

### 9. Veredicto Final
- Resumo executivo em 3-5 frases
- Classificação: RECOMENDADO / RECOMENDADO COM RESSALVAS / NÃO RECOMENDADO
- Top 3 ações prioritárias antes de submeter proposta

Seja direto, prático e específico. Use formatação em markdown com negrito e listas para facilitar a leitura.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "Você é um consultor sênior com 20+ anos de experiência em contratos de TI, precificação de serviços e análise de viabilidade no Brasil. Você conhece profundamente o mercado brasileiro de TI, faixas salariais, margens praticadas e riscos comuns. Responda sempre em português brasileiro de forma objetiva, profissional e com dados concretos.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulation-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
