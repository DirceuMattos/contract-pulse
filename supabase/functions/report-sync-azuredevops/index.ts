import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const {
      reportId,
      azureOrg = "bnpdesenvolvimento",
      azureProject,
      azureTags,
      month,
      year,
    } = await req.json();

    if (!reportId) throw new Error("reportId obrigatório");
    if (!azureProject) throw new Error("azureProject obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar PAT do Vault
    const { data: secretData, error: secretError } = await supabase.rpc(
      "get_vault_secret",
      { secret_name: "AZURE_DEVOPS_PAT" }
    );
    if (secretError || !secretData) throw new Error("AZURE_DEVOPS_PAT não encontrado no Vault");
    const pat = secretData as string;
    const authHeader = "Basic " + btoa(":" + pat);

    // Calcular datas do período
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    // Montar query WIQL
    // Busca work items fechados no período com as tags informadas
    const tagsFilter = azureTags && azureTags.length > 0
      ? ` AND (${azureTags.map((t: string) => `[System.Tags] CONTAINS '${t}'`).join(" OR ")})`
      : "";

    // Suporta múltiplos projetos separados por vírgula
    const projects: string[] = String(azureProject)
      .split(",")
      .map((p: string) => p.trim())
      .filter(Boolean);

    let workItems: Record<string, unknown>[] = [];

    for (const project of projects) {
      const wiql = {
        query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], 
                [System.AssignedTo], [System.Tags], [Microsoft.VSTS.Common.ClosedDate],
                [Microsoft.VSTS.Scheduling.StoryPoints], [System.IterationPath]
                FROM WorkItems 
                WHERE [System.TeamProject] = '${project}'
                AND [System.State] IN ('Done', 'Closed', 'Resolved', 'Completed')
                AND [Microsoft.VSTS.Common.ClosedDate] >= '${startStr}'
                AND [Microsoft.VSTS.Common.ClosedDate] <= '${endStr}'
                ${tagsFilter}
                ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC`,
      };

      const wiqlUrl = `https://dev.azure.com/${azureOrg}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.0`;
      const wiqlRes = await fetch(wiqlUrl, {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(wiql),
      });

      if (!wiqlRes.ok) {
        const err = await wiqlRes.text();
        console.error(`[AzureDevOps] Projeto "${project}" falhou: ${wiqlRes.status} ${err}`);
        continue;
      }

      const wiqlData = await wiqlRes.json();
      const workItemIds: number[] = (wiqlData.workItems ?? []).map((w: { id: number }) => w.id);

      if (workItemIds.length === 0) continue;

      // Buscar detalhes em lotes de 200
      const BATCH = 200;
      for (let i = 0; i < workItemIds.length; i += BATCH) {
        const batch = workItemIds.slice(i, i + BATCH);
        const fields = [
          "System.Id", "System.Title", "System.WorkItemType", "System.State",
          "System.AssignedTo", "System.Tags", "Microsoft.VSTS.Common.ClosedDate",
          "Microsoft.VSTS.Scheduling.StoryPoints", "System.IterationPath",
          "System.AreaPath", "Microsoft.VSTS.Common.Priority",
        ].join(",");

        const detailUrl = `https://dev.azure.com/${azureOrg}/${encodeURIComponent(project)}/_apis/wit/workitems?ids=${batch.join(",")}&fields=${fields}&api-version=7.0`;
        const detailRes = await fetch(detailUrl, {
          headers: { "Authorization": authHeader },
        });

        if (!detailRes.ok) continue;
        const detailData = await detailRes.json();
        workItems = workItems.concat(detailData.value ?? []);
      }
    }

    // Processar work items
    const tiposContagem: Record<string, number> = {
      "User Story": 0,
      "Bug": 0,
      "Task": 0,
      "Feature": 0,
      "Epic": 0,
      "Outros": 0,
    };

    let totalStoryPoints = 0;
    let totalBugs = 0;

    const tarefas = workItems.map((wi: Record<string, unknown>) => {
      const fields = wi.fields as Record<string, unknown>;
      const tipo = fields["System.WorkItemType"] as string ?? "Outros";
      const key = Object.keys(tiposContagem).includes(tipo) ? tipo : "Outros";
      tiposContagem[key]++;

      const sp = Number(fields["Microsoft.VSTS.Scheduling.StoryPoints"] ?? 0);
      totalStoryPoints += sp;

      if (tipo === "Bug") totalBugs++;

      const assignedTo = fields["System.AssignedTo"] as Record<string, unknown>;

      return {
        id: wi.id as number,
        titulo: fields["System.Title"] as string,
        tipo,
        estado: fields["System.State"] as string,
        responsavel: (assignedTo?.displayName as string) ?? "Não atribuído",
        tags: (fields["System.Tags"] as string ?? "").split(";").map((t: string) => t.trim()).filter(Boolean),
        story_points: sp,
        iteracao: fields["System.IterationPath"] as string ?? "",
        data_fechamento: fields["Microsoft.VSTS.Common.ClosedDate"] as string ?? "",
        prioridade: fields["Microsoft.VSTS.Common.Priority"] as number ?? 0,
      };
    });

    // Calcular métricas de Eficiência e Previsibilidade
    const totalConcluidos = workItems.length;
    const totalUserStories = tiposContagem["User Story"] + tiposContagem["Feature"];
    const pbiTestedRatio = totalUserStories > 0
      ? Math.round((totalUserStories / Math.max(totalConcluidos, 1)) * 100)
      : 0;

    const eficienciaContent = {
      demandas: totalConcluidos,
      bugs: totalBugs,
      story_points: totalStoryPoints,
      por_tipo: tiposContagem,
      pbi_tested_ratio: pbiTestedRatio,
      tarefas: tarefas.slice(0, 50), // limitar para não estourar o JSON
      status: totalBugs === 0 ? "alta" :
              totalBugs <= 2 ? "adequado" :
              totalBugs <= 5 ? "atencao" : "critico",
    };

    const now = new Date().toISOString();

    // Upsert seção eficiencia_previsibilidade
    const { error: upsertError } = await supabase
      .from("report_sections")
      .upsert({
        report_id: reportId,
        section_key: "eficiencia_previsibilidade",
        content: eficienciaContent,
        source: "azure_devops",
        synced_at: now,
      }, { onConflict: "report_id,section_key" });

    if (upsertError) throw new Error(`Erro ao salvar seção: ${upsertError.message}`);

    return new Response(JSON.stringify({
      success: true,
      total_work_items: totalConcluidos,
      total_bugs: totalBugs,
      story_points: totalStoryPoints,
      por_tipo: tiposContagem,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[AzureDevOps]", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
