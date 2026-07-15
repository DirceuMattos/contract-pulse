// v3 - merge-preserva-manual: eficiencia_previsibilidade (nao apaga campos manuais)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// mergeScalar (espelho de src/lib/reportMergeManual.ts): preserva o valor do
// usuário quando o campo foi tocado (_manualFields), guardando o coletado em __sync.
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reportId, azureOrg = "bnpdesenvolvimento", azureProject, azureTags, month, year } = await req.json();

    if (!reportId) throw new Error("reportId obrigatório");
    if (!azureProject) throw new Error("azureProject obrigatório");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pat } = await supabase.rpc("get_vault_secret", { secret_name: "AZURE_DEVOPS_PAT" });
    const authHeader = "Basic " + btoa(":" + (pat as string));

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split("T")[0];
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString().split("T")[0];

    const tagsFilter = azureTags && azureTags.length > 0
      ? ` AND (${azureTags.map((t: string) => `[System.Tags] CONTAINS '${t}'`).join(" OR ")})`
      : "";

    const wiql = {
      query: `SELECT [System.Id] FROM WorkItems 
              WHERE [System.TeamProject] = '${azureProject}'
              AND [System.State] IN ('Done', 'Closed', 'Resolved', 'Completed')
              AND [Microsoft.VSTS.Common.ClosedDate] >= '${startDate}'
              AND [Microsoft.VSTS.Common.ClosedDate] <= '${endDate}'
              ${tagsFilter}
              ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC`,
    };

    const wiqlRes = await fetch(
      `https://dev.azure.com/${azureOrg}/${encodeURIComponent(azureProject)}/_apis/wit/wiql?api-version=7.0`,
      { method: "POST", headers: { "Authorization": authHeader, "Content-Type": "application/json" }, body: JSON.stringify(wiql) }
    );

    if (!wiqlRes.ok) {
      const err = await wiqlRes.text();
      throw new Error(`Azure DevOps WIQL error ${wiqlRes.status}: ${err}`);
    }

    const wiqlData = await wiqlRes.json();
    const ids: number[] = (wiqlData.workItems ?? []).map((w: { id: number }) => w.id);

    let workItems: Record<string, unknown>[] = [];
    if (ids.length > 0) {
      const fieldsStr = [
        "System.Id", "System.WorkItemType", "System.State",
        "Microsoft.VSTS.Common.ClosedDate", "System.CreatedDate",
        "Microsoft.VSTS.Scheduling.StoryPoints", "System.Tags",
        "System.AssignedTo", "System.IterationPath", "System.Title",
        "Microsoft.VSTS.Common.Priority",
      ].join(",");

      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const res = await fetch(
          `https://dev.azure.com/${azureOrg}/_apis/wit/workitems?ids=${batch.join(",")}&fields=${fieldsStr}&api-version=7.0`,
          { headers: { "Authorization": authHeader } }
        );
        if (res.ok) {
          const d = await res.json();
          workItems = workItems.concat(d.value ?? []);
        }
      }
    }

    // Processar
    const tiposContagem: Record<string, number> = {};
    let totalBugs = 0;
    let totalSP = 0;
    let totalLeadDays = 0;
    let countLeadDays = 0;

    const tarefas = workItems.map((wi: Record<string, unknown>) => {
      const f = wi.fields as Record<string, unknown>;
      const tipo = (f["System.WorkItemType"] as string) ?? "Outros";
      tiposContagem[tipo] = (tiposContagem[tipo] ?? 0) + 1;

      if (tipo === "Bug") totalBugs++;
      const sp = Number(f["Microsoft.VSTS.Scheduling.StoryPoints"] ?? 0);
      totalSP += sp;

      const closed = f["Microsoft.VSTS.Common.ClosedDate"] as string;
      const created = f["System.CreatedDate"] as string;
      let leadDays = 0;
      if (closed && created) {
        leadDays = Math.max(0, Math.round((new Date(closed).getTime() - new Date(created).getTime()) / 86400000));
        totalLeadDays += leadDays;
        countLeadDays++;
      }

      const assignee = f["System.AssignedTo"] as Record<string, unknown>;
      return {
        id: wi.id as number,
        titulo: f["System.Title"] as string,
        tipo,
        estado: f["System.State"] as string,
        responsavel: (assignee?.displayName as string) ?? "Não atribuído",
        tags: ((f["System.Tags"] as string) ?? "").split(";").map((t: string) => t.trim()).filter(Boolean),
        story_points: sp,
        iteracao: f["System.IterationPath"] as string ?? "",
        data_fechamento: closed ?? "",
        lead_time_days: leadDays,
      };
    });

    const total = workItems.length;
    const leadTimeMedia = countLeadDays > 0 ? Math.round(totalLeadDays / countLeadDays) : 0;
    const freqDeploy = total;
    const efficiencyRatio = total > 0 ? Math.round(((total - totalBugs) / total) * 100) : 0;

    // PBI = tudo exceto Bug
    const totalPBI = total - totalBugs;
    const pbiTestedRatio = total > 0 ? Math.round((totalPBI / total) * 100) : 0;

    const status = totalBugs === 0 ? "alta" : totalBugs <= 2 ? "adequado" : totalBugs <= 5 ? "atencao" : "critico";

    // Merge-preserva-manual: lê o content atual e preserva os campos que o
    // usuário tocou. O editor edita em camelCase, então são esses que protegemos
    // via mergeScalar. Os campos snake_case (compatibilidade de leitura) e os
    // dados puros do sync (story_points, por_tipo, tarefas) atualizam direto.
    const { data: atual } = await supabase
      .from("report_sections").select("content")
      .eq("report_id", reportId).eq("section_key", "eficiencia_previsibilidade").maybeSingle();
    const cur = (atual?.content ?? {}) as Record<string, unknown>;

    const content = {
      ...cur,
      // snake_case (compatibilidade de leitura / dados do sync)
      bugs: totalBugs,
      story_points: totalSP,
      por_tipo: tiposContagem,
      lead_time: leadTimeMedia,
      frequencia_deploy: freqDeploy,
      efficiency_ratio: efficiencyRatio,
      pbi_tested_ratio: pbiTestedRatio,
      tarefas: tarefas.slice(0, 50),
      // camelCase (lido e editado pelo usuário) — preserva se tocado
      ...mergeScalar(cur, "leadTime", leadTimeMedia),
      ...mergeScalar(cur, "frequenciaDeploy", freqDeploy),
      ...mergeScalar(cur, "efficiencyRatio", efficiencyRatio),
      ...mergeScalar(cur, "pbiTestedRatio", pbiTestedRatio),
      ...mergeScalar(cur, "demandas", total),
      ...mergeScalar(cur, "status", status),
    };

    const { error } = await supabase
      .from("report_sections")
      .upsert(
        { report_id: reportId, section_key: "eficiencia_previsibilidade", content, source: "azuredevops", synced_at: new Date().toISOString() },
        { onConflict: "report_id,section_key" }
      );

    if (error) throw new Error(`Erro ao salvar: ${error.message}`);

    return new Response(JSON.stringify({ success: true, total, bugs: totalBugs, leadTime: leadTimeMedia, freqDeploy, efficiencyRatio, pbiTestedRatio }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AzureDevOps]", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
