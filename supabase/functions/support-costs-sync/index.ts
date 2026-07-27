import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";
const MILVUS_URL = "https://apiintegracao.milvus.com.br/api/chamado/listagem";
const MILVUS_CLIENT_URL = "https://apiintegracao.milvus.com.br/api/cliente/busca";
const FUNCTION_VERSION = "support-costs-sync-2026-07-27-cache-scope-v21";
const MILVUS_PAGE_SIZE = 50;
const MILVUS_MAX_SLICES = 160;
const MILVUS_MAX_CLIENTS_PER_SYNC = 140;
const MILVUS_SLICE_FIELDS = ["tecnico", "prioridade", "categoria_primaria", "categoria_secundaria"] as const;

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

type AttendanceRecord = {
  id: string;
  clientName: string;
  projectName: string;
  analystName: string;
  hours: number;
  date?: string;
  raw: Record<string, unknown>;
};

type MonthRange = {
  label: string;
  from: string;
  to: string;
};

type AttendanceReportResult = {
  source: "milvus-direct" | "devid-mcp";
  rawResult: unknown;
  diagnostics?: Record<string, unknown>;
};

type SyncRequest = {
  dateFrom: string;
  dateTo: string;
  clientName?: string;
  clientNames?: string[];
  fullCatalogSync?: boolean;
  mode?: "sync" | "audit" | "dry-run" | "write" | "finalize-month";
  confirmWrite?: boolean;
  finalizeMonthlyLoad?: boolean;
  clientLimit?: number;
};

type HubClient = {
  id: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
};

type HubContract = {
  id: string;
  nome?: string | null;
  codigo?: string | null;
  client_id?: string | null;
};

type HubSubproject = {
  id: string;
  name?: string | null;
  contract_id?: string | null;
  contract_name?: string | null;
  client_id?: string | null;
};

type HubProjectTarget = {
  kind: "contract" | "subproject";
  id: string;
  name?: string | null;
  code?: string | null;
  client_id?: string | null;
  contract_id?: string | null;
};

type MatchResult<T> = {
  item: T | null;
  status: "matched" | "pending" | "ambiguous";
  confidence: number;
  method: string;
};

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message ?? obj.error_description ?? obj.error ?? "Erro sem mensagem"),
      code: obj.code ?? null,
      details: obj.details ?? null,
      hint: obj.hint ?? null,
      raw: obj,
    };
  }
  return { message: String(error) };
}

function errorMessage(error: unknown): string {
  return String(serializeError(error).message ?? "Erro desconhecido");
}

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_vault_secret", { secret_name: name });
  if (error || !data) {
    const { data: sqlData, error: sqlError } = await supabase.rpc("get_secret_by_name", { p_name: name });
    if (sqlError || !sqlData) throw new Error(`Secret '${name}' nao encontrado`);
    return sqlData as string;
  }
  return data as string;
}

async function callMcp(url: string, token: string, tool: string, params: Record<string, unknown>): Promise<unknown> {
  const initRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "bnphub-support-costs", version: "1.0.0" },
      },
    }),
  });

  const sessionId = initRes.headers.get("mcp-session-id") ?? initRes.headers.get("x-session-id") ?? "";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }),
  });

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

  if (!toolRes.ok) {
    const body = await toolRes.text();
    throw new Error(`MCP retornou ${toolRes.status}: ${body}`);
  }

  const contentType = toolRes.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await toolRes.text();
    const lines = text.split("\n").filter((line) => line.startsWith("data:"));
    for (const line of lines) {
      try {
        const json = JSON.parse(line.replace("data:", "").trim());
        if (json.result) return json.result;
      } catch {
        continue;
      }
    }
    throw new Error("Nenhum resultado valido no SSE");
  }

  const json = (await toolRes.json()) as Record<string, unknown>;
  return json.result;
}

function getRowsFromMilvusPayload(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["lista", "data", "rows", "items", "records", "tickets"]) {
    const value = obj[key];
    if (Array.isArray(value))
      return value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
  }
  return [];
}

function getStableRowKey(row: Record<string, unknown>, fallback: string): string {
  return firstString(row, ["id", "codigo", "ticket", "ticket_id", "chamado", "numero", "protocolo"], fallback);
}

