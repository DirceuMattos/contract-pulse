import pptxgen from "pptxgenjs";
import logoBnpUrl from "@/assets/logo-bnp-final.png";
import logoBnpBlackUrl from "@/assets/logo-bnp-final-black.png";

let logoBnp: string = "";
let logoBnpBlack: string = "";

const AZUL_ESCURO  = "1A4F8A";
const AZUL_MEDIO   = "2D7FC1";
const AZUL_CLARO   = "D6E8F7";
const CINZA_TEXTO  = "333333";
const CINZA_CLARO  = "F5F7FA";
const BRANCO       = "FFFFFF";

const STATUS_CORES: Record<string, { cor: string; label: string }> = {
  alta:     { cor: "1E8A3E", label: "Alta Performance" },
  adequado: { cor: "C8A000", label: "Adequado" },
  atencao:  { cor: "C85000", label: "Atenção" },
  critico:  { cor: "C81E1E", label: "Crítico" },
};

function headerBar(slide: any, titulo: string) {
  slide.addShape("rect", {
    x: 0, y: 0, w: 10, h: 0.65,
    fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO }
  });
  slide.addText(titulo, {
    x: 0.35, y: 0, w: 7.5, h: 0.65,
    fontSize: 16, bold: true, color: BRANCO, valign: "middle", margin: 0
  });
  slide.addImage({
    data: logoBnp,
    x: 8.5, y: 0.02, w: 1.35, h: 0.62
  });
}

function statusBadge(slide: any, x: number, y: number, w: number, status: string) {
  const s = STATUS_CORES[status] ?? STATUS_CORES.adequado;
  slide.addShape("roundRect", {
    x, y, w, h: 0.34,
    fill: { color: s.cor }, line: { color: s.cor }, rectRadius: 0.05
  });
  slide.addText(s.label, {
    x, y, w, h: 0.34,
    fontSize: 11, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0
  });
}

function kpiCard(slide: any, x: number, y: number, w: number, h: number, label: string, valor: string, cor?: string) {
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: CINZA_CLARO },
    shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 45, opacity: 0.10 },
    rectRadius: 0.08, line: { color: "E0E7EF", width: 0.5 }
  });
  slide.addText(label, {
    x: x+0.1, y: y+0.1, w: w-0.2, h: 0.3,
    fontSize: 9, color: "666666", align: "center", valign: "middle", margin: 0
  });
  slide.addText(valor, {
    x: x+0.1, y: y+0.38, w: w-0.2, h: h-0.5,
    fontSize: 22, bold: true, color: cor ?? AZUL_ESCURO,
    align: "center", valign: "middle", margin: 0
  });
}

