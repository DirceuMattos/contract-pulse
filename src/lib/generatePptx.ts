// v5 - ordem correta de slides
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

const COR_STATUS_TR: Record<string, string> = {
  sim:          "1E8A3E",
  parcialmente: "C8A000",
  não:          "C81E1E",
};

function normalizeStatus(raw: string): string {
  return (raw ?? "adequado")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace("altaperformance", "alta");
}

function headerBar(slide: any, titulo: string) {
  slide.addShape("rect", { x: 0, y: 0, w: 10, h: 0.65, fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO } });
  slide.addText(titulo, { x: 0.35, y: 0, w: 7.5, h: 0.65, fontSize: 16, bold: true, color: BRANCO, valign: "middle", margin: 0 });
  slide.addImage({ data: logoBnp, x: 8.5, y: 0.02, w: 1.35, h: 0.62 });
}

function statusBadge(slide: any, x: number, y: number, w: number, status: string) {
  const s = STATUS_CORES[normalizeStatus(status)] ?? STATUS_CORES.adequado;
  slide.addShape("roundRect", { x, y, w, h: 0.34, fill: { color: s.cor }, line: { color: s.cor }, rectRadius: 0.05 });
  slide.addText(s.label, { x, y, w, h: 0.34, fontSize: 11, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0 });
}

function kpiCard(slide: any, x: number, y: number, w: number, h: number, label: string, valor: string, cor?: string) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: CINZA_CLARO }, shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 45, opacity: 0.10 }, rectRadius: 0.08, line: { color: "E0E7EF", width: 0.5 } });
  slide.addText(label, { x: x+0.1, y: y+0.1, w: w-0.2, h: 0.3, fontSize: 9, color: "666666", align: "center", valign: "middle", margin: 0 });
  slide.addText(valor, { x: x+0.1, y: y+0.38, w: w-0.2, h: h-0.5, fontSize: 22, bold: true, color: cor ?? AZUL_ESCURO, align: "center", valign: "middle", margin: 0 });
}