function getMilvusMetaTotal(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const meta = obj.meta as Record<string, unknown> | undefined;
  const paginate = meta?.paginate as Record<string, unknown> | undefined;
  for (const value of [paginate?.total, meta?.total, obj.total]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function compactToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeName(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(ltda|me|eireli|sa|s\/a|organizacao|social|de|da|do|dos|das)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactName(value: string | undefined | null): string {
  return normalizeName(value).replace(/[^a-z0-9]/g, "");
}

function scoreNameMatch(source: string, target: string): number {
  const sourceCompact = compactName(source);
  const targetCompact = compactName(target);
  if (!sourceCompact || !targetCompact) return 0;
  if (sourceCompact === targetCompact) return 1;
  if (sourceCompact.length >= 4 && targetCompact.includes(sourceCompact)) return 0.86;
  if (targetCompact.length >= 4 && sourceCompact.includes(targetCompact)) return 0.82;

  const sourceWords = new Set(
    normalizeName(source)
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  );
  const targetWords = new Set(
    normalizeName(target)
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  );
  if (sourceWords.size === 0 || targetWords.size === 0) return 0;
  const common = [...sourceWords].filter((word) => targetWords.has(word)).length;
  return common / Math.max(sourceWords.size, targetWords.size);
}

function bestHubClientMatch(name: string, clients: HubClient[]): MatchResult<HubClient> {
  const scored = clients
    .map((client) => {
      const fantasiaScore = scoreNameMatch(name, client.nome_fantasia ?? "");
      const razaoScore = scoreNameMatch(name, client.razao_social ?? "");
      return {
        item: client,
        score: Math.max(fantasiaScore, razaoScore),
      };
    })
    .filter((entry) => entry.score >= 0.55)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { item: null, status: "pending", confidence: 0, method: "auto-name" };
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.08) {
    return { item: null, status: "ambiguous", confidence: scored[0].score, method: "auto-name" };
  }
  return { item: scored[0].item, status: "matched", confidence: scored[0].score, method: "auto-name" };
}

function buildHubProjectTargets(contracts: HubContract[], subprojects: HubSubproject[]): HubProjectTarget[] {
  return [
    ...contracts.map((contract) => ({
      kind: "contract" as const,
      id: contract.id,
      name: contract.nome,
      code: contract.codigo,
      client_id: contract.client_id,
      contract_id: contract.id,
    })),
    ...subprojects.map((subproject) => ({
      kind: "subproject" as const,
      id: subproject.id,
      name: subproject.name,
      code: subproject.contract_name,
      client_id: subproject.client_id,
      contract_id: subproject.contract_id,
    })),
  ];
}

function bestHubProjectMatch(
  projectName: string,
  targets: HubProjectTarget[],
  preferredClientId?: string | null,
): MatchResult<HubProjectTarget> {
  const scored = targets
    .map((target) => {
      const nameScore = scoreNameMatch(projectName, target.name ?? "");
      const codeScore = scoreNameMatch(projectName, target.code ?? "");
      const clientBoost = preferredClientId && target.client_id === preferredClientId ? 0.08 : 0;
      return {
        item: target,
        score: Math.min(1, Math.max(nameScore, codeScore) + clientBoost),
      };
    })
    .filter((entry) => entry.score >= 0.52)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { item: null, status: "pending", confidence: 0, method: "auto-name" };
  if (scored.length > 1 && scored[0].score - scored[1].score < 0.06) {
    return { item: null, status: "ambiguous", confidence: scored[0].score, method: "auto-name" };
  }
  return { item: scored[0].item, status: "matched", confidence: scored[0].score, method: "auto-name" };
}

function getMilvusClientTerms(clientName?: string, clientNames: string[] = []): string[] {
  const sourceNames = [...clientNames, clientName].filter((value): value is string => Boolean(value?.trim()));
  const terms: string[] = [];

  for (const sourceName of sourceNames) {
    const clean = sourceName.trim();
    const words = clean
      .split(/[\s\-_/.,]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3);
    terms.push(clean, words.slice(0, 2).join(" "), words.slice(0, 3).join(" "));
  }

  return Array.from(new Set(terms.filter((term) => term && term.length >= 3))).slice(0, 24);
}

async function fetchDirectMilvusSlice(token: string, filtroBody: Record<string, unknown>): Promise<unknown> {
  const body: Record<string, unknown> = {
    page: 1,
    per_page: MILVUS_PAGE_SIZE,
    order_by: "codigo",
    descending: true,
    filtro_body: filtroBody,
  };

  const milvusRes = await fetch(MILVUS_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!milvusRes.ok) {
    const responseBody = await milvusRes.text();
    throw new Error(`Milvus direto retornou ${milvusRes.status}: ${responseBody}`);
  }

  return await milvusRes.json();
}

async function fetchMilvusClients(token: string, searchTerm?: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ status: "1" });
  if (searchTerm?.trim()) params.set("nome_fantasia", searchTerm.trim());

  const milvusRes = await fetch(`${MILVUS_CLIENT_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  });

  if (!milvusRes.ok) {
    const responseBody = await milvusRes.text();
    throw new Error(`Busca de clientes Milvus retornou ${milvusRes.status}: ${responseBody}`);
  }

  const payload = await milvusRes.json();
  return unwrapRows(payload);
}

function getMilvusClientNameFromRow(row: Record<string, unknown>): string {
  return firstString(
    row,
    ["nome_fantasia", "nomeFantasia", "fantasia", "nome", "razao_social", "razaoSocial", "cliente"],
    "",
  );
}

function getSearchSeedsFromName(name: string): string[] {
  const normalized = normalizeName(name);
  const words = normalized.split(/\s+/).filter((word) => word.length >= 3);
  const seeds = new Set<string>();
  if (name.trim()) seeds.add(name.trim());
  if (words.length > 0) seeds.add(words[0]);
  if (words.length > 1) seeds.add(words.slice(0, 2).join(" "));
  if (words.length > 2) seeds.add(words.slice(0, 3).join(" "));
  return Array.from(seeds).filter((seed) => seed.length >= 3);
}

async function resolveMilvusClientNames(
  token: string,
  requestedNames: string[],
  hubClients: HubClient[],
  hubProjectTargets: HubProjectTarget[],
): Promise<{ names: string[]; source: string; searchedTerms: string[]; catalogRows: number }> {
  const found = new Set<string>();
  const searchedTerms = new Set<string>();
  let catalogRows = 0;

  async function searchAndCollect(term?: string) {
    if (term?.trim()) searchedTerms.add(term.trim());
    const rows = await fetchMilvusClients(token, term);
    catalogRows += rows.length;
    for (const row of rows) {
      const name = getMilvusClientNameFromRow(row);
      if (name) found.add(name);
    }
  }

  if (requestedNames.length > 0) {
    return {
      names: Array.from(new Set(requestedNames.map((name) => name.trim()).filter(Boolean))).slice(
        0,
        MILVUS_MAX_CLIENTS_PER_SYNC,
      ),
      source: "requested-client-exact",
      searchedTerms: [],
      catalogRows: 0,
    };
  }

  const explicitSeeds = requestedNames.flatMap(getSearchSeedsFromName);
  if (explicitSeeds.length > 0) {
    for (const seed of explicitSeeds.slice(0, 32)) {
      try {
        await searchAndCollect(seed);
      } catch (error) {
        console.warn(
          `[support-costs-sync] Busca cliente Milvus falhou para '${seed}': ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    for (const fallback of requestedNames) {
      if (fallback.trim()) found.add(fallback.trim());
    }
    return {
      names: Array.from(found).slice(0, MILVUS_MAX_CLIENTS_PER_SYNC),
      source: "requested-client-catalog",
      searchedTerms: Array.from(searchedTerms),
      catalogRows,
    };
  }

  try {
    await searchAndCollect();
    if (found.size > 0) {
      return {
        names: Array.from(found)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, MILVUS_MAX_CLIENTS_PER_SYNC),
        source: "milvus-active-client-catalog",
        searchedTerms: Array.from(searchedTerms),
        catalogRows,
      };
    }
  } catch (error) {
    console.warn(
      `[support-costs-sync] Catalogo geral Milvus indisponivel: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const fallbackSeeds = new Set<string>();
  for (const client of hubClients) {
    for (const value of [client.nome_fantasia, client.razao_social]) {
      if (value?.trim()) fallbackSeeds.add(value.trim());
    }
  }
  for (const target of hubProjectTargets) {
    if (target.name?.trim()) fallbackSeeds.add(target.name.trim());
  }

  for (const seed of Array.from(fallbackSeeds).slice(0, 80).flatMap(getSearchSeedsFromName)) {
    try {
      await searchAndCollect(seed);
    } catch {
      continue;
    }
  }

  return {
    names: Array.from(found)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MILVUS_MAX_CLIENTS_PER_SYNC),
    source: "hub-seed-client-catalog",
    searchedTerms: Array.from(searchedTerms),
    catalogRows,
  };
}

function getSliceValues(rows: Record<string, unknown>[], field: (typeof MILVUS_SLICE_FIELDS)[number]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) values.add(value.trim());
    if (typeof value === "number" && Number.isFinite(value)) values.add(String(value));
  }
  return Array.from(values).slice(0, 30);
}

function getOldestParsedDate(rows: Record<string, unknown>[]): string | null {
  const dates = rows
    .map((row) => normalizeRecord(row, "date-check").date)
    .map((date) => parseDateOnly(date))
    .filter((date): date is string => Boolean(date))
    .sort();
  return dates[0] ?? null;
}

function buildSliceKey(filter: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(filter)
      .sort()
      .map((key) => [key, filter[key]]),
  );
}

async function callDirectMilvusAttendanceReport(
  token: string,
  range: MonthRange,
  clientName?: string,
  clientNames: string[] = [],
): Promise<{ lista: Record<string, unknown>[]; extractionDiagnostics: Record<string, unknown> }> {
  const filtroBody: Record<string, unknown> = {
    status: "Todos",
    data_hora_criacao_inicial: `${range.from} 00:00:00`,
    data_hora_criacao_final: `${range.to} 23:59:59`,
  };
  const clientTerms = getMilvusClientTerms(clientName, clientNames);

  if (clientTerms.length === 0) {
    const payload = await fetchDirectMilvusSlice(token, filtroBody);
    const rows = getRowsFromMilvusPayload(payload);
    return {
      lista: rows,
      extractionDiagnostics: {
        mode: "unfiltered-sample",
        reason: "cliente nao selecionado",
        rowsCollected: rows.length,
        metaTotal: getMilvusMetaTotal(payload),
      },
    };
  }

  const collected = new Map<string, Record<string, unknown>>();
  const visited = new Set<string>();
  const queue: Array<{ filter: Record<string, unknown>; depth: number }> = clientTerms.map((term) => ({
    filter: { ...filtroBody, cliente: term },
    depth: 0,
  }));
  const sliceDiagnostics: Array<Record<string, unknown>> = [];

  while (queue.length > 0 && visited.size < MILVUS_MAX_SLICES) {
    const current = queue.shift()!;
    const sliceKey = buildSliceKey(current.filter);
    if (visited.has(sliceKey)) continue;
    visited.add(sliceKey);

    const payload = await fetchDirectMilvusSlice(token, current.filter);
    const rows = getRowsFromMilvusPayload(payload);
    const metaTotal = getMilvusMetaTotal(payload);
    const oldestDate = getOldestParsedDate(rows);
    const isComplete =
      rows.length < MILVUS_PAGE_SIZE ||
      (metaTotal !== null && metaTotal <= MILVUS_PAGE_SIZE) ||
      Boolean(oldestDate && oldestDate < range.from);

    for (const row of rows) {
      const key = getStableRowKey(row, `slice-${visited.size}-${collected.size}`);
      collected.set(key, row);
    }

    sliceDiagnostics.push({
      filter: current.filter,
      depth: current.depth,
      rows: rows.length,
      metaTotal,
      oldestDate,
      complete: isComplete,
    });

    if (isComplete || current.depth >= MILVUS_SLICE_FIELDS.length) continue;

    const field = MILVUS_SLICE_FIELDS[current.depth];
    const values = getSliceValues(rows, field);
    for (const value of values) {
      queue.push({
        filter: { ...current.filter, [field]: value },
        depth: current.depth + 1,
      });
    }
  }

  const rows = Array.from(collected.values());

  return {
    lista: rows,
    extractionDiagnostics: {
      clientTerms,
      slicesVisited: visited.size,
      slicesLimited: visited.size >= MILVUS_MAX_SLICES,
      rowsCollected: rows.length,
      sampleSlices: sliceDiagnostics.slice(0, 12),
    },
  };
}

async function callAttendanceReport(
  devidToken: string,
  milvusToken: string | null,
  range: MonthRange,
  clientName?: string,
  clientNames: string[] = [],
): Promise<AttendanceReportResult> {
  if (milvusToken) {
    try {
      if (!clientName?.trim() && clientNames.length > 1) {
        const collected = new Map<string, Record<string, unknown>>();
        const clientDiagnostics: Array<Record<string, unknown>> = [];
        const chunks: string[][] = [];
        for (let index = 0; index < clientNames.length; index += 4) {
          chunks.push(clientNames.slice(index, index + 4));
        }

        for (const chunk of chunks) {
          const results = await Promise.all(
            chunk.map(async (name) => {
              try {
                const result = await callDirectMilvusAttendanceReport(milvusToken, range, name, [name]);
                return { name, result, error: null as string | null };
              } catch (error) {
                return { name, result: null, error: error instanceof Error ? error.message : String(error) };
              }
            }),
          );

          for (const item of results) {
            if (!item.result) {
              clientDiagnostics.push({ client: item.name, error: item.error });
              continue;
            }

            for (const row of item.result.lista) {
              const key = getStableRowKey(row, `${item.name}-${collected.size}`);
              collected.set(key, row);
            }
            clientDiagnostics.push({
              client: item.name,
              rowsCollected: item.result.lista.length,
              extraction: item.result.extractionDiagnostics,
            });
          }
        }

        return {
          source: "milvus-direct",
          rawResult: {
            lista: Array.from(collected.values()),
            extractionDiagnostics: {
              mode: "client-batch",
              clientCount: clientNames.length,
              rowsCollected: collected.size,
              clientDiagnostics: clientDiagnostics.slice(0, 80),
            },
          },
        };
      }

      return {
        source: "milvus-direct",
        rawResult: await callDirectMilvusAttendanceReport(milvusToken, range, clientName, clientNames),
      };
    } catch (error) {
      console.warn(
        `[support-costs-sync] Milvus direto falhou em ${range.label}; usando MCP: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const baseParams = {
    date_from: range.from,
    date_to: range.to,
  };

  try {
    return {
      source: "devid-mcp",
      rawResult: await callMcp(DEVID_URL, devidToken, "milvus_get_attendance_report", {
        ...baseParams,
        limit: 1000,
        page_size: 1000,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/limit|page_size|argument|schema|invalid|unknown|unexpected/i.test(message)) throw error;
    console.warn(`[support-costs-sync] Retentando ${range.label} sem parametros de limite: ${message}`);
    return {
      source: "devid-mcp",
      rawResult: await callMcp(DEVID_URL, devidToken, "milvus_get_attendance_report", baseParams),
    };
  }
}

function firstString(record: Record<string, unknown>, keys: string[], fallback = "Nao informado"): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const duration = parseDurationHours(value);
      if (duration !== null) return duration;

      const normalized = value
        .trim()
        .replace(/\.(?=\d{3}(\D|$))/g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function keyLooksLikeTime(key: string): boolean {
  const normalized = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/data|criacao|modificacao|resposta|solucao|agendamento|saida|entrada/.test(normalized)) return false;
  return /hora|hour|minute|minuto|segundo|second|tempo|duracao|duration|trabalh/.test(normalized);
}

function numberFromValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const duration = parseDurationHours(value);
    if (duration !== null) return duration;

    const normalized = value
      .trim()
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function detectNestedHours(value: unknown, depth = 0): number {
  if (!value || depth > 5) return 0;

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + detectNestedHours(item, depth + 1), 0);
  }

  if (typeof value !== "object") return 0;

  const obj = value as Record<string, unknown>;
  let total = 0;

  for (const [key, nestedValue] of Object.entries(obj)) {
    if (key === "rawTicket") continue;
    if (keyLooksLikeTime(key)) {
      const parsed = numberFromValue(nestedValue);
      if (parsed !== null && parsed > 0) {
        const normalizedKey = key
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        if (/minuto|minute/.test(normalizedKey)) total += parsed / 60;
        else if (/segundo|second/.test(normalizedKey)) total += parsed / 3600;
        else total += parsed;
        continue;
      }
    }
    if (nestedValue && typeof nestedValue === "object") total += detectNestedHours(nestedValue, depth + 1);
  }

  return total;
}

function parseDurationHours(value: string): number | null {
  const match = value.trim().match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours + minutes / 60 + seconds / 3600;
}

function formatDateParts(year: number, month: number, day: number): string | null {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!formatDateParts(year, month, day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildMonthRanges(dateFrom: string, dateTo: string): MonthRange[] {
  const startDate = parseIsoDate(dateFrom);
  const endDate = parseIsoDate(dateTo);
  if (!startDate || !endDate || startDate > endDate) return [];

  const ranges: MonthRange[] = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  while (cursor <= endDate) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const rangeStart = monthStart < startDate ? startDate : monthStart;
    const rangeEnd = monthEnd > endDate ? endDate : monthEnd;
    ranges.push({
      label: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      from: formatIsoDate(rangeStart),
      to: formatIsoDate(rangeEnd),
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return ranges;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function loadImportedClosedMonthKeys(
  supabase: ReturnType<typeof createClient>,
  monthRanges: MonthRange[],
): Promise<Set<string>> {
  const currentKey = currentMonthKey();
  const closedMonthKeys = monthRanges.map((range) => range.label).filter((label) => label < currentKey);

  if (closedMonthKeys.length === 0) return new Set();

  try {
    const { data, error } = await supabase
      .from("support_cost_monthly_loads")
      .select("month_key, status")
      .eq("load_scope", "full")
      .in("month_key", closedMonthKeys);
    if (error) throw error;

    return new Set((data ?? []).filter((row) => row.status === "imported").map((row) => String(row.month_key)));
  } catch (error) {
    console.warn(
      `[support-costs-sync] Nao foi possivel consultar cache mensal: ${error instanceof Error ? error.message : String(error)}`,
    );
    return new Set();
  }
}

function parseDateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const usDate = formatDateParts(year, first, second);
    const brDate = formatDateParts(year, second, first);

    if (first > 12) return brDate;
    if (second > 12) return usDate;
    return usDate || brDate;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function isRecordInPeriod(record: AttendanceRecord, dateFrom: string, dateTo: string): boolean {
  const date = parseDateOnly(record.date);
  if (!date) return false;
  return date >= dateFrom && date <= dateTo;
}

function shouldKeepRecordForRequestedPeriod(record: AttendanceRecord, dateFrom: string, dateTo: string): boolean {
  const date = parseDateOnly(record.date);
  if (!date) return false;
  return date >= dateFrom && date <= dateTo;
}

function detectHours(record: Record<string, unknown>): number {
  const directHours = firstNumber(record, [
    "horas",
    "hours",
    "total_horas",
    "total_horas_atendimento",
    "quantidade_horas",
    "tempo_horas",
    "duration_hours",
    "horas_atendimento",
    "horas_trabalhadas",
    "tempo_total_horas",
    "total_hours",
    "horas_ticket",
    "horas_operador",
    "horas_internas",
    "horas_externas",
  ]);
  if (directHours > 0) return directHours;

  const minutes = firstNumber(record, [
    "minutos",
    "minutes",
    "total_minutos",
    "duration_minutes",
    "tempo_minutos",
    "total_minutes",
  ]);
  if (minutes > 0) return minutes / 60;

  const seconds = firstNumber(record, [
    "segundos",
    "seconds",
    "total_segundos",
    "duration_seconds",
    "tempo_segundos",
    "total_seconds",
  ]);
  if (seconds > 0) return seconds / 3600;

  return detectNestedHours(record);
}

function arrayFromNestedValue(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (typeof value === "string") {
    const parsed = tryParseJsonText(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
    }
  }
  return [];
}

function expandRowsWithNestedServices(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const expanded: Record<string, unknown>[] = [];

  for (const row of rows) {
    let pushedNested = false;
    for (const key of [
      "servico_realizado",
      "servicos_realizados",
      "atendimentos",
      "apontamentos",
      "horas",
      "lancamentos",
    ]) {
      const nestedRows = arrayFromNestedValue(row[key]);
      for (const nested of nestedRows) {
        const merged = { ...row, ...nested, rawTicket: row };
        if (detectHours(merged) > 0) {
          expanded.push(merged);
          pushedNested = true;
        }
      }
    }
    if (!pushedNested) expanded.push(row);
  }

  return expanded;
}

function tryParseJsonText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonStart = Math.min(...["[", "{"].map((char) => trimmed.indexOf(char)).filter((index) => index >= 0));
    if (!Number.isFinite(jsonStart)) return null;

    try {
      return JSON.parse(trimmed.slice(jsonStart));
    } catch {
      return null;
    }
  }
}

function looksLikeAttendanceRow(record: Record<string, unknown>): boolean {
  return [
    "cliente",
    "client",
    "clientName",
    "nome_cliente",
    "projeto",
    "project",
    "projectName",
    "contrato",
    "responsavel",
    "analista",
    "atendente",
    "ticket",
    "chamado",
  ].some((key) => record[key] !== undefined);
}

function unwrapRows(result: unknown): Record<string, unknown>[] {
  const queue: unknown[] = [result];
  const candidates: Record<string, unknown>[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current === "string") {
      const parsed = tryParseJsonText(current);
      if (parsed !== null) queue.push(parsed);
      continue;
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>;

      if (typeof obj.type === "string" && obj.type === "text" && typeof obj.text === "string") {
        const parsed = tryParseJsonText(obj.text);
        if (parsed !== null) queue.push(parsed);
        continue;
      }

      let unwrapped = false;
      for (const key of [
        "content",
        "data",
        "rows",
        "items",
        "lista",
        "result",
        "records",
        "relatorio",
        "report",
        "tickets",
        "atendimentos",
        "horas",
      ]) {
        if (obj[key] !== undefined) {
          queue.push(obj[key]);
          unwrapped = true;
        }
      }

      if (!unwrapped || looksLikeAttendanceRow(obj)) {
        candidates.push(obj);
      }
    }
  }

  return candidates;
}

function describeShape(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      first: depth < 2 ? describeShape(value[0], depth + 1) : undefined,
    };
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 20);
    return {
      type: "object",
      keys,
      nested:
        depth < 2
          ? Object.fromEntries(keys.slice(0, 5).map((key) => [key, describeShape(obj[key], depth + 1)]))
          : undefined,
    };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return {
      type: "string",
      length: trimmed.length,
    };
  }
  return { type: typeof value };
}

