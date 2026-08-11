// v4 - milvus paginado + dedupe + classificacao sem acento;
//      bloco Fireflies REMOVIDO (dono unico da secao: report-sync-fireflies)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAnyRole, AuthError } from "../_shared/auth.ts";

const REPORT_ROLES = ["c-level", "superadmin", "lider_tribo", "administrativo", "coordenacao_suporte", "projetos_produtos"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";

// ── Constantes Milvus (espelham support-costs-sync/index.ts) ──
// A API do Milvus NÃO aceita `total_registros`; ela pagina com `page`/`per_page`
// e o `per_page` é limitado a 50 no servidor. Pedir 1000 fazia a API devolver
// só a primeira página (truncamento silencioso da contagem de chamados).
const MILVUS_URL = "https://apiintegracao.milvus.com.br/api/chamado/listagem";
const MILVUS_PAGE_SIZE = 50;
// Teto de segurança: 200 páginas x 50 = 10k chamados/cliente. Impede laço infinito
// caso a API pare de sinalizar o fim da paginação.
const MILVUS_MAX_PAGES = 200;

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

// ── merge-preserva-manual (espelho de src/lib/reportMergeManual.ts) ──
// Escalar: se o usuário tocou (_manualFields inclui `field`), preserva o valor
// dele e grava o coletado em `field__sync`. Senão, atualiza direto.
function mergeScalar(
  currentContent: Record<string, unknown> | null | undefined,
  field: string,
  incomingValue: unknown,
): Record<string, unknown> {
  const mf = Array.isArray(currentContent?._manualFields) ? (currentContent!._manualFields as string[]) : [];
  if (mf.includes(field)) {
    return { [field]: currentContent?.[field], [`${field}__sync`]: incomingValue };
  }
  return { [field]: incomingValue };
}

// ── Helpers Milvus (copiados de support-costs-sync para não criar módulo
//    compartilhado — Deno deploy de edge function é por pasta) ──

function firstString(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

// A lista de chamados vem em campos diferentes conforme endpoint/versão da API.
function getRowsFromMilvusPayload(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload)) {
    return (payload as unknown[]).filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }
  const obj = payload as Record<string, unknown>;
  for (const key of ["lista", "data", "dados", "rows", "items", "records", "registros", "tickets", "chamados"]) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
    }
  }
  return [];
}

// Chave estável do chamado: usada para deduplicar. Sem isto, um mesmo chamado
// contava 2x quando dois nomes de cliente configurados casam parcialmente com o
// mesmo registro (a busca do Milvus é por substring do nome do cliente).
function getStableRowKey(row: Record<string, unknown>, fallback: string): string {
  return firstString(row, ["id", "codigo", "ticket", "ticket_id", "chamado", "numero", "protocolo"], fallback);
}

// Total informado pela API (meta.paginate.total). Serve para detectar coleta parcial.
function getMilvusMetaTotal(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const meta = obj.meta as Record<string, unknown> | undefined;
  const paginate = (meta?.paginate ?? obj.paginate) as Record<string, unknown> | undefined;
  for (const value of [paginate?.total, meta?.total, obj.total, obj.total_registros]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d]/g, ""));
      if (Number.isFinite(parsed) && value.trim() !== "") return parsed;
    }
  }
  return null;
}

// NFD + remoção de diacríticos: a API devolve "Requisição"/"Dúvida" com acento,
// mas as chaves de `porTipo` são sem acento. Sem normalizar, quase tudo caía no
// fallback "duvida" e `intercorrencias` ficava zerado.
function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDateOnly(value: string | undefined | null): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const dia = Number(brMatch[1]);
    const mes = Number(brMatch[2]);
    const ano = Number(brMatch[3]);
    // Formato brasileiro (dd/mm/aaaa) é o padrão do Milvus; se o 1º campo > 12
    // não há ambiguidade, senão assume dd/mm.
    if (dia > 12 && mes <= 12) return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function getTicketCreationDate(row: Record<string, unknown>): string | null {
  return parseDateOnly(
    firstString(row, [
      "data_hora_criacao",
      "data_criacao",
      "data_abertura",
      "data_hora_abertura",
      "data",
      "date",
      "created_at",
      "dia",
    ], ""),
  );
}

