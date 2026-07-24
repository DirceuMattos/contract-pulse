import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";
const MILVUS_URL = "https://apiintegracao.milvus.com.br/api/chamado/listagem";
const FUNCTION_VERSION = "support-costs-sync-2026-07-23-reconciliation-v11";
const MILVUS_PAGE_SIZE = 50;
const MILVUS_MAX_SLICES = 160;
const MILVUS_SLICE_FIELDS = ["tecnico", "prioridade", "categoria_primaria", "categoria_secundaria"] as const;

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

type MatchResult<T> = {
  item: T | null;
  status: "matched" | "pending" | "ambiguous";
  confidence: number;
  method: string;
};

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
        clientInfo: { name: "bnphub-support-costs", version: "1.0.0" },
      },
    }),
  });

  const sessionId = initRes.headers.get("mcp-session-id") ?? initRes.headers.get("x-session-id") ?? "";
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
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

  const json = await toolRes.json() as Record<string, unknown>;
  return json.result;
}

function getRowsFromMilvusPayload(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["lista", "data", "rows", "items", "records", "tickets"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
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

  const sourceWords = new Set(normalizeName(source).split(/\s+/).filter((word) => word.length >= 3));
  const targetWords = new Set(normalizeName(target).split(/\s+/).filter((word) => word.length >= 3));
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

function bestHubContractMatch(projectName: string, contracts: HubContract[], preferredClientId?: string | null): MatchResult<HubContract> {
  const scored = contracts
    .map((contract) => {
      const nameScore = scoreNameMatch(projectName, contract.nome ?? "");
      const codeScore = scoreNameMatch(projectName, contract.codigo ?? "");
      const clientBoost = preferredClientId && contract.client_id === preferredClientId ? 0.08 : 0;
      return {
        item: contract,
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
    const words = clean.split(/[\s\-_/.,]+/).map((word) => word.trim()).filter((word) => word.length >= 3);
    const acronym = words
      .filter((word) => /^[A-Z0-9]+$/.test(word) || word.length <= 5)
      .slice(0, 3)
      .join(" ");
    terms.push(clean, words.slice(0, 2).join(" "), words[0], acronym, compactToken(clean));
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
      "Authorization": token,
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

function getSliceValues(rows: Record<string, unknown>[], field: typeof MILVUS_SLICE_FIELDS[number]): string[] {
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
  return JSON.stringify(Object.keys(filter).sort().map((key) => [key, filter[key]]));
}

async function callDirectMilvusAttendanceReport(token: string, range: MonthRange, clientName?: string, clientNames: string[] = []): Promise<{ lista: Record<string, unknown>[]; extractionDiagnostics: Record<string, unknown> }> {
  const filtroBody: Record<string, unknown> = {
    status: "Todos",
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
    const isComplete = rows.length < MILVUS_PAGE_SIZE
      || (metaTotal !== null && metaTotal <= MILVUS_PAGE_SIZE)
      || Boolean(oldestDate && oldestDate < range.from);

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

async function callAttendanceReport(devidToken: string, milvusToken: string | null, range: MonthRange, clientName?: string, clientNames: string[] = []): Promise<AttendanceReportResult> {
  if (milvusToken) {
    try {
      return {
        source: "milvus-direct",
        rawResult: await callDirectMilvusAttendanceReport(milvusToken, range, clientName, clientNames),
      };
    } catch (error) {
      console.warn(`[support-costs-sync] Milvus direto falhou em ${range.label}; usando MCP: ${error instanceof Error ? error.message : String(error)}`);
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

  const minutes = firstNumber(record, ["minutos", "minutes", "total_minutos", "duration_minutes", "tempo_minutos", "total_minutes"]);
  if (minutes > 0) return minutes / 60;

  const seconds = firstNumber(record, ["segundos", "seconds", "total_segundos", "duration_seconds", "tempo_segundos", "total_seconds"]);
  if (seconds > 0) return seconds / 3600;

  return detectNestedHours(record);
}

function arrayFromNestedValue(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  }
  if (typeof value === "string") {
    const parsed = tryParseJsonText(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
    }
  }
  return [];
}

function expandRowsWithNestedServices(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const expanded: Record<string, unknown>[] = [];

  for (const row of rows) {
    let pushedNested = false;
    for (const key of ["servico_realizado", "servicos_realizados", "atendimentos", "apontamentos", "horas", "lancamentos"]) {
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
    const jsonStart = Math.min(
      ...["[", "{"]
        .map((char) => trimmed.indexOf(char))
        .filter((index) => index >= 0),
    );
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
      for (const key of ["content", "data", "rows", "items", "lista", "result", "records", "relatorio", "report", "tickets", "atendimentos", "horas"]) {
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
      nested: depth < 2
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
  const clientName = firstString(record, ["cliente", "client", "clientName", "nome_cliente", "nome_fantasia", "razaoSocial", "razao_social", "customer", "empresa"]);
  const projectName = firstString(record, ["projeto", "project", "projectName", "nome_projeto", "contrato", "contract", "servico", "service", "cliente_projeto", "setor"], clientName);
  const analystName = firstString(record, ["responsavel", "analista", "atendente", "tecnico", "colaborador", "user", "usuario", "operador", "consultor", "nome", "sobrenome"]);
  const hours = detectHours(record);
  const date = firstString(record, [
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
  ], "");

  return {
    id: firstString(record, ["id", "ticket", "ticket_id", "chamado", "codigo", "numero", "protocolo"], `milvus-${index}`),
    clientName,
    projectName,
    analystName,
    hours,
    date: date || undefined,
    raw: record,
  };
}

async function loadHubCatalog(supabase: ReturnType<typeof createClient>): Promise<{ clients: HubClient[]; contracts: HubContract[] }> {
  const [{ data: clients }, { data: contracts }] = await Promise.all([
    supabase.from("clients").select("id, razao_social, nome_fantasia, cnpj"),
    supabase.from("contracts").select("id, nome, codigo, client_id"),
  ]);

  return {
    clients: (clients ?? []) as HubClient[],
    contracts: (contracts ?? []) as HubContract[],
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

  return Array.from(new Set((data ?? [])
    .map((row) => String((row as Record<string, unknown>).milvus_client_name ?? "").trim())
    .filter(Boolean)));
}

async function persistSupportCostRecords(
  supabase: ReturnType<typeof createClient>,
  syncRunId: string,
  records: AttendanceRecord[],
  hubClients: HubClient[],
  hubContracts: HubContract[],
): Promise<{ stored: number; inconsistencies: number }> {
  let stored = 0;
  let inconsistencies = 0;
  const clientIdByKey = new Map<string, { id: string; match: MatchResult<HubClient> }>();
  const projectIdByKey = new Map<string, { id: string; match: MatchResult<HubContract>; clientId?: string | null }>();

  for (const record of records) {
    const clientKey = compactName(record.clientName || "Nao informado") || compactToken(record.clientName || "nao-informado");
    let clientEntry = clientIdByKey.get(clientKey);

    if (!clientEntry) {
      const match = bestHubClientMatch(record.clientName, hubClients);
      const { data: clientRow, error: clientError } = await supabase
        .from("support_milvus_clients")
        .upsert({
          milvus_client_name: record.clientName || "Nao informado",
          milvus_client_key: clientKey,
          raw: { sample: record.raw ?? {} },
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "milvus_client_key" })
        .select("id")
        .single();
      if (clientError) throw clientError;

      await supabase
        .from("support_milvus_client_mappings")
        .upsert({
          milvus_client_id: clientRow.id,
          hub_client_id: match.item?.id ?? null,
          status: match.status,
          match_method: match.method,
          confidence: match.confidence,
          notes: match.status === "matched" ? null : "Revisar relacao Cliente Milvus x Cliente Hub.",
          updated_at: new Date().toISOString(),
        }, { onConflict: "milvus_client_id" });

      clientEntry = { id: clientRow.id, match };
      clientIdByKey.set(clientKey, clientEntry);
    }

    const projectKey = `${clientKey}:${compactName(record.projectName || record.clientName || "Nao informado")}`;
    let projectEntry = projectIdByKey.get(projectKey);

    if (!projectEntry) {
      const preferredClientId = clientEntry.match.item?.id ?? null;
      const projectMatch = bestHubContractMatch(record.projectName || record.clientName, hubContracts, preferredClientId);
      const { data: projectRow, error: projectError } = await supabase
        .from("support_milvus_projects")
        .upsert({
          milvus_client_id: clientEntry.id,
          milvus_project_name: record.projectName || record.clientName || "Nao informado",
          milvus_project_key: compactName(record.projectName || record.clientName || "nao-informado"),
          raw: { sample: record.raw ?? {} },
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "milvus_client_id,milvus_project_key" })
        .select("id")
        .single();
      if (projectError) throw projectError;

      await supabase
        .from("support_milvus_project_mappings")
        .upsert({
          milvus_project_id: projectRow.id,
          hub_contract_id: projectMatch.item?.id ?? null,
          status: projectMatch.status,
          match_method: projectMatch.method,
          confidence: projectMatch.confidence,
          notes: projectMatch.status === "matched" ? null : "Revisar relacao Projeto Milvus x Contrato Hub.",
          updated_at: new Date().toISOString(),
        }, { onConflict: "milvus_project_id" });

      projectEntry = {
        id: projectRow.id,
        match: projectMatch,
        clientId: projectMatch.item?.client_id ?? preferredClientId,
      };
      projectIdByKey.set(projectKey, projectEntry);
    }

    const parsedDate = parseDateOnly(record.date);
    const hubClientId = projectEntry.clientId ?? clientEntry.match.item?.id ?? null;
    const hubContractId = projectEntry.match.item?.id ?? null;
    const { error: ticketError } = await supabase
      .from("support_cost_tickets")
      .upsert({
        sync_run_id: syncRunId,
        milvus_ticket_code: record.id,
        milvus_ticket_id: String(record.raw?.id ?? record.raw?.ticket_id ?? record.id),
        milvus_client_id: clientEntry.id,
        milvus_project_id: projectEntry.id,
        hub_client_id: hubClientId,
        hub_contract_id: hubContractId,
        client_name: record.clientName || "Nao informado",
        project_name: record.projectName || "Nao informado",
        analyst_name: record.analystName || "Nao informado",
        ticket_date: parsedDate,
        hours: record.hours,
        subject: firstString(record.raw ?? {}, ["assunto", "subject", "titulo", "title"], ""),
        status: firstString(record.raw ?? {}, ["status", "situacao"], ""),
        raw: record.raw ?? {},
        updated_at: new Date().toISOString(),
      }, { onConflict: "milvus_ticket_code" });
    if (ticketError) throw ticketError;
    stored += 1;

    const reasons: Array<{ code: string; detail: string }> = [];
    if (clientEntry.match.status !== "matched") {
      reasons.push({ code: `client_${clientEntry.match.status}`, detail: `Cliente Milvus sem match confiavel: ${record.clientName}` });
    }
    if (projectEntry.match.status !== "matched") {
      reasons.push({ code: `project_${projectEntry.match.status}`, detail: `Projeto/contrato Milvus sem match confiavel: ${record.projectName}` });
    }

    for (const reason of reasons) {
      const { error: inconsistencyError } = await supabase
        .from("support_cost_inconsistencies")
        .insert({
          sync_run_id: syncRunId,
          reason_code: reason.code,
          reason_detail: reason.detail,
          milvus_client_id: clientEntry.id,
          milvus_project_id: projectEntry.id,
          milvus_ticket_code: record.id,
          payload: record.raw ?? {},
        });
      if (!inconsistencyError) inconsistencies += 1;
    }
  }

  return { stored, inconsistencies };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { dateFrom, dateTo, clientName, clientNames = [] } = await req.json() as SyncRequest;
    if (!dateFrom || !dateTo) throw new Error("Periodo obrigatorio");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const hubCatalog = await loadHubCatalog(supabase);
    const explicitClientNames = clientNames.filter((name) => Boolean(name?.trim()));
    const knownMilvusClientNames = (!clientName?.trim() && explicitClientNames.length === 0)
      ? await loadKnownMilvusClientNames(supabase)
      : [];
    const effectiveClientNames = explicitClientNames.length > 0 ? explicitClientNames : knownMilvusClientNames;
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
      console.warn(`[support-costs-sync] Nao foi possivel registrar execucao: ${error instanceof Error ? error.message : String(error)}`);
    }

    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");
    let milvusToken: string | null = null;
    try {
      milvusToken = await getVaultSecret(supabase, "MILVUS_TOKEN");
    } catch (error) {
      console.warn(`[support-costs-sync] MILVUS_TOKEN indisponivel; usando MCP: ${error instanceof Error ? error.message : String(error)}`);
    }

    const monthRanges = buildMonthRanges(dateFrom, dateTo);
    if (monthRanges.length === 0) throw new Error("Periodo invalido");
    const syncRanges: MonthRange[] = [{ label: `${dateFrom}_${dateTo}`, from: dateFrom, to: dateTo }];

    const rows: Record<string, unknown>[] = [];
    const normalized: AttendanceRecord[] = [];
    const monthRecords: AttendanceRecord[] = [];
    const monthDiagnostics: Array<Record<string, unknown>> = [];

    const cleanDevidToken = devidToken.replace(/^Bearer\s+/i, "");

    const monthResults = await Promise.all(syncRanges.map(async (range) => {
      const { source, rawResult } = await callAttendanceReport(cleanDevidToken, milvusToken, range, clientName, effectiveClientNames);
      const monthRows = expandRowsWithNestedServices(unwrapRows(rawResult));
      const monthNormalized = monthRows.map((row, index) => normalizeRecord(row, `${range.label}-${index}`));
      const monthRecordsWithHours = monthNormalized.filter((record) => record.hours > 0);
      const monthKeptRecords = monthRecordsWithHours.filter((record) => shouldKeepRecordForRequestedPeriod(record, range.from, range.to));
      const rawObject = rawResult && typeof rawResult === "object" && !Array.isArray(rawResult) ? rawResult as Record<string, unknown> : {};
      return { range, source, rawObject, monthRows, monthNormalized, monthRecordsWithHours, monthKeptRecords };
    }));

    for (const { range, source, rawObject, monthRows, monthNormalized, monthRecordsWithHours, monthKeptRecords } of monthResults) {
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
        recordsOutsidePeriod: monthRecordsWithHours.filter((record) => parseDateOnly(record.date) && !isRecordInPeriod(record, range.from, range.to)).length,
        recordsDetected: monthKeptRecords.length,
        totalHours: Number(monthKeptRecords.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
      });
    }


    const recordsWithHours = normalized.filter((record) => record.hours > 0);
    const recordsWithoutRecognizedDate = recordsWithHours.filter((record) => !parseDateOnly(record.date)).length;
    const recordsOutsidePeriod = recordsWithHours.filter((record) => parseDateOnly(record.date) && !isRecordInPeriod(record, dateFrom, dateTo)).length;
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
        return leftDate.localeCompare(rightDate)
          || left.clientName.localeCompare(right.clientName)
          || left.projectName.localeCompare(right.projectName);
      });

    const diagnostics = {
      functionVersion: FUNCTION_VERSION,
      request: {
        dateFrom,
        dateTo,
        clientName: clientName || null,
        clientAliasesCount: effectiveClientNames.length,
        knownMilvusClientsUsed: knownMilvusClientNames.length,
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
      monthDiagnostics,
      duplicatedRecordsRemoved: monthRecords.length - records.length,
      totalHours: Number(records.reduce((sum, record) => sum + record.hours, 0).toFixed(4)),
    };

    let persistence = { stored: 0, inconsistencies: 0 };
    if (syncRunId) {
      try {
        persistence = await persistSupportCostRecords(supabase, syncRunId, records, hubCatalog.clients, hubCatalog.contracts);
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
            error_message: error instanceof Error ? error.message : String(error),
            ended_at: new Date().toISOString(),
          })
          .eq("id", syncRunId);
        console.warn(`[support-costs-sync] Persistencia de conciliacao falhou: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log("[support-costs-sync:diagnostics]", JSON.stringify(diagnostics));

    return new Response(JSON.stringify({
      success: true,
      functionVersion: FUNCTION_VERSION,
      count: records.length,
      records,
      syncRunId,
      reconciliation: persistence,
      rawShape: {
        type: "monthly",
        months: monthRanges.length,
        rowsDetected: rows.length,
        recordsDetected: records.length,
      },
      diagnostics: records.length === 0 ? diagnostics : undefined,
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[support-costs-sync]", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