function diagnosticsForRows(rows: Record<string, unknown>[], normalized: AttendanceRecord[]) {
  const sampleRows = rows.slice(0, 3);
  const sampleRecords = normalized.slice(0, 3);
  const rowsWithoutHours = normalized.filter((record) => record.hours <= 0).length;

  return {
    rowsDetected: rows.length,
    rowsWithoutHours,
    sampleKeys: sampleRows.map((row) => Object.keys(row).slice(0, 30)),
    sampleHourValues: sampleRows.map((row) => ({
      horas: row.horas,
      hours: row.hours,
      total_horas: row.total_horas,
      total_horas_atendimento: row.total_horas_atendimento,
      tempo_horas: row.tempo_horas,
      tempo: row.tempo,
      duracao: row.duracao,
      duration: row.duration,
      tempo_trabalhado: row.tempo_trabalhado,
      tempo_atendimento: row.tempo_atendimento,
      horas_ticket: row.horas_ticket,
      horas_operador: row.horas_operador,
      horas_internas: row.horas_internas,
      horas_externas: row.horas_externas,
      minutos: row.minutos,
      minutes: row.minutes,
      nestedHours: detectNestedHours(row),
    })),
    sampleDateValues: sampleRows.map((row, index) => ({
      data_inicial: row.data_inicial,
      data_final: row.data_final,
      data_criacao: row.data_criacao,
      data_solucao: row.data_solucao,
      created_at: row.created_at,
      normalizedDate: sampleRecords[index]?.date,
      parsedDate: parseDateOnly(sampleRecords[index]?.date),
    })),
    sampleNormalizedRecords: sampleRecords.map((record) => ({
      clientName: record.clientName,
      projectName: record.projectName,
      analystName: record.analystName,
      hours: record.hours,
      date: record.date,
      parsedDate: parseDateOnly(record.date),
    })),
  };
}

