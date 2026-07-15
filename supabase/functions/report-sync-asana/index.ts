import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_TAG_PRODUTO = "1212620863263948";
const FIELD_TIPO = "1211693385884904";
const FIELD_STATUS = "1144694301084828";

// ── merge-preserva-manual (espelho de src/lib/reportMergeManual.ts) ──
// Deno não importa de src/, então a lógica é replicada aqui. Manter em sincronia.
function deriveSyncKey(item: Record<string, unknown>): string {
  const gid = item.gid ?? item.id ?? item.task_id;
  if (gid != null && String(gid).trim() !== "") return `gid:${String(gid)}`;
  const nome = (item.tarefa ?? item.nome ?? "") as string;
  return `nome:${nome.trim().toLowerCase()}`;
}

// Mescla a lista coletada com o content atual, preservando itens manuais.
// Idempotente: re-sincronizar N vezes produz o mesmo resultado.
// - TODOS os itens manuais do content atual são preservados (nunca removidos).
// - Os itens de origem "sync" antigos são DESCARTADOS e substituídos pelos
//   recém-coletados (dedup por syncKey), para não acumular cópias a cada sync.
function mergeLinhas(
  currentContent: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  const cur = (currentContent?.linhas ?? currentContent?.tarefas ?? []) as any[];

  // 1. Preserva itens manuais, mantendo TODOS os campos (inclusive gid) e o syncKey imutável.
  const manualItems = cur
    .filter((it) => it?.origem === "manual")
    .map((it) => ({ ...it, origem: "manual", syncKey: it.syncKey ?? deriveSyncKey(it) }));

  // 2. Itens do sync: dedup por syncKey (a fonte pode, em teoria, repetir).
  const seenSync = new Set<string>();
  const syncItems: any[] = [];
  for (const it of incoming) {
    const k = deriveSyncKey(it);
    if (seenSync.has(k)) continue;
    seenSync.add(k);
    syncItems.push({ ...it, origem: "sync", syncKey: k });
  }

  // 3. Ordena agrupando por nome normalizado: manual antes do sync correspondente.
  const norm = (it: any) =>
    String(it.tarefa ?? it.nome ?? "")
      .trim()
      .toLowerCase();
  const order: string[] = [];
  const byName = new Map<string, any[]>();
  const push = (it: any) => {
    const n = norm(it);
    if (!byName.has(n)) {
      byName.set(n, []);
      order.push(n);
    }
    byName.get(n)!.push(it);
  };
  manualItems.forEach(push);
  syncItems.forEach(push);

  const result: any[] = [];
  for (const n of order) {
    const group = byName.get(n)!;
    group.sort((a, b) => (a.origem === "manual" ? -1 : 1) - (b.origem === "manual" ? -1 : 1));
    result.push(...group);
  }
  return result;
}

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

// Nomes de seção reconhecidos (case-insensitive) para categorizar sem depender de GID fixo
const SECTION_CONCLUIDO_NAMES = ["concluído", "concluido", "done", "entregue", "entregues", "concluídas", "concluidas"];
const SECTION_EM_ANDAMENTO_NAMES = ["em andamento", "in progress", "fazendo", "doing", "em progresso"];
const SECTION_PLANEJADO_NAMES = ["planejado", "planejadas", "planned", "a fazer", "to do", "todo", "next", "próximo"];
const SECTION_BACKLOG_NAMES = ["backlog", "pendente", "pendentes", "fila"];

function matchesSection(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase().trim();
  return patterns.some((p) => lower.includes(p));
}

function getCustomFieldValue(task: Record<string, unknown>, gid: string): string | null {
  const fields = task.custom_fields as Array<Record<string, unknown>>;
  if (!fields) return null;
  const field = fields.find((f) => f.gid === gid);
  if (!field) return null;
  if (field.enum_value) return (field.enum_value as Record<string, unknown>).name as string;
  if (Array.isArray(field.multi_enum_values) && (field.multi_enum_values as unknown[]).length > 0) {
    return (field.multi_enum_values as Array<Record<string, unknown>>)[0].name as string;
  }
  return null;
}

async function fetchPagedAsana(token: string, url: string): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!res.ok) {
      console.error(`[ASANA] Erro HTTP ${res.status} em ${next}`);
      break;
    }
    const json = (await res.json()) as Record<string, unknown>;
    items.push(...((json.data as Array<Record<string, unknown>>) ?? []));
    const np = json.next_page as Record<string, unknown> | null;
    next = np ? (np.uri as string) : null;
  }
  return items;
}

