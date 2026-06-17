// v2 - fireflies integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL      = "https://ca-devid-app.azurewebsites.net/mcp";
const FIREFLIES_URL  = "https://api.fireflies.ai/mcp";

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_vault_secret', { secret_name: name });
  if (error || !data) {
    const { data: sqlData, error: sqlError } = await supabase
      .rpc('get_secret_by_name', { p_name: name });
    if (sqlError || !sqlData) throw new Error(`Secret '${name}' não encontrado`);
    return sqlData as string;
  }
  return data as string;
}

async function callMcp(url: string, token: string, tool: string, params: Record<string, unknown>): Promise<unknown> {
  console.log(`[MCP:${url}] Chamando tool: ${tool}`);

  // Passo 1: Initialize
  const initRes = await fetch(url, {
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
  console.log(`[MCP] Initialize status: ${initRes.status}, body: ${initText.substring(0, 200)}`);

  const sessionId = initRes.headers.get("mcp-session-id") ??
                    initRes.headers.get("x-session-id") ?? "";

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  // Passo 2: notifications/initialized
  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }),
  });

  // Passo 3: tools/call
  const toolRes = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: tool, arguments: params },
    }),
  });

  console.log(`[MCP] Tool status: ${toolRes.status}`);

  if (!toolRes.ok) {
    const body = await toolRes.text();
    throw new Error(`MCP retornou ${toolRes.status}: ${body}`);
  }

  const contentType = toolRes.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await toolRes.text();
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
  return json.result;
}