function normalizeRecord(record: Record<string, unknown>, index: number | string): AttendanceRecord {
  const clientName = firstString(record, [
    "cliente",
    "client",
    "clientName",
    "nome_cliente",
    "nome_fantasia",
    "razaoSocial",
    "razao_social",
    "customer",
    "empresa",
  ]);
  const projectName = firstString(
    record,
    [
      "projeto",
      "project",
      "projectName",
      "nome_projeto",
      "contrato",
      "contract",
      "servico",
      "service",
      "cliente_projeto",
      "setor",
    ],
    clientName,
  );
  const analystName = firstString(record, [
    "responsavel",
    "analista",
    "atendente",
    "tecnico",
    "colaborador",
    "user",
    "usuario",
    "operador",
    "consultor",
    "nome",
    "sobrenome",
  ]);
  const hours = detectHours(record);
  const date = firstString(
    record,
    [
      "data",
      "date",
      "dia",
      "created_at",
      "data_atendimento",
      "data_chamado",
      "data_fechamento",
      "data_inicial",
      "data_final",
      "data_criacao",
      "data_saida",
    ],
    "",
  );

  return {
    id: firstString(
      record,
      ["id", "ticket", "ticket_id", "chamado", "codigo", "numero", "protocolo"],
      `milvus-${index}`,
    ),
    clientName,
    projectName,
    analystName,
    hours,
    date: date || undefined,
    raw: record,
  };
}

async function loadHubCatalog(supabase: ReturnType<typeof createClient>): Promise<{
  clients: HubClient[];
  contracts: HubContract[];
  subprojects: HubSubproject[];
  projectTargets: HubProjectTarget[];
}> {
  const [{ data: clients }, { data: contracts }, { data: subprojects }] = await Promise.all([
    supabase.from("clients").select("id, razao_social, nome_fantasia, cnpj"),
    supabase.from("contracts").select("id, nome, codigo, client_id"),
    supabase.from("contract_subprojects").select("id, name, contract_id"),
  ]);
  const typedContracts = (contracts ?? []) as HubContract[];
  const contractById = new Map(typedContracts.map((contract) => [contract.id, contract]));
  const typedSubprojects = (
    (subprojects ?? []) as Array<{ id: string; name?: string | null; contract_id?: string | null }>
  ).map((subproject) => {
    const parentContract = subproject.contract_id ? contractById.get(subproject.contract_id) : undefined;
    return {
      ...subproject,
      contract_name: parentContract?.nome ?? null,
      client_id: parentContract?.client_id ?? null,
    };
  });

  return {
    clients: (clients ?? []) as HubClient[],
    contracts: typedContracts,
    subprojects: typedSubprojects,
    projectTargets: buildHubProjectTargets(typedContracts, typedSubprojects),
  };
}

async function loadKnownMilvusClientNames(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await supabase
    .from("support_milvus_clients")
    .select("milvus_client_name")
    .order("milvus_client_name", { ascending: true })
    .limit(120);

  if (error) {
    console.warn(`[support-costs-sync] Nao foi possivel carregar clientes Milvus conhecidos: ${error.message}`);
    return [];
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => String((row as Record<string, unknown>).milvus_client_name ?? "").trim())
        .filter(Boolean),
    ),
  );
}