export interface GeneratePptxInput {
  mesAno: string;
  nomeContrato: string;
  nomeCliente: string;
  numeroContrato: string;
  sections: Record<string, Record<string, unknown>>;
  clientLogoUrl?: string;
}

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generatePptx(input: GeneratePptxInput): Promise<void> {
  const { mesAno, nomeContrato, nomeCliente, numeroContrato, sections, clientLogoUrl } = input;
  logoBnp = await loadImageAsBase64(logoBnpUrl);
  logoBnpBlack = await loadImageAsBase64(logoBnpBlackUrl);
  let clientLogo: string | null = null;
  if (clientLogoUrl) {
    try {
      clientLogo = await loadImageAsBase64(clientLogoUrl);
    } catch {
      clientLogo = null;
    }
  }
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";

  // ── SLIDE 1: CAPA
  {
    const s = pres.addSlide();
    s.background = { color: "EEF4FB" };
    s.addShape("ellipse", { x: 5.8, y: -1.2, w: 6, h: 6,
      fill: { color: AZUL_MEDIO, transparency: 20 }, line: { color: AZUL_MEDIO, transparency: 20 } });
    s.addShape("ellipse", { x: 6.5, y: 0.2, w: 4.5, h: 4.5,
      fill: { color: AZUL_ESCURO, transparency: 30 }, line: { color: AZUL_ESCURO, transparency: 30 } });
    s.addImage({ data: logoBnpBlack, x: 0.5, y: 0.3, w: 2.4, h: 1.1 });
    if (clientLogo) {
      s.addImage({ data: clientLogo, x: 3.2, y: 0.35, w: 2.0, h: 1.0, sizing: { type: "contain", w: 2.0, h: 1.0 } });
    }
    s.addText("Relatório Mensal de Atividades", {
      x: 0.5, y: 2.0, w: 5.5, h: 0.75,
      fontSize: 26, bold: true, color: AZUL_ESCURO, margin: 0
    });
    s.addText([
      { text: mesAno,         options: { bold: true, breakLine: true } },
      { text: "Projeto: ",    options: { color: "777777", breakLine: false } },
      { text: nomeContrato,   options: { bold: true, breakLine: true } },
      { text: nomeCliente,    options: { color: "555555", breakLine: true } },
      { text: "Contrato: ",   options: { color: "777777", breakLine: false } },
      { text: numeroContrato, options: { bold: true, color: AZUL_ESCURO } },
    ], { x: 0.5, y: 2.9, w: 5.5, h: 1.6, fontSize: 13, color: CINZA_TEXTO });

    const capa = sections["capa"] ?? {};
    const criadoPor   = (capa.criado_por as string) ?? "";
    const revisadoPor = (capa.revisado_por as string) ?? "";
    if (criadoPor || revisadoPor) {
      s.addText([
        { text: "Criado por: ",    options: { italic: true, color: "777777" } },
        { text: criadoPor,         options: { italic: true, color: "444444" } },
        { text: "\nRevisado por: ", options: { italic: true, color: "777777" } },
        { text: revisadoPor,       options: { italic: true, color: "444444" } },
      ], { x: 0.5, y: 4.6, w: 5.5, h: 0.8, fontSize: 11 });
    }
  }

  // ── SLIDE 2: SUMÁRIO
  {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Sumário");
    const secoes = [
      "Objetivo do relatório",
      "Painel executivo",
      "Histórico evolutivo do Termo de Referência",
      "Evolução e Inovação",
      "Evolução e Inovação / Entregas",
      "Demonstrativo de Horas",
      "Eficiência Operacional",
      "Eficiência e Previsibilidade",
      "Engajamento e Experiência do Usuário",
      "Maturidade e Gestão da Plataforma",
      "Treinamentos / Reuniões",
      "Oportunidades e Fatores de Atenção",
    ];
    s.addText(secoes.map((t, i) => ({
      text: `${i + 1}.  ${t}`,
      options: { breakLine: true, paraSpaceAfter: 4 }
    })), { x: 1.5, y: 0.85, w: 7, h: 4.5, fontSize: 13, color: AZUL_MEDIO });
  }

  // ── SLIDE 3: OBJETIVO
  if (!sections["objetivo"]?.__hidden) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Objetivo do relatório");
    const obj = sections["objetivo"] ?? {};
    const texto = (obj.texto as string) ?? `Este relatório tem como objetivo apresentar, de forma clara e estruturada, o acompanhamento das atividades realizadas no projeto ${nomeContrato} no mês de ${mesAno}.`;
    s.addText(texto, { x: 0.6, y: 0.9, w: 8.8, h: 1.2, fontSize: 13, color: CINZA_TEXTO });
    s.addText("O documento consolida informações sobre a evolução da plataforma, o engajamento dos usuários, a eficiência operacional e desempenho da aplicação, bem como os principais indicadores, entregas realizadas, prioridades do próximo período e pontos de atenção estratégicos.",
      { x: 0.6, y: 2.2, w: 8.8, h: 1.2, fontSize: 13, color: CINZA_TEXTO });
    s.addText([
      { text: "Transparência  •  ",           options: { bold: true, color: AZUL_MEDIO } },
      { text: "Monitoramento do Projeto  •  ", options: { bold: true, color: AZUL_MEDIO } },
      { text: "Tomada de Decisão",             options: { bold: true, color: AZUL_MEDIO } },
    ], { x: 0.6, y: 3.6, w: 8.8, h: 0.6, fontSize: 14, align: "center" });
  }

  // ── SLIDE 4: PAINEL EXECUTIVO
  if (!sections["painel_executivo"]?.__hidden) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Painel Executivo");
    s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.3, fontSize: 11, bold: true, color: "555555" });
    const painel = sections["painel_executivo"] ?? {};
    const cards = [
      { x: 0.4,  y: 1.15, label: "Histórico do TR",         status: (painel.historico_tr as string) ?? "adequado" },
      { x: 3.55, y: 1.15, label: "Evolução e Inovação",     status: (painel.evolucao_inovacao as string) ?? "adequado" },
      { x: 6.7,  y: 1.15, label: "Eficiência Operacional",  status: (painel.eficiencia_operacional as string) ?? "adequado" },
      { x: 0.4,  y: 3.2,  label: "Efic. e Previsibilidade", status: (painel.eficiencia_previsibilidade as string) ?? "adequado" },
      { x: 3.55, y: 3.2,  label: "Desempenho da Aplicação", status: (painel.desempenho_aplicacao as string) ?? "adequado" },
      { x: 6.7,  y: 3.2,  label: "Engajamento do Usuário",  status: (painel.engajamento_usuario as string) ?? "adequado" },
    ];
    for (const c of cards) {
      s.addShape("roundRect", { x: c.x, y: c.y, w: 2.9, h: 1.75,
        fill: { color: "EEF4FB" }, rectRadius: 0.1,
        shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 45, opacity: 0.10 },
        line: { color: "D6E8F7", width: 0.5 } });
      s.addText(c.label, { x: c.x+0.1, y: c.y+0.15, w: 2.7, h: 0.55,
        fontSize: 10, color: "555555", align: "center", valign: "middle", bold: true, margin: 0 });
      statusBadge(s, c.x+0.35, c.y+0.95, 2.2, c.status);
    }
  }

  // ── SLIDE 5: ENTREGAS
  if (!sections["entregas"]?.__hidden) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Evolução e Inovação / Entregas");
    s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
    s.addText("Tarefas desenvolvidas pelo time durante o período. Todas registradas no Asana.",
      { x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 11, color: "555555", italic: true });
    const entregas = sections["entregas"] ?? {};
    const tarefas = (entregas.tarefas as Array<{ nome: string; status: string; categoria: string }>) ?? [];
    if (tarefas.length > 0) {
      const tableData = [
        [
          { text: "TAREFAS",   options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          { text: "STATUS",    options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          { text: "CATEGORIA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
        ],
        ...tarefas.map(t => [t.nome ?? "", t.status ?? "Concluído", t.categoria ?? "Desenvolvimento"])
      ];
      s.addTable(tableData as any, {
        x: 0.4, y: 1.55, w: 9.2, fontSize: 10,
        border: { pt: 0.5, color: "D0DCE8" },
        rowH: 0.42, colW: [5.0, 1.4, 2.8],
        align: "left", valign: "middle",
      });
      s.addShape("ellipse", { x: 8.8, y: 4.8, w: 0.85, h: 0.85,
        fill: { color: AZUL_MEDIO }, line: { color: AZUL_MEDIO } });
      s.addText(`Total\n${tarefas.length}`, { x: 8.8, y: 4.8, w: 0.85, h: 0.85,
        fontSize: 9, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0 });
    } else {
      s.addText("Nenhuma entrega registrada para o período.", {
        x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center"
      });
    }
  }

  // ── SLIDE 6: EFICIÊNCIA OPERACIONAL
  if (!sections["eficiencia_operacional"]?.__hidden) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Eficiência Operacional");
    s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
    const efOp = sections["eficiencia_operacional"] ?? {};
    statusBadge(s, 0.5, 1.1, 2.8, (efOp.status as string) ?? "alta");
    kpiCard(s, 0.5, 1.65, 1.3, 1.0, "SLA",     String(efOp.sla ?? "—"),    "1E8A3E");
    kpiCard(s, 1.9, 1.65, 1.3, 1.0, "Tickets",  String(efOp.tickets ?? "—"), AZUL_ESCURO);
    kpiCard(s, 0.5, 2.8,  1.3, 1.0, "Crises",   String(efOp.crises ?? "0"), "1E8A3E");
    kpiCard(s, 1.9, 2.8,  1.3, 1.0, "Bugs",     String(efOp.bugs ?? "—"),   "C85000");
    s.addShape("roundRect", { x: 3.6, y: 1.05, w: 5.9, h: 4.1,
      fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
    s.addText("Análise – Eficiência Operacional", {
      x: 3.75, y: 1.15, w: 5.6, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO, margin: 0 });
    s.addText((efOp.analise as string) ?? "Análise a ser preenchida.", {
      x: 3.75, y: 1.6, w: 5.6, h: 3.2, fontSize: 10, color: CINZA_TEXTO, valign: "top" });
  }

  // ── SLIDE 7: TREINAMENTOS
  {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Treinamentos / Reuniões");
    s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
    const trein = sections["treinamentos_reunioes"] ?? {};
    const reunioes = (trein.reunioes as Array<{ tipo: string; data: string; descricao: string }>) ?? [];
    if (reunioes.length > 0) {
      const tableData = [
        [
          { text: "TIPO",  options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          { text: "DATA",  options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          { text: "DESCRIÇÃO DA ATIVIDADE", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
        ],
        ...reunioes.map(r => [r.tipo ?? "", r.data ?? "", r.descricao ?? ""])
      ];
      s.addTable(tableData as any, {
        x: 0.4, y: 1.1, w: 9.2, fontSize: 10,
        border: { pt: 0.5, color: "D0DCE8" },
        rowH: 0.55, colW: [3.0, 1.2, 5.0],
        align: "left", valign: "middle",
      });
    } else {
      s.addText("Nenhuma reunião registrada para o período.", {
        x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center"
      });
    }
    s.addText((trein.rodape as string) ?? "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.",
      { x: 0.4, y: 4.7, w: 9.2, h: 0.5, fontSize: 10, bold: true, color: CINZA_TEXTO, italic: true });
  }

  // ── SLIDE 8: OPORTUNIDADES
  {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Oportunidades e Fatores de Atenção");
    s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
    const opor = sections["oportunidades_atencao"] ?? {};
    const itens = (opor.itens as Array<{ descricao: string; fator: string }>) ?? [];
    if (itens.length > 0) {
      const tableData = [
        [
          { text: "DESCRIÇÃO",         options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
          { text: "OPORTUNIDADE/FATOR", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } },
        ],
        ...itens.map(i => [i.descricao ?? "", i.fator ?? ""])
      ];
      s.addTable(tableData as any, {
        x: 0.4, y: 1.1, w: 9.2, fontSize: 10,
        border: { pt: 0.5, color: "D0DCE8" },
        rowH: 0.65, colW: [3.5, 5.7],
        align: "left", valign: "middle",
      });
    } else {
      s.addText("Nenhum item registrado para o período.", {
        x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center"
      });
    }
  }

  // ── SLIDE 9: ENCERRAMENTO
  {
    const s = pres.addSlide();
    s.background = { color: "D6E8F7" };
    s.addShape("ellipse", { x: 1.5, y: 0.3, w: 5, h: 5,
      fill: { color: AZUL_MEDIO, transparency: 40 }, line: { color: AZUL_MEDIO, transparency: 40 } });
    s.addShape("ellipse", { x: 3.5, y: 1.1, w: 3.5, h: 3.5,
      fill: { color: AZUL_ESCURO, transparency: 35 }, line: { color: AZUL_ESCURO, transparency: 35 } });
    s.addImage({ data: logoBnp, x: 2.8, y: 2.2, w: 3.28, h: 1.5 });
    if (clientLogo) {
      s.addImage({ data: clientLogo, x: 0.4, y: 0.4, w: 2.0, h: 1.0, sizing: { type: "contain", w: 2.0, h: 1.0 } });
    }
    s.addText(mesAno, {
      x: 2.5, y: 3.9, w: 5.0, h: 0.55,
      fontSize: 20, bold: true, color: AZUL_ESCURO, align: "center", margin: 0
    });
  }

  // Download
  const filename = `relatorio-${nomeContrato.toLowerCase().replace(/\s+/g, "-")}-${mesAno.toLowerCase().replace("/", "-")}.pptx`;
  await pres.writeFile({ fileName: filename });
}
