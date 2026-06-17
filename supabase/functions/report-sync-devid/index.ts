import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {

  const { data, error } = await supabase.rpc('get_vault_secret', { secret_name: name });

  if (error || !data) {

    // Fallback: query direta via SQL

    const { data: sqlData, error: sqlError } = await supabase
      .rpc('get_secret_by_name', { p_name: name });
    if (sqlError || !sqlData) throw new Error(`Secret '${name}' não encontrado`);
    return sqlData as string;
  }

  return data as string;
}


async function callDevid(token: string, tool: string, params: Record<string, unknown>): Promise<unknown> {

  console.log(`[DEVID] Chamando tool: ${tool}`, JSON.stringify(params));

  // Passo 1: Initialize

  const initRes = await fetch(DEVID_URL, {

    method: "POST",

    headers: {

      "Authorization": `Bearer ${token}`,

      "Content-Type": "application/json",

      "Accept": "application/json, text/event-stream",

    },

    body: JSON.stringify({

      jsonrpc: "2.0",

      id: 1,

      method: "initialize",

      params: {

        protocolVersion: "2024-11-05",

        capabilities: {},

        clientInfo: { name: "bnphub", version: "1.0.0" },

      },

    }),

  });

  const initText = await initRes.text();

  console.log(`[DEVID] Initialize status: ${initRes.status}, body: ${initText.substring(0, 200)}`);

  // Extrair session ID do header se existir

  const sessionId = initRes.headers.get("mcp-session-id") ?? 

                    initRes.headers.get("x-session-id") ?? "";

  console.log(`[DEVID] Session ID: ${sessionId}`);

  // Passo 2: Notificar que inicialização está completa

  const headers: Record<string, string> = {

    "Authorization": `Bearer ${token}`,

    "Content-Type": "application/json",

    "Accept": "application/json, text/event-stream",

  };

  if (sessionId) headers["mcp-session-id"] = sessionId;

  await fetch(DEVID_URL, {

    method: "POST",

    headers,

    body: JSON.stringify({

      jsonrpc: "2.0",

      method: "notifications/initialized",

      params: {},

    }),

  });

  // Passo 3: Chamar a tool

  const toolRes = await fetch(DEVID_URL, {

    method: "POST",

    headers,

    body: JSON.stringify({

      jsonrpc: "2.0",

      id: Date.now(),

      method: "tools/call",

      params: { name: tool, arguments: params },

    }),

  });

  console.log(`[DEVID] Tool status: ${toolRes.status}`);

  if (!toolRes.ok) {

    const body = await toolRes.text();

    console.error(`[DEVID] Tool error body: ${body}`);

    throw new Error(`DEVID retornou ${toolRes.status}: ${body}`);

  }

  const contentType = toolRes.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {

    const text = await toolRes.text();

    console.log(`[DEVID] SSE raw: ${text.substring(0, 500)}`);

    const lines = text.split("\n").filter(l => l.startsWith("data:"));

    for (const line of lines) {

      try {

        const json = JSON.parse(line.replace("data:", "").trim());

        if (json.result) return json.result;

      } catch { continue; }

    }

    throw new Error("Nenhum resultado válido no SSE");

  }

  const json = await toolRes.json() as Record<string, unknown>;

  console.log(`[DEVID] Tool result: ${JSON.stringify(json).substring(0, 500)}`);

  return json.result;

}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reportId, clientEmailDomain, firefliesKeywords, month, year, milvusClientNames } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");

    const periodoInicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const ultimoDia = new Date(year, month, 0).getDate();
    const periodoFim = `${year}-${String(month).padStart(2, "0")}-${ultimoDia}`;

    const now = new Date().toISOString();
    const results: Record<string, unknown> = {};

    // ── 1. Tickets do Milvus ─────────────────────────────────────────────────
    try {

      console.log("[DEVID] Iniciando sync, token length:", devidToken.length);

      

      // Primeiro testar com tools/list para ver se a conexão funciona

      const testRes = await fetch(DEVID_URL, {

        method: "POST",

        headers: {

          "Authorization": `Bearer ${devidToken}`,

          "Content-Type": "application/json",

          "Accept": "application/json, text/event-stream",

        },

        body: JSON.stringify({

          jsonrpc: "2.0",

          id: 1,

          method: "tools/list",

          params: {},

        }),

      });

      

      console.log("[DEVID] tools/list status:", testRes.status);

      const testText = await testRes.text();

      console.log("[DEVID] tools/list response:", testText.substring(0, 1000));

      // Buscar tickets para cada nome fantasia do cliente

      const todosTickets: Array<Record<string, unknown>> = [];

      const nomesBusca = (milvusClientNames as string[] ?? []);

      if (nomesBusca.length === 0) {

        console.log("[DEVID] Nenhum nome Milvus configurado, pulando busca de tickets");

      } else {

        console.log(`[DEVID] Buscando tickets para ${nomesBusca.length} nomes fantasia`);

        

        for (const nomeCliente of nomesBusca) {

          try {

            const result = await callDevid(devidToken, "milvus_search_tickets", {
              cliente: nomeCliente,
              data_hora_criacao_inicial: `${periodoInicio} 00:00:00`,
              data_hora_criacao_final: `${periodoFim} 23:59:59`,
              status: "Todos",
              total_registros: 1000,
            }) as Record<string, unknown>;

            const content = result?.content as Array<Record<string, unknown>> ?? [];

            

            // O resultado vem como texto JSON dentro de content[0].text

            if (content.length > 0 && content[0].text) {

              try {

                const parsed = JSON.parse(content[0].text as string) as Record<string, unknown>;

                const lista = parsed?.lista as Array<Record<string, unknown>> ?? [];

                console.log(`[DEVID] ${nomeCliente}: ${lista.length} tickets`);

                todosTickets.push(...lista);

              } catch {

                console.log(`[DEVID] ${nomeCliente}: erro ao parsear JSON`);

              }

            }

          } catch (e) {

            console.log(`[DEVID] Erro ao buscar ${nomeCliente}: ${(e as Error).message}`);

          }

        }

        

        console.log(`[DEVID] Total tickets encontrados: ${todosTickets.length}`);

      }

      const tickets = todosTickets;

      

      console.log("[DEVID] tickets count:", tickets.length);

      const porTipo: Record<string, number> = {

        incidente: 0, problema: 0, requisicao: 0, melhoria: 0, duvida: 0,

      };

      for (const t of tickets) {

        const tipo = ((t.type ?? t.ticket_type ?? "duvida") as string).toLowerCase();

        if (porTipo[tipo] !== undefined) porTipo[tipo]++;

        else porTipo["duvida"]++;

      }

      const totalTickets = tickets.length;

      const dentroSla = tickets.filter((t) => t.within_sla === true || t.sla_status === "ok").length;

      const slaPercentual = totalTickets > 0 ? Math.round((dentroSla / totalTickets) * 100) : 100;

      const bugs = tickets.filter((t) =>

        ((t.type ?? t.ticket_type ?? "") as string).toLowerCase().includes("bug") ||

        ((t.subject ?? t.title ?? "") as string).toLowerCase().includes("bug")

      ).length;

      results.milvus = {

        tickets: totalTickets, por_tipo: porTipo,

        sla_percentual: slaPercentual, bugs, crises: 0,

        intercorrencias: porTipo.incidente,

        status: slaPercentual >= 95 ? "alta" : slaPercentual >= 80 ? "adequado" : slaPercentual >= 60 ? "atencao" : "critico",

      };

      await supabase.from("report_sections").upsert({

        report_id: reportId, section_key: "eficiencia_operacional",

        content: {

          tickets: totalTickets, bugs, crises: 0,

          intercorrencias: porTipo.incidente,

          sla: `${slaPercentual}%`,

          por_tipo: porTipo, status: results.milvus.status, analise: "",

        },

        source: "devid", synced_at: now,

      }, { onConflict: "report_id,section_key" });

    } catch (e) {

      console.error("[DEVID] Erro Milvus:", (e as Error).message);

      results.milvus_error = (e as Error).message;

    }

    // ── 2. Relatório de horas do Milvus ───────────────────────────────────────
    try {
      const horasResult = await callDevid(devidToken, "milvus_get_attendance_report", {
        date_from: periodoInicio,
        date_to:   periodoFim,
      }) as Record<string, unknown>;

      results.horas = horasResult;
    } catch (e) {
      results.horas_error = (e as Error).message;
    }

    // ── 3. Reuniões do Discord ────────────────────────────────────────────────
    try {
      // Listar canais disponíveis
      const canaisResult = await callDevid(devidToken, "list_channels", {}) as Record<string, unknown>;
      const canais = (canaisResult?.content as Array<Record<string, unknown>>) ?? [];

      // Filtrar canais relevantes por palavras-chave
      const keywords = (firefliesKeywords ?? []) as string[];
      const domainParts = (clientEmailDomain ?? "").split(".")[0].toLowerCase();
      const termoBusca = [domainParts, ...keywords].filter(Boolean);

      const canaisRelevantes = termoBusca.length > 0
        ? canais.filter((c) => {
            const nome = ((c.name ?? c.topic ?? "") as string).toLowerCase();
            return termoBusca.some((k) => nome.includes(k.toLowerCase()));
          })
        : [];

      // Buscar mensagens dos canais relevantes (últimas 50 mensagens de cada)
      const reunioes: Array<{ tipo: string; data: string; descricao: string }> = [];
      for (const canal of canaisRelevantes.slice(0, 3)) {
        try {
          const msgs = await callDevid(devidToken, "get_channel_messages", {
            channelId: canal.id as string,
            limit: 50,
          }) as Record<string, unknown>;
          const mensagens = (msgs?.content as Array<Record<string, unknown>>) ?? [];

          // Filtrar mensagens do período
          for (const msg of mensagens) {
            const ts = new Date((msg.timestamp ?? msg.created_at) as string);
            if (ts >= new Date(periodoInicio) && ts <= new Date(periodoFim + "T23:59:59")) {
              const conteudo = (msg.content ?? msg.text ?? "") as string;
              if (conteudo.length > 20) { // ignorar mensagens muito curtas
                reunioes.push({
                  tipo:      "Alinhamento",
                  data:      ts.toLocaleDateString("pt-BR"),
                  descricao: conteudo.substring(0, 200),
                });
              }
            }
          }
        } catch { continue; }
      }

      results.discord = { canais_relevantes: canaisRelevantes.length, reunioes: reunioes.length };

      // Salvar seção treinamentos/reuniões (mescla com dados existentes se houver)
      const { data: secaoExistente } = await supabase
        .from("report_sections")
        .select("content")
        .eq("report_id", reportId)
        .eq("section_key", "treinamentos_reunioes")
        .single();

      const conteudoAtual = (secaoExistente?.content ?? {}) as Record<string, unknown>;
      const reunioesAtuais = (conteudoAtual.reunioes as Array<unknown>) ?? [];

      await supabase.from("report_sections").upsert({
        report_id:   reportId,
        section_key: "treinamentos_reunioes",
        content: {
          reunioes: [...reunioesAtuais, ...reunioes],
          rodape:   conteudoAtual.rodape ?? "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.",
        },
        source:    "devid",
        synced_at: now,
      }, { onConflict: "report_id,section_key" });

    } catch (e) {
      results.discord_error = (e as Error).message;
    }

    // Log
    await supabase.from("report_sync_logs").insert({
      report_id:       reportId,
      source:          "devid",
      status:          "success",
      records_fetched: (results.milvus as Record<string, unknown>)?.tickets as number ?? 0,
    });

    return new Response(JSON.stringify({ success: true, ...results }),
      { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
