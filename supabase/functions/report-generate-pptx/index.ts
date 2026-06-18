import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import pptxgen from "https://esm.sh/pptxgenjs@3.12.0";

const AZUL_ESCURO = "1A4F8A";
const AZUL_MEDIO = "2D7FC1";
const AZUL_CLARO = "D6E8F7";
const CINZA_TEXTO = "333333";
const CINZA_CLARO = "F5F7FA";
const BRANCO = "FFFFFF";

const STATUS_CORES = {
  alta: { cor: "1E8A3E", label: "Alta Performance" },
  adequado: { cor: "C8A000", label: "Adequado" },
  atencao: { cor: "C85000", label: "Atenção" },
  critico: { cor: "C81E1E", label: "Crítico" },
};

const MESES = [
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { reportId } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: report } = await supabase
      .from("monthly_reports")
      .select("*, contracts(*, clients(*))")
      .eq("id", reportId)
      .single();
    if (!report) throw new Error("Relatório não encontrado");

    const { data: sections } = await supabase.from("report_sections").select("*").eq("report_id", reportId);
    const sectionMap: Record<string, Record<string, unknown>> = {};
    for (const s of sections ?? []) sectionMap[s.section_key] = s.content ?? {};

    const contract = report.contracts;
    const client = contract?.clients;
    const mesAno = `${MESES[(report.month ?? 1) - 1]}/${report.year}`;
    const nomeContrato = contract?.nome ?? "Contrato";
    const nomeCliente = client?.nome_fantasia ?? client?.razao_social ?? "Cliente";
    const numeroContrato = contract?.numero ?? "";

    const pres = new pptxgen();
    pres.layout = "LAYOUT_16x9";

    // ── Helpers ──────────────────────────────────────────────────────────────

    function headerBar(slide: any, titulo: string) {
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: 10,
        h: 0.65,
        fill: { color: AZUL_ESCURO },
        line: { color: AZUL_ESCURO },
      });
      slide.addText(titulo, {
        x: 0.35,
        y: 0,
        w: 7.5,
        h: 0.65,
        fontSize: 16,
        bold: true,
        color: BRANCO,
        valign: "middle",
        margin: 0,
      });
      slide.addText("bnp", {
        x: 8.5,
        y: 0.1,
        w: 1.3,
        h: 0.45,
        fontSize: 18,
        bold: true,
        color: BRANCO,
        align: "right",
        valign: "middle",
      });
    }

    function statusBadge(slide: any, x: number, y: number, w: number, status: string) {
      const sc = STATUS_CORES[status as keyof typeof STATUS_CORES] ?? STATUS_CORES.adequado;
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h: 0.34,
        fill: { color: sc.cor },
        line: { color: sc.cor },
        rectRadius: 0.05,
      });
      slide.addText(sc.label, {
        x,
        y,
        w,
        h: 0.34,
        fontSize: 11,
        bold: true,
        color: BRANCO,
        align: "center",
        valign: "middle",
        margin: 0,
      });
    }

    function kpiCard(
      slide: any,
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      valor: string,
      cor?: string,
    ) {
      slide.addShape("roundRect", {
        x,
        y,
        w,
        h,
        fill: { color: CINZA_CLARO },
        shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 45, opacity: 0.1 },
        rectRadius: 0.08,
        line: { color: "E0E7EF", width: 0.5 },
      });
      slide.addText(label, {
        x: x + 0.1,
        y: y + 0.1,
        w: w - 0.2,
        h: 0.3,
        fontSize: 9,
        color: "666666",
        align: "center",
        valign: "middle",
        margin: 0,
      });
      slide.addText(valor, {
        x: x + 0.1,
        y: y + 0.38,
        w: w - 0.2,
        h: h - 0.5,
        fontSize: 22,
        bold: true,
        color: cor ?? AZUL_ESCURO,
        align: "center",
        valign: "middle",
        margin: 0,
      });
    }

    function emptyMsg(slide: any, msg: string) {
      slide.addText(msg, { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center" });
    }

    // ── SLIDE 1: CAPA ────────────────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: AZUL_CLARO };
      s.addShape("ellipse", {
        x: 5.5,
        y: -0.5,
        w: 5.5,
        h: 5.5,
        fill: { color: AZUL_MEDIO, transparency: 30 },
        line: { color: AZUL_MEDIO, transparency: 30 },
      });
      s.addShape("ellipse", {
        x: 6.5,
        y: 0.8,
        w: 4.0,
        h: 4.0,
        fill: { color: AZUL_ESCURO, transparency: 25 },
        line: { color: AZUL_ESCURO, transparency: 25 },
      });
      s.addText("bnp", { x: 0.4, y: 0.3, w: 1.5, h: 0.6, fontSize: 28, bold: true, color: AZUL_ESCURO });
      s.addText("Relatório Mensal de Atividades", {
        x: 0.4,
        y: 2.0,
        w: 5.5,
        h: 0.8,
        fontSize: 26,
        bold: true,
        color: AZUL_ESCURO,
      });
      const capa = sectionMap["capa"] ?? {};
      s.addText(mesAno, { x: 0.4, y: 3.1, w: 5.5, h: 0.35, fontSize: 14, bold: true, color: CINZA_TEXTO });
      s.addText(`Projeto: ${(capa.projeto as string) || nomeContrato}`, {
        x: 0.4,
        y: 3.5,
        w: 5.5,
        h: 0.3,
        fontSize: 11,
        color: CINZA_TEXTO,
      });
      s.addText((capa.cliente as string) || nomeCliente, {
        x: 0.4,
        y: 3.82,
        w: 5.5,
        h: 0.3,
        fontSize: 11,
        color: CINZA_TEXTO,
      });
      s.addText(`Contrato: ${(capa.numeroContrato as string) || numeroContrato}`, {
        x: 0.4,
        y: 4.1,
        w: 5.5,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: AZUL_ESCURO,
      });
    }

    // ── SLIDE 2: SUMÁRIO ─────────────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Sumário");
      const sumItems = [
        "Objetivo do relatório",
        "Painel executivo",
        "Histórico evolutivo do Termo de Referência",
        "Evolução e Inovação",
        "Evolução e Inovação / Entregas",
        "Tarefas Priorizadas",
        "Demonstrativo de Horas",
        "Eficiência Operacional",
        "Eficiência e Previsibilidade",
        "Engajamento e Experiência do Usuário",
        "Maturidade e Gestão da Plataforma",
        "Treinamentos / Reuniões",
        "Oportunidades e Fatores de Atenção",
      ];
      sumItems.forEach((item, i) => {
        s.addText(`${i + 1}.  ${item}`, { x: 1.5, y: 0.85 + i * 0.36, w: 7, h: 0.34, fontSize: 13, color: AZUL_MEDIO });
      });
    }

    // ── SLIDE 3: OBJETIVO ────────────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Objetivo do relatório");
      const obj = sectionMap["objetivo"] ?? {};
      const texto =
        (obj.texto as string) ??
        "Apresentar as principais entregas, indicadores e oportunidades identificadas no período de referência.";
      s.addText(texto, { x: 0.5, y: 1.0, w: 9, h: 1.2, fontSize: 13, color: CINZA_TEXTO, wrap: true });
      s.addText(
        "O documento consolida informações sobre a evolução da plataforma, o engajamento dos usuários, a eficiência operacional e desempenho da aplicação, bem como os principais indicadores, entregas realizadas, prioridades do próximo período e pontos de atenção estratégicos.",
        { x: 0.5, y: 2.5, w: 9, h: 1.2, fontSize: 13, color: CINZA_TEXTO, wrap: true },
      );
      s.addText("Transparência  ●  Monitoramento do Projeto  ●  Tomada de Decisão", {
        x: 1.0,
        y: 4.2,
        w: 8,
        h: 0.5,
        fontSize: 13,
        bold: true,
        color: AZUL_MEDIO,
        align: "center",
      });
    }

    // ── SLIDE 4: PAINEL EXECUTIVO ────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Painel Executivo");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const painel = sectionMap["painel_executivo"] ?? {};
      const cards = [
        { key: "historicoTr", label: "Histórico do TR" },
        { key: "evolucaoInovacao", label: "Evolução e Inovação" },
        { key: "eficienciaOperacional", label: "Eficiência Operacional" },
        { key: "eficienciaPrevisibilidade", label: "Efic. e Previsibilidade" },
        { key: "desempenhoAplicacao", label: "Desempenho da Aplicação" },
        { key: "engajamentoUsuario", label: "Engajamento do Usuário" },
      ];
      cards.forEach((c, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 0.4 + col * 3.1;
        const y = 1.1 + row * 1.75;
        const status = ((painel[c.key] as string) ?? "adequado")
          .toLowerCase()
          .replace(" ", "")
          .replace("alta performance", "alta")
          .replace("atenção", "atencao")
          .replace("crítico", "critico");
        s.addShape("roundRect", {
          x,
          y,
          w: 2.85,
          h: 1.55,
          fill: { color: CINZA_CLARO },
          line: { color: "E0E7EF", width: 0.5 },
          rectRadius: 0.1,
          shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 45, opacity: 0.08 },
        });
        s.addText(c.label, {
          x: x + 0.1,
          y: y + 0.18,
          w: 2.65,
          h: 0.4,
          fontSize: 11,
          color: CINZA_TEXTO,
          align: "center",
        });
        statusBadge(s, x + 0.25, y + 0.85, 2.35, status);
      });
      if (painel.observacoes) {
        s.addText(painel.observacoes as string, {
          x: 0.4,
          y: 4.65,
          w: 9.2,
          h: 0.4,
          fontSize: 9,
          color: "888888",
          italic: true,
        });
      }
    }

    // ── SLIDE 5: HISTÓRICO TR ────────────────────────────────────────────────
    {
      const htr = sectionMap["historico_tr"] ?? {};
      const linhasHtr = (htr.linhas as Array<{ descricao: string; entregue: boolean }>) ?? [];
      if (linhasHtr.length > 0) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Histórico evolutivo do Termo de Referência");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        const total = linhasHtr.length;
        const entregues = linhasHtr.filter((l) => l.entregue).length;
        const pct = total > 0 ? Math.round((entregues / total) * 100) : 0;
        s.addShape("roundRect", {
          x: 7.5,
          y: 0.72,
          w: 2.0,
          h: 0.32,
          fill: { color: AZUL_ESCURO },
          line: { color: AZUL_ESCURO },
          rectRadius: 0.05,
        });
        s.addText(`${pct}% concluído`, {
          x: 7.5,
          y: 0.72,
          w: 2.0,
          h: 0.32,
          fontSize: 10,
          bold: true,
          color: BRANCO,
          align: "center",
          valign: "middle",
        });
        const tableData = [
          [
            { text: "MACROENTREGA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...linhasHtr.map((l) => [l.descricao ?? "", l.entregue ? "✓ Entregue" : "Pendente"]),
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.15,
          w: 9.2,
          fontSize: 10,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.42,
          colW: [7.5, 1.7],
          align: "left",
          valign: "middle",
        });
      }
    }

    // ── SLIDE 6: EVOLUÇÃO E INOVAÇÃO ─────────────────────────────────────────
    {
      const evo = sectionMap["evolucao_inovacao"] ?? {};
      const tags = (evo.contagem_por_tag ?? evo.tags) as Record<string, number> | undefined;
      if (tags || evo.percentual_inovacao !== undefined) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Evolução e Inovação");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        const pct = Number(evo.percentual_inovacao ?? evo.percentualInovacao ?? 0);
        const totalEvo = Number(evo.total_entregas ?? 0);
        if (tags) {
          const tagEntries = Object.entries(tags);
          tagEntries.forEach(([tag, count], i) => {
            const x = 0.4 + i * 2.3;
            kpiCard(s, x, 1.05, 2.0, 1.1, tag, String(count), AZUL_MEDIO);
          });
        }
        s.addText(`Total de entregas: ${totalEvo}`, {
          x: 0.5,
          y: 2.35,
          w: 4,
          h: 0.3,
          fontSize: 11,
          color: CINZA_TEXTO,
        });
        s.addText(`% Inovação: ${pct}%`, {
          x: 0.5,
          y: 2.7,
          w: 4,
          h: 0.3,
          fontSize: 13,
          bold: true,
          color: AZUL_ESCURO,
        });
        const statusEvo = (evo.status as string) ?? "adequado";
        statusBadge(s, 4.8, 2.6, 2.4, statusEvo);
        if (evo.analise) {
          s.addText(evo.analise as string, {
            x: 0.5,
            y: 3.2,
            w: 9,
            h: 1.5,
            fontSize: 10,
            color: CINZA_TEXTO,
            wrap: true,
          });
        }
      }
    }

    // ── SLIDE 7: ENTREGAS ────────────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Evolução e Inovação / Entregas");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      s.addText("Tarefas desenvolvidas pelo time durante o período. Todas registradas no Asana.", {
        x: 0.5,
        y: 1.05,
        w: 9,
        h: 0.4,
        fontSize: 11,
        color: "555555",
        italic: true,
      });
      const entregas = sectionMap["entregas"] ?? {};
      const tarefas =
        ((entregas.tarefas ?? entregas.linhas) as Array<{
          nome?: string;
          tarefa?: string;
          status: string;
          categoria: string;
        }>) ?? [];
      if (tarefas.length > 0) {
        const tableData = [
          [
            { text: "TAREFAS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "CATEGORIA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...tarefas.map((t) => [t.nome ?? t.tarefa ?? "", t.status ?? "Concluído", t.categoria ?? "Desenvolvimento"]),
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.55,
          w: 9.2,
          fontSize: 10,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.42,
          colW: [5.0, 1.4, 2.8],
          align: "left",
          valign: "middle",
        });
        s.addShape("ellipse", {
          x: 8.8,
          y: 4.8,
          w: 0.85,
          h: 0.85,
          fill: { color: AZUL_MEDIO },
          line: { color: AZUL_MEDIO },
        });
        s.addText(`Total\n${tarefas.length}`, {
          x: 8.8,
          y: 4.8,
          w: 0.85,
          h: 0.85,
          fontSize: 9,
          bold: true,
          color: BRANCO,
          align: "center",
          valign: "middle",
          margin: 0,
        });
      } else {
        emptyMsg(s, "Nenhuma entrega registrada para o período.");
      }
    }

    // ── SLIDE 8: TAREFAS PRIORIZADAS ─────────────────────────────────────────
    {
      const prio = sectionMap["priorizadas"] ?? {};
      const tarefasPrio =
        ((prio.tarefas ?? prio.linhas) as Array<{
          nome?: string;
          tarefa?: string;
          status: string;
          categoria: string;
        }>) ?? [];
      if (tarefasPrio.length > 0) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Tarefas Priorizadas");
        s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        s.addText("Tarefas em andamento e planejadas para o próximo período.", {
          x: 0.5,
          y: 1.05,
          w: 9,
          h: 0.4,
          fontSize: 11,
          color: "555555",
          italic: true,
        });
        const tableData = [
          [
            { text: "TAREFAS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "CATEGORIA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...tarefasPrio.map((t) => [t.nome ?? t.tarefa ?? "", t.status ?? "", t.categoria ?? ""]),
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.55,
          w: 9.2,
          fontSize: 10,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.42,
          colW: [5.0, 1.4, 2.8],
          align: "left",
          valign: "middle",
        });
        if (prio.total_backlog) {
          s.addText(`Backlog: ${prio.total_backlog} itens`, {
            x: 0.4,
            y: 4.75,
            w: 4,
            h: 0.3,
            fontSize: 10,
            color: "888888",
            italic: true,
          });
        }
      }
    }

    // ── SLIDE 9: DEMONSTRATIVO DE HORAS ──────────────────────────────────────
    {
      const demo = sectionMap["demonstrativo_horas"] ?? {};
      const linhasDemo =
        (demo.linhas as Array<{
          recurso: string;
          funcao?: string;
          dedicacao?: string;
          unidade: string;
          quantidade: number;
        }>) ?? [];
      if (linhasDemo.length > 0) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Demonstrativo de Horas");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        const total = linhasDemo.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
        const tableData = [
          [
            { text: "RECURSO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "FUNÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "DEDICAÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "UNIDADE", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "QTD", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...linhasDemo.map((l) => [
            l.recurso ?? "",
            l.funcao ?? "",
            l.dedicacao ?? "",
            l.unidade ?? "horas",
            String(l.quantidade ?? 0),
          ]),
          [
            { text: "TOTAL", options: { bold: true, fill: { color: AZUL_CLARO } } },
            "",
            "",
            "",
            { text: String(total), options: { bold: true, fill: { color: AZUL_CLARO } } },
          ],
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.1,
          w: 9.2,
          fontSize: 10,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.42,
          colW: [2.8, 2.0, 1.5, 1.3, 1.6],
          align: "left",
          valign: "middle",
        });
        if (demo.legenda) {
          s.addText(demo.legenda as string, {
            x: 0.4,
            y: 4.7,
            w: 9.2,
            h: 0.35,
            fontSize: 9,
            color: "888888",
            italic: true,
          });
        }
      }
    }

    // ── SLIDE 10: EFICIÊNCIA OPERACIONAL ─────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Eficiência Operacional");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const efOp = sectionMap["eficiencia_operacional"] ?? {};
      const statusEf = (efOp.status as string) ?? "adequado";
      statusBadge(s, 0.5, 1.1, 2.8, statusEf);
      kpiCard(s, 0.5, 1.6, 1.3, 1.0, "SLA", String(efOp.sla ?? "—"), "1E8A3E");
      kpiCard(s, 1.9, 1.6, 1.3, 1.0, "Tickets", String(efOp.tickets ?? "—"), AZUL_ESCURO);
      kpiCard(s, 0.5, 2.75, 1.3, 1.0, "Crises", String(efOp.crises ?? "0"), "1E8A3E");
      kpiCard(s, 1.9, 2.75, 1.3, 1.0, "Bugs", String(efOp.bugs ?? "0"), "C85000");
      // Breakdown por tipo
      const porTipo = efOp.por_tipo as Record<string, number> | undefined;
      if (porTipo) {
        const tipoLabels: Record<string, string> = {
          incidente: "Incid.",
          problema: "Probl.",
          requisicao: "Req.",
          melhoria: "Melh.",
          duvida: "Dúvid.",
        };
        Object.entries(porTipo).forEach(([tipo, qtd], i) => {
          kpiCard(s, 0.4 + i * 1.1, 3.9, 0.95, 0.8, tipoLabels[tipo] ?? tipo, String(qtd), AZUL_MEDIO);
        });
      }
      s.addShape("roundRect", {
        x: 3.6,
        y: 1.05,
        w: 5.9,
        h: 4.1,
        fill: { color: CINZA_CLARO },
        line: { color: "E0E7EF", width: 0.5 },
        rectRadius: 0.1,
      });
      s.addText("Análise – Eficiência Operacional", {
        x: 3.75,
        y: 1.15,
        w: 5.6,
        h: 0.35,
        fontSize: 11,
        bold: true,
        color: AZUL_ESCURO,
        margin: 0,
      });
      s.addText((efOp.analise as string) || "Análise a ser preenchida.", {
        x: 3.75,
        y: 1.6,
        w: 5.6,
        h: 3.2,
        fontSize: 10,
        color: CINZA_TEXTO,
        valign: "top",
      });
    }

    // ── SLIDE 11: EFICIÊNCIA E PREVISIBILIDADE ────────────────────────────────
    {
      const efPrev = sectionMap["eficiencia_previsibilidade"] ?? {};
      const temDados =
        efPrev.frequencia_deploy || efPrev.frequenciaDeploy || efPrev.lead_time || efPrev.leadTime || efPrev.demandas;
      if (temDados) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Eficiência e Previsibilidade");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        const statusPrev = (efPrev.status as string) ?? "adequado";
        statusBadge(s, 0.5, 1.1, 2.8, statusPrev);
        const kpis = [
          { label: "Freq. Deploy", val: String(efPrev.frequencia_deploy ?? efPrev.frequenciaDeploy ?? "—") },
          { label: "Lead Time (d)", val: String(efPrev.lead_time ?? efPrev.leadTime ?? "—") },
          { label: "Demandas", val: String(efPrev.demandas ?? "—") },
          { label: "Bugs", val: String(efPrev.bugs ?? "—") },
          { label: "PBI Tested %", val: String(efPrev.pbi_tested_ratio ?? efPrev.pbiTestedRatio ?? "—") },
          { label: "Efficiency %", val: String(efPrev.efficiency_ratio ?? efPrev.efficiencyRatio ?? "—") },
        ];
        kpis.forEach((k, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          kpiCard(s, 0.4 + col * 1.65, 1.6 + row * 1.2, 1.45, 1.0, k.label, k.val, AZUL_MEDIO);
        });
        if (efPrev.analise) {
          s.addShape("roundRect", {
            x: 5.4,
            y: 1.05,
            w: 4.1,
            h: 4.1,
            fill: { color: CINZA_CLARO },
            line: { color: "E0E7EF", width: 0.5 },
            rectRadius: 0.1,
          });
          s.addText("Análise", { x: 5.55, y: 1.15, w: 3.8, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO });
          s.addText(efPrev.analise as string, {
            x: 5.55,
            y: 1.6,
            w: 3.8,
            h: 3.2,
            fontSize: 10,
            color: CINZA_TEXTO,
            valign: "top",
          });
        }
      }
    }

    // ── SLIDE 12: DESEMPENHO DA APLICAÇÃO ────────────────────────────────────
    {
      const desemp = sectionMap["desempenho_aplicacao"] ?? {};
      if (desemp.status || desemp.analise) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Desempenho da Aplicação");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        statusBadge(s, 0.5, 1.1, 2.8, (desemp.status as string) ?? "adequado");
        if (desemp.analise) {
          s.addText(desemp.analise as string, {
            x: 0.5,
            y: 1.65,
            w: 9,
            h: 3.0,
            fontSize: 11,
            color: CINZA_TEXTO,
            wrap: true,
          });
        }
      }
    }

    // ── SLIDE 13: ENGAJAMENTO DO USUÁRIO ─────────────────────────────────────
    {
      const eng = sectionMap["engajamento_usuario"] ?? {};
      const temEngDados = eng.usuariosCadastrados || eng.usuariosUnicos || eng.sessoes || eng.status;
      if (temEngDados) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Engajamento e Experiência do Usuário");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        statusBadge(s, 0.5, 1.1, 2.8, (eng.status as string) ?? "adequado");
        const kpisEng = [
          { label: "Usuários Cad.", val: String(eng.usuariosCadastrados ?? "—") },
          { label: "Únicos", val: String(eng.usuariosUnicos ?? "—") },
          { label: "Sessões", val: String(eng.sessoes ?? "—") },
          { label: "Retornados %", val: String(eng.usuariosRetornados ?? "—") },
          { label: "Tempo Ativo", val: String(eng.tempoMedioAtivo ?? "—") },
          { label: "Acessos/user", val: String(eng.acessosPorUsuario ?? "—") },
        ];
        kpisEng.forEach((k, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          kpiCard(s, 0.4 + col * 1.65, 1.6 + row * 1.2, 1.45, 1.0, k.label, k.val, AZUL_MEDIO);
        });
        if (eng.analise) {
          s.addText(eng.analise as string, {
            x: 0.5,
            y: 4.1,
            w: 9,
            h: 0.8,
            fontSize: 10,
            color: CINZA_TEXTO,
            wrap: true,
          });
        }
      }
    }

    // ── SLIDE 14: MATURIDADE DA PLATAFORMA ───────────────────────────────────
    {
      const mat = sectionMap["maturidade_plataforma"] ?? {};
      const metricas = (mat.metricas as Array<{ nome: string; valor: string }>) ?? [];
      if (metricas.length > 0 || mat.analise) {
        const s = pres.addSlide();
        s.background = { color: BRANCO };
        headerBar(s, "Maturidade e Gestão da Plataforma");
        s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
        metricas.forEach((m, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          kpiCard(s, 0.4 + col * 2.35, 1.1 + row * 1.2, 2.1, 1.0, m.nome, m.valor, AZUL_MEDIO);
        });
        if (mat.analise) {
          const yBase = metricas.length > 0 ? 1.1 + Math.ceil(metricas.length / 4) * 1.2 + 0.2 : 1.1;
          s.addText(mat.analise as string, {
            x: 0.5,
            y: yBase,
            w: 9,
            h: 1.5,
            fontSize: 10,
            color: CINZA_TEXTO,
            wrap: true,
          });
        }
      }
    }

    // ── SLIDE 15: TREINAMENTOS / REUNIÕES ────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Treinamentos / Reuniões");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const trein = sectionMap["treinamentos_reunioes"] ?? {};
      // Suporta content.linhas (Fireflies) e content.reunioes (legado)
      const reunioes =
        ((trein.linhas ?? trein.reunioes) as Array<{
          tipo: string;
          data: string;
          horario?: string;
          descricao: string;
        }>) ?? [];
      if (reunioes.length > 0) {
        const tableData = [
          [
            { text: "TIPO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "DATA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "DESCRIÇÃO DA ATIVIDADE", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...reunioes.map((r) => [
            r.tipo ?? "",
            `${r.data ?? ""}${r.horario ? " " + r.horario : ""}`,
            r.descricao ?? "",
          ]),
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.1,
          w: 9.2,
          fontSize: 10,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.55,
          colW: [2.0, 1.5, 5.7],
          align: "left",
          valign: "middle",
        });
      } else {
        emptyMsg(s, "Nenhuma reunião registrada para o período.");
      }
      s.addText(
        (trein.rodape as string) ??
          "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.",
        { x: 0.4, y: 4.7, w: 9.2, h: 0.5, fontSize: 10, bold: true, color: CINZA_TEXTO, italic: true },
      );
    }

    // ── SLIDE 16: OPORTUNIDADES E FATORES DE ATENÇÃO ─────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Oportunidades e Fatores de Atenção");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const opor = sectionMap["oportunidades_atencao"] ?? {};
      const itens = (opor.linhas as Array<{ descricao: string; tipo: string }>) ?? [];
      if (itens.length > 0) {
        const tableData = [
          [
            { text: "DESCRIÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
            { text: "TIPO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          ],
          ...itens.map((it) => [it.descricao ?? "", it.tipo ?? ""]),
        ];
        s.addTable(tableData, {
          x: 0.4,
          y: 1.1,
          w: 9.2,
          fontSize: 11,
          border: { pt: 0.5, color: "D0DCE8" },
          rowH: 0.55,
          colW: [7.0, 2.2],
          align: "left",
          valign: "middle",
        });
      } else {
        emptyMsg(s, "Nenhum item registrado para o período.");
      }
    }

    // ── SLIDE 17: ENCERRAMENTO ───────────────────────────────────────────────
    {
      const s = pres.addSlide();
      s.background = { color: AZUL_CLARO };
      s.addShape("ellipse", {
        x: 1.5,
        y: 0.3,
        w: 5,
        h: 5,
        fill: { color: AZUL_MEDIO, transparency: 40 },
        line: { color: AZUL_MEDIO, transparency: 40 },
      });
      s.addShape("ellipse", {
        x: 3.5,
        y: 1.1,
        w: 3.5,
        h: 3.5,
        fill: { color: AZUL_ESCURO, transparency: 35 },
        line: { color: AZUL_ESCURO, transparency: 35 },
      });
      s.addText("bnp", { x: 3.5, y: 2.3, w: 3.0, h: 0.8, fontSize: 36, bold: true, color: BRANCO, align: "center" });
      s.addText(mesAno, {
        x: 2.5,
        y: 3.9,
        w: 5.0,
        h: 0.55,
        fontSize: 20,
        bold: true,
        color: AZUL_ESCURO,
        align: "center",
        margin: 0,
      });
    }

    const pptxBuffer = (await pres.write({ outputType: "uint8array" })) as Uint8Array;
    const base64 = encodeBase64(pptxBuffer);
    const filename = `relatorio-${nomeContrato.toLowerCase().replace(/\s+/g, "-")}-${mesAno.toLowerCase().replace("/", "-")}.pptx`;

    return new Response(JSON.stringify({ fileBase64: base64, filename }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
