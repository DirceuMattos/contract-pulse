import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";
const FUNCTION_VERSION = "support-costs-sync-2026-07-23-diagnostics-v2";

type AttendanceRecord = {
  id: string;
  clientName: string;
  projectName: string;
  analystName: string;
  hours: number;
  date?: string;
  raw: Record<string, unknown>;
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
      const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function detectHours(record: Record<string, unknown>): number {
  const directHours = firstNumber(record, [
    "horas",
    "hours",
    "total_horas",
    "quantidade_horas",
    "tempo_horas",
    "duration_hours",
    "horas_atendimento",
    "horas_trabalhadas",
    "tempo_total_horas",
    "total_hours",
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
  const rowsWithoutHours = normalized.filter((record) => record.hours <= 0).length;

  return {
    rowsDetected: rows.length,
    rowsWithoutHours,
    sampleKeys: sampleRows.map((row) => Object.keys(row).slice(0, 30)),
    sampleHourValues: sampleRows.map((row) => ({
      horas: row.horas,
      hours: row.hours,
      total_horas: row.total_horas,
      tempo_horas: row.tempo_horas,
      minutos: row.minutos,
      minutes: row.minutes,
    })),
  };
}

function normalizeRecord(record: Record<string, unknown>, index: number): AttendanceRecord {
  const clientName = firstString(record, ["cliente", "client", "clientName", "nome_cliente", "razaoSocial", "razao_social", "customer", "empresa"]);
  const projectName = firstString(record, ["projeto", "project", "projectName", "nome_projeto", "contrato", "contract", "servico", "service", "cliente_projeto"], clientName);
  const analystName = firstString(record, ["responsavel", "analista", "atendente", "tecnico", "colaborador", "user", "usuario", "operador", "consultor"]);
  const hours = detectHours(record);
  const date = firstString(record, ["data", "date", "dia", "created_at", "data_atendimento", "data_chamado", "data_fechamento"], "");

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
    const { dateFrom, dateTo, clientName, projectName } = await req.json();
    if (!dateFrom || !dateTo) throw new Error("Periodo obrigatorio");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const devidToken = await getVaultSecret(supabase, "DEVID_TOKEN");

    const rawResult = await callMcp(DEVID_URL, devidToken.replace(/^Bearer\s+/i, ""), "milvus_get_attendance_report", {
      date_from: dateFrom,
      date_to: dateTo,
      client: clientName || undefined,
      project: projectName || undefined,
    });

    const rows = unwrapRows(rawResult);
    const normalized = rows.map(normalizeRecord);
    const seen = new Set<string>();
    const records = normalized
      .filter((record) => record.hours > 0)
      .filter((record) => {
        const key = `${record.id}|${record.clientName}|${record.projectName}|${record.analystName}|${record.hours}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const diagnostics = {
      request: {
        dateFrom,
        dateTo,
        hasClientFilter: Boolean(clientName),
        hasProjectFilter: Boolean(projectName),
      },
      rawShape: describeShape(rawResult),
      ...diagnosticsForRows(rows, normalized),
      recordsDetected: records.length,
    };
    console.log("[support-costs-sync:diagnostics]", JSON.stringify(diagnostics));

    return new Response(JSON.stringify({
      success: true,
      functionVersion: FUNCTION_VERSION,
      count: records.length,
      records,
      rawShape: {
        type: Array.isArray(rawResult) ? "array" : typeof rawResult,
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
