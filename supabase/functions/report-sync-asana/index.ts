import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GIDs dos campos personalizados do Asana SMC
const FIELD_TAG_PRODUTO     = "1212620863263948";
const FIELD_TIPO            = "1211693385884904";
const FIELD_STATUS          = "1144694301084828";
const FIELD_CATEGORIA       = "1213013617061730";

// Seções do board
const SECAO_CONCLUIDO       = "1205557490010166";
const SECAO_EM_ANDAMENTO    = "1205557490010164";
const SECAO_PLANEJADO       = "1208732335475545";
const SECAO_BACKLOG         = "1205557490010162";

function getCustomFieldValue(task: Record<string, unknown>, gid: string): string | null {
  const fields = task.custom_fields as Array<Record<string, unknown>>;
  if (!fields) return null;
  const field = fields.find((f) => f.gid === gid);
  if (!field) return null;
  // enum field
  if (field.enum_value) return (field.enum_value as Record<string, unknown>).name as string;
  // multi_enum field
  if (Array.isArray(field.multi_enum_values) && (field.multi_enum_values as unknown[]).length > 0) {
    return ((field.multi_enum_values as Array<Record<string, unknown>>)[0]).name as string;
  }
  return null;
}

async function fetchAsanaTasks(
  asanaToken: string,
  section: string,
  optFields: string
): Promise<Array<Record<string, unknown>>> {
  const tasks: Array<Record<string, unknown>> = [];
  let url = `https://app.asana.com/api/1.0/tasks?section=${section}&opt_fields=${optFields}&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${asanaToken}` },
    });
    if (!res.ok) break;
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    tasks.push(...data);
    const next = json.next_page as Record<string, unknown> | null;
    url = next ? (next.uri as string) : "";
  }
  return tasks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reportId, asanaProjectId, month, year } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Token do Asana via secret do Supabase
    const asanaToken = Deno.env.get("ASANA_TOKEN")!;

    const optFields = "name,completed,completed_at,due_on,assignee.name,custom_fields,permalink_url";

    // Período de filtro
    const periodoInicio = new Date(year, month - 1, 1).toISOString();
    const periodoFim    = new Date(year, month, 0, 23, 59, 59).toISOString();

    // ── 1. Tarefas CONCLUÍDAS no período ─────────────────────────────────────
    const concluidas = await fetchAsanaTasks(asanaToken, SECAO_CONCLUIDO, optFields);
    const entregasPeriodo = concluidas.filter((t) => {
      const completedAt = t.completed_at as string | null;
      if (!completedAt) return false;
      const d = new Date(completedAt);
      return d >= new Date(periodoInicio) && d <= new Date(periodoFim);
    });

    const tarefasEntregas = entregasPeriodo.map((t) => ({
      gid:        t.gid as string,
      nome:       (t.name as string).trim(),
      status:     "Concluído",
      categoria:  getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee:   (t.assignee as Record<string, unknown> | null)?.name as string ?? "",
      link:       t.permalink_url as string ?? "",
      completed_at: t.completed_at as string,
    }));

    // ── 2. Tarefas PRIORIZADAS (Em Andamento + Planejado) ─────────────────────
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

    // ── 3. Métricas de Evolução e Inovação ───────────────────────────────────
    const contagemPorTag: Record<string, number> = {
      "Novas Funcionalidades": 0,
      "Integrações": 0,
      "Evolução": 0,
      "Outros": 0,
    };
    for (const t of tarefasEntregas) {
      const tag = getCustomFieldValue(
        entregasPeriodo.find((e) => e.gid === t.gid)!,
        FIELD_TAG_PRODUTO
      );
      if (tag && contagemPorTag[tag] !== undefined) {
        contagemPorTag[tag]++;
      } else {
        contagemPorTag["Outros"]++;
      }
    }

    const totalEntregas = tarefasEntregas.length;
    const totalInovacao = contagemPorTag["Novas Funcionalidades"] + contagemPorTag["Integrações"] + contagemPorTag["Evolução"];
    const percentualInovacao = totalEntregas > 0
      ? Math.round((totalInovacao / totalEntregas) * 100)
      : 0;

    // ── 4. Métricas de Eficiência e Previsibilidade ───────────────────────────
    // Frequência de deploy = dias no período / qtd deploys (tarefas concluídas)
    const diasNoPeriodo = new Date(year, month, 0).getDate();
    const frequenciaDeploy = totalEntregas > 0
      ? Math.round((diasNoPeriodo / totalEntregas) * 10) / 10
      : 0;

    // Lead time médio (dias entre criação e conclusão) - aproximado pelo due_on
    const leadTimes = entregasPeriodo
      .filter((t) => t.due_on && t.completed_at)
      .map((t) => {
        const due  = new Date(t.due_on as string);
        const done = new Date(t.completed_at as string);
        return Math.abs(Math.round((done.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      });
    const leadTimeMedia = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
      : 0;

    // ── 5. Salvar seções no banco ─────────────────────────────────────────────
    const now = new Date().toISOString();

    const secoes = [
      {
        report_id:   reportId,
        section_key: "entregas",
        content: {
          tarefas: tarefasEntregas,
          total:   totalEntregas,
        },
        source:    "asana",
        synced_at: now,
      },
      {
        report_id:   reportId,
        section_key: "priorizadas",
        content: {
          tarefas:        tarefasPriorizadas,
          total:          tarefasPriorizadas.length,
          total_backlog:  backlog.length,
        },
        source:    "asana",
        synced_at: now,
      },
      {
        report_id:   reportId,
        section_key: "evolucao_inovacao",
        content: {
          contagem_por_tag:    contagemPorTag,
          total_entregas:      totalEntregas,
          percentual_inovacao: percentualInovacao,
          status: percentualInovacao >= 60 ? "alta" :
                  percentualInovacao >= 40 ? "adequado" :
                  percentualInovacao >= 20 ? "atencao" : "critico",
        },
        source:    "asana",
        synced_at: now,
      },
      {
        report_id:   reportId,
        section_key: "eficiencia_previsibilidade",
        content: {
          frequencia_deploy: frequenciaDeploy,
          lead_time:         leadTimeMedia,
          demandas:          totalEntregas,
          status:            "adequado",
        },
        source:    "asana",
        synced_at: now,
      },
    ];

    for (const secao of secoes) {
      await supabase
        .from("report_sections")
        .upsert(secao, { onConflict: "report_id,section_key" });
    }

    // Log de sync
    await supabase.from("report_sync_logs").insert({
      report_id:       reportId,
      source:          "asana",
      status:          "success",
      records_fetched: totalEntregas + tarefasPriorizadas.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        entregas:    totalEntregas,
        priorizadas: tarefasPriorizadas.length,
        backlog:     backlog.length,
        inovacao:    percentualInovacao,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
