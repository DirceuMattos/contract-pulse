import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVID_URL = "https://ca-devid-app.azurewebsites.net/mcp";

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
  const directHours = firstNumber(record, ["horas", "hours", "total_horas", "quantidade_horas", "tempo_horas", "duration_hours"]);
  if (directHours > 0) return directHours;

  const minutes = firstNumber(record, ["minutos", "minutes", "total_minutos", "duration_minutes"]);
  if (minutes > 0) return minutes / 60;

  const seconds = firstNumber(record, ["segundos", "seconds", "total_segundos", "duration_seconds"]);
  if (seconds > 0) return seconds / 3600;

  return 0;
}

function unwrapRows(result: unknown): Record<string, unknown>[] {
  const queue: unknown[] = [result];
  const candidates: Record<string, unknown>[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      if (current.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
        candidates.push(...current as Record<string, unknown>[]);
      } else {
        queue.push(...current);
      }
      continue;
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>;
      for (const key of ["content", "data", "rows", "items", "lista", "result", "records", "relatorio", "report"]) {
        if (obj[key] !== undefined) queue.push(obj[key]);
      }
      if (typeof obj.type === "string" && obj.type === "text" && typeof obj.text === "string") {
        try {
          queue.push(JSON.parse(obj.text));
        } catch {
          continue;
        }
      }
    }
  }

  return candidates;
}

function normalizeRecord(record: Record<string, unknown>, index: number): AttendanceRecord {
  const clientName = firstString(record, ["cliente", "client", "clientName", "nome_cliente", "razaoSocial", "customer"]);
  const projectName = firstString(record, ["projeto", "project", "projectName", "contrato", "contract", "servico", "service"], clientName);
  const analystName = firstString(record, ["responsavel", "analista", "atendente", "tecnico", "colaborador", "user", "usuario"]);
  const hours = detectHours(record);
  const date = firstString(record, ["data", "date", "dia", "created_at", "data_atendimento"], "");

  return {
    id: firstString(record, ["id", "ticket", "ticket_id", "chamado", "codigo"], `milvus-${index}`),
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
    const seen = new Set<string>();
    const records = rows
      .map(normalizeRecord)
      .filter((record) => record.hours > 0)
      .filter((record) => {
        const key = `${record.id}|${record.clientName}|${record.projectName}|${record.analystName}|${record.hours}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return new Response(JSON.stringify({
      success: true,
      count: records.length,
      records,
      rawShape: {
        type: Array.isArray(rawResult) ? "array" : typeof rawResult,
        rowsDetected: rows.length,
      },
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