// Busca UMA página do Milvus.
async function fetchMilvusPage(
  token: string,
  filtroBody: Record<string, unknown>,
  page: number,
): Promise<unknown> {
  const res = await fetch(MILVUS_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page,
      per_page: MILVUS_PAGE_SIZE,
      order_by: "codigo",
      descending: true,
      filtro_body: filtroBody,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Milvus retornou ${res.status}: ${body.slice(0, 300)}`);
  }
  return await res.json();
}

// Laço de paginação real: avança até a página vir incompleta (< per_page),
// até bater o total informado pela API ou até o teto de segurança.
async function fetchMilvusAllPages(
  token: string,
  filtroBody: Record<string, unknown>,
): Promise<{ rows: Record<string, unknown>[]; metaTotal: number | null; pages: number; truncated: boolean }> {
  const rows: Record<string, unknown>[] = [];
  let metaTotal: number | null = null;
  let pages = 0;
  let truncated = false;

  for (let page = 1; page <= MILVUS_MAX_PAGES; page++) {
    const payload = await fetchMilvusPage(token, filtroBody, page);
    const pageRows = getRowsFromMilvusPayload(payload);
    pages = page;
    if (metaTotal === null) metaTotal = getMilvusMetaTotal(payload);
    rows.push(...pageRows);

    if (pageRows.length < MILVUS_PAGE_SIZE) break;
    if (metaTotal !== null && rows.length >= metaTotal) break;
    if (page === MILVUS_MAX_PAGES) truncated = true;
  }

  return { rows, metaTotal, pages, truncated };
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

    // Segurança: só perfis do módulo de Relatórios podem sincronizar.
    await requireAnyRole(req, supabase, REPORT_ROLES);

    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");

    const periodoInicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const ultimoDia = new Date(year, month, 0).getDate();
    const periodoFim = `${year}-${String(month).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const now = new Date().toISOString();
    const results: Record<string, unknown> = {};

    // Erros/avisos do Milvus acumulados para refletir no retorno e no log
    // (antes o erro por cliente era engolido com `continue` e o log dizia success).
    const milvusErros: string[] = [];
    const milvusAvisos: string[] = [];

    // ── 1. Tickets do Milvus ─────────────────────────────────────────────────
    try {
      const nomesBusca = (milvusClientNames as string[] ?? []);
      if (nomesBusca.length === 0) {
        results.eficiencia_operacional_aviso = 'Configure os nomes de cliente do Milvus para sincronizar tickets.';
        milvusAvisos.push('Nenhum nome de cliente do Milvus configurado.');
        console.log('[MILVUS] Sem milvusClientNames configurados — pulando busca.');
      }
      const MILVUS_TOKEN = nomesBusca.length > 0 ? await getVaultSecret(supabase, "MILVUS_TOKEN") : "";

      // Dedupe por chave estável do chamado: o mesmo registro pode voltar em mais
      // de uma busca quando dois nomes configurados casam parcialmente com ele.
      const ticketsPorChave = new Map<string, Record<string, unknown>>();
      const porCliente: Array<Record<string, unknown>> = [];

      for (const nomeCliente of nomesBusca) {
        try {
          const { rows, metaTotal, pages, truncated } = await fetchMilvusAllPages(MILVUS_TOKEN, {
            cliente: nomeCliente,
            data_hora_criacao_inicial: `${periodoInicio} 00:00:00`,
            data_hora_criacao_final: `${periodoFim} 23:59:59`,
            status: "Todos",
          });

          if (rows.length === 0) {
            console.log(`[MILVUS] ${nomeCliente}: 0 tickets (páginas lidas: ${pages}).`);
            if (!Array.isArray(results.milvus_diagnostico)) results.milvus_diagnostico = [];
            (results.milvus_diagnostico as unknown[]).push({ cliente: nomeCliente, rows: 0, metaTotal, pages });
          } else {
            console.log(`[MILVUS] ${nomeCliente}: ${rows.length} tickets em ${pages} página(s) (meta total: ${metaTotal ?? 'n/d'})`);
          }

          // Divergência entre o total informado pela API e o coletado = coleta parcial.
          if (metaTotal !== null && metaTotal !== rows.length) {
            milvusAvisos.push(
              `${nomeCliente}: API informou ${metaTotal} chamados, coletados ${rows.length}.`,
            );
          }
          if (truncated) {
            milvusAvisos.push(`${nomeCliente}: teto de ${MILVUS_MAX_PAGES} páginas atingido — resultado pode estar truncado.`);
          }

          for (const row of rows) {
            const key = getStableRowKey(row, `${nomeCliente}-${ticketsPorChave.size}`);
            ticketsPorChave.set(key, row);
          }

          porCliente.push({ cliente: nomeCliente, coletados: rows.length, metaTotal, paginas: pages });
        } catch (e) {
          const msg = `${nomeCliente}: ${(e as Error).message}`;
          console.log(`[MILVUS] Erro ${msg}`);
          milvusErros.push(msg);
        }
      }

      const ticketsBrutos = Array.from(ticketsPorChave.values());

      // Re-filtro no cliente por data de criação dentro do mês do relatório:
      // não confiar apenas no filtro da API (que já falhou com `total_registros`).
      // Chamado sem data reconhecível é mantido (não descartar dado por falta de campo).
      let semDataReconhecida = 0;
      const tickets = ticketsBrutos.filter((t) => {
        const data = getTicketCreationDate(t);
        if (!data) { semDataReconhecida++; return true; }
        return data >= periodoInicio && data <= periodoFim;
      });
      const foraDoPeriodo = ticketsBrutos.length - tickets.length;
      if (foraDoPeriodo > 0) {
        milvusAvisos.push(`${foraDoPeriodo} chamado(s) descartado(s) por data de criação fora de ${periodoInicio}..${periodoFim}.`);
      }
      if (semDataReconhecida > 0) {
        console.log(`[MILVUS] ${semDataReconhecida} chamado(s) sem data de criação reconhecível — mantidos na contagem.`);
      }

      const totalTickets = tickets.length;
      const porTipo: Record<string, number> = { incidente: 0, problema: 0, requisicao: 0, melhoria: 0, duvida: 0 };
      const tiposChave = Object.keys(porTipo);

      for (const t of tickets) {
        // Normaliza acentos/caixa antes de comparar: "Requisição" → "requisicao".
        const tipo = normalizeText(t.tipo ?? t.type ?? t.ticket_type ?? t.tipo_chamado ?? "duvida");
        // Aceita valores compostos ("Requisição de Serviço") via substring.
        const chave = tiposChave.find((k) => tipo === k || tipo.includes(k));
        porTipo[chave ?? "duvida"]++;
      }

      const dentroSla = tickets.filter((t) =>
        t.within_sla === true || t.sla_status === "ok" ||
        normalizeText((t.sla as Record<string, unknown>)?.status_sla_solucao) === "em conformidade"
      ).length;

      const slaPercentual = totalTickets > 0 ? Math.round((dentroSla / totalTickets) * 100) : 100;
      const bugs = tickets.filter((t) =>
        normalizeText(t.tipo ?? t.type ?? t.ticket_type ?? "").includes("bug") ||
        normalizeText(t.assunto ?? t.subject ?? t.title ?? "").includes("bug")
      ).length;

      const statusMilvus = slaPercentual >= 95 ? "alta" : slaPercentual >= 80 ? "adequado" : slaPercentual >= 60 ? "atencao" : "critico";

      results.milvus = {
        tickets: totalTickets,
        brutos: ticketsBrutos.length,
        por_tipo: porTipo,
        sla_percentual: slaPercentual,
        bugs,
        crises: 0,
        intercorrencias: porTipo.incidente,
        status: statusMilvus,
        por_cliente: porCliente,
        avisos: milvusAvisos,
        erros: milvusErros,
      };

      const { data: efoAtual } = await supabase
        .from("report_sections").select("content")
        .eq("report_id", reportId).eq("section_key", "eficiencia_operacional").maybeSingle();
      const efoContent = (efoAtual?.content ?? {}) as Record<string, unknown>;
      const efoMerged = {
        ...efoContent,
        // por_tipo é dado do sync (não editável): sempre atualiza.
        por_tipo: porTipo,
        // Escalares que o usuário pode ter tocado: preserva o dele, guarda o sync ao lado.
        ...mergeScalar(efoContent, "tickets", totalTickets),
        ...mergeScalar(efoContent, "bugs", bugs),
        ...mergeScalar(efoContent, "crises", 0),
        ...mergeScalar(efoContent, "intercorrencias", porTipo.incidente),
        ...mergeScalar(efoContent, "sla", `${slaPercentual}%`),
        ...mergeScalar(efoContent, "status", statusMilvus),
      };
      await supabase.from("report_sections").upsert({
        report_id:   reportId,
        section_key: "eficiencia_operacional",
        content:     efoMerged,
        source:    "devid",
        synced_at: now,
      }, { onConflict: "report_id,section_key" });

    } catch (e) {
      console.error("[DEVID] Erro Milvus:", (e as Error).message);
      results.milvus_error = (e as Error).message;
      milvusErros.push((e as Error).message);
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

    // NOTA: a seção `treinamentos_reunioes` tem um ÚNICO dono — a função
    // `report-sync-fireflies`. O bloco que existia aqui era uma duplicata
    // desatualizada, rodava em paralelo e sobrescrevia (last-writer-wins) o
    // resultado corretamente filtrado. Foi removido de propósito.

    // Log geral: reflete erros/avisos acumulados em vez de gravar success cego.
    const temProblema = milvusErros.length > 0 || milvusAvisos.length > 0;
    const mensagens = [...milvusErros, ...milvusAvisos];
    await supabase.from("report_sync_logs").insert({
      report_id:       reportId,
      source:          "devid",
      status:          temProblema ? "partial" : "success",
      records_fetched: ((results.milvus as Record<string, unknown> | undefined)?.tickets as number) ?? 0,
      error_message:   temProblema ? mensagens.join("; ").slice(0, 1000) : null,
      synced_at:       now,
    });

    return new Response(JSON.stringify({
      success: milvusErros.length === 0,
      milvus_avisos: milvusAvisos,
      milvus_erros: milvusErros,
      ...results,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