// Mantém alias para DEVID (compatibilidade com chamadas existentes)
async function callDevid(token: string, tool: string, params: Record<string, unknown>): Promise<unknown> {
  return callMcp(DEVID_URL, token, tool, params);
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
      const todosTickets: Array<Record<string, unknown>> = [];
      const nomesBusca = (milvusClientNames as string[] ?? []);
      const MILVUS_TOKEN = await getVaultSecret(supabase, "MILVUS_TOKEN");
      const MILVUS_URL = "https://apiintegracao.milvus.com.br/api/chamado/listagem";

      for (const nomeCliente of nomesBusca) {
        try {
          const milvusRes = await fetch(MILVUS_URL, {
            method: "POST",
            headers: {
              "Authorization": MILVUS_TOKEN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              total_registros: 1000,
              filtro_body: {
                cliente: nomeCliente,
                data_hora_criacao_inicial: `${periodoInicio} 00:00:00`,
                data_hora_criacao_final: `${periodoFim} 23:59:59`,
                status: "Todos",
              },
            }),
          });

          if (!milvusRes.ok) { console.log(`[MILVUS] ${nomeCliente}: HTTP ${milvusRes.status}`); continue; }

          const milvusData = await milvusRes.json() as Record<string, unknown>;
          const lista = (milvusData?.lista as Array<Record<string, unknown>>) ?? [];
          console.log(`[MILVUS] ${nomeCliente}: ${lista.length} tickets`);
          todosTickets.push(...lista);
        } catch (e) {
          console.log(`[MILVUS] Erro ${nomeCliente}: ${(e as Error).message}`);
        }
      }

      const tickets = todosTickets;
      const totalTickets = tickets.length;
      const porTipo: Record<string, number> = { incidente: 0, problema: 0, requisicao: 0, melhoria: 0, duvida: 0 };

      for (const t of tickets) {
        const tipo = ((t.tipo ?? t.type ?? t.ticket_type ?? "duvida") as string).toLowerCase();
        if (porTipo[tipo] !== undefined) porTipo[tipo]++;
        else porTipo["duvida"]++;
      }

      const dentroSla = tickets.filter((t) =>
        t.within_sla === true || t.sla_status === "ok" ||
        (t.sla as Record<string, unknown>)?.status_sla_solucao === "Em conformidade"
      ).length;

      const slaPercentual = totalTickets > 0 ? Math.round((dentroSla / totalTickets) * 100) : 100;
      const bugs = tickets.filter((t) =>
        ((t.tipo ?? t.type ?? t.ticket_type ?? "") as string).toLowerCase().includes("bug") ||
        ((t.assunto ?? t.subject ?? t.title ?? "") as string).toLowerCase().includes("bug")
      ).length;

      results.milvus = {
        tickets: totalTickets,
        por_tipo: porTipo,
        sla_percentual: slaPercentual,
        bugs,
        crises: 0,
        intercorrencias: porTipo.incidente,
        status: slaPercentual >= 95 ? "alta" : slaPercentual >= 80 ? "adequado" : slaPercentual >= 60 ? "atencao" : "critico",
      };

      await supabase.from("report_sections").upsert({
        report_id:   reportId,
        section_key: "eficiencia_operacional",
        content: {
          tickets:         totalTickets,
          bugs,
          crises:          0,
          intercorrencias: porTipo.incidente,
          sla:             `${slaPercentual}%`,
          por_tipo:        porTipo,
          status:          results.milvus.status,
          analise:         "",
        },
        source:    "devid",
        synced_at: now,
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
      const canaisResult = await callDevid(devidToken, "list_channels", {}) as Record<string, unknown>;
      const canais = (canaisResult?.content as Array<Record<string, unknown>>) ?? [];
      const keywords = (firefliesKeywords ?? []) as string[];
      const domainParts = (clientEmailDomain ?? "").split(".")[0].toLowerCase();
      const termoBusca = [domainParts, ...keywords].filter(Boolean);

      const canaisRelevantes = termoBusca.length > 0
        ? canais.filter((c) => {
            const nome = ((c.name ?? c.topic ?? "") as string).toLowerCase();
            return termoBusca.some((k) => nome.includes(k.toLowerCase()));
          })
        : [];

      results.discord = { canais_relevantes: canaisRelevantes.length };
    } catch (e) {
      results.discord_error = (e as Error).message;
    }

    // ── 4. Reuniões do Fireflies via MCP ──────────────────────────────────────
    try {
      const firefliesToken = await getVaultSecret(supabase, "FIREFLIES_TOKEN");

      const ffResult = await callMcp(FIREFLIES_URL, firefliesToken, "fireflies_get_transcripts", {
        fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
        toDate:   `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
        format:   "json",
        limit:    50,
      }) as Record<string, unknown>;

      // Extrair array de transcrições do resultado MCP
      const rawContent = (ffResult as Record<string, unknown>)?.content;
      let transcripts: Array<Record<string, unknown>> = [];

      if (Array.isArray(rawContent)) {
        // Resultado MCP pode vir como array de content blocks
        for (const block of rawContent) {
          if ((block as Record<string, unknown>).type === "text") {
            try {
              const parsed = JSON.parse((block as Record<string, unknown>).text as string);
              if (Array.isArray(parsed)) transcripts = parsed;
              else if (parsed.transcripts) transcripts = parsed.transcripts;
            } catch { continue; }
          }
        }
      } else if (Array.isArray(ffResult)) {
        transcripts = ffResult as Array<Record<string, unknown>>;
      }

      console.log(`[FIREFLIES] Total reuniões no período: ${transcripts.length}`);

      // Filtragem por domínio do cliente OU por palavras-chave no título
      const domain = (clientEmailDomain ?? "").toLowerCase().trim();
      const kws = ((firefliesKeywords ?? []) as string[]).map((k: string) => k.toLowerCase().trim()).filter(Boolean);

      const filtered = transcripts.filter((t) => {
        const titleLc = ((t.title ?? "") as string).toLowerCase();
        const titleMatch = kws.length > 0 && kws.some((k) => titleLc.includes(k));
        const participants = (t.participants ?? t.meetingAttendees ?? []) as Array<string | Record<string, unknown>>;
        const emails = participants.map((p) =>
          typeof p === "string" ? p : ((p as Record<string, unknown>).email as string ?? "")
        );
        const domainMatch = domain && emails.some((e) => e.toLowerCase().endsWith(`@${domain}`));
        if (!domain && kws.length === 0) return true;
        return titleMatch || domainMatch;
      });

      console.log(`[FIREFLIES] Reuniões filtradas para o contrato: ${filtered.length}`);

      if (filtered.length > 0) {

        console.log(`[FIREFLIES] Amostra date field: ${JSON.stringify(filtered[0].date)} | dateString: ${JSON.stringify((filtered[0] as Record<string, unknown>).dateString)}`);

      }

      // Monta linhas no formato esperado pela seção treinamentos_reunioes
      const linhas = filtered.map((t) => ({
        tipo:     "Reunião",
        data:     new Date(t.date as string | number).toISOString().slice(0, 10),
        descricao: (t.title as string) + (
          (t.summary as Record<string, unknown>)?.short_summary
            ? ` — ${(t.summary as Record<string, unknown>).short_summary}`
            : ""
        ),
      }));

      results.fireflies = { total: transcripts.length, filtradas: filtered.length };

      // Salva seção treinamentos_reunioes (substitui conteúdo anterior)
      await supabase.from("report_sections").upsert({
        report_id:   reportId,
        section_key: "treinamentos_reunioes",
        content: {
          linhas,
          rodape: "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.",
        },
        source:    "fireflies",
        synced_at: now,
      }, { onConflict: "report_id,section_key" });

      await supabase.from("report_sync_logs").insert({
        report_id:       reportId,
        source:          "fireflies",
        status:          "success",
        records_fetched: filtered.length,
        synced_at:       now,
      });

    } catch (e) {
      console.error("[FIREFLIES] Erro:", (e as Error).message);
      results.fireflies_error = (e as Error).message;
    }

    // Log geral
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
