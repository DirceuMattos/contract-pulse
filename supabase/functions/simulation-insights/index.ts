import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { simulation } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formatBRL = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const prompt = `Você é um consultor de negócios experiente em contratos de tecnologia e serviços de TI no Brasil.

Analise a seguinte simulação de contrato e forneça insights práticos e diretos.

## Dados da Simulação

- **Nome:** ${simulation.name}
- **Cliente:** ${simulation.clientName}
- **Tipo:** ${simulation.contractType === "gov" ? "Governo" : "Privado"}${simulation.govSphere ? ` (${simulation.govSphere})` : ""}
- **Prazo informado:** ${simulation.termMonths} meses
- **Prazo sugerido:** ${simulation.suggestedTermMonths} meses
- **Complexidade:** ${simulation.complexityLevel}
- **Descrição:** ${simulation.description}
- **Valor mensal sugerido:** ${formatBRL(simulation.suggestedMonthlyValue)}
- **Valor total sugerido:** ${formatBRL(simulation.suggestedTotalValue)}
- **Custo mensal:** ${formatBRL(simulation.custoMensal)}
- **Break-even mensal:** ${formatBRL(simulation.breakEvenMonthly)}
- **Margem projetada:** ${simulation.margemPercent.toFixed(1)}%
- **Margem-alvo:** ${simulation.targetMarginPercent}%

### Questionário
- Tipo de demanda: ${simulation.questionnaire.demandType}
- Criticidade: ${simulation.questionnaire.criticality}
- Integrações: ${simulation.questionnaire.integrations}
- Módulos: ${simulation.questionnaire.modules}
- Volume de usuários: ${simulation.questionnaire.userVolume}
- SLA: ${simulation.questionnaire.slaLevel}
- Ritmo de entrega: ${simulation.questionnaire.deliveryPace}
- Dependência de campo: ${simulation.questionnaire.fieldDependency ? "Sim" : "Não"}

## Instruções

Forneça sua análise em português brasileiro, com os seguintes tópicos:

1. **Perfil do Contrato** — Breve análise do perfil e posicionamento
2. **Pontos de Atenção e Riscos** — Riscos específicos identificados
3. **Oportunidades de Otimização** — Sugestões para melhorar margem ou reduzir riscos
4. **Recomendação sobre Prazo e Precificação** — Avaliação da adequação do prazo e preço sugeridos
5. **Veredicto Final** — Resumo executivo em 2-3 frases

Seja direto, prático e específico. Evite generalidades. Use dados da simulação para embasar cada ponto.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Você é um consultor sênior especializado em contratos de TI e governança de serviços no Brasil. Responda sempre em português brasileiro de forma objetiva e profissional.",
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