async function getProjectSections(token: string, projectId: string) {
  const sections = await fetchPagedAsana(
    token,
    `https://app.asana.com/api/1.0/projects/${projectId}/sections?opt_fields=gid,name&limit=100`,
  );
  return sections as Array<{ gid: string; name: string }>;
}

async function fetchTasksBySection(
  token: string,
  sectionGid: string,
  optFields: string,
): Promise<Array<Record<string, unknown>>> {
  return fetchPagedAsana(
    token,
    `https://app.asana.com/api/1.0/tasks?section=${sectionGid}&opt_fields=${optFields}&limit=100`,
  );
}

async function getVaultSecret(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_vault_secret", { secret_name: name });
  if (error || !data) throw new Error(`Secret '${name}' não encontrado no Vault`);
  return data as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Suporta asanaProjectIds (array) com fallback para asanaProjectId (legado)
    const body = await req.json();
    const { reportId, month, year } = body;
    const asanaProjectIds: string[] = body.asanaProjectIds?.length
      ? body.asanaProjectIds
      : body.asanaProjectId
        ? [body.asanaProjectId]
        : [];

    if (!reportId || !month || !year || asanaProjectIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios: reportId, month, year, asanaProjectIds" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const asanaToken = await getVaultSecret(supabase, "ASANA_TOKEN");

    const optFields =
      "name,completed,completed_at,due_on,assignee.name,custom_fields,permalink_url,memberships.section.name";

    const periodoInicio = new Date(Date.UTC(year, month - 1, 1));
    const periodoFim = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Acumula tarefas de todos os projetos configurados
    const allConcluidas: Array<Record<string, unknown>> = [];
    const allEmAndamento: Array<Record<string, unknown>> = [];
    const allPlanejadas: Array<Record<string, unknown>> = [];
    const allBacklog: Array<Record<string, unknown>> = [];
    const projectsSynced: string[] = [];
    const projectErrors: string[] = [];

    for (const projectId of asanaProjectIds) {
      try {
        console.log(`[ASANA] Buscando seções do projeto ${projectId}...`);
        const sections = await getProjectSections(asanaToken, projectId);

        if (sections.length === 0) {
          console.warn(`[ASANA] Projeto ${projectId} sem seções encontradas`);
          projectErrors.push(`${projectId}: sem seções`);
          continue;
        }

        console.log(
          `[ASANA] Projeto ${projectId} — ${sections.length} seções: ${sections.map((s) => s.name).join(", ")}`,
        );

        for (const section of sections) {
          const name = section.name;
          const tasks = await fetchTasksBySection(asanaToken, section.gid, optFields);

          if (matchesSection(name, SECTION_CONCLUIDO_NAMES)) {
            allConcluidas.push(...tasks);
          } else if (matchesSection(name, SECTION_EM_ANDAMENTO_NAMES)) {
            allEmAndamento.push(...tasks);
          } else if (matchesSection(name, SECTION_PLANEJADO_NAMES)) {
            allPlanejadas.push(...tasks);
          } else if (matchesSection(name, SECTION_BACKLOG_NAMES)) {
            allBacklog.push(...tasks);
          } else {
            // Seção não reconhecida — incluir em planejadas como fallback
            console.log(`[ASANA] Seção não reconhecida: "${name}" (${section.gid}) — incluída em planejadas`);
            allPlanejadas.push(...tasks);
          }
        }
        projectsSynced.push(projectId);
      } catch (err) {
        console.error(`[ASANA] Erro no projeto ${projectId}:`, (err as Error).message);
        projectErrors.push(`${projectId}: ${(err as Error).message}`);
      }
    }

    // Entregas do período
    const entregasPeriodo = allConcluidas.filter((t) => {
      if (!t.completed_at) return false;
      const d = new Date(t.completed_at as string);
      return d >= periodoInicio && d <= periodoFim;
    });

    const tarefasEntregas = entregasPeriodo.map((t) => ({
      gid: t.gid as string,
      nome: (t.name as string).trim(),
      status: "Concluído",
      categoria: getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee: ((t.assignee as Record<string, unknown> | null)?.name as string) ?? "",
      link: (t.permalink_url as string) ?? "",
      completed_at: t.completed_at as string,
    }));

    // Tarefas priorizadas
    const tarefasPriorizadas = [...allEmAndamento, ...allPlanejadas].map((t) => ({
      gid: t.gid as string,
      nome: (t.name as string).trim(),
      status: getCustomFieldValue(t, FIELD_STATUS) ?? "Em Andamento",
      categoria: getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee: ((t.assignee as Record<string, unknown> | null)?.name as string) ?? "",
      link: (t.permalink_url as string) ?? "",
    }));

    // Métricas evolução e inovação
    const contagemPorTag: Record<string, number> = {
      "Novas Funcionalidades": 0,
      Integrações: 0,
      Evolução: 0,
      Outros: 0,
    };
    for (const t of entregasPeriodo) {
      const tag = getCustomFieldValue(t, FIELD_TAG_PRODUTO);
      if (tag && contagemPorTag[tag] !== undefined) contagemPorTag[tag]++;
      else contagemPorTag["Outros"]++;
    }

    const totalEntregas = tarefasEntregas.length;
    const totalInovacao =
      contagemPorTag["Novas Funcionalidades"] + contagemPorTag["Integrações"] + contagemPorTag["Evolução"];
    const percentualInovacao = totalEntregas > 0 ? Math.round((totalInovacao / totalEntregas) * 100) : 0;

    const statusInovacao =
      percentualInovacao >= 60
        ? "alta"
        : percentualInovacao >= 40
          ? "adequado"
          : percentualInovacao >= 20
            ? "atencao"
            : "critico";

    // Histórico 3 meses anteriores via search API
    const MESES_NOMES = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const historico: Record<string, { total: number; contagem: Record<string, number> }> = {};

    for (let offset = 1; offset <= 3; offset++) {
      try {
        const d = new Date(Date.UTC(year, month - 1 - offset, 1));
        const inicioMes = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString();
        const fimMes = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)).toISOString();
        const nomeMes = MESES_NOMES[d.getMonth()];

        const params = new URLSearchParams({
          "projects.any": asanaProjectIds.join(","),
          completed: "true",
          "completed_at.after": inicioMes,
          "completed_at.before": fimMes,
          opt_fields: "gid,custom_fields",
          limit: "100",
        });

        const res = await fetch(`https://app.asana.com/api/1.0/tasks/search?${params}`, {
          headers: { Authorization: `Bearer ${asanaToken}`, Accept: "application/json" },
        });

        if (!res.ok) continue;

        const data = (await res.json()) as { data: Array<Record<string, unknown>> };
        const tasks = data.data ?? [];

        const contagem: Record<string, number> = {
          "Novas Funcionalidades": 0,
          Evolução: 0,
          Integrações: 0,
          Outros: 0,
        };
        for (const task of tasks) {
          const tagValue = getCustomFieldValue(task, FIELD_TAG_PRODUTO);
          const key = tagValue && contagem[tagValue] !== undefined ? tagValue : "Outros";
          contagem[key]++;
        }
        historico[nomeMes] = { total: tasks.length, contagem };
      } catch {
        continue;
      }
    }

    // Adicionar mês atual ao histórico
    historico[MESES_NOMES[month - 1]] = { total: totalEntregas, contagem: contagemPorTag };

    // Métricas eficiência
    const diasNoPeriodo = new Date(Date.UTC(year, month, 0)).getDate();
    const frequenciaDeploy = totalEntregas > 0 ? Math.round((diasNoPeriodo / totalEntregas) * 10) / 10 : 0;
    const leadTimes = entregasPeriodo
      .filter((t) => t.due_on && t.completed_at)
      .map((t) =>
        Math.abs(
          Math.round(
            (new Date(t.completed_at as string).getTime() - new Date(t.due_on as string).getTime()) / 86400000,
          ),
        ),
      );
    const leadTimeMedia =
      leadTimes.length > 0 ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : 0;

    // Salvar seções
    const now = new Date().toISOString();

    // ── PILOTO merge-preserva-manual: seção "entregas" ──
    // Lê o content atual, mescla listas (preserva itens manuais) e escalar `total`.
    const { data: entregaAtual } = await supabase
      .from("report_sections")
      .select("content")
      .eq("report_id", reportId)
      .eq("section_key", "entregas")
      .maybeSingle();
    const entregaContent = (entregaAtual?.content ?? {}) as Record<string, unknown>;

    // Normaliza itens do Asana para os nomes de campo do editor (tarefa/url).
    const entregasIncoming = tarefasEntregas.map((t) => ({
      gid: t.gid,
      tarefa: t.nome,
      status: t.status,
      categoria: t.categoria,
      assignee: t.assignee,
      url: t.link,
      completed_at: t.completed_at,
    }));

    const entregasMerged = {
      ...entregaContent,
      linhas: mergeLinhas(entregaContent, entregasIncoming),
      tarefas: undefined, // consolida no formato `linhas`
      ...mergeScalar(entregaContent, "total", totalEntregas),
    };

    await supabase
      .from("report_sections")
      .upsert(
        { report_id: reportId, section_key: "entregas", content: entregasMerged, source: "asana", synced_at: now },
        { onConflict: "report_id,section_key" },
      );

    // ── PILOTO merge-preserva-manual: seção "priorizadas" (mesmo padrão de entregas) ──
    const { data: priorizadaAtual } = await supabase
      .from("report_sections")
      .select("content")
      .eq("report_id", reportId)
      .eq("section_key", "priorizadas")
      .maybeSingle();
    const priorizadaContent = (priorizadaAtual?.content ?? {}) as Record<string, unknown>;

    const priorizadasIncoming = tarefasPriorizadas.map((t) => ({
      gid: t.gid,
      tarefa: t.nome,
      status: t.status,
      categoria: t.categoria,
      assignee: t.assignee,
      url: t.link,
    }));

    const priorizadasMerged = {
      ...priorizadaContent,
      linhas: mergeLinhas(priorizadaContent, priorizadasIncoming),
      tarefas: undefined,
      ...mergeScalar(priorizadaContent, "total", tarefasPriorizadas.length),
      ...mergeScalar(priorizadaContent, "total_backlog", allBacklog.length),
    };

    await supabase
      .from("report_sections")
      .upsert(
        { report_id: reportId, section_key: "priorizadas", content: priorizadasMerged, source: "asana", synced_at: now },
        { onConflict: "report_id,section_key" },
      );

    // ── Fase 2 merge-preserva-manual: seções de escalar ──
    // Lê o content atual e preserva os campos que o usuário tocou (_manualFields),
    // gravando o valor coletado em `campo__sync` quando houver divergência.
    // `...atual` no início garante que QUALQUER campo manual extra (inclusive em
    // camelCase, fora dos escalares abaixo) nunca seja apagado pelo upsert.

    const { data: evoAtual } = await supabase
      .from("report_sections").select("content")
      .eq("report_id", reportId).eq("section_key", "evolucao_inovacao").maybeSingle();
    const evoContent = (evoAtual?.content ?? {}) as Record<string, unknown>;
    const evoMerged = {
      ...evoContent,
      // Campos só do sync (usuário não edita): sempre atualizam.
      contagem_por_tag: contagemPorTag,
      total_entregas: totalEntregas,
      historico_mensal: historico,
      projetos_sincronizados: projectsSynced,
      projetos_com_erro: projectErrors,
      // Escalares que o usuário pode ter tocado: preserva o dele, guarda o sync ao lado.
      ...mergeScalar(evoContent, "percentual_inovacao", percentualInovacao),
      ...mergeScalar(evoContent, "status", statusInovacao),
    };

    const { data: efpAtual } = await supabase
      .from("report_sections").select("content")
      .eq("report_id", reportId).eq("section_key", "eficiencia_previsibilidade").maybeSingle();
    const efpContent = (efpAtual?.content ?? {}) as Record<string, unknown>;
    const efpMerged = {
      ...efpContent,
      ...mergeScalar(efpContent, "frequencia_deploy", frequenciaDeploy),
      ...mergeScalar(efpContent, "lead_time", leadTimeMedia),
      ...mergeScalar(efpContent, "demandas", totalEntregas),
      ...mergeScalar(efpContent, "status", "adequado"),
    };

    const secoes = [
      { report_id: reportId, section_key: "evolucao_inovacao", content: evoMerged, source: "asana", synced_at: now },
      { report_id: reportId, section_key: "eficiencia_previsibilidade", content: efpMerged, source: "asana", synced_at: now },
    ];

    for (const secao of secoes) {
      await supabase.from("report_sections").upsert(secao, { onConflict: "report_id,section_key" });
    }

    await supabase.from("report_sync_logs").insert({
      report_id: reportId,
      source: "asana",
      status: projectErrors.length === 0 ? "success" : "partial",
      records_fetched: totalEntregas + tarefasPriorizadas.length,
      error_message: projectErrors.length > 0 ? projectErrors.join("; ") : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        entregas: totalEntregas,
        priorizadas: tarefasPriorizadas.length,
        backlog: allBacklog.length,
        inovacao: percentualInovacao,
        projetos_sincronizados: projectsSynced,
        projetos_com_erro: projectErrors,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ASANA] Erro fatal:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
