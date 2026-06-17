import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_TAG_PRODUTO  = "1212620863263948";
const FIELD_TIPO         = "1211693385884904";
const FIELD_STATUS       = "1144694301084828";
const SECAO_CONCLUIDO    = "1205557490010166";
const SECAO_EM_ANDAMENTO = "1205557490010164";
const SECAO_PLANEJADO    = "1208732335475545";
const SECAO_BACKLOG      = "1205557490010162";

function getCustomFieldValue(task: Record<string, unknown>, gid: string): string | null {
  const fields = task.custom_fields as Array<Record<string, unknown>>;
  if (!fields) return null;
  const field = fields.find((f) => f.gid === gid);
  if (!field) return null;
  if (field.enum_value) return (field.enum_value as Record<string, unknown>).name as string;
  if (Array.isArray(field.multi_enum_values) && (field.multi_enum_values as unknown[]).length > 0) {
    return ((field.multi_enum_values as Array<Record<string, unknown>>)[0]).name as string;
  }
  return null;
}

async function fetchAsanaTasks(token: string, section: string, optFields: string): Promise<Array<Record<string, unknown>>> {
  const tasks: Array<Record<string, unknown>> = [];
  let url = `https://app.asana.com/api/1.0/tasks?section=${section}&opt_fields=${optFields}&limit=100`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const json = await res.json() as Record<string, unknown>;
    tasks.push(...(json.data as Array<Record<string, unknown>>));
    const next = json.next_page as Record<string, unknown> | null;
    url = next ? (next.uri as string) : "";
  }
  return tasks;
}

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data, error } = await supabase
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", name)
    .schema("vault")
    .single();
  if (error || !data) throw new Error(`Secret '${name}' não encontrado no Vault`);
  return data.decrypted_secret as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reportId, asanaProjectId, month, year } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const asanaToken = await getVaultSecret(supabase, "ASANA_TOKEN");

    const optFields = "name,completed,completed_at,due_on,assignee.name,custom_fields,permalink_url";

    const periodoInicio = new Date(year, month - 1, 1).toISOString();
    const periodoFim    = new Date(year, month, 0, 23, 59, 59).toISOString();

    // Tarefas concluídas no período
    const concluidas = await fetchAsanaTasks(asanaToken, SECAO_CONCLUIDO, optFields);
    const entregasPeriodo = concluidas.filter((t) => {
      const d = new Date(t.completed_at as string);
      return d >= new Date(periodoInicio) && d <= new Date(periodoFim);
    });

    const tarefasEntregas = entregasPeriodo.map((t) => ({
      gid:          t.gid as string,
      nome:         (t.name as string).trim(),
      status:       "Concluído",
      categoria:    getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee:     (t.assignee as Record<string, unknown> | null)?.name as string ?? "",
      link:         t.permalink_url as string ?? "",
      completed_at: t.completed_at as string,
    }));

    // Tarefas priorizadas
    const emAndamento = await fetchAsanaTasks(asanaToken, SECAO_EM_ANDAMENTO, optFields);
    const planejadas  = await fetchAsanaTasks(asanaToken, SECAO_PLANEJADO, optFields);
    const backlog     = await fetchAsanaTasks(asanaToken, SECAO_BACKLOG, optFields);

    const tarefasPriorizadas = [...emAndamento, ...planejadas].map((t) => ({
      gid:       t.gid as string,
      nome:      (t.name as string).trim(),
      status:    getCustomFieldValue(t, FIELD_STATUS) ?? "Em Andamento",
      categoria: getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee:  (t.assignee as Record<string, unknown> | null)?.name as string ?? "",
      link:      t.permalink_url as string ?? "",
    }));

    // Métricas evolução e inovação
    const contagemPorTag: Record<string, number> = {
      "Novas Funcionalidades": 0, "Integrações": 0, "Evolução": 0, "Outros": 0,
    };
    for (const t of entregasPeriodo) {
      const tag = getCustomFieldValue(t, FIELD_TAG_PRODUTO);
      if (tag && contagemPorTag[tag] !== undefined) contagemPorTag[tag]++;
      else contagemPorTag["Outros"]++;
    }

    const totalEntregas = tarefasEntregas.length;
    const totalInovacao = contagemPorTag["Novas Funcionalidades"] + contagemPorTag["Integrações"] + contagemPorTag["Evolução"];
    const percentualInovacao = totalEntregas > 0 ? Math.round((totalInovacao / totalEntregas) * 100) : 0;

    // Métricas eficiência e previsibilidade
    const diasNoPeriodo = new Date(year, month, 0).getDate();
    const frequenciaDeploy = totalEntregas > 0 ? Math.round((diasNoPeriodo / totalEntregas) * 10) / 10 : 0;
    const leadTimes = entregasPeriodo
      .filter((t) => t.due_on && t.completed_at)
      .map((t) => Math.abs(Math.round((new Date(t.completed_at as string).getTime() - new Date(t.due_on as string).getTime()) / 86400000)));
    const leadTimeMedia = leadTimes.length > 0 ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : 0;

    // Salvar seções
    const now = new Date().toISOString();
    const secoes = [
      {
        report_id: reportId, section_key: "entregas",
        content: { tarefas: tarefasEntregas, total: totalEntregas },
        source: "asana", synced_at: now,
      },
      {
        report_id: reportId, section_key: "priorizadas",
        content: { tarefas: tarefasPriorizadas, total: tarefasPriorizadas.length, total_backlog: backlog.length },
        source: "asana", synced_at: now,
      },
      {
        report_id: reportId, section_key: "evolucao_inovacao",
        content: {
          contagem_por_tag: contagemPorTag, total_entregas: totalEntregas,
          percentual_inovacao: percentualInovacao,
          status: percentualInovacao >= 60 ? "alta" : percentualInovacao >= 40 ? "adequado" : percentualInovacao >= 20 ? "atencao" : "critico",
        },
        source: "asana", synced_at: now,
      },
      {
        report_id: reportId, section_key: "eficiencia_previsibilidade",
        content: { frequencia_deploy: frequenciaDeploy, lead_time: leadTimeMedia, demandas: totalEntregas, status: "adequado" },
        source: "asana", synced_at: now,
      },
    ];

    for (const secao of secoes) {
      await supabase.from("report_sections").upsert(secao, { onConflict: "report_id,section_key" });
    }

    await supabase.from("report_sync_logs").insert({
      report_id: reportId, source: "asana", status: "success",
      records_fetched: totalEntregas + tarefasPriorizadas.length,
    });

    return new Response(JSON.stringify({
      success: true, entregas: totalEntregas,
      priorizadas: tarefasPriorizadas.length, backlog: backlog.length, inovacao: percentualInovacao,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