async function persistSupportCostRecords(
  supabase: ReturnType<typeof createClient>,
  syncRunId: string,
  records: AttendanceRecord[],
  hubClients: HubClient[],
  hubProjectTargets: HubProjectTarget[],
): Promise<{ stored: number; inconsistencies: number }> {
  const clientIdByKey = new Map<
    string,
    { id: string; match: MatchResult<HubClient>; hubClientId?: string | null; mappingStatus: string }
  >();
  const projectIdByKey = new Map<
    string,
    {
      id: string;
      match: MatchResult<HubProjectTarget>;
      hubContractId?: string | null;
      hubSubprojectId?: string | null;
      clientId?: string | null;
      mappingStatus: string;
    }
  >();
  const ticketRows: Record<string, unknown>[] = [];
  const inconsistencyCandidates: Record<string, unknown>[] = [];

  for (const record of records) {
    const clientKey =
      compactName(record.clientName || "Nao informado") || compactToken(record.clientName || "nao-informado");
    let clientEntry = clientIdByKey.get(clientKey);

    if (!clientEntry) {
      const match = bestHubClientMatch(record.clientName, hubClients);
      const { data: clientRow, error: clientError } = await supabase
        .from("support_milvus_clients")
        .upsert(
          {
            milvus_client_name: record.clientName || "Nao informado",
            milvus_client_key: clientKey,
            raw: { sample: record.raw ?? {} },
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "milvus_client_key" },
        )
        .select("id")
        .single();
      if (clientError) throw clientError;

      await supabase.from("support_milvus_client_mappings").upsert(
        {
          milvus_client_id: clientRow.id,
          hub_client_id: match.item?.id ?? null,
          status: match.status,
          match_method: match.method,
          confidence: match.confidence,
          notes: match.status === "matched" ? null : "Revisar relacao Cliente Milvus x Cliente Hub.",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "milvus_client_id", ignoreDuplicates: true },
      );

      const { data: mappingRow } = await supabase
        .from("support_milvus_client_mappings")
        .select("hub_client_id, status")
        .eq("milvus_client_id", clientRow.id)
        .maybeSingle();

      clientEntry = {
        id: clientRow.id,
        match,
        hubClientId: String(mappingRow?.hub_client_id ?? match.item?.id ?? "") || null,
        mappingStatus: String(mappingRow?.status ?? match.status),
      };
      clientIdByKey.set(clientKey, clientEntry);
    }

    const projectKey = `${clientKey}:${compactName(record.projectName || record.clientName || "Nao informado")}`;
    let projectEntry = projectIdByKey.get(projectKey);

    if (!projectEntry) {
      const preferredClientId = clientEntry.hubClientId ?? clientEntry.match.item?.id ?? null;
      const projectMatch = bestHubProjectMatch(
        record.projectName || record.clientName,
        hubProjectTargets,
        preferredClientId,
      );
      const { data: projectRow, error: projectError } = await supabase
        .from("support_milvus_projects")
        .upsert(
          {
            milvus_client_id: clientEntry.id,
            milvus_project_name: record.projectName || record.clientName || "Nao informado",
            milvus_project_key: compactName(record.projectName || record.clientName || "nao-informado"),
            raw: { sample: record.raw ?? {} },
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "milvus_client_id,milvus_project_key" },
        )
        .select("id")
        .single();
      if (projectError) throw projectError;

      await supabase.from("support_milvus_project_mappings").upsert(
        {
          milvus_project_id: projectRow.id,
          hub_contract_id:
            projectMatch.item?.kind === "subproject"
              ? (projectMatch.item.contract_id ?? null)
              : (projectMatch.item?.id ?? null),
          hub_subproject_id: projectMatch.item?.kind === "subproject" ? projectMatch.item.id : null,
          status: projectMatch.status,
          match_method: projectMatch.method,
          confidence: projectMatch.confidence,
          notes: projectMatch.status === "matched" ? null : "Revisar relacao Projeto Milvus x Contrato Hub.",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "milvus_project_id", ignoreDuplicates: true },
      );

      const { data: mappingRow } = await supabase
        .from("support_milvus_project_mappings")
        .select("hub_contract_id, hub_subproject_id, status")
        .eq("milvus_project_id", projectRow.id)
        .maybeSingle();
      const matchedContractId =
        projectMatch.item?.kind === "subproject"
          ? (projectMatch.item.contract_id ?? null)
          : (projectMatch.item?.id ?? null);
      const mappedContractId = String(mappingRow?.hub_contract_id ?? matchedContractId ?? "") || null;
      const mappedSubprojectId =
        String(
          mappingRow?.hub_subproject_id ?? (projectMatch.item?.kind === "subproject" ? projectMatch.item.id : "") ?? "",
        ) || null;
      const mappedTarget = mappedSubprojectId
        ? hubProjectTargets.find((target) => target.kind === "subproject" && target.id === mappedSubprojectId)
        : mappedContractId
          ? hubProjectTargets.find((target) => target.kind === "contract" && target.id === mappedContractId)
          : null;

      projectEntry = {
        id: projectRow.id,
        match: projectMatch,
        hubContractId: mappedContractId,
        hubSubprojectId: mappedSubprojectId,
        clientId: mappedTarget?.client_id ?? projectMatch.item?.client_id ?? preferredClientId,
        mappingStatus: String(mappingRow?.status ?? projectMatch.status),
      };
      projectIdByKey.set(projectKey, projectEntry);
    }

    const parsedDate = parseDateOnly(record.date);
    const hubClientId = projectEntry.clientId ?? clientEntry.hubClientId ?? clientEntry.match.item?.id ?? null;
    const hubContractId = projectEntry.hubContractId ?? projectEntry.match.item?.id ?? null;
    ticketRows.push({
      sync_run_id: syncRunId,
      milvus_ticket_code: record.id,
      milvus_ticket_id: String(record.raw?.id ?? record.raw?.ticket_id ?? record.id),
      milvus_client_id: clientEntry.id,
      milvus_project_id: projectEntry.id,
      hub_client_id: hubClientId,
      hub_contract_id: hubContractId,
      hub_subproject_id: projectEntry.hubSubprojectId ?? null,
      client_name: record.clientName || "Nao informado",
      project_name: record.projectName || "Nao informado",
      analyst_name: record.analystName || "Nao informado",
      ticket_date: parsedDate,
      hours: record.hours,
      subject: firstString(record.raw ?? {}, ["assunto", "subject", "titulo", "title"], ""),
      status: firstString(record.raw ?? {}, ["status", "situacao"], ""),
      raw: record.raw ?? {},
      updated_at: new Date().toISOString(),
    });

    const reasons: Array<{ code: string; detail: string }> = [];
    if (clientEntry.mappingStatus !== "matched") {
      reasons.push({
        code: `client_${clientEntry.mappingStatus}`,
        detail: `Cliente Milvus sem match confiavel: ${record.clientName}`,
      });
    }
    if (projectEntry.mappingStatus !== "matched") {
      reasons.push({
        code: `project_${projectEntry.mappingStatus}`,
        detail: `Projeto/contrato Milvus sem match confiavel: ${record.projectName}`,
      });
    }

    for (const reason of reasons) {
      inconsistencyCandidates.push({
        sync_run_id: syncRunId,
        reason_code: reason.code,
        reason_detail: reason.detail,
        milvus_client_id: clientEntry.id,
        milvus_project_id: projectEntry.id,
        milvus_ticket_code: record.id,
        payload: record.raw ?? {},
      });
    }
  }

  for (let index = 0; index < ticketRows.length; index += 100) {
    const chunk = ticketRows.slice(index, index + 100);
    const { error } = await supabase.from("support_cost_tickets").upsert(chunk, { onConflict: "milvus_ticket_code" });
    if (error) throw error;
  }

  let insertedInconsistencies = 0;
  if (inconsistencyCandidates.length > 0) {
    const ticketCodes = Array.from(new Set(inconsistencyCandidates.map((row) => String(row.milvus_ticket_code))));
    const { data: existingRows, error: existingError } = await supabase
      .from("support_cost_inconsistencies")
      .select("milvus_ticket_code, reason_code")
      .in("milvus_ticket_code", ticketCodes)
      .is("resolved_at", null);
    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existingRows ?? []).map((row) => {
        const raw = row as Record<string, unknown>;
        return `${String(raw.milvus_ticket_code ?? "")}|${String(raw.reason_code ?? "")}`;
      }),
    );
    const seenNewKeys = new Set<string>();
    const newInconsistencies = inconsistencyCandidates.filter((row) => {
      const key = `${String(row.milvus_ticket_code ?? "")}|${String(row.reason_code ?? "")}`;
      if (existingKeys.has(key) || seenNewKeys.has(key)) return false;
      seenNewKeys.add(key);
      return true;
    });

    for (let index = 0; index < newInconsistencies.length; index += 100) {
      const chunk = newInconsistencies.slice(index, index + 100);
      const { error } = await supabase.from("support_cost_inconsistencies").insert(chunk);
      if (error) throw error;
      insertedInconsistencies += chunk.length;
    }
  }

  return { stored: ticketRows.length, inconsistencies: insertedInconsistencies };
}