function emptyMsg(slide: any, msg: string) {
  slide.addText(msg, { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center" });
}

function isHidden(content: Record<string, unknown>): boolean {
  return content.__hidden === true;
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
    try { clientLogo = await loadImageAsBase64(clientLogoUrl); } catch { clientLogo = null; }
  }

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";

  // ── SLIDE 1: CAPA ──────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: AZUL_CLARO };
    s.addShape("ellipse", { x: 5.5, y: -0.5, w: 5.5, h: 5.5, fill: { color: AZUL_MEDIO, transparency: 30 }, line: { color: AZUL_MEDIO, transparency: 30 } });
    s.addShape("ellipse", { x: 6.5, y: 0.8, w: 4.0, h: 4.0, fill: { color: AZUL_ESCURO, transparency: 25 }, line: { color: AZUL_ESCURO, transparency: 25 } });
    s.addImage({ data: logoBnpBlack, x: 0.35, y: 0.25, w: 1.6, h: 0.7 });
    if (clientLogo) {
      s.addImage({ data: clientLogo, x: 2.5, y: 0.25, w: 2.5, h: 0.7, sizing: { type: "contain", w: 2.5, h: 0.7 } });
    }
    s.addText("Relatório Mensal de Atividades", { x: 0.4, y: 1.8, w: 5.5, h: 0.8, fontSize: 26, bold: true, color: AZUL_ESCURO });
    const capa = sections["capa"] ?? {};
    s.addText(mesAno, { x: 0.4, y: 3.0, w: 5.5, h: 0.35, fontSize: 14, bold: true, color: CINZA_TEXTO });
    s.addText(`Projeto: ${(capa.projeto as string) || nomeContrato}`, { x: 0.4, y: 3.4, w: 5.5, h: 0.28, fontSize: 11, color: CINZA_TEXTO });
    s.addText((capa.cliente as string) || nomeCliente, { x: 0.4, y: 3.7, w: 5.5, h: 0.28, fontSize: 11, color: CINZA_TEXTO });
    s.addText(`Contrato: ${(capa.numeroContrato as string) || numeroContrato}`, { x: 0.4, y: 4.0, w: 5.5, h: 0.28, fontSize: 11, bold: true, color: AZUL_ESCURO });
  }

  // ── SLIDE 2: SUMÁRIO ───────────────────────────────────────────
  if (!isHidden(sections["sumario"] ?? {})) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Sumário");
    const sumItems = [
      "Objetivo do relatório",
      "Glossário de Termos Técnicos",
      "Ambientes Implementados",
      "Histórico evolutivo do Termo de Referência",
      "Histórico TR — Aderência Global",
      "Painel executivo",
      "Evolução e Inovação",
      "Demonstrativo de Horas",
      "Eficiência Operacional",
      "Eficiência e Previsibilidade",
      "Desempenho da Aplicação",
      "Engajamento e Experiência do Usuário",
      "Maturidade e Gestão da Plataforma",
      "Treinamentos / Reuniões",
      "Oportunidades e Fatores de Atenção",
      "Tarefas Priorizadas",
      "Evolução e Inovação / Entregas",
      "Indicadores deste Relatório",
    ];
    const mid = Math.ceil(sumItems.length / 2);
    sumItems.slice(0, mid).forEach((item, i) => {
      s.addText(`${i + 1}.  ${item}`, { x: 0.5, y: 0.82 + i * 0.35, w: 4.6, h: 0.32, fontSize: 11, color: AZUL_MEDIO });
    });
    sumItems.slice(mid).forEach((item, i) => {
      s.addText(`${mid + i + 1}.  ${item}`, { x: 5.3, y: 0.82 + i * 0.35, w: 4.6, h: 0.32, fontSize: 11, color: AZUL_MEDIO });
    });
  }

  // ── SLIDE 3: GLOSSÁRIO ─────────────────────────────────────────
  {
    const sec = sections["glossario"] ?? {};
    const termos = (sec.termos as Array<{ termo: string; definicao: string }>) ?? [];
    if (!isHidden(sec) && termos.length > 0) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Glossário dos termos técnicos");
      s.addText("Para facilitar a compreensão das informações apresentadas neste relatório, reunimos abaixo os principais termos técnicos utilizados.", { x: 0.4, y: 0.72, w: 9.2, h: 0.4, fontSize: 10, color: CINZA_TEXTO, wrap: true });
      s.addShape("rect", { x: 0.4, y: 1.2, w: 9.2, h: 0.28, fill: { color: AZUL_MEDIO }, line: { color: AZUL_MEDIO } });
      s.addText("Termos utilizados", { x: 0.5, y: 1.2, w: 9, h: 0.28, fontSize: 10, bold: true, color: BRANCO, valign: "middle" });
      let yPos = 1.55;
      termos.slice(0, 8).forEach((t) => {
        s.addText(`${t.termo}:`, { x: 0.4, y: yPos, w: 9.2, h: 0.18, fontSize: 9, bold: true, color: CINZA_TEXTO });
        s.addText(t.definicao, { x: 0.4, y: yPos + 0.18, w: 9.2, h: 0.28, fontSize: 9, color: CINZA_TEXTO, wrap: true });
        s.addShape("line", { x: 0.4, y: yPos + 0.48, w: 9.2, h: 0, line: { color: "E0E7EF", width: 0.5 } });
        yPos += 0.52;
      });
    }
  }

  // ── SLIDE 4: OBJETIVO ──────────────────────────────────────────
  {
    const sec = sections["objetivo"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Objetivo do relatório");
      s.addText((sec.texto as string) ?? "Apresentar as principais entregas, indicadores e oportunidades identificadas no período de referência, evidenciando a evolução do contrato e o engajamento das partes envolvidas.", { x: 0.5, y: 1.0, w: 9, h: 1.2, fontSize: 13, color: CINZA_TEXTO, wrap: true });
      s.addText("O documento consolida informações sobre a evolução da plataforma, o engajamento dos usuários, a eficiência operacional e desempenho da aplicação, bem como os principais indicadores, entregas realizadas, prioridades do próximo período e pontos de atenção estratégicos.", { x: 0.5, y: 2.5, w: 9, h: 1.2, fontSize: 13, color: CINZA_TEXTO, wrap: true });
      s.addText("Transparência  ●  Monitoramento do Projeto  ●  Tomada de Decisão", { x: 1.0, y: 4.2, w: 8, h: 0.5, fontSize: 13, bold: true, color: AZUL_MEDIO, align: "center" });
    }
  }

  // ── SLIDE 5: AMBIENTES IMPLEMENTADOS ───────────────────────────
  {
    const sec = sections["ambientes"] ?? {};
    const ambientes = (sec.ambientes as Array<{ nome: string; status: string; itens: string[] }>) ?? [];
    if (!isHidden(sec) && ambientes.length > 0) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Ambientes Implementados");
      const COR_AMB: Record<string, string> = { ativo: "1E8A3E", inativo: "C81E1E", parcial: "C8A000" };
      ambientes.forEach((amb, i) => {
        const x = 0.4 + i * 4.8;
        const cor = COR_AMB[amb.status] ?? COR_AMB.ativo;
        s.addShape("roundRect", { x, y: 0.85, w: 4.5, h: 4.35, fill: { color: BRANCO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.12, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 45, opacity: 0.08 } });
        s.addShape("rect", { x, y: 0.85, w: 4.5, h: 0.1, fill: { color: cor }, line: { color: cor } });
        s.addText(amb.nome, { x: x+0.2, y: 1.02, w: 3.5, h: 0.4, fontSize: 13, bold: true, color: CINZA_TEXTO });
        // Badge status
        s.addShape("roundRect", { x: x+0.2, y: 1.48, w: 1.2, h: 0.3, fill: { color: cor, transparency: 85 }, line: { color: cor, width: 0.5 }, rectRadius: 0.04 });
        s.addText(`✅ ${amb.status.charAt(0).toUpperCase() + amb.status.slice(1)}`, { x: x+0.2, y: 1.48, w: 1.2, h: 0.3, fontSize: 9, color: cor, align: "center", valign: "middle" });
        // Itens
        amb.itens.slice(0, 6).forEach((item, ii) => {
          s.addShape("ellipse", { x: x+0.2, y: 1.95 + ii * 0.45, w: 0.15, h: 0.15, fill: { color: cor }, line: { color: cor } });
          s.addText(item, { x: x+0.42, y: 1.92 + ii * 0.45, w: 3.85, h: 0.4, fontSize: 10, color: CINZA_TEXTO, wrap: true });
        });
      });
    }
  }

  // ── SLIDE 6: AMBIENTES — DETALHAMENTO ──────────────────────────
  {
    const sec = sections["ambientes_detalhe"] ?? {};
    if (!isHidden(sec) && (sec.texto || sec.links)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Ambientes Implementados");
      if (sec.texto) {
        s.addText(sec.texto as string, { x: 0.4, y: 0.82, w: 9.2, h: 3.8, fontSize: 11, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
      const links = (sec.links as Array<{ label: string; url: string }>) ?? [];
      links.forEach((l, i) => {
        s.addText(`${l.label}: `, { x: 0.4, y: 4.7 + i * 0.32, w: 1.5, h: 0.28, fontSize: 11, bold: true, color: CINZA_TEXTO });
        s.addText(l.url, { x: 1.9, y: 4.7 + i * 0.32, w: 7.5, h: 0.28, fontSize: 11, color: AZUL_MEDIO, hyperlink: { url: l.url } });
      });
    }
  }

  // ── SLIDE 7: HISTÓRICO TR ──────────────────────────────────────
  {
    const sec = sections["historico_tr"] ?? {};
    type Linha = { descricao: string; status: string; entregue?: boolean };
    const linhas = ((sec.linhas as Linha[]) ?? []).map(l => ({
      descricao: l.descricao ?? "",
      status: l.status ?? (l.entregue === true ? "sim" : "não"),
    })).filter(l => l.descricao.trim());

    if (!isHidden(sec) && linhas.length > 0) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Histórico evolutivo do Termo de Referência");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 7, h: 0.28, fontSize: 11, bold: true, color: "555555" });

      const total = linhas.length;
      const sim   = linhas.filter(l => l.status === "sim").length;
      const parc  = linhas.filter(l => l.status === "parcialmente").length;
      const nao   = linhas.filter(l => l.status === "não").length;
      const pct   = Math.round(((sim + parc * 0.5) / total) * 100);

      // Badge %
      s.addShape("roundRect", { x: 7.5, y: 0.68, w: 2.0, h: 0.36, fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO }, rectRadius: 0.05 });
      s.addText(`${pct}% concluído`, { x: 7.5, y: 0.68, w: 2.0, h: 0.36, fontSize: 10, bold: true, color: BRANCO, align: "center", valign: "middle" });

      // Legenda contadores
      s.addText(`✓ ${sim}  ◑ ${parc}  ✗ ${nao}`, { x: 0.5, y: 1.02, w: 5, h: 0.25, fontSize: 9, color: "666666" });

      const tableData = [
        [{ text: "MACROENTREGA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
        ...linhas.map(l => [
          l.descricao,
          {
            text: l.status === "sim" ? "✓ Sim" : l.status === "parcialmente" ? "◑ Parcial" : "✗ Não",
            options: { bold: true, color: COR_STATUS_TR[l.status] ?? "333333" }
          }
        ]),
      ];
      s.addTable(tableData as any, { x: 0.4, y: 1.32, w: 9.2, fontSize: 10, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.36, colW: [7.8, 1.4], align: "left", valign: "middle" });
    }
  }

  // ── SLIDE 8: HISTÓRICO TR — ADERÊNCIA GLOBAL ───────────────────
  {
    const sec = sections["historico_tr_aderencia"] ?? {};
    if (!isHidden(sec) && (sec.percentual_global || sec.analise)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Histórico evolutivo do Termo de Referência");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });

      // Card % global
      s.addShape("roundRect", { x: 0.4, y: 1.05, w: 2.5, h: 2.2, fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO }, rectRadius: 0.1 });
      s.addText(`≈ ${sec.percentual_global ?? 0}%`, { x: 0.4, y: 1.35, w: 2.5, h: 0.8, fontSize: 28, bold: true, color: "00D4AA", align: "center" });
      s.addText("Aderência\nGlobal Estimada", { x: 0.4, y: 2.2, w: 2.5, h: 0.5, fontSize: 9, color: BRANCO, align: "center" });
      if (sec.total_itens) {
        s.addText(`${sec.total_itens} itens avaliados`, { x: 0.4, y: 2.75, w: 2.5, h: 0.25, fontSize: 8, color: "AACCEE", align: "center" });
      }

      // Categorias
      const COR_CATEGORIA: Record<string, string> = { verde: "1E8A3E", amarelo: "C8A000", vermelho: "C81E1E", azul: AZUL_MEDIO };
      const categorias = (sec.categorias as Array<{ label: string; total: number; percentual: number; cor: string }>) ?? [];
      categorias.forEach((cat, i) => {
        const x = 3.2 + i * 1.75;
        const cor = COR_CATEGORIA[cat.cor] ?? AZUL_MEDIO;
        s.addShape("roundRect", { x, y: 1.05, w: 1.55, h: 2.2, fill: { color: BRANCO }, line: { color: "E0E7EF", width: 1 }, rectRadius: 0.08 });
        s.addShape("rect", { x, y: 1.05, w: 1.55, h: 0.12, fill: { color: cor }, line: { color: cor } });
        s.addShape("ellipse", { x: x+0.52, y: 1.28, w: 0.52, h: 0.52, fill: { color: cor, transparency: 75 }, line: { color: cor, transparency: 50 } });
        s.addText(String(cat.total), { x: x+0.52, y: 1.28, w: 0.52, h: 0.52, fontSize: 16, bold: true, color: cor, align: "center", valign: "middle" });
        s.addText("Itens", { x: x+0.1, y: 1.88, w: 1.35, h: 0.22, fontSize: 8, color: "888888", align: "center" });
        s.addText(`≈ ${cat.percentual}%`, { x: x+0.1, y: 2.12, w: 1.35, h: 0.3, fontSize: 14, bold: true, color: cor, align: "center" });
        s.addText(cat.label, { x: x+0.05, y: 2.5, w: 1.45, h: 0.45, fontSize: 8, color: "888888", align: "center", wrap: true });
      });

      // Análise
      if (sec.analise) {
        s.addShape("roundRect", { x: 0.4, y: 3.45, w: 9.2, h: 1.65, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.08 });
        s.addText(sec.analise as string, { x: 0.55, y: 3.55, w: 8.9, h: 1.45, fontSize: 10, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 9: PAINEL EXECUTIVO ──────────────────────────────────
  {
    const sec = sections["painel_executivo"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Painel Executivo");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const cards = [
        { key: "historicoTr",              label: "Histórico do TR" },
        { key: "evolucaoInovacao",          label: "Evolução e Inovação" },
        { key: "eficienciaOperacional",     label: "Eficiência Operacional" },
        { key: "eficienciaPrevisibilidade", label: "Efic. e Previsibilidade" },
        { key: "desempenhoAplicacao",       label: "Desempenho da Aplicação" },
        { key: "engajamentoUsuario",        label: "Engajamento do Usuário" },
      ];
      cards.forEach((c, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        const x = 0.4 + col * 3.1; const y = 1.1 + row * 1.75;
        const status = normalizeStatus((sec[c.key] as string) ?? "adequado");
        s.addShape("roundRect", { x, y, w: 2.85, h: 1.55, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1, shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 45, opacity: 0.08 } });
        s.addText(c.label, { x: x+0.1, y: y+0.18, w: 2.65, h: 0.4, fontSize: 11, color: CINZA_TEXTO, align: "center" });
        statusBadge(s, x+0.25, y+0.85, 2.35, status);
      });
      if (sec.observacoes) {
        s.addText(sec.observacoes as string, { x: 0.4, y: 4.65, w: 9.2, h: 0.4, fontSize: 9, color: "888888", italic: true });
      }
    }
  }

  // ── SLIDE 10: EVOLUÇÃO E INOVAÇÃO ───────────────────────────────
  {
    const sec = sections["evolucao_inovacao"] ?? {};
    const tags = (sec.contagem_por_tag ?? sec.tags) as Record<string, number> | undefined;
    const pctEvo = Number(sec.percentual_inovacao ?? sec.percentualInovacao ?? 0);
    if (!isHidden(sec) && (tags || pctEvo > 0)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Evolução e Inovação");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });

      // Gráfico de barras SVG-like via pptxgenjs charts
      if (tags) {
        const tagEntries = Object.entries(tags);
        const maxVal = Math.max(...tagEntries.map(([, v]) => v), 1);
        const chartW = 4.2; const chartH = 2.8;
        const chartX = 0.4; const chartY = 1.05;
        const barW = chartW / tagEntries.length * 0.5;

        s.addShape("rect", { x: chartX, y: chartY, w: chartW, h: chartH, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 } });

        tagEntries.forEach(([tag, count], i) => {
          const bx = chartX + (i + 0.5) * (chartW / tagEntries.length) - barW / 2;
          const bh = count > 0 ? (count / maxVal) * (chartH - 0.5) : 0.05;
          const by = chartY + chartH - 0.3 - bh;
          const cor = i === 0 ? AZUL_ESCURO : i === 1 ? AZUL_MEDIO : i === 2 ? "6BA3CC" : "AAAAAA";
          if (bh > 0.05) {
            s.addShape("rect", { x: bx, y: by, w: barW, h: bh, fill: { color: cor }, line: { color: cor } });
            s.addText(String(count), { x: bx, y: by - 0.22, w: barW, h: 0.2, fontSize: 9, bold: true, color: cor, align: "center" });
          }
          s.addText(tag.length > 8 ? tag.substring(0, 8) + "." : tag, { x: bx - 0.1, y: chartY + chartH - 0.28, w: barW + 0.2, h: 0.25, fontSize: 7, color: "666666", align: "center" });
        });

        // Badge % inovação no gráfico
        s.addShape("ellipse", { x: chartX + chartW * 0.3, y: chartY + chartH * 0.35, w: 0.9, h: 0.5, fill: { color: "1E8A3E" }, line: { color: "1E8A3E" } });
        s.addText(`${pctEvo}%`, { x: chartX + chartW * 0.3, y: chartY + chartH * 0.35, w: 0.9, h: 0.5, fontSize: 14, bold: true, color: BRANCO, align: "center", valign: "middle" });

        // Status badge no gráfico
        statusBadge(s, chartX + 0.3, chartY + chartH - 0.02, chartW - 0.6, (sec.status as string) ?? "adequado");
      }

      // Painel direito — análise
      s.addShape("roundRect", { x: 4.85, y: 1.05, w: 4.75, h: 3.9, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
      const totalEvo = Number(sec.total_entregas ?? 0);
      s.addText(`Total de entregas: ${totalEvo}`, { x: 5.0, y: 1.15, w: 4.4, h: 0.3, fontSize: 11, color: CINZA_TEXTO });
      s.addText(`% Inovação: ${pctEvo}%`, { x: 5.0, y: 1.5, w: 4.4, h: 0.3, fontSize: 13, bold: true, color: AZUL_ESCURO });
      if (sec.analise) {
        s.addText(sec.analise as string, { x: 5.0, y: 1.95, w: 4.4, h: 2.85, fontSize: 10, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 11: DEMONSTRATIVO DE HORAS ────────────────────────────
  {
    const sec = sections["demonstrativo_horas"] ?? {};
    const linhasDemo = (sec.linhas as Array<{ recurso: string; funcao?: string; dedicacao?: string; unidade: string; quantidade: number }>) ?? [];
    if (!isHidden(sec) && linhasDemo.length > 0) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Demonstrativo de Horas");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const total = linhasDemo.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
      const tableData: any[] = [
        [{ text: "RECURSO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "FUNÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "DEDICAÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "UNIDADE", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "QTD", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
        ...linhasDemo.map(l => [l.recurso ?? "", l.funcao ?? "", l.dedicacao ?? "", l.unidade ?? "horas", String(l.quantidade ?? 0)]),
        [{ text: "TOTAL", options: { bold: true, fill: { color: AZUL_CLARO } } }, "", "", "", { text: String(total), options: { bold: true, fill: { color: AZUL_CLARO } } }],
      ];
      if (sec.legenda) {
        tableData.push([{ text: sec.legenda as string, options: { color: "888888", colspan: 5, fontSize: 8 } }, "", "", "", ""]);
      }
      s.addTable(tableData as any, { x: 0.4, y: 1.1, w: 9.2, fontSize: 10, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.38, colW: [2.8, 2.0, 1.5, 1.3, 1.6], align: "left", valign: "middle" });
    }
  }

  // ── SLIDE 12: EFICIÊNCIA OPERACIONAL ────────────────────────────
  {
    const sec = sections["eficiencia_operacional"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Eficiência Operacional");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      statusBadge(s, 0.5, 1.1, 2.8, (sec.status as string) ?? "adequado");
      kpiCard(s, 0.5, 1.6, 1.3, 1.0, "SLA", String(sec.sla ?? "—"), "1E8A3E");
      kpiCard(s, 1.9, 1.6, 1.3, 1.0, "Tickets", String(sec.tickets ?? "—"), AZUL_ESCURO);
      kpiCard(s, 0.5, 2.75, 1.3, 1.0, "Crises", String(sec.crises ?? "0"), "1E8A3E");
      kpiCard(s, 1.9, 2.75, 1.3, 1.0, "Bugs", String(sec.bugs ?? "0"), "C85000");
      const porTipo = sec.por_tipo as Record<string, number> | undefined;
      {
        const tipoLabels: Record<string, string> = { incidente: "Incid.", problema: "Probl.", requisicao: "Req.", melhoria: "Melh.", duvida: "Dúvid." };
        const tiposOrdem = ["incidente", "problema", "requisicao", "melhoria", "duvida"];
        tiposOrdem.forEach((tipo, i) => {
          const qtd = porTipo?.[tipo] ?? 0;
          kpiCard(s, 0.4 + i * 1.1, 3.9, 0.95, 0.8, tipoLabels[tipo], String(qtd), AZUL_MEDIO);
        });
      }
      s.addShape("roundRect", { x: 3.6, y: 1.05, w: 5.9, h: 4.1, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
      s.addText("Análise – Eficiência Operacional", { x: 3.75, y: 1.15, w: 5.6, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO, margin: 0 });
      s.addText((sec.analise as string) || "Análise a ser preenchida.", { x: 3.75, y: 1.6, w: 5.6, h: 3.2, fontSize: 10, color: CINZA_TEXTO, valign: "top" });
    }
  }

  // ── SLIDE 13: EFICIÊNCIA E PREVISIBILIDADE ──────────────────────
  {
    const sec = sections["eficiencia_previsibilidade"] ?? {};
    const temDados = sec.frequencia_deploy || sec.frequenciaDeploy || sec.lead_time || sec.leadTime || sec.demandas;
    if (!isHidden(sec) && temDados) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Eficiência e Previsibilidade");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      statusBadge(s, 0.5, 1.1, 2.8, (sec.status as string) ?? "adequado");
      const kpis = [
        { label: "Freq. Deploy",  val: String(sec.frequencia_deploy ?? sec.frequenciaDeploy ?? "—") },
        { label: "Lead Time (d)", val: String(sec.lead_time ?? sec.leadTime ?? "—") },
        { label: "Demandas",      val: String(sec.demandas ?? "—") },
        { label: "Bugs",          val: String(sec.bugs ?? "—") },
        { label: "PBI Tested %",  val: String(sec.pbi_tested_ratio ?? sec.pbiTestedRatio ?? "—") },
        { label: "Efficiency %",  val: String(sec.efficiency_ratio ?? sec.efficiencyRatio ?? "—") },
      ];
      kpis.forEach((k, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        kpiCard(s, 0.4 + col * 1.65, 1.6 + row * 1.2, 1.45, 1.0, k.label, k.val, AZUL_MEDIO);
      });
      if (sec.analise) {
        s.addShape("roundRect", { x: 5.4, y: 1.05, w: 4.1, h: 4.1, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
        s.addText("Análise", { x: 5.55, y: 1.15, w: 3.8, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO });
        s.addText(sec.analise as string, { x: 5.55, y: 1.6, w: 3.8, h: 3.2, fontSize: 10, color: CINZA_TEXTO, valign: "top" });
      }
    }
  }

  // ── SLIDE 14: DESEMPENHO DA APLICAÇÃO ───────────────────────────
  {
    const sec = sections["desempenho_aplicacao"] ?? {};
    if (!isHidden(sec) && (sec.status || sec.analise)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Desempenho da Aplicação");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });

      const statusRaw = normalizeStatus((sec.status as string) ?? "adequado");
      statusBadge(s, 0.5, 1.1, 2.8, statusRaw);

      // Gauge usando arcos
      const gx = 0.5; const gy = 1.6; const gw = 2.8;
      // Arcos do gauge (semiciclo dividido em 4)
      const arcos = [
        { path: "M 0.5,2.4 A 1.2,1.2 0 0 1 0.85,1.55", cor: "C81E1E" },
      ];
      // Simplificado: 4 retângulos curvados representando os arcos
      const gaugeColors = ["C81E1E", "C85000", "C8A000", "1E8A3E"];
      const gaugeLabels = ["Crítico", "Atenção", "Adequado", "Alta"];
      gaugeLabels.forEach((label, i) => {
        const isActive = (statusRaw === "critico" && i === 0) || (statusRaw === "atencao" && i === 1) || (statusRaw === "adequado" && i === 2) || (statusRaw === "alta" && i === 3);
        s.addShape("roundRect", { x: gx + i * 0.7, y: gy + 0.5, w: 0.6, h: isActive ? 0.6 : 0.4, fill: { color: gaugeColors[i] }, line: { color: gaugeColors[i] }, rectRadius: 0.04 });
        s.addText(label, { x: gx + i * 0.7, y: gy + 1.15, w: 0.6, h: 0.2, fontSize: 7, color: gaugeColors[i], align: "center" });
      });

      // Análise
      s.addShape("roundRect", { x: 3.6, y: 1.05, w: 5.9, h: 4.1, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
      s.addText("Análise – Desempenho da Aplicação", { x: 3.75, y: 1.15, w: 5.6, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO });
      s.addText((sec.analise as string) || "Análise a ser preenchida.", { x: 3.75, y: 1.6, w: 5.6, h: 3.2, fontSize: 10, color: CINZA_TEXTO, valign: "top" });
    }
  }

  // ── SLIDE 15: ENGAJAMENTO DO USUÁRIO ────────────────────────────
  {
    const sec = sections["engajamento_usuario"] ?? {};
    const temEngDados = sec.usuariosCadastrados || sec.usuariosUnicos || sec.sessoes || sec.status;
    if (!isHidden(sec) && temEngDados) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Engajamento e Experiência do Usuário");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      statusBadge(s, 0.5, 1.1, 2.8, (sec.status as string) ?? "adequado");
      const kpisEng = [
        { label: "Usuários Cad.", val: String(sec.usuariosCadastrados ?? "—") },
        { label: "Únicos",        val: String(sec.usuariosUnicos ?? "—") },
        { label: "Sessões",       val: String(sec.sessoes ?? "—") },
        { label: "Retornados %",  val: String(sec.usuariosRetornados ?? "—") },
        { label: "Tempo Ativo",   val: String(sec.tempoMedioAtivo ?? "—") },
        { label: "Acessos/user",  val: String(sec.acessosPorUsuario ?? "—") },
      ];
      kpisEng.forEach((k, i) => {
        const col = i % 3; const row = Math.floor(i / 3);
        kpiCard(s, 0.4 + col * 1.65, 1.6 + row * 1.2, 1.45, 1.0, k.label, k.val, AZUL_MEDIO);
      });
      if (sec.analise) {
        s.addText(sec.analise as string, { x: 0.5, y: 4.1, w: 9, h: 0.8, fontSize: 10, color: CINZA_TEXTO, wrap: true });
      }
    }
  }

  // ── SLIDE 16: MATURIDADE DA PLATAFORMA ──────────────────────────
  {
    const sec = sections["maturidade_plataforma"] ?? {};
    const metricas = (sec.metricas as Array<{ nome: string; valor: string }>) ?? [];
    if (!isHidden(sec) && (metricas.length > 0 || sec.analise)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Maturidade e Gestão da Plataforma");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      metricas.forEach((m, i) => {
        const col = i % 4; const row = Math.floor(i / 4);
        kpiCard(s, 0.4 + col * 2.35, 1.1 + row * 1.2, 2.1, 1.0, m.nome, m.valor, AZUL_MEDIO);
      });
      if (sec.analise) {
        const yBase = metricas.length > 0 ? 1.1 + Math.ceil(metricas.length / 4) * 1.2 + 0.2 : 1.1;
        s.addText(sec.analise as string, { x: 0.5, y: yBase, w: 9, h: 1.5, fontSize: 10, color: CINZA_TEXTO, wrap: true });
      }
    }
  }

  // ── SLIDE 17: TREINAMENTOS / REUNIÕES ───────────────────────────
  {
    const sec = sections["treinamentos_reunioes"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Treinamentos / Reuniões");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const reunioes = ((sec.linhas ?? sec.reunioes) as Array<{ tipo: string; data: string; horario?: string; descricao: string }>) ?? [];
      if (reunioes.length > 0) {
        const tableData = [
          [{ text: "TIPO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "DATA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "DESCRIÇÃO DA ATIVIDADE", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
          ...reunioes.map(r => {
            const desc = (r.descricao ?? "");
            const descTruncada = desc.length > 280 ? desc.substring(0, 280) + "..." : desc;
            return [r.tipo ?? "", `${r.data ?? ""}${r.horario ? " " + r.horario : ""}`, descTruncada];
          }),
        ];
        s.addTable(tableData as any, { x: 0.4, y: 1.1, w: 9.2, fontSize: 9, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.65, colW: [1.6, 1.3, 6.3], align: "left", valign: "top" });
      } else {
        emptyMsg(s, "Nenhuma reunião registrada para o período.");
      }
      s.addText((sec.rodape as string) ?? "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.", { x: 0.4, y: 4.6, w: 9.2, h: 0.4, fontSize: 9, bold: true, color: CINZA_TEXTO, italic: true });
    }
  }

  // ── SLIDE 18: OPORTUNIDADES E FATORES DE ATENÇÃO ────────────────
  {
    const sec = sections["oportunidades_atencao"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Oportunidades e Fatores de Atenção");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      const itens = (sec.linhas as Array<{ descricao: string; tipo: string }>) ?? [];
      if (itens.length > 0) {
        const tableData = [
          [{ text: "DESCRIÇÃO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "TIPO", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
          ...itens.map(it => [it.descricao ?? "", it.tipo ?? ""]),
        ];
        s.addTable(tableData as any, { x: 0.4, y: 1.1, w: 9.2, fontSize: 11, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.55, colW: [7.0, 2.2], align: "left", valign: "middle" });
      } else {
        emptyMsg(s, "Nenhum item registrado para o período.");
      }
    }
  }

  // ── SLIDE 19: TAREFAS PRIORIZADAS ───────────────────────────────
  {
    const sec = sections["priorizadas"] ?? {};
    const tarefasPrio = ((sec.tarefas ?? sec.linhas) as Array<{ nome?: string; tarefa?: string; status: string; categoria: string }>) ?? [];
    if (!isHidden(sec) && tarefasPrio.length > 0) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Tarefas Priorizadas");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      s.addText("Tarefas em andamento e planejadas para o próximo período.", { x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 11, color: "555555", italic: true });
      const tableData = [
        [{ text: "TAREFAS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "CATEGORIA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
        ...tarefasPrio.map(t => [t.nome ?? t.tarefa ?? "", t.status ?? "", t.categoria ?? ""]),
      ];
      s.addTable(tableData as any, { x: 0.4, y: 1.55, w: 9.2, fontSize: 10, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.38, colW: [5.0, 1.4, 2.8], align: "left", valign: "middle" });
      if (sec.total_backlog) {
        s.addText(`Backlog: ${sec.total_backlog} itens`, { x: 0.4, y: 4.75, w: 4, h: 0.3, fontSize: 10, color: "888888", italic: true });
      }
    }
  }

  // ── SLIDE 20: ENTREGAS ──────────────────────────────────────────
  {
    const sec = sections["entregas"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Evolução e Inovação / Entregas");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555" });
      s.addText("Tarefas desenvolvidas pelo time durante o período. Todas registradas no Asana.", { x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 11, color: "555555", italic: true });
      const tarefas = ((sec.tarefas ?? sec.linhas) as Array<{ nome?: string; tarefa?: string; status: string; categoria: string }>) ?? [];
      if (tarefas.length > 0) {
        const tableData = [
          [{ text: "TAREFAS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "STATUS", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }, { text: "CATEGORIA", options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }],
          ...tarefas.map(t => [t.nome ?? t.tarefa ?? "", t.status ?? "Concluído", t.categoria ?? ""]),
        ];
        s.addTable(tableData as any, { x: 0.4, y: 1.55, w: 9.2, fontSize: 10, border: { pt: 0.5, color: "D0DCE8" }, rowH: 0.42, colW: [5.0, 1.4, 2.8], align: "left", valign: "middle" });
        s.addShape("ellipse", { x: 8.8, y: 4.8, w: 0.85, h: 0.85, fill: { color: AZUL_MEDIO }, line: { color: AZUL_MEDIO } });
        s.addText(`Total\n${tarefas.length}`, { x: 8.8, y: 4.8, w: 0.85, h: 0.85, fontSize: 9, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0 });
      } else {
        emptyMsg(s, "Nenhuma entrega registrada para o período.");
      }
    }
  }

  // ── SLIDE 21: INDICADORES ───────────────────────────────────────
  {
    const sec = sections["indicadores"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Indicadores deste relatório");
      s.addText("Os indicadores apresentados neste relatório utilizam um modelo de avaliação por faixas (termômetro), permitindo uma leitura rápida do nível de saúde, desempenho e maturidade do projeto.", { x: 0.4, y: 0.72, w: 9.2, h: 0.45, fontSize: 10, color: CINZA_TEXTO, italic: true, wrap: true });

      // Cards de indicadores (2x2 + 1)
      const inds = [
        { label: "Evolução e Inovação",           desc: (sec.descEvolucaoInovacao as string) ?? "Mede o percentual de entregas voltadas à melhoria contínua e novas funcionalidades em relação ao total de tarefas trabalhadas no período." },
        { label: "Eficiência e Previsibilidade",   desc: (sec.descEficienciaPrevisibilidade as string) ?? "Mede a capacidade do time de cumprir prazos planejados e entregar demandas com estabilidade e consistência ao longo do tempo." },
        { label: "Engajamento e Exp. do Usuário",  desc: (sec.descEngajamentoUsuario as string) ?? "Avalia o uso da plataforma com base em acessos, recorrência, tempo de navegação e profundidade de uso." },
        { label: "Desempenho da Aplicação",        desc: (sec.descDesempenhoAplicacao as string) ?? "Avalia a performance técnica e a experiência de carregamento, considerando métricas de estabilidade, velocidade e usabilidade." },
      ];
      inds.forEach((ind, i) => {
        const col = i % 2; const row = Math.floor(i / 2);
        const x = 0.4 + col * 4.55; const y = 1.25 + row * 1.55;
        s.addShape("roundRect", { x, y, w: 4.3, h: 1.4, fill: { color: AZUL_CLARO }, line: { color: AZUL_MEDIO, width: 0.5 }, rectRadius: 0.08 });
        s.addText(ind.label, { x: x+0.15, y: y+0.12, w: 3.95, h: 0.28, fontSize: 11, bold: true, color: AZUL_ESCURO });
        s.addText(ind.desc, { x: x+0.15, y: y+0.42, w: 3.95, h: 0.85, fontSize: 9, color: CINZA_TEXTO, wrap: true });
      });
      // Eficiência Operacional (linha inteira)
      s.addShape("roundRect", { x: 0.4, y: 4.38, w: 5.5, h: 0.72, fill: { color: AZUL_CLARO }, line: { color: AZUL_MEDIO, width: 0.5 }, rectRadius: 0.08 });
      s.addText("Eficiência Operacional", { x: 0.55, y: 4.45, w: 5.2, h: 0.22, fontSize: 11, bold: true, color: AZUL_ESCURO });
      s.addText((sec.descEficienciaOperacional as string) ?? "Mede a capacidade de atendimento, resolução de demandas e cumprimento dentro dos prazos (SLAs).", { x: 0.55, y: 4.68, w: 5.2, h: 0.35, fontSize: 9, color: CINZA_TEXTO, wrap: true });

      // Legenda status
      const statuses = [
        { cor: "1E8A3E", label: "Alta Performance" },
        { cor: "C8A000", label: "Adequado" },
        { cor: "C85000", label: "Atenção" },
        { cor: "C81E1E", label: "Crítico" },
      ];
      s.addShape("roundRect", { x: 6.1, y: 1.25, w: 3.5, h: 3.85, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.08 });
      statuses.forEach((st, i) => {
        const y = 1.6 + i * 0.82;
        s.addShape("ellipse", { x: 6.45, y, w: 0.32, h: 0.32, fill: { color: st.cor }, line: { color: st.cor } });
        s.addText(st.label, { x: 6.9, y, w: 2.5, h: 0.32, fontSize: 13, color: CINZA_TEXTO, valign: "middle" });
      });

      // Severidades SLA
      const sevs = [
        { label: "Severidade 4 - Baixa", val: (sec.sev4 as string) ?? "Até 24h úteis" },
        { label: "Severidade 3 - Moderada", val: (sec.sev3 as string) ?? "Até 12h úteis" },
        { label: "Severidade 2 - Alta", val: (sec.sev2 as string) ?? "Até 8h úteis" },
        { label: "Severidade 1 - Crítica", val: (sec.sev1 as string) ?? "Até 4h úteis" },
      ];
      sevs.forEach((sv, i) => {
        const col = i % 2; const row = Math.floor(i / 2);
        const x = 6.25 + col * 1.65; const y = 4.38 + row * 0.38;
        s.addShape("roundRect", { x, y, w: 1.55, h: 0.32, fill: { color: AZUL_CLARO }, line: { color: AZUL_MEDIO, width: 0.5 }, rectRadius: 0.04 });
        s.addText(`${sv.label}\n${sv.val}`, { x, y, w: 1.55, h: 0.32, fontSize: 7, color: AZUL_ESCURO, align: "center", valign: "middle" });
      });
    }
  }

  // ── SLIDE 22: ENCERRAMENTO ──────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: AZUL_CLARO };
    s.addShape("ellipse", { x: 1.5, y: 0.3, w: 5, h: 5, fill: { color: AZUL_MEDIO, transparency: 40 }, line: { color: AZUL_MEDIO, transparency: 40 } });
    s.addShape("ellipse", { x: 3.5, y: 1.1, w: 3.5, h: 3.5, fill: { color: AZUL_ESCURO, transparency: 35 }, line: { color: AZUL_ESCURO, transparency: 35 } });
    s.addImage({ data: logoBnp, x: 3.7, y: 2.1, w: 2.6, h: 1.15 });
    s.addText(mesAno, { x: 2.5, y: 3.9, w: 5.0, h: 0.55, fontSize: 20, bold: true, color: AZUL_ESCURO, align: "center", margin: 0 });
  }

  await pres.writeFile({ fileName: `relatorio-${nomeContrato.toLowerCase().replace(/\s+/g, "-")}-${mesAno.toLowerCase().replace("/", "-")}.pptx` });
}
