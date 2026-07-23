import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";
const MILVUS_URL = "https://apiintegracao.milvus.com.br/api/chamado/listagem";
const FUNCTION_VERSION = "support-costs-sync-2026-07-23-direct-milvus-v7";

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
};

type SyncRequest = {
  dateFrom: string;
  dateTo: string;
  clientName?: string;
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

async function callDirectMilvusAttendanceReport(token: string, range: MonthRange, clientName?: string): Promise<unknown> {
  const filtroBody: Record<string, unknown> = {
    data_hora_criacao_inicial: `${range.from} 00:00:00`,
    data_hora_criacao_final: `${range.to} 23:59:59`,
    status: "Todos",
  };
  if (clientName?.trim()) filtroBody.cliente = clientName.trim();

  const milvusRes = await fetch(MILVUS_URL, {
    method: "POST",
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      total_registros: 10000,
      filtro_body: filtroBody,
    }),
  });

  if (!milvusRes.ok) {
    const body = await milvusRes.text();
    throw new Error(`Milvus direto retornou ${milvusRes.status}: ${body}`);
  }

  return await milvusRes.json();
}

async function callAttendanceReport(devidToken: string, milvusToken: string | null, range: MonthRange, clientName?: string): Promise<AttendanceReportResult> {
  if (milvusToken) {
    try {
      return {
        source: "milvus-direct",
        rawResult: await callDirectMilvusAttendanceReport(milvusToken, range, clientName),
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
  if (!date) return true;
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

  return 0;
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
  return detectHours(record) > 0 || [
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
      horas_ticket: row.horas_ticket,
      horas_operador: row.horas_operador,
      horas_internas: row.horas_internas,
      horas_externas: row.horas_externas,
      minutos: row.minutos,
      minutes: row.minutes,
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

function normalizeRecord(record: Record<string, unknown>, index: number): AttendanceRecord {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { dateFrom, dateTo, clientName } = await req.json() as SyncRequest;
    if (!dateFrom || !dateTo) throw new Error("Periodo obrigatorio");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");
    let milvusToken: string | null = null;
    try {
      milvusToken = await getVaultSecret(supabase, "MILVUS_TOKEN");
    } catch (error) {
      console.warn(`[support-costs-sync] MILVUS_TOKEN indisponivel; usando MCP: ${error instanceof Error ? error.message : String(error)}`);
    }

    const monthRanges = buildMonthRanges(dateFrom, dateTo);
    if (monthRanges.length === 0) throw new Error("Periodo invalido");

    const rows: Record<string, unknown>[] = [];
    const normalized: AttendanceRecord[] = [];
    const monthRecords: AttendanceRecord[] = [];
    const monthDiagnostics: Array<Record<string, unknown>> = [];

    const cleanDevidToken = devidToken.replace(/^Bearer\s+/i, "");

    const monthResults = await Promise.all(monthRanges.map(async (range) => {
      const { source, rawResult } = await callAttendanceReport(cleanDevidToken, milvusToken, range, clientName);
      const monthRows = unwrapRows(rawResult);
      const monthNormalized = monthRows.map((row, index) => normalizeRecord(row, `${range.label}-${index}`));
      const monthRecordsWithHours = monthNormalized.filter((record) => record.hours > 0);
      const monthKeptRecords = monthRecordsWithHours.filter((record) => shouldKeepRecordForRequestedPeriod(record, range.from, range.to));
      return { range, source, monthRows, monthNormalized, monthRecordsWithHours, monthKeptRecords };
    }));

    for (const { range, source, monthRows, monthNormalized, monthRecordsWithHours, monthKeptRecords } of monthResults) {
      rows.push(...monthRows);
      normalized.push(...monthNormalized);
      monthRecords.push(...monthKeptRecords);
      monthDiagnostics.push({
        month: range.label,
        source,
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
        hasClientFilter: Boolean(clientName?.trim()),
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
    console.log("[support-costs-sync:diagnostics]", JSON.stringify(diagnostics));

    return new Response(JSON.stringify({
      success: true,
      functionVersion: FUNCTION_VERSION,
      count: records.length,
      records,
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
