import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAnyRole, AuthError } from "../_shared/auth.ts";

const REPORT_ROLES = ["c-level", "superadmin", "lider_tribo", "administrativo", "coordenacao_suporte", "projetos_produtos", "rh"];

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

// Normaliza acentos/caixa: o quadro do cliente escreve "Concluído", "CONCLUIDO",
// "Concluidas"... e a comparação crua deixava passar seção para a categoria errada.
function normalizeSectionName(name: string): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Deny-list: "Não concluído" contém "concluido" e caía em Entregas. Qualquer
// seção negada ("não ...") deixa de casar como concluído.
function isSecaoNegada(name: string): boolean {
  return /(^|\s)nao(\s|$)/.test(normalizeSectionName(name));
}

function matchesSection(name: string, patterns: string[]): boolean {
  const lower = normalizeSectionName(name);
  return patterns.some((p) => lower.includes(normalizeSectionName(p)));
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

// Nome do projeto e workspace_gid. O workspace é obrigatório para o endpoint de
// busca (`/workspaces/{gid}/tasks/search`) e não vem de outro lugar confiável.
async function getProjectMeta(
  token: string,
  projectId: string,
): Promise<{ name: string; workspaceGid: string | null }> {
  const res = await fetch(`https://app.asana.com/api/1.0/projects/${projectId}?opt_fields=name,workspace.gid`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error(`[ASANA] Não foi possível ler metadados do projeto ${projectId}: HTTP ${res.status}`);
    return { name: projectId, workspaceGid: null };
  }
  const json = (await res.json()) as { data?: Record<string, unknown> };
  const data = json.data ?? {};
  return {
    name: (data.name as string) ?? projectId,
    workspaceGid: ((data.workspace as Record<string, unknown> | undefined)?.gid as string) ?? null,
  };
}

// Carimba cada tarefa com a origem (projeto + coluna do quadro). Quando a tarefa
// está em vários projetos, `memberships` dá o par projeto/seção exato; o par do
// laço serve de fallback.
function anotarOrigem(
  tasks: Array<Record<string, unknown>>,
  projetoNome: string,
  colunaNome: string,
  sectionGid: string,
): Array<Record<string, unknown>> {
  return tasks.map((t) => {
    const memberships = (t.memberships as Array<Record<string, unknown>> | undefined) ?? [];
    const m = memberships.find(
      (mb) => ((mb.section as Record<string, unknown> | undefined)?.gid as string) === sectionGid,
    );
    const projeto = ((m?.project as Record<string, unknown> | undefined)?.name as string) ?? projetoNome;
    const coluna = ((m?.section as Record<string, unknown> | undefined)?.name as string) ?? colunaNome;
    return { ...t, __projeto: projeto, __coluna: coluna };
  });
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
    // sectionKey: o front envia no re-sync individual de uma seção. Quando presente,
    // só aquela seção é gravada (as demais nem são tocadas).
    const { reportId, month, year, sectionKey } = body as {
      reportId?: string; month?: number; year?: number; sectionKey?: string;
    };
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

    // Segurança: só perfis do módulo de Relatórios podem sincronizar.
    await requireAnyRole(req, supabase, REPORT_ROLES);

    const asanaToken = await getVaultSecret(supabase, "ASANA_TOKEN");

    // Só grava a seção pedida quando o front manda `sectionKey` (re-sync individual).
    const deveGravar = (key: string) => !sectionKey || sectionKey === key;

    // memberships.project.name / section.gid: necessários para identificar de qual
    // projeto e de qual coluna do quadro cada tarefa veio.
    const optFields =
      "name,completed,completed_at,due_on,assignee.name,custom_fields,permalink_url," +
      "memberships.section.name,memberships.section.gid,memberships.project.name";

    const periodoInicio = new Date(Date.UTC(year, month - 1, 1));
    const periodoFim = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Acumula tarefas de todos os projetos configurados
    const allConcluidas: Array<Record<string, unknown>> = [];
    const allEmAndamento: Array<Record<string, unknown>> = [];
    const allPlanejadas: Array<Record<string, unknown>> = [];
    const allBacklog: Array<Record<string, unknown>> = [];
    const projectsSynced: string[] = [];
    const projectErrors: string[] = [];
    // Colunas do quadro que não casaram com nenhuma categoria conhecida.
    // DECISÃO DO CLIENTE: as tarefas NÃO são descartadas (seguem para Priorizadas),
    // mas a lista é devolvida e gravada para o front avisar quem configurou o quadro.
    const colunasNaoReconhecidas = new Map<string, { projeto: string; coluna: string; qtd: number }>();
    let workspaceGid: string | null = null;

    for (const projectId of asanaProjectIds) {
      try {
        console.log(`[ASANA] Buscando seções do projeto ${projectId}...`);
        const projectMeta = await getProjectMeta(asanaToken, projectId);
        if (!workspaceGid) workspaceGid = projectMeta.workspaceGid;
        const projetoNome = projectMeta.name;
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
          const rawTasks = await fetchTasksBySection(asanaToken, section.gid, optFields);
          const tasks = anotarOrigem(rawTasks, projetoNome, name, section.gid);

          // "Não concluído"/"Não iniciado" NÃO podem cair em concluído (deny-list).
          if (!isSecaoNegada(name) && matchesSection(name, SECTION_CONCLUIDO_NAMES)) {
            allConcluidas.push(...tasks);
          } else if (matchesSection(name, SECTION_EM_ANDAMENTO_NAMES)) {
            allEmAndamento.push(...tasks);
          } else if (matchesSection(name, SECTION_PLANEJADO_NAMES)) {
            allPlanejadas.push(...tasks);
          } else if (matchesSection(name, SECTION_BACKLOG_NAMES)) {
            allBacklog.push(...tasks);
          } else {
            // Seção não reconhecida — mantém em planejadas (vai para Priorizadas)
            // e registra o aviso para o usuário renomear a coluna ou revisar o quadro.
            console.log(`[ASANA] Seção não reconhecida: "${name}" (${section.gid}) — incluída em planejadas`);
            allPlanejadas.push(...tasks);
            const chave = `${projetoNome}||${name}`;
            const atual = colunasNaoReconhecidas.get(chave);
            if (atual) atual.qtd += tasks.length;
            else colunasNaoReconhecidas.set(chave, { projeto: projetoNome, coluna: name, qtd: tasks.length });
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
      // Origem: permite auditar de qual quadro/coluna a entrega veio.
      projeto: (t.__projeto as string) ?? "",
      coluna: (t.__coluna as string) ?? "",
    }));

    // Tarefas priorizadas
    const tarefasPriorizadas = [...allEmAndamento, ...allPlanejadas].map((t) => ({
      gid: t.gid as string,
      nome: (t.name as string).trim(),
      status: getCustomFieldValue(t, FIELD_STATUS) ?? "Em Andamento",
      categoria: getCustomFieldValue(t, FIELD_TAG_PRODUTO) ?? getCustomFieldValue(t, FIELD_TIPO) ?? "Outros",
      assignee: ((t.assignee as Record<string, unknown> | null)?.name as string) ?? "",
      link: (t.permalink_url as string) ?? "",
      // Origem: em Priorizadas caem também as colunas não reconhecidas, então
      // saber projeto/coluna é o que permite identificar item vindo de fora.
      projeto: (t.__projeto as string) ?? "",
      coluna: (t.__coluna as string) ?? "",
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
    const historicoErros: string[] = [];

    // Nunca buscar sem projetos (a busca sem filtro traria o workspace inteiro).
    // Sem workspace_gid a URL do search é inválida — antes chamávamos
    // `/tasks/search` (sem `/workspaces/{gid}`), que retorna erro e o histórico
    // vinha sempre vazio, silenciosamente (o `if (!res.ok) continue`).
    const podeBuscarHistorico = asanaProjectIds.length > 0 && Boolean(workspaceGid);
    if (!podeBuscarHistorico) {
      historicoErros.push(
        asanaProjectIds.length === 0
          ? "Nenhum projeto configurado — histórico não buscado."
          : "workspace_gid não encontrado nos projetos configurados — histórico não buscado.",
      );
    }

    const projectIdSet = new Set(asanaProjectIds.map((id) => String(id)));

    for (let offset = 1; podeBuscarHistorico && offset <= 3; offset++) {
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
          opt_fields: "gid,custom_fields,projects.gid",
          limit: "100",
        });

        const res = await fetch(
          `https://app.asana.com/api/1.0/workspaces/${workspaceGid}/tasks/search?${params}`,
          { headers: { Authorization: `Bearer ${asanaToken}`, Accept: "application/json" } },
        );

        if (!res.ok) {
          const corpo = await res.text();
          historicoErros.push(`${nomeMes}: HTTP ${res.status} ${corpo.slice(0, 200)}`);
          continue;
        }

        const data = (await res.json()) as { data: Array<Record<string, unknown>> };
        // Re-filtro por projeto no cliente: `projects.any` é filtro do servidor e
        // não deve ser a única garantia de que a tarefa é do contrato.
        const tasks = (data.data ?? []).filter((t) => {
          const projs = t.projects as Array<Record<string, unknown>> | undefined;
          if (!Array.isArray(projs)) return true; // API não devolveu o campo: não descarta
          return projs.some((p) => projectIdSet.has(String(p.gid)));
        });

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
      } catch (err) {
        // Não engolir: o histórico vazio precisa ter causa visível no retorno/log.
        historicoErros.push(`offset ${offset}: ${(err as Error).message}`);
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
    const avisoColunas = Array.from(colunasNaoReconhecidas.values());

    // ── PILOTO merge-preserva-manual: seção "entregas" ──
    // Lê o content atual, mescla listas (preserva itens manuais) e escalar `total`.
    if (deveGravar("entregas")) {
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
        projeto: t.projeto,
        coluna: t.coluna,
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
    }

    // ── PILOTO merge-preserva-manual: seção "priorizadas" (mesmo padrão de entregas) ──
    if (deveGravar("priorizadas")) {
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
        projeto: t.projeto,
        coluna: t.coluna,
      }));

      const priorizadasMerged = {
        ...priorizadaContent,
        linhas: mergeLinhas(priorizadaContent, priorizadasIncoming),
        tarefas: undefined,
        // Aviso de colunas não reconhecidas: chave própria (prefixo `_`) para o
        // front exibir sem confundir com campo editável do usuário.
        _avisoColunas: avisoColunas,
        ...mergeScalar(priorizadaContent, "total", tarefasPriorizadas.length),
        ...mergeScalar(priorizadaContent, "total_backlog", allBacklog.length),
      };

      await supabase
        .from("report_sections")
        .upsert(
          { report_id: reportId, section_key: "priorizadas", content: priorizadasMerged, source: "asana", synced_at: now },
          { onConflict: "report_id,section_key" },
        );
    }

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
      historico_erros: historicoErros,
      projetos_sincronizados: projectsSynced,
      projetos_com_erro: projectErrors,
      colunas_nao_reconhecidas: avisoColunas,
      // Itens que compõem a contagem, com a origem (projeto/coluna) de cada um.
      itens: tarefasEntregas.map((t) => ({
        gid: t.gid,
        tarefa: t.nome,
        categoria: t.categoria,
        projeto: t.projeto,
        coluna: t.coluna,
      })),
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
      if (!deveGravar(secao.section_key)) continue;
      await supabase.from("report_sections").upsert(secao, { onConflict: "report_id,section_key" });
    }

    const problemas = [...projectErrors, ...historicoErros];
    await supabase.from("report_sync_logs").insert({
      report_id: reportId,
      source: "asana",
      status: problemas.length === 0 ? "success" : "partial",
      records_fetched: totalEntregas + tarefasPriorizadas.length,
      error_message: problemas.length > 0 ? problemas.join("; ").slice(0, 1000) : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        section_key: sectionKey ?? null,
        entregas: totalEntregas,
        priorizadas: tarefasPriorizadas.length,
        backlog: allBacklog.length,
        inovacao: percentualInovacao,
        projetos_sincronizados: projectsSynced,
        projetos_com_erro: projectErrors,
        colunas_nao_reconhecidas: avisoColunas,
        historico_erros: historicoErros,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ASANA] Erro fatal:", (error as Error).message);
    const status = error instanceof AuthError ? error.status : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