async function markMonthlyLoadsSyncing(
  supabase: ReturnType<typeof createClient>,
  monthRanges: MonthRange[],
  syncRunId: string | null,
) {
  try {
    for (const range of monthRanges) {
      await supabase.from("support_cost_monthly_loads").upsert(
        {
          month_key: range.label,
          load_scope: "full",
          period_start: range.from,
          period_end: range.to,
          status: "syncing",
          sync_run_id: syncRunId,
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "month_key,load_scope" },
      );
    }
  } catch (error) {
    console.warn(
      `[support-costs-sync] Controle mensal indisponivel: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function markMonthlyLoadsFinished(
  supabase: ReturnType<typeof createClient>,
  monthRanges: MonthRange[],
  records: AttendanceRecord[],
  status: "imported" | "error",
  syncRunId: string | null,
  inconsistencyCount: number,
  errorMessage?: string,
) {
  try {
    for (const range of monthRanges) {
      const monthRecords = records.filter((record) => isRecordInPeriod(record, range.from, range.to));
      await supabase.from("support_cost_monthly_loads").upsert(
        {
          month_key: range.label,
          load_scope: "full",
          period_start: range.from,
          period_end: range.to,
          status,
          sync_run_id: syncRunId,
          tickets_count: monthRecords.length,
          total_hours: Number(monthRecords.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
          inconsistency_count: status === "imported" ? inconsistencyCount : 0,
          last_synced_at: status === "imported" ? new Date().toISOString() : null,
          error_message: errorMessage ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "month_key,load_scope" },
      );
    }
  } catch (error) {
    console.warn(
      `[support-costs-sync] Controle mensal indisponivel: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function markMonthlyLoadsFromStoredTickets(
  supabase: ReturnType<typeof createClient>,
  monthRanges: MonthRange[],
  syncRunId: string | null,
) {
  for (const range of monthRanges) {
    const { data, error } = await supabase
      .from("support_cost_tickets")
      .select("milvus_ticket_code, hours")
      .gte("ticket_date", range.from)
      .lte("ticket_date", range.to);
    if (error) throw error;

    const uniqueTickets = new Set<string>();
    let totalHours = 0;
    for (const row of data ?? []) {
      const ticketCode = String((row as Record<string, unknown>).milvus_ticket_code ?? "");
      if (!ticketCode || uniqueTickets.has(ticketCode)) continue;
      uniqueTickets.add(ticketCode);
      const hours = Number((row as Record<string, unknown>).hours ?? 0);
      if (Number.isFinite(hours)) totalHours += hours;
    }

    const { data: inconsistencyRows, error: inconsistencyError } = await supabase
      .from("support_cost_inconsistencies")
      .select("milvus_ticket_code")
      .is("resolved_at", null);
    if (inconsistencyError) throw inconsistencyError;
    const inconsistencyCount = (inconsistencyRows ?? []).filter((row) =>
      uniqueTickets.has(String((row as Record<string, unknown>).milvus_ticket_code ?? "")),
    ).length;

    await supabase.from("support_cost_monthly_loads").upsert(
      {
        month_key: range.label,
        load_scope: "full",
        period_start: range.from,
        period_end: range.to,
        status: "imported",
        sync_run_id: syncRunId,
        tickets_count: uniqueTickets.size,
        total_hours: Number(totalHours.toFixed(4)),
        inconsistency_count: inconsistencyCount,
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month_key,load_scope" },
    );
  }
}

function summarizeClientAudit(names: string[], hubClients: HubClient[]) {
  const audit = names
    .map((name) => {
      const match = bestHubClientMatch(name, hubClients);
      return {
        milvusClientName: name,
        status: match.status,
        confidence: Number(match.confidence.toFixed(4)),
        hubClientId: match.item?.id ?? null,
        hubClientName: match.item ? match.item.nome_fantasia || match.item.razao_social || "" : "",
      };
    })
    .sort((left, right) => {
      const statusOrder = { pending: 0, ambiguous: 1, matched: 2 } as Record<string, number>;
      return (
        (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9) ||
        left.milvusClientName.localeCompare(right.milvusClientName)
      );
    });

  return {
    summary: {
      milvusClients: names.length,
      matched: audit.filter((row) => row.status === "matched").length,
      pending: audit.filter((row) => row.status === "pending").length,
      ambiguous: audit.filter((row) => row.status === "ambiguous").length,
    },
    audit,
  };
}

function summarizeProjectAudit(
  records: AttendanceRecord[],
  projectTargets: HubProjectTarget[],
  preferredClientByName: Map<string, string | null>,
) {
  const projectNames = Array.from(
    new Map(
      records.map((record) => [
        `${compactName(record.clientName)}:${compactName(record.projectName || record.clientName)}`,
        record,
      ]),
    ).values(),
  );

  const audit = projectNames.map((record) => {
    const match = bestHubProjectMatch(
      record.projectName || record.clientName,
      projectTargets,
      preferredClientByName.get(compactName(record.clientName)) ?? null,
    );
    return {
      milvusClientName: record.clientName,
      milvusProjectName: record.projectName,
      status: match.status,
      confidence: Number(match.confidence.toFixed(4)),
      hubTargetType: match.item?.kind ?? null,
      hubContractId: match.item?.kind === "subproject" ? (match.item.contract_id ?? null) : (match.item?.id ?? null),
      hubSubprojectId: match.item?.kind === "subproject" ? match.item.id : null,
      hubProjectName: match.item?.name ?? "",
    };
  });

  return {
    total: audit.length,
    matched: audit.filter((row) => row.status === "matched").length,
    pending: audit.filter((row) => row.status === "pending").length,
    ambiguous: audit.filter((row) => row.status === "ambiguous").length,
    sample: audit.filter((row) => row.status !== "matched").slice(0, 80),
  };
}

async function collectHistoricalRecords(
  cleanDevidToken: string,
  milvusToken: string | null,
  dateFrom: string,
  dateTo: string,
  clientName: string | undefined,
  clientNames: string[],
) {
  const ranges = buildMonthRanges(dateFrom, dateTo);
  const rows: Record<string, unknown>[] = [];
  const normalized: AttendanceRecord[] = [];
  const kept: AttendanceRecord[] = [];
  const diagnostics: Array<Record<string, unknown>> = [];

  for (const range of ranges) {
    const { source, rawResult } = await callAttendanceReport(
      cleanDevidToken,
      milvusToken,
      range,
      clientName,
      clientNames,
    );
    const rangeRows = expandRowsWithNestedServices(unwrapRows(rawResult));
    const rangeNormalized = rangeRows.map((row, index) => normalizeRecord(row, `${range.label}-${index}`));
    const rangeKept = rangeNormalized
      .filter((record) => record.hours > 0)
      .filter((record) => shouldKeepRecordForRequestedPeriod(record, range.from, range.to));
    const rawObject =
      rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)
        ? (rawResult as Record<string, unknown>)
        : {};

    rows.push(...rangeRows);
    normalized.push(...rangeNormalized);
    kept.push(...rangeKept);
    diagnostics.push({
      month: range.label,
      source,
      rowsDetected: rangeRows.length,
      recordsDetected: rangeKept.length,
      totalHours: Number(rangeKept.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
      extraction: rawObject.extractionDiagnostics ?? null,
    });
  }

  const seen = new Set<string>();
  const records = kept
    .filter((record) => {
      const key = `${record.id}|${record.date ?? ""}|${record.clientName}|${record.projectName}|${record.analystName}|${record.hours.toFixed(6)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftDate = parseDateOnly(left.date) ?? "";
      const rightDate = parseDateOnly(right.date) ?? "";
      return (
        leftDate.localeCompare(rightDate) ||
        left.clientName.localeCompare(right.clientName) ||
        left.projectName.localeCompare(right.projectName)
      );
    });

  return {
    ranges,
    rows,
    normalized,
    records,
    diagnostics,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      dateFrom,
      dateTo,
      clientName,
      clientNames = [],
      fullCatalogSync = false,
      mode = "sync",
      confirmWrite = false,
      finalizeMonthlyLoad = false,
      clientLimit = 0,
    } = (await req.json()) as SyncRequest;
    if (mode !== "audit" && (!dateFrom || !dateTo)) throw new Error("Periodo obrigatorio");
    if (mode === "write" && !confirmWrite) throw new Error("Modo write exige confirmWrite=true");
    if (mode === "finalize-month" && !confirmWrite) throw new Error("Modo finalize-month exige confirmWrite=true");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (mode === "finalize-month") {
      const monthRanges = buildMonthRanges(dateFrom, dateTo);
      if (monthRanges.length === 0) throw new Error("Periodo invalido");
      await markMonthlyLoadsFromStoredTickets(supabase, monthRanges, null);
      return new Response(
        JSON.stringify({
          success: true,
          mode,
          functionVersion: FUNCTION_VERSION,
          monthRanges,
          message: "Mes(es) finalizado(s) a partir da base local deduplicada.",
        }),
        {
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const hubCatalog = await loadHubCatalog(supabase);
    const explicitClientNames = fullCatalogSync ? [] : clientNames.filter((name) => Boolean(name?.trim()));
    const hasRequestedClientFilter = !fullCatalogSync && Boolean(clientName?.trim() || explicitClientNames.length > 0);

    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");
    let milvusToken: string | null = null;
    try {
      milvusToken = await getVaultSecret(supabase, "MILVUS_TOKEN");
    } catch (error) {
      console.warn(
        `[support-costs-sync] MILVUS_TOKEN indisponivel; usando MCP: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let nameResolution = {
      names: explicitClientNames,
      source: explicitClientNames.length > 0 ? "request" : "none",
      searchedTerms: [] as string[],
      catalogRows: 0,
    };
    if (milvusToken) {
      nameResolution = await resolveMilvusClientNames(
        milvusToken,
        explicitClientNames.length > 0 ? explicitClientNames : clientName?.trim() ? [clientName.trim()] : [],
        hubCatalog.clients,
        hubCatalog.projectTargets,
      );
    } else if (!clientName?.trim() && explicitClientNames.length === 0) {
      const knownMilvusClientNames = await loadKnownMilvusClientNames(supabase);
      nameResolution = {
        names: knownMilvusClientNames,
        source: "stored-milvus-clients",
        searchedTerms: [],
        catalogRows: 0,
      };
    }

    const effectiveClientNames = (nameResolution.names.length > 0 ? nameResolution.names : explicitClientNames).slice(
      0,
      clientLimit > 0 ? clientLimit : undefined,
    );

    if (mode === "audit") {
      const audit = summarizeClientAudit(effectiveClientNames, hubCatalog.clients);
      return new Response(
        JSON.stringify({
          success: true,
          mode,
          functionVersion: FUNCTION_VERSION,
          source: nameResolution.source,
          searchedTerms: nameResolution.searchedTerms,
          catalogRows: nameResolution.catalogRows,
          ...audit,
        }),
        {
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    if (mode === "dry-run" || mode === "write") {
      const cleanDevidToken = devidToken.replace(/^Bearer\s+/i, "");
      const collected = await collectHistoricalRecords(
        cleanDevidToken,
        milvusToken,
        dateFrom,
        dateTo,
        clientName,
        effectiveClientNames,
      );
      const totalHours = Number(collected.records.reduce((sum, record) => sum + record.hours, 0).toFixed(4));
      const clientMatches = new Map<string, string | null>();
      const clientAudit = summarizeClientAudit(
        Array.from(new Set(collected.records.map((record) => record.clientName).filter(Boolean))),
        hubCatalog.clients,
      );
      for (const row of clientAudit.audit) clientMatches.set(compactName(row.milvusClientName), row.hubClientId);
      const projectAudit = summarizeProjectAudit(collected.records, hubCatalog.projectTargets, clientMatches);
      let persistence: { stored: number; inconsistencies: number } | null = null;
      let syncRunId: string | null = null;

      if (mode === "write") {
        const { data: syncRun, error: syncRunError } = await supabase
          .from("support_cost_sync_runs")
          .insert({
            date_from: dateFrom,
            date_to: dateTo,
            requested_client_name: clientName || null,
            requested_client_names: effectiveClientNames,
            status: "running",
            diagnostics: { mode: "historical-write", functionVersion: FUNCTION_VERSION },
          })
          .select("id")
          .single();
        if (syncRunError) throw syncRunError;
        syncRunId = syncRun.id;
        persistence = await persistSupportCostRecords(
          supabase,
          syncRunId,
          collected.records,
          hubCatalog.clients,
          hubCatalog.projectTargets,
        );
        if (finalizeMonthlyLoad && !hasRequestedClientFilter) {
          await markMonthlyLoadsFromStoredTickets(supabase, collected.ranges, syncRunId);
        }
        await supabase
          .from("support_cost_sync_runs")
          .update({
            status: "success",
            records_detected: collected.records.length,
            tickets_stored: persistence.stored,
            inconsistency_count: persistence.inconsistencies,
            diagnostics: {
              mode: "historical-write",
              functionVersion: FUNCTION_VERSION,
              monthDiagnostics: collected.diagnostics,
              totalHours,
              clientAudit: clientAudit.summary,
              projectAudit,
            },
            ended_at: new Date().toISOString(),
          })
          .eq("id", syncRunId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode,
          functionVersion: FUNCTION_VERSION,
          dryRun: mode === "dry-run",
          syncRunId,
          summary: {
            dateFrom,
            dateTo,
            requestedClientName: clientName || null,
            clientAliasesCount: effectiveClientNames.length,
            rowsDetected: collected.rows.length,
            recordsDetected: collected.records.length,
            totalHours,
            clientAudit: clientAudit.summary,
            projectAudit,
            stored: persistence?.stored ?? 0,
            inconsistencies:
              persistence?.inconsistencies ??
              clientAudit.summary.pending +
                clientAudit.summary.ambiguous +
                projectAudit.pending +
                projectAudit.ambiguous,
          },
          monthDiagnostics: collected.diagnostics,
          clientAudit: clientAudit.audit.slice(0, 200),
          sampleRecords: collected.records.slice(0, 50),
        }),
        {
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    let syncRunId: string | null = null;

    try {
      const { data: syncRun, error: syncRunError } = await supabase
        .from("support_cost_sync_runs")
        .insert({
          date_from: dateFrom,
          date_to: dateTo,
          requested_client_name: clientName || null,
          requested_client_names: effectiveClientNames,
          status: "running",
        })
        .select("id")
        .single();
      if (syncRunError) throw syncRunError;
      syncRunId = syncRun.id;
    } catch (error) {
      console.warn(
        `[support-costs-sync] Nao foi possivel registrar execucao: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const monthRanges = buildMonthRanges(dateFrom, dateTo);
    if (monthRanges.length === 0) throw new Error("Periodo invalido");
    const importedClosedMonthKeys = !hasRequestedClientFilter
      ? await loadImportedClosedMonthKeys(supabase, monthRanges)
      : new Set<string>();
    const syncRanges = monthRanges.filter((range) => !importedClosedMonthKeys.has(range.label));
    const skippedMonthRanges = monthRanges.filter((range) => importedClosedMonthKeys.has(range.label));
    if (!hasRequestedClientFilter) await markMonthlyLoadsSyncing(supabase, syncRanges, syncRunId);

    if (syncRanges.length === 0) {
      const diagnostics = {
        functionVersion: FUNCTION_VERSION,
        request: {
          dateFrom,
          dateTo,
          clientName: clientName || null,
          clientAliasesCount: effectiveClientNames.length,
          clientNameResolutionSource: nameResolution.source,
          clientCatalogRows: nameResolution.catalogRows,
          clientSearchTerms: nameResolution.searchedTerms.slice(0, 40),
          hasClientFilter: hasRequestedClientFilter,
          hasProjectFilter: false,
        },
        rawShape: {
          type: "monthly-cache",
          months: monthRanges.length,
          rowsDetected: 0,
          recordsDetected: 0,
        },
        recordsDetected: 0,
        monthRanges,
        skippedMonthRanges,
        message: "Todos os meses fechados do periodo ja estavam importados na base local.",
      };

      if (syncRunId) {
        await supabase
          .from("support_cost_sync_runs")
          .update({
            status: "success",
            records_detected: 0,
            tickets_stored: 0,
            inconsistency_count: 0,
            diagnostics,
            ended_at: new Date().toISOString(),
          })
          .eq("id", syncRunId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          accepted: false,
          functionVersion: FUNCTION_VERSION,
          syncRunId,
          count: 0,
          diagnostics,
          message: "Periodo ja importado. A tela pode carregar a base local.",
        }),
        {
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    const cleanDevidToken = devidToken.replace(/^Bearer\s+/i, "");

    // Run the heavy attendance fetch + persistence in the background to avoid
    // the 150s idle timeout. Frontend polls `support_cost_sync_runs` by syncRunId.
    const backgroundJob = async () => {
      const rows: Record<string, unknown>[] = [];
      const normalized: AttendanceRecord[] = [];
      const monthRecords: AttendanceRecord[] = [];
      const monthDiagnostics: Array<Record<string, unknown>> = [];

      try {
        const monthResults = await Promise.all(
          syncRanges.map(async (range) => {
            const { source, rawResult } = await callAttendanceReport(
              cleanDevidToken,
              milvusToken,
              range,
              clientName,
              effectiveClientNames,
            );
            const monthRows = expandRowsWithNestedServices(unwrapRows(rawResult));
            const monthNormalized = monthRows.map((row, index) => normalizeRecord(row, `${range.label}-${index}`));
            const monthRecordsWithHours = monthNormalized.filter((record) => record.hours > 0);
            const monthKeptRecords = monthRecordsWithHours.filter((record) =>
              shouldKeepRecordForRequestedPeriod(record, range.from, range.to),
            );
            const rawObject =
              rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)
                ? (rawResult as Record<string, unknown>)
                : {};
            return { range, source, rawObject, monthRows, monthNormalized, monthRecordsWithHours, monthKeptRecords };
          }),
        );

        for (const {
          range,
          source,
          rawObject,
          monthRows,
          monthNormalized,
          monthRecordsWithHours,
          monthKeptRecords,
        } of monthResults) {
          rows.push(...monthRows);
          normalized.push(...monthNormalized);
          monthRecords.push(...monthKeptRecords);
          monthDiagnostics.push({
            month: range.label,
            source,
            paginationStrategy: rawObject.paginationStrategy ?? null,
            pagesMerged: rawObject.pagesMerged ?? null,
            extraction: rawObject.extractionDiagnostics ?? null,
            dateFrom: range.from,
            dateTo: range.to,
            rowsDetected: monthRows.length,
            recordsWithHours: monthRecordsWithHours.length,
            recordsWithoutRecognizedDate: monthRecordsWithHours.filter((record) => !parseDateOnly(record.date)).length,
            recordsOutsidePeriod: monthRecordsWithHours.filter(
              (record) => parseDateOnly(record.date) && !isRecordInPeriod(record, range.from, range.to),
            ).length,
            recordsDetected: monthKeptRecords.length,
            totalHours: Number(monthKeptRecords.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
          });
        }

        const recordsWithHours = normalized.filter((record) => record.hours > 0);
        const recordsWithoutRecognizedDate = recordsWithHours.filter((record) => !parseDateOnly(record.date)).length;
        const recordsOutsidePeriod = recordsWithHours.filter(
          (record) => parseDateOnly(record.date) && !isRecordInPeriod(record, dateFrom, dateTo),
        ).length;
        const seen = new Set<string>();
        const records = monthRecords
          .filter((record) => {
            const key = `${record.id}|${record.date ?? ""}|${record.clientName}|${record.projectName}|${record.analystName}|${record.hours.toFixed(6)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((left, right) => {
            const leftDate = parseDateOnly(left.date) ?? "";
            const rightDate = parseDateOnly(right.date) ?? "";
            return (
              leftDate.localeCompare(rightDate) ||
              left.clientName.localeCompare(right.clientName) ||
              left.projectName.localeCompare(right.projectName)
            );
          });

        const diagnostics = {
          functionVersion: FUNCTION_VERSION,
          request: {
            dateFrom,
            dateTo,
            clientName: clientName || null,
            clientAliasesCount: effectiveClientNames.length,
            clientNameResolutionSource: nameResolution.source,
            clientCatalogRows: nameResolution.catalogRows,
            clientSearchTerms: nameResolution.searchedTerms.slice(0, 40),
            hasClientFilter: Boolean(clientName?.trim() || effectiveClientNames.length > 0),
            hasProjectFilter: false,
          },
          rawShape: {
            type: "monthly",
            months: monthRanges.length,
            rowsDetected: rows.length,
            recordsDetected: records.length,
          },
          ...diagnosticsForRows(rows, normalized),
          recordsWithHours: recordsWithHours.length,
          recordsWithoutRecognizedDate,
          recordsOutsidePeriod,
          recordsDetected: records.length,
          monthRanges,
          syncRanges,
          skippedMonthRanges,
          monthDiagnostics,
          duplicatedRecordsRemoved: monthRecords.length - records.length,
          totalHours: Number(records.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
        };

        if (syncRunId) {
          try {
            const persistence = await persistSupportCostRecords(
              supabase,
              syncRunId,
              records,
              hubCatalog.clients,
              hubCatalog.projectTargets,
            );
            if (!hasRequestedClientFilter) {
              await markMonthlyLoadsFinished(
                supabase,
                syncRanges,
                records,
                "imported",
                syncRunId,
                persistence.inconsistencies,
              );
            }
            await supabase
              .from("support_cost_sync_runs")
              .update({
                status: "success",
                records_detected: records.length,
                tickets_stored: persistence.stored,
                inconsistency_count: persistence.inconsistencies,
                diagnostics,
                ended_at: new Date().toISOString(),
              })
              .eq("id", syncRunId);
          } catch (error) {
            await supabase
              .from("support_cost_sync_runs")
              .update({
                status: "error",
                records_detected: records.length,
                diagnostics,
                error_message: errorMessage(error),
                ended_at: new Date().toISOString(),
              })
              .eq("id", syncRunId);
            if (!hasRequestedClientFilter) {
              await markMonthlyLoadsFinished(supabase, syncRanges, records, "error", syncRunId, 0, errorMessage(error));
            }
            console.warn(`[support-costs-sync] Persistencia falhou: ${errorMessage(error)}`);
          }
        }
        console.log("[support-costs-sync:diagnostics]", JSON.stringify(diagnostics));
      } catch (error) {
        console.error("[support-costs-sync:background]", error);
        if (syncRunId) {
          await supabase
            .from("support_cost_sync_runs")
            .update({
              status: "error",
              error_message: errorMessage(error),
              ended_at: new Date().toISOString(),
            })
            .eq("id", syncRunId);
        }
        if (!hasRequestedClientFilter) {
          await markMonthlyLoadsFinished(supabase, syncRanges, [], "error", syncRunId, 0, errorMessage(error));
        }
      }
    };

    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      EdgeRuntime.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }

    return new Response(
      JSON.stringify({
        success: true,
        accepted: true,
        functionVersion: FUNCTION_VERSION,
        syncRunId,
        message: "Sincronizacao iniciada em segundo plano. Acompanhe o status via support_cost_sync_runs.",
      }),
      {
        status: 202,
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[support-costs-sync]", error);
    return new Response(
      JSON.stringify({
        success: false,
        functionVersion: FUNCTION_VERSION,
        error: errorMessage(error),
        errorDetails: serializeError(error),
      }),
      {
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  }
});
