// v6 - paginacao de tabelas + valign top + sumario dinamico
import pptxgen from "pptxgenjs";
import logoBnpUrl from "@/assets/logo-bnp-final.png";
import logoBnpBlackUrl from "@/assets/logo-bnp-final-black.png";
import { SECTION_META } from "@/lib/reportSectionSchemas";

type Slide = pptxgen.Slide;
type TableRow = pptxgen.TableRow;
type TableCell = pptxgen.TableCell;

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

// ── Geometria do slide (LAYOUT_16x9 = 10" x 5.625") ───────────────
// header: 0 → 0.65 | corpo: 0.72 → 5.0 | rodapé de fonte: 5.05
const BODY_TOP = 0.72;
const BODY_BOTTOM = 4.95;
const TABLE_X = 0.4;

/** Nº aproximado de caracteres que cabem em uma linha de `widthIn` polegadas. */
function charsPerLine(widthIn: number, fontSize: number): number {
  const charWidth = (fontSize * 0.52) / 72; // largura média de caractere (pt → pol)
  return Math.max(4, Math.floor(Math.max(widthIn, 0.15) / charWidth));
}

/** Altura de uma linha de texto, em polegadas (entrelinha 1.25). */
function lineHeightIn(fontSize: number): number {
  return (fontSize * 1.25) / 72;
}

/** Altura estimada de um texto corrido dentro de uma caixa de `widthIn` polegadas. */
function estimateTextHeight(text: string, widthIn: number, fontSize: number, padIn = 0.08): number {
  const cpl = charsPerLine(widthIn, fontSize);
  const lines = String(text ?? "")
    .split("\n")
    .reduce((acc, par) => acc + Math.max(1, Math.ceil(par.length / cpl)), 0);
  return lines * lineHeightIn(fontSize) + padIn;
}

/** Maior fonte entre `min` e `base` em que o texto cabe na altura disponível. */
function fitFontSize(text: string, widthIn: number, heightIn: number, base: number, min: number): number {
  for (let fs = base; fs > min; fs--) {
    if (estimateTextHeight(text, widthIn, fs) <= heightIn) return fs;
  }
  return min;
}

/** Reduz a fonte e, se ainda assim não couber, trunca o texto para caber na caixa. */
function fitText(text: string, widthIn: number, heightIn: number, base: number, min: number): { text: string; fontSize: number } {
  const original = String(text ?? "");
  const fontSize = fitFontSize(original, widthIn, heightIn, base, min);
  if (estimateTextHeight(original, widthIn, fontSize) <= heightIn) return { text: original, fontSize };
  const maxLines = Math.max(1, Math.floor((heightIn - 0.08) / lineHeightIn(fontSize)));
  const maxChars = Math.max(20, maxLines * charsPerLine(widthIn, fontSize) - 3);
  return { text: original.slice(0, maxChars).trimEnd() + "…", fontSize };
}

function sourceFooter(slide: Slide, source: string) {
  const labels: Record<string, string> = {
    asana: 'Fonte: Asana',
    fireflies: 'Fonte: Fireflies',
    milvus: 'Fonte: Milvus (Helpdesk)',
    azuredevops: 'Fonte: Azure DevOps',
  };
  const label = labels[source];
  if (!label) return;
  slide.addText(label, {
    x: 0.4, y: 5.05, w: 9.2, h: 0.22,
    fontSize: 8, italic: true, color: "AAAAAA", align: "right",
  });
}

function headerBar(slide: Slide, titulo: string) {
  slide.addShape("rect", { x: 0, y: 0, w: 10, h: 0.65, fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO } });
  slide.addText(titulo, { x: 0.35, y: 0, w: 7.5, h: 0.65, fontSize: 16, bold: true, color: BRANCO, valign: "middle", margin: 0 });
  slide.addImage({ data: logoBnp, x: 8.5, y: 0.02, w: 1.35, h: 0.62 });
}

function statusBadge(slide: Slide, x: number, y: number, w: number, status: string) {
  const s = STATUS_CORES[normalizeStatus(status)] ?? STATUS_CORES.adequado;
  slide.addShape("roundRect", { x, y, w, h: 0.34, fill: { color: s.cor }, line: { color: s.cor }, rectRadius: 0.05 });
  slide.addText(s.label, { x, y, w, h: 0.34, fontSize: 11, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0 });
}

function kpiCard(slide: Slide, x: number, y: number, w: number, h: number, label: string, valor: string, cor?: string) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: CINZA_CLARO }, shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 45, opacity: 0.10 }, rectRadius: 0.08, line: { color: "E0E7EF", width: 0.5 } });
  slide.addText(label, { x: x+0.1, y: y+0.1, w: w-0.2, h: 0.3, fontSize: 9, color: "666666", align: "center", valign: "middle", margin: 0 });
  slide.addText(valor, { x: x+0.1, y: y+0.38, w: w-0.2, h: h-0.5, fontSize: 22, bold: true, color: cor ?? AZUL_ESCURO, align: "center", valign: "middle", margin: 0 });
}

function emptyMsg(slide: Slide, msg: string) {
  slide.addText(msg, { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 13, color: "999999", align: "center", valign: "top" });
}

// ── Paginação de tabelas ──────────────────────────────────────────
interface PaginatedTableOptions {
  /** Larguras das colunas, em polegadas. */
  colW: number[];
  /** y da tabela na primeira página. */
  firstY: number;
  /** y da tabela nas páginas seguintes. */
  contY?: number;
  fontSize?: number;
  minRowH?: number;
  /** Subtítulo (ex.: mês/ano) repetido nas páginas de continuação. */
  subtitle?: string;
  /** Fonte de dados (rodapé) repetida nas páginas de continuação. */
  source?: string;
  /** Espaço reservado no fim da ÚLTIMA página para elementos de rodapé. */
  lastPageReserve?: number;
  valign?: "top" | "middle";
}

function cellOf(cell: TableCell | string): TableCell {
  return typeof cell === "string" ? { text: cell } : cell;
}

function cellPlainText(cell: TableCell | string): string {
  const c = cellOf(cell);
  if (typeof c.text === "string") return c.text;
  if (Array.isArray(c.text)) return c.text.map(cellPlainText).join(" ");
  return "";
}

/** Altura estimada de uma linha da tabela, a partir do conteúdo de cada célula. */
function estimateRowHeight(row: TableRow, colW: number[], fontSize: number, minRowH: number): number {
  let altura = minRowH;
  let col = 0;
  for (const raw of row) {
    const cell = cellOf(raw);
    const span = Math.max(1, cell.options?.colspan ?? 1);
    const largura = colW.slice(col, col + span).reduce((a, b) => a + b, 0) - 0.16; // padding lateral
    const fs = cell.options?.fontSize ?? fontSize;
    altura = Math.max(altura, estimateTextHeight(cellPlainText(cell), largura, fs, 0.14));
    col += span;
  }
  return altura;
}

/**
 * Desenha uma tabela quebrando-a em quantas páginas forem necessárias.
 * A altura de cada linha é estimada pelo conteúdo (não é fixa), de modo que
 * células com texto longo não estouram o limite inferior do slide.
 * Páginas seguintes repetem o cabeçalho e usam o título com sufixo "(cont.)".
 * Devolve o último slide usado, para o chamador posicionar rodapés nele.
 */
function addPaginatedTable(
  pres: pptxgen,
  firstSlide: Slide,
  titulo: string,
  header: TableRow,
  rows: TableRow[],
  opts: PaginatedTableOptions,
): Slide {
  const fontSize = opts.fontSize ?? 9;
  const minRowH = opts.minRowH ?? 0.3;
  const bottomY = BODY_BOTTOM;
  const contY = opts.contY ?? 1.1;
  const reserve = opts.lastPageReserve ?? 0;
  const totalW = opts.colW.reduce((a, b) => a + b, 0);

  const headerH = estimateRowHeight(header, opts.colW, fontSize, minRowH);
  const heights = rows.map((r) => estimateRowHeight(r, opts.colW, fontSize, minRowH));

  // 1) quebra gulosa respeitando o limite inferior de cada página
  const pages: number[][] = [];
  let atual: number[] = [];
  let usado = 0;
  let limite = bottomY - opts.firstY - headerH;
  rows.forEach((_, i) => {
    if (atual.length > 0 && usado + heights[i] > limite) {
      pages.push(atual);
      atual = [];
      usado = 0;
      limite = bottomY - contY - headerH;
    }
    atual.push(i);
    usado += heights[i];
  });
  if (atual.length > 0 || pages.length === 0) pages.push(atual);

  // 2) reserva de rodapé na última página (bolha "Total", "Backlog: N itens", …)
  if (reserve > 0) {
    const ultima = pages.length - 1;
    const inicioY = ultima === 0 ? opts.firstY : contY;
    const consumido = pages[ultima].reduce((acc, i) => acc + heights[i], 0);
    if (pages[ultima].length > 1 && inicioY + headerH + consumido > bottomY - reserve) {
      const movida = pages[ultima].pop();
      if (movida !== undefined) pages.push([movida]);
    }
  }

  // 3) desenho
  let slide = firstSlide;
  pages.forEach((idxs, pi) => {
    if (pi > 0) {
      slide = pres.addSlide();
      slide.background = { color: BRANCO };
      headerBar(slide, `${titulo} (cont.)`);
      if (opts.subtitle) {
        slide.addText(opts.subtitle, { x: 0.5, y: BODY_TOP, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      }
      if (opts.source) sourceFooter(slide, opts.source);
    }
    const y = pi === 0 ? opts.firstY : contY;
    const rowH = [headerH, ...idxs.map((i) => heights[i])];
    slide.addTable([header, ...idxs.map((i) => rows[i])], {
      x: TABLE_X, y, w: totalW, colW: opts.colW, fontSize,
      border: { pt: 0.5, color: "D0DCE8" },
      rowH, align: "left", valign: opts.valign ?? "top", autoPage: false,
    });
  });

  return slide;
}

/** Cabeçalho padrão de tabela (fundo azul, texto branco). */
function tableHeader(...labels: string[]): TableRow {
  return labels.map((text) => ({ text, options: { bold: true, color: BRANCO, fill: { color: AZUL_MEDIO } } }));
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
    s.addText("Relatório Mensal de Atividades", { x: 0.4, y: 1.8, w: 5.5, h: 0.8, fontSize: 26, bold: true, color: AZUL_ESCURO, valign: "top" });
    const capa = sections["capa"] ?? {};
    s.addText(mesAno, { x: 0.4, y: 3.0, w: 5.5, h: 0.35, fontSize: 14, bold: true, color: CINZA_TEXTO, valign: "top" });
    s.addText(`Projeto: ${(capa.projeto as string) || nomeContrato}`, { x: 0.4, y: 3.4, w: 5.5, h: 0.28, fontSize: 11, color: CINZA_TEXTO, valign: "top" });
    s.addText((capa.cliente as string) || nomeCliente, { x: 0.4, y: 3.7, w: 5.5, h: 0.28, fontSize: 11, color: CINZA_TEXTO, valign: "top" });
    s.addText(`Contrato: ${(capa.numeroContrato as string) || numeroContrato}`, { x: 0.4, y: 4.0, w: 5.5, h: 0.28, fontSize: 11, bold: true, color: AZUL_ESCURO, valign: "top" });
    // Elaborador / revisor — só entram quando preenchidos no editor da Capa
    const responsaveis: string[] = [];
    const criadoPor = (capa.criadoPor as string) ?? "";
    const revisadoPor = (capa.revisadoPor as string) ?? "";
    if (criadoPor.trim()) responsaveis.push(`Elaborado por: ${criadoPor.trim()}`);
    if (revisadoPor.trim()) responsaveis.push(`Revisado por: ${revisadoPor.trim()}`);
    responsaveis.forEach((linha, i) => {
      s.addText(linha, { x: 0.4, y: 4.4 + i * 0.3, w: 5.5, h: 0.28, fontSize: 10, color: CINZA_TEXTO, valign: "top" });
    });
  }

  // ── SLIDE 2: SUMÁRIO ───────────────────────────────────────────
  if (!isHidden(sections["sumario"] ?? {})) {
    const s = pres.addSlide();
    s.background = { color: BRANCO };
    headerBar(s, "Sumário");
    // Gerado a partir do SECTION_META, refletindo apenas as seções que serão
    // realmente renderizadas (capa e sumário fora; ocultas fora).
    const sumItems = SECTION_META
      .filter((m) => m.key !== "capa" && m.key !== "sumario")
      .filter((m) => !isHidden(sections[m.key] ?? {}))
      .map((m) => m.label);

    const sumTop = 0.82;
    const mid = Math.ceil(sumItems.length / 2);
    const passo = mid > 0 ? Math.min(0.35, (BODY_BOTTOM - sumTop) / mid) : 0.35;
    const fsSum = passo >= 0.32 ? 11 : passo >= 0.26 ? 10 : 9;
    const alturaItem = Math.min(passo, 0.32);
    sumItems.forEach((item, i) => {
      const col = i < mid ? 0 : 1;
      const linha = i < mid ? i : i - mid;
      s.addText(`${i + 1}.  ${item}`, {
        x: col === 0 ? 0.5 : 5.3, y: sumTop + linha * passo, w: 4.6, h: alturaItem,
        fontSize: fsSum, color: AZUL_MEDIO, valign: "top",
      });
    });
  }

  // ── SLIDE 3: GLOSSÁRIO ─────────────────────────────────────────
  {
    const sec = sections["glossario"] ?? {};
    const termos = (sec.termos as Array<{ termo: string; definicao: string }>) ?? [];
    if (!isHidden(sec)) {
      let s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Glossário dos termos técnicos");
      s.addText("Para facilitar a compreensão das informações apresentadas neste relatório, reunimos abaixo os principais termos técnicos utilizados.", { x: 0.4, y: BODY_TOP, w: 9.2, h: 0.4, fontSize: 10, color: CINZA_TEXTO, wrap: true, valign: "top" });
      if (termos.length === 0) {
        emptyMsg(s, "Nenhum termo cadastrado. Adicione termos na tela de edição.");
      } else {
      s.addShape("rect", { x: 0.4, y: 1.2, w: 9.2, h: 0.28, fill: { color: AZUL_MEDIO }, line: { color: AZUL_MEDIO } });
      s.addText("Termos utilizados", { x: 0.5, y: 1.2, w: 9, h: 0.28, fontSize: 10, bold: true, color: BRANCO, valign: "middle" });
      let yPos = 1.55;
      termos.forEach((t) => {
        const hTermo = estimateTextHeight(`${t.termo}:`, 9.2, 9, 0.02);
        const hDef = estimateTextHeight(t.definicao ?? "", 9.2, 9, 0.04);
        const bloco = hTermo + hDef + 0.1;
        if (yPos + bloco > BODY_BOTTOM) {
          s = pres.addSlide();
          s.background = { color: BRANCO };
          headerBar(s, "Glossário dos termos técnicos (cont.)");
          yPos = BODY_TOP + 0.06;
        }
        s.addText(`${t.termo}:`, { x: 0.4, y: yPos, w: 9.2, h: hTermo, fontSize: 9, bold: true, color: CINZA_TEXTO, valign: "top" });
        s.addText(t.definicao ?? "", { x: 0.4, y: yPos + hTermo, w: 9.2, h: hDef, fontSize: 9, color: CINZA_TEXTO, wrap: true, valign: "top" });
        s.addShape("line", { x: 0.4, y: yPos + hTermo + hDef + 0.04, w: 9.2, h: 0, line: { color: "E0E7EF", width: 0.5 } });
        yPos += bloco;
      });
      } // end else termos
    }
  }

  // ── SLIDE 4: OBJETIVO ──────────────────────────────────────────
  {
    const sec = sections["objetivo"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Objetivo do relatório");
      const par1 = (sec.texto as string) ?? "Apresentar as principais entregas, indicadores e oportunidades identificadas no período de referência, evidenciando a evolução do contrato e o engajamento das partes envolvidas.";
      const par2 = (sec.texto_complementar as string) ?? "O documento consolida informações sobre a evolução da plataforma, o engajamento dos usuários, a eficiência operacional e desempenho da aplicação, bem como os principais indicadores, entregas realizadas, prioridades do próximo período e pontos de atenção estratégicos.";
      const objTop = 1.0;
      const objBottom = 4.05; // acima da faixa "Transparência ● …" (y 4.2)
      const espaco = 0.22;
      // A textarea do editor aceita textos longos: reduz a fonte até os dois
      // parágrafos caberem entre o título e a faixa de destaque.
      let fsObj = 13;
      for (; fsObj > 9; fsObj--) {
        const total = estimateTextHeight(par1, 9, fsObj) + estimateTextHeight(par2, 9, fsObj) + espaco;
        if (objTop + total <= objBottom) break;
      }
      const h1 = estimateTextHeight(par1, 9, fsObj);
      const h2 = estimateTextHeight(par2, 9, fsObj);
      s.addText(par1, { x: 0.5, y: objTop, w: 9, h: h1, fontSize: fsObj, color: CINZA_TEXTO, wrap: true, valign: "top" });
      s.addText(par2, { x: 0.5, y: objTop + h1 + espaco, w: 9, h: h2, fontSize: fsObj, color: CINZA_TEXTO, wrap: true, valign: "top" });
      s.addText("Transparência  ●  Monitoramento do Projeto  ●  Tomada de Decisão", { x: 1.0, y: 4.2, w: 8, h: 0.5, fontSize: 13, bold: true, color: AZUL_MEDIO, align: "center", valign: "middle" });
    }
  }

  // ── SLIDE 5: INDICADORES ───────────────────────────────────────
  {
    const sec = sections["indicadores"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Indicadores deste relatório");
      s.addText("Os indicadores apresentados neste relatório utilizam um modelo de avaliação por faixas (termômetro), permitindo uma leitura rápida do nível de saúde, desempenho e maturidade do projeto.", { x: 0.4, y: BODY_TOP, w: 9.2, h: 0.45, fontSize: 10, color: CINZA_TEXTO, italic: true, wrap: true, valign: "top" });

      // Cards de indicadores (2x2 + 1)
      // 5 cards em coluna única à esquerda (w=5.5), legenda à direita (x=6.1)
      const inds = [
        { label: "Evolução e Inovação",           desc: (sec.descEvolucaoInovacao as string) ?? "Mede o percentual de entregas voltadas à melhoria contínua e novas funcionalidades em relação ao total de tarefas trabalhadas no período." },
        { label: "Eficiência e Previsibilidade",   desc: (sec.descEficienciaPrevisibilidade as string) ?? "Mede a capacidade do time de cumprir prazos planejados e entregar demandas com estabilidade e consistência ao longo do tempo." },
        { label: "Engajamento e Exp. do Usuário",  desc: (sec.descEngajamentoUsuario as string) ?? "Avalia o uso da plataforma com base em acessos, recorrência, tempo de navegação e profundidade de uso." },
        { label: "Desempenho da Aplicação",        desc: (sec.descDesempenhoAplicacao as string) ?? "Avalia a performance técnica e a experiência de carregamento, considerando métricas de estabilidade, velocidade e usabilidade." },
        { label: "Eficiência Operacional",         desc: (sec.descEficienciaOperacional as string) ?? "Mede a capacidade de atendimento, resolução de demandas e cumprimento dentro dos prazos (SLAs)." },
      ];
      inds.forEach((ind, i) => {
        const y = 1.25 + i * 0.72;
        s.addShape("roundRect", { x: 0.4, y, w: 5.5, h: 0.65, fill: { color: AZUL_CLARO }, line: { color: AZUL_MEDIO, width: 0.5 }, rectRadius: 0.06 });
        s.addText(ind.label, { x: 0.55, y: y+0.04, w: 5.2, h: 0.22, fontSize: 10, bold: true, color: AZUL_ESCURO, valign: "top" });
        const descFit = fitText(ind.desc, 5.2, 0.34, 8, 6);
        s.addText(descFit.text, { x: 0.55, y: y+0.27, w: 5.2, h: 0.34, fontSize: descFit.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      });

      // Legenda status — coluna direita
      const statuses = [
        { cor: "1E8A3E", label: "Alta Performance" },
        { cor: "C8A000", label: "Adequado" },
        { cor: "C85000", label: "Atenção" },
        { cor: "C81E1E", label: "Crítico" },
      ];
      s.addShape("roundRect", { x: 6.15, y: 1.25, w: 3.5, h: 3.3, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.08 });
      statuses.forEach((st, i) => {
        const sy = 1.5 + i * 0.72;
        s.addShape("ellipse", { x: 6.4, y: sy, w: 0.35, h: 0.35, fill: { color: st.cor }, line: { color: st.cor } });
        s.addText(st.label, { x: 6.9, y: sy, w: 2.6, h: 0.35, fontSize: 12, color: CINZA_TEXTO, valign: "middle" });
      });

      // Severidades SLA — abaixo da legenda
      const sevs = [
        { label: "Sev. 4 - Baixa",    val: (sec.sev4 as string) ?? "Até 24h úteis" },
        { label: "Sev. 3 - Moderada", val: (sec.sev3 as string) ?? "Até 12h úteis" },
        { label: "Sev. 2 - Alta",     val: (sec.sev2 as string) ?? "Até 8h úteis" },
        { label: "Sev. 1 - Crítica",  val: (sec.sev1 as string) ?? "Até 4h úteis" },
      ];
      sevs.forEach((sv, i) => {
        const col = i % 2; const row = Math.floor(i / 2);
        const sx = 6.15 + col * 1.78; const sy = 4.65 + row * 0.42;
        s.addShape("roundRect", { x: sx, y: sy, w: 1.65, h: 0.36, fill: { color: AZUL_CLARO }, line: { color: AZUL_MEDIO, width: 0.5 }, rectRadius: 0.04 });
        s.addText(`${sv.label}\n${sv.val}`, { x: sx, y: sy, w: 1.65, h: 0.36, fontSize: 7, color: AZUL_ESCURO, align: "center", valign: "middle" });
      });
    }
  }

  // ── SLIDE 6: AMBIENTES IMPLEMENTADOS ───────────────────────────
  {
    const sec = sections["ambientes"] ?? {};
    const ambientes = (sec.ambientes as Array<{ nome: string; status: string; itens: string[] }>) ?? [];
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Ambientes Implementados");
      const COR_AMB: Record<string, string> = { ativo: "1E8A3E", inativo: "C81E1E", parcial: "C8A000" };
      if (ambientes.length === 0) {
        emptyMsg(s, "Nenhum ambiente cadastrado. Preencha na tela de edição.");
      } else {
      ambientes.forEach((amb, i) => {
        const x = 0.4 + i * 4.8;
        const cor = COR_AMB[amb.status] ?? COR_AMB.ativo;
        s.addShape("roundRect", { x, y: 0.85, w: 4.5, h: 4.35, fill: { color: BRANCO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.12, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 45, opacity: 0.08 } });
        s.addShape("rect", { x, y: 0.85, w: 4.5, h: 0.1, fill: { color: cor }, line: { color: cor } });
        s.addText(amb.nome, { x: x+0.2, y: 1.02, w: 3.5, h: 0.4, fontSize: 13, bold: true, color: CINZA_TEXTO, valign: "top" });
        // Badge status
        s.addShape("roundRect", { x: x+0.2, y: 1.48, w: 1.2, h: 0.3, fill: { color: cor, transparency: 85 }, line: { color: cor, width: 0.5 }, rectRadius: 0.04 });
        s.addText(`✅ ${amb.status.charAt(0).toUpperCase() + amb.status.slice(1)}`, { x: x+0.2, y: 1.48, w: 1.2, h: 0.3, fontSize: 9, color: cor, align: "center", valign: "middle" });
        // Itens
        amb.itens.slice(0, 6).forEach((item, ii) => {
          s.addShape("ellipse", { x: x+0.2, y: 1.95 + ii * 0.45, w: 0.15, h: 0.15, fill: { color: cor }, line: { color: cor } });
          s.addText(item, { x: x+0.42, y: 1.92 + ii * 0.45, w: 3.85, h: 0.4, fontSize: 10, color: CINZA_TEXTO, wrap: true, valign: "top" });
        });
      });
      } // end else ambientes
    }
  }

  // ── SLIDE 7: AMBIENTES — DETALHAMENTO ──────────────────────────
  {
    const sec = sections["ambientes_detalhe"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Ambientes Implementados");
      if (!sec.texto && (!sec.links || (sec.links as []).length === 0)) {
        emptyMsg(s, "Adicione o texto descritivo e links na tela de edição.");
      }
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

  // ── SLIDE 8: HISTÓRICO TR ──────────────────────────────────────
  {
    const sec = sections["historico_tr"] ?? {};
    type Linha = { descricao: string; status: string; entregue?: boolean; observacoes?: string };
    const linhas = ((sec.linhas as Linha[]) ?? []).map(l => ({
      descricao: l.descricao ?? "",
      status: l.status ?? (l.entregue === true ? "sim" : "não"),
      observacoes: l.observacoes ?? "",
    })).filter(l => l.descricao.trim());

    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Histórico evolutivo do Termo de Referência");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 7, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });

      const total = linhas.length;
      const sim   = linhas.filter(l => l.status === "sim").length;
      const parc  = linhas.filter(l => l.status === "parcialmente").length;
      const nao   = linhas.filter(l => l.status === "não").length;
      const pct   = Math.round(((sim + parc * 0.5) / total) * 100);

      if (linhas.length === 0) {
        emptyMsg(s, "Nenhuma macroentrega cadastrada. Adicione na tela de edição.");
      } else {
      // Badge %
      s.addShape("roundRect", { x: 7.5, y: 0.68, w: 2.0, h: 0.36, fill: { color: AZUL_ESCURO }, line: { color: AZUL_ESCURO }, rectRadius: 0.05 });
      s.addText(`${pct}% concluído`, { x: 7.5, y: 0.68, w: 2.0, h: 0.36, fontSize: 10, bold: true, color: BRANCO, align: "center", valign: "middle" });

      // Legenda contadores
      s.addText(`✓ ${sim}  ◑ ${parc}  ✗ ${nao}`, { x: 0.5, y: 1.02, w: 5, h: 0.25, fontSize: 9, color: "666666" });

      const rowsTr: TableRow[] = linhas.map(l => [
        { text: l.descricao },
        {
          text: l.status === "sim" ? "✓ Sim" : l.status === "parcialmente" ? "◑ Parcial" : "✗ Não",
          options: { bold: true, color: COR_STATUS_TR[l.status] ?? "333333" }
        },
        { text: l.observacoes },
      ]);
      addPaginatedTable(pres, s, "Histórico evolutivo do Termo de Referência", tableHeader("MACROENTREGA", "STATUS", "OBSERVAÇÕES"), rowsTr, {
        colW: [5.0, 1.4, 2.8], firstY: 1.32, contY: 1.1, fontSize: 10, minRowH: 0.36, subtitle: mesAno,
      });
      } // end else histórico TR
    }
  }

  // ── SLIDE 9: HISTÓRICO TR — ADERÊNCIA GLOBAL ───────────────────
  {
    const sec = sections["historico_tr_aderencia"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Histórico evolutivo do Termo de Referência");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });

      if (!sec.percentual_global && !sec.analise) {
        emptyMsg(s, "Preencha os dados de aderência global na tela de edição.");
      } else {
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
        s.addShape("roundRect", { x: 0.4, y: 3.45, w: 9.2, h: 1.5, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.08 });
        const anaAder = fitText(sec.analise as string, 8.9, 1.3, 10, 7);
        s.addText(anaAder.text, { x: 0.55, y: 3.55, w: 8.9, h: 1.3, fontSize: anaAder.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
      } // end else aderência
    }
  }

  // ── SLIDE 10: PAINEL EXECUTIVO ──────────────────────────────────
  {
    const sec = sections["painel_executivo"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Painel Executivo");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
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
        const obsPainel = fitText(sec.observacoes as string, 9.2, 0.36, 9, 7);
        s.addText(obsPainel.text, { x: 0.4, y: 4.6, w: 9.2, h: 0.36, fontSize: obsPainel.fontSize, color: "888888", italic: true, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 11: EVOLUÇÃO E INOVAÇÃO ───────────────────────────────
  {
    const sec = sections["evolucao_inovacao"] ?? {};
    const tags = (sec.contagem_por_tag ?? sec.tags) as Record<string, number> | undefined;
    const pctEvo = Number(sec.percentual_inovacao ?? sec.percentualInovacao ?? 0);
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Evolução e Inovação");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      sourceFooter(s, 'asana');

      // Gráfico histórico de barras por mês (usa historico_mensal se disponível, senão tags do mês atual)
      {
        const historico = sec.historico_mensal as Record<string, { total: number; contagem: Record<string, number> }> | undefined;
        const chartW = 4.2; const chartH = 2.8;
        const chartX = 0.4; const chartY = 1.05;
        const CORES_TAG: Record<string, string> = {
          "Novas Funcionalidades": AZUL_ESCURO,
          "Evolução": AZUL_MEDIO,
          "Integrações": "6BA3CC",
          "Outros": "AAAAAA",
        };

        s.addShape("rect", { x: chartX, y: chartY, w: chartW, h: chartH, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 } });

        if (historico && Object.keys(historico).length > 0) {
          // Gráfico histórico por mês
          const mesesHist = Object.keys(historico);
          const maxTotal = Math.max(...mesesHist.map(m => historico[m].total), 1);
          const colW = chartW / mesesHist.length;

          mesesHist.forEach((mes, mi) => {
            const dado = historico[mes];
            const colX = chartX + mi * colW;
            const baseY = chartY + chartH - 0.35;
            const tagKeys = ["Novas Funcionalidades", "Evolução", "Integrações", "Outros"];
            let stackY = baseY;

            // Barras empilhadas por categoria
            tagKeys.forEach(tag => {
              const count = dado.contagem?.[tag] ?? 0;
              if (count > 0) {
                const bh = (count / maxTotal) * (chartH - 0.55);
                stackY -= bh;
                const cor = CORES_TAG[tag] ?? "AAAAAA";
                const bx = colX + colW * 0.2;
                const bw = colW * 0.6;
                s.addShape("rect", { x: bx, y: stackY, w: bw, h: bh, fill: { color: cor }, line: { color: cor } });
                if (count > 0 && bh > 0.18) {
                  s.addText(String(count), { x: bx, y: stackY + bh/2 - 0.1, w: bw, h: 0.2, fontSize: 8, bold: true, color: BRANCO, align: "center" });
                }
              }
            });

            // Total acima da barra
            if (dado.total > 0) {
              s.addText(String(dado.total), { x: colX, y: stackY - 0.22, w: colW, h: 0.2, fontSize: 9, bold: true, color: CINZA_TEXTO, align: "center" });
            }

            // % inovação como badge
            const inovacao = (dado.contagem?.["Novas Funcionalidades"] ?? 0) + (dado.contagem?.["Evolução"] ?? 0) + (dado.contagem?.["Integrações"] ?? 0);
            const pctMes = dado.total > 0 ? Math.round(inovacao / dado.total * 100) : 0;
            const corBadge = pctMes >= 50 ? "1E8A3E" : pctMes >= 25 ? "C8A000" : "C85000";
            s.addShape("ellipse", { x: colX + colW * 0.15, y: chartY + chartH - 0.32, w: colW * 0.7, h: 0.28, fill: { color: corBadge }, line: { color: corBadge } });
            s.addText(pctMes + "%", { x: colX + colW * 0.15, y: chartY + chartH - 0.32, w: colW * 0.7, h: 0.28, fontSize: 8, bold: true, color: BRANCO, align: "center", valign: "middle" });

            // Nome do mês abreviado
            s.addText(mes.substring(0, 3), { x: colX, y: chartY + chartH - 0.02, w: colW, h: 0.2, fontSize: 8, color: "666666", align: "center" });
          });

          // Legenda abaixo do nome do mês
          const tagKeys = ["Novas Funcionalidades", "Evolução", "Integrações", "Outros"];
          const legendaY = chartY + chartH + 0.28;
          tagKeys.forEach((tag, i) => {
            const lx = chartX + 0.05 + i * 1.04;
            s.addShape("rect", { x: lx, y: legendaY, w: 0.13, h: 0.13, fill: { color: CORES_TAG[tag] }, line: { color: CORES_TAG[tag] } });
            s.addText(tag === "Novas Funcionalidades" ? "Novas Func." : tag, { x: lx + 0.16, y: legendaY, w: 0.85, h: 0.13, fontSize: 7, color: "555555", valign: "middle" });
          });

        } else if (tags) {
          // Fallback: gráfico do mês atual por categoria
          const tagEntries = Object.entries(tags);
          const maxVal = Math.max(...tagEntries.map(([, v]) => v), 1);
          const barW = chartW / tagEntries.length * 0.5;
          tagEntries.forEach(([tag, count], i) => {
            const bx = chartX + (i + 0.5) * (chartW / tagEntries.length) - barW / 2;
            const bh = (count as number) > 0 ? ((count as number) / maxVal) * (chartH - 0.5) : 0.05;
            const by = chartY + chartH - 0.3 - bh;
            const cor = Object.values(CORES_TAG)[i] ?? "AAAAAA";
            if (bh > 0.05) {
              s.addShape("rect", { x: bx, y: by, w: barW, h: bh, fill: { color: cor }, line: { color: cor } });
              s.addText(String(count), { x: bx, y: by - 0.22, w: barW, h: 0.2, fontSize: 9, bold: true, color: cor, align: "center" });
            }
            s.addText(tag.length > 8 ? tag.substring(0, 8) + "." : tag, { x: bx - 0.1, y: chartY + chartH - 0.28, w: barW + 0.2, h: 0.25, fontSize: 7, color: "666666", align: "center" });
          });
          s.addShape("ellipse", { x: chartX + chartW * 0.3, y: chartY + chartH * 0.35, w: 0.9, h: 0.5, fill: { color: "1E8A3E" }, line: { color: "1E8A3E" } });
          s.addText(pctEvo + "%", { x: chartX + chartW * 0.3, y: chartY + chartH * 0.35, w: 0.9, h: 0.5, fontSize: 14, bold: true, color: BRANCO, align: "center", valign: "middle" });
          statusBadge(s, chartX + 0.3, chartY + chartH - 0.02, chartW - 0.6, (sec.status as string) ?? "adequado");
        }
      }

      // Painel direito — análise
      s.addShape("roundRect", { x: 4.85, y: 1.05, w: 4.75, h: 3.9, fill: { color: CINZA_CLARO }, line: { color: "E0E7EF", width: 0.5 }, rectRadius: 0.1 });
      const totalEvo = Number(sec.total_entregas ?? 0);
      s.addText(`Total de entregas: ${totalEvo}`, { x: 5.0, y: 1.15, w: 4.4, h: 0.3, fontSize: 11, color: CINZA_TEXTO, valign: "top" });
      s.addText(`% Inovação: ${pctEvo}%`, { x: 5.0, y: 1.5, w: 4.4, h: 0.3, fontSize: 13, bold: true, color: AZUL_ESCURO, valign: "top" });
      if (sec.analise) {
        // O card cinza termina em y=4.95: reduz a fonte e trunca para não vazar.
        const anaEvo = fitText(sec.analise as string, 4.4, 2.85, 10, 7);
        s.addText(anaEvo.text, { x: 5.0, y: 1.95, w: 4.4, h: 2.85, fontSize: anaEvo.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 12: EQUIPE DO PROJETO ─────────────────────────────────
  {
    const sec = sections["demonstrativo_horas"] ?? {};
    const linhasDemo = (sec.linhas as Array<{ recurso: string; funcao?: string }>) ?? [];
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Equipe do Projeto");
      s.addText(mesAno, { x: 0.5, y: BODY_TOP, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      if (linhasDemo.length === 0) {
        emptyMsg(s, "Nenhum recurso cadastrado. Preencha na tela de edição.");
      } else {
        const colWEquipe = [4.6, 4.6];
        const rowsEquipe: TableRow[] = linhasDemo.map(l => [{ text: l.recurso ?? "" }, { text: l.funcao ?? "" }]);
        if (sec.legenda) {
          rowsEquipe.push([{ text: sec.legenda as string, options: { color: "888888", colspan: 2, fontSize: 8 } }]);
        }
        addPaginatedTable(pres, s, "Equipe do Projeto", tableHeader("RECURSO", "FUNÇÃO"), rowsEquipe, {
          colW: colWEquipe, firstY: 1.1, contY: 1.1, fontSize: 9, minRowH: 0.32, subtitle: mesAno, valign: "middle",
        });
      }
    }
  }

  // ── SLIDE 13: EFICIÊNCIA OPERACIONAL ────────────────────────────
  {
    const sec = sections["eficiencia_operacional"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Eficiência Operacional");
      sourceFooter(s, 'milvus');
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      statusBadge(s, 0.5, 1.1, 2.8, (sec.status as string) ?? "adequado");
      kpiCard(s, 0.5, 1.6, 1.3, 1.0, "SLA", String(sec.sla ?? "—"), "1E8A3E");
      kpiCard(s, 1.9, 1.6, 1.3, 1.0, "Tickets", String(sec.tickets ?? "—"), AZUL_ESCURO);
      kpiCard(s, 0.5, 2.75, 1.3, 1.0, "Crises", String(sec.crises ?? "0"), "1E8A3E");
      kpiCard(s, 1.9, 2.75, 1.3, 1.0, "Bugs", String(sec.bugs ?? "0"), "C85000");
      const porTipo = sec.por_tipo as Record<string, number> | undefined;
      {
        const tipoLabels: Record<string, string> = { incidente: "Incidentes", problema: "Problemas", requisicao: "Requisições", melhoria: "Melhorias", duvida: "Dúvidas" };
        const tiposOrdem = ["incidente", "problema", "requisicao", "melhoria", "duvida"];
        tiposOrdem.forEach((tipo, i) => {
          const qtd = porTipo?.[tipo] ?? 0;
          kpiCard(s, 0.4 + i * 1.1, 3.85, 1.0, 0.9, tipoLabels[tipo], String(qtd), AZUL_MEDIO);
        });
      }
      s.addShape("roundRect", { x: 3.6, y: 1.05, w: 5.9, h: 2.6, fill: { color: CINZA_CLARO }, line: { color: CINZA_CLARO, width: 0 }, rectRadius: 0.1 });
      s.addText("Análise – Eficiência Operacional", { x: 3.75, y: 1.15, w: 5.6, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO, margin: 0, valign: "top" });
      const anaOper = fitText((sec.analise as string) || "Análise a ser preenchida.", 5.6, 2.0, 10, 7);
      s.addText(anaOper.text, { x: 3.75, y: 1.55, w: 5.6, h: 2.0, fontSize: anaOper.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
    }
  }

  // ── SLIDE 14: EFICIÊNCIA E PREVISIBILIDADE ──────────────────────
  {
    const sec = sections["eficiencia_previsibilidade"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Eficiência e Previsibilidade");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      statusBadge(s, 0.5, 1.1, 2.8, (sec.status as string) ?? "adequado");
      if (!sec.frequencia_deploy && !sec.frequenciaDeploy && !sec.lead_time && !sec.leadTime && !sec.demandas) {
        emptyMsg(s, "Dados serão preenchidos via Azure DevOps. Configure na tela de edição.");
      }
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
        s.addText("Análise", { x: 5.55, y: 1.15, w: 3.8, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO, valign: "top" });
        const anaPrev = fitText(sec.analise as string, 3.8, 3.4, 10, 7);
        s.addText(anaPrev.text, { x: 5.55, y: 1.6, w: 3.8, h: 3.4, fontSize: anaPrev.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 15: DESEMPENHO DA APLICAÇÃO ───────────────────────────
  {
    const sec = sections["desempenho_aplicacao"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Desempenho da Aplicação");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });

      const statusRaw = normalizeStatus((sec.status as string) ?? "adequado");
      statusBadge(s, 0.5, 1.1, 2.8, statusRaw);

      // Gauge velocímetro — paths fixos pré-calculados (cx=150,cy=150,r=110,sweep=1)
      const gx = 0.5; const gy = 1.6; const gw = 2.8;
      // Arco 180°→360° pelo topo (270°=y40). Ponteiro aponta para status ativo.
      const needlePoints: Record<string, [number,number]> = {
        critico:  [66.6,  116.3],
        atencao:  [114.8, 67.2],
        adequado: [183.7, 66.6],
        alta:     [232.8, 114.8],
      };
      const [npx, npy] = needlePoints[statusRaw] ?? needlePoints.adequado;
      const gaugeSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="195" viewBox="0 0 320 195">'
        + '<path d="M 40 150 A 110 110 0 0 1 72.2 72.2" fill="none" stroke="#C81E1E" stroke-width="26" stroke-linecap="butt"/>'
        + '<path d="M 72.2 72.2 A 110 110 0 0 1 150 40" fill="none" stroke="#C85000" stroke-width="26" stroke-linecap="butt"/>'
        + '<path d="M 150 40 A 110 110 0 0 1 227.8 72.2" fill="none" stroke="#C8A000" stroke-width="26" stroke-linecap="butt"/>'
        + '<path d="M 227.8 72.2 A 110 110 0 0 1 260 150" fill="none" stroke="#1E8A3E" stroke-width="26" stroke-linecap="butt"/>'
        + '<line x1="150" y1="150" x2="' + npx + '" y2="' + npy + '" stroke="#1A4F8A" stroke-width="5" stroke-linecap="round"/>'
        + '<circle cx="150" cy="150" r="12" fill="#1A4F8A"/>'
        + '<circle cx="150" cy="150" r="5" fill="#FFFFFF"/>'
        + '<text x="22" y="98.3" font-size="12" fill="#C81E1E" font-family="Arial" font-weight="bold" text-anchor="middle">Critico</text>'
        + '<text x="96.1" y="23" font-size="12" fill="#C85000" font-family="Arial" font-weight="bold" text-anchor="middle">Atencao</text>'
        + '<text x="201.7" y="22" font-size="12" fill="#C8A000" font-family="Arial" font-weight="bold" text-anchor="middle">Adequado</text>'
        + '<text x="277" y="96.1" font-size="12" fill="#1E8A3E" font-family="Arial" font-weight="bold" text-anchor="middle">Alta</text>'
        + '</svg>';
      const svgB64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(gaugeSvg)));
      s.addImage({ data: svgB64, x: gx, y: gy + 0.1, w: gw, h: 2.05 });

      // Análise
      s.addShape("roundRect", { x: 3.6, y: 1.05, w: 5.9, h: 4.1, fill: { color: CINZA_CLARO }, line: { color: CINZA_CLARO, width: 0 }, rectRadius: 0.1 });
      s.addText("Análise – Desempenho da Aplicação", { x: 3.75, y: 1.15, w: 5.6, h: 0.35, fontSize: 11, bold: true, color: AZUL_ESCURO, valign: "top" });
      const anaDesemp = fitText((sec.analise as string) || "Análise a ser preenchida.", 5.6, 3.4, 10, 7);
      s.addText(anaDesemp.text, { x: 3.75, y: 1.6, w: 5.6, h: 3.4, fontSize: anaDesemp.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
    }
  }

  // ── SLIDE 16: ENGAJAMENTO DO USUÁRIO ────────────────────────────
  {
    const sec = sections["engajamento_usuario"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Engajamento e Experiência do Usuário");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
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
        const anaEng = fitText(sec.analise as string, 9, 0.85, 10, 7);
        s.addText(anaEng.text, { x: 0.5, y: 4.1, w: 9, h: 0.85, fontSize: anaEng.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 17: MATURIDADE DA PLATAFORMA ──────────────────────────
  {
    const sec = sections["maturidade_plataforma"] ?? {};
    const metricas = (sec.metricas as Array<{ nome: string; valor: string }>) ?? [];
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Maturidade e Gestão da Plataforma");
      s.addText(mesAno, { x: 0.5, y: 0.72, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      if (metricas.length === 0 && !sec.analise) {
        emptyMsg(s, "Preencha as métricas de maturidade na tela de edição.");
      }
      metricas.forEach((m, i) => {
        const col = i % 4; const row = Math.floor(i / 4);
        kpiCard(s, 0.4 + col * 2.35, 1.1 + row * 1.2, 2.1, 1.0, m.nome, m.valor, AZUL_MEDIO);
      });
      if (sec.analise) {
        const yBase = metricas.length > 0 ? 1.1 + Math.ceil(metricas.length / 4) * 1.2 + 0.2 : 1.1;
        const alturaAna = Math.max(0.4, BODY_BOTTOM - yBase);
        const anaMat = fitText(sec.analise as string, 9, alturaAna, 10, 7);
        s.addText(anaMat.text, { x: 0.5, y: yBase, w: 9, h: alturaAna, fontSize: anaMat.fontSize, color: CINZA_TEXTO, wrap: true, valign: "top" });
      }
    }
  }

  // ── SLIDE 18: TREINAMENTOS / REUNIÕES ───────────────────────────
  {
    const sec = sections["treinamentos_reunioes"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Treinamentos / Reuniões");
      sourceFooter(s, 'fireflies');
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      const reunioes = ((sec.linhas ?? sec.reunioes) as Array<{ tipo: string; data: string; horario?: string; descricao: string }>) ?? [];
      const rodapeTreino = (sec.rodape as string) ?? "Além das reuniões e treinamentos realizados, a equipe da BNP presta apoio consultivo contínuo aos gestores.";
      let slideTreino = s;
      if (reunioes.length > 0) {
        // Tabela densa: fonte 8 e descrição limitada, com paginação por altura real.
        const rowsTreino: TableRow[] = reunioes.map(r => {
          const desc = r.descricao ?? "";
          const descTruncada = desc.length > 240 ? desc.substring(0, 240).trimEnd() + "…" : desc;
          return [
            { text: r.tipo ?? "" },
            { text: `${r.data ?? ""}${r.horario ? " " + r.horario : ""}` },
            { text: descTruncada },
          ];
        });
        const paginado = addPaginatedTable(pres, s, "Treinamentos / Reuniões", tableHeader("TIPO", "DATA", "DESCRIÇÃO DA ATIVIDADE"), rowsTreino, {
          colW: [1.6, 1.3, 6.3], firstY: 1.1, contY: 1.1, fontSize: 8, minRowH: 0.32,
          subtitle: mesAno, source: 'fireflies', lastPageReserve: 0.45,
        });
        slideTreino = paginado;
      } else {
        emptyMsg(s, "Nenhuma reunião registrada para o período.");
      }
      slideTreino.addText(rodapeTreino, { x: 0.4, y: 4.55, w: 9.2, h: 0.4, fontSize: 9, bold: true, color: CINZA_TEXTO, italic: true, wrap: true, valign: "top" });
    }
  }

  // ── SLIDE 19: OPORTUNIDADES E FATORES DE ATENÇÃO ────────────────
  {
    const sec = sections["oportunidades_atencao"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Oportunidades e Fatores de Atenção");
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      const itens = (sec.linhas as Array<{ descricao: string; tipo: string }>) ?? [];
      if (itens.length > 0) {
        const rowsOport: TableRow[] = itens.map(it => [{ text: it.descricao ?? "" }, { text: it.tipo ?? "" }]);
        addPaginatedTable(pres, s, "Oportunidades e Fatores de Atenção", tableHeader("DESCRIÇÃO", "TIPO"), rowsOport, {
          colW: [7.0, 2.2], firstY: 1.1, contY: 1.1, fontSize: 11, minRowH: 0.45, subtitle: mesAno,
        });
      } else {
        emptyMsg(s, "Nenhum item registrado para o período.");
      }
    }
  }

  // ── SLIDE 20: TAREFAS PRIORIZADAS ───────────────────────────────
  {
    const sec = sections["priorizadas"] ?? {};
    const tarefasPrio = ((sec.tarefas ?? sec.linhas) as Array<{ nome?: string; tarefa?: string; status: string; categoria: string }>) ?? [];
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Tarefas Priorizadas");
      sourceFooter(s, 'asana');
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      s.addText("Tarefas em andamento e planejadas para o próximo período.", { x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 11, color: "555555", italic: true, valign: "top" });
      if (tarefasPrio.length === 0) {
        emptyMsg(s, "Nenhuma tarefa priorizada. Sincronize com o Asana.");
      } else {
        const rowsPrio: TableRow[] = tarefasPrio.map(t => [
          { text: t.nome ?? t.tarefa ?? "" }, { text: t.status ?? "" }, { text: t.categoria ?? "" },
        ]);
        const paginado = addPaginatedTable(pres, s, "Tarefas Priorizadas", tableHeader("TAREFAS", "STATUS", "CATEGORIA"), rowsPrio, {
          colW: [5.0, 1.4, 2.8], firstY: 1.55, contY: 1.1, fontSize: 10, minRowH: 0.38,
          subtitle: mesAno, source: 'asana', lastPageReserve: sec.total_backlog ? 0.42 : 0,
        });
        // Backlog só na última página
        if (sec.total_backlog) {
          paginado.addText(`Backlog: ${sec.total_backlog} itens`, { x: 0.4, y: 4.62, w: 4, h: 0.3, fontSize: 10, color: "888888", italic: true, valign: "top" });
        }
      }
    }
  }

  // ── SLIDE 21: ENTREGAS ──────────────────────────────────────────
  {
    const sec = sections["entregas"] ?? {};
    if (!isHidden(sec)) {
      const s = pres.addSlide();
      s.background = { color: BRANCO };
      headerBar(s, "Evolução e Inovação / Entregas");
      sourceFooter(s, 'asana');
      s.addText(mesAno, { x: 0.5, y: 0.75, w: 9, h: 0.28, fontSize: 11, bold: true, color: "555555", valign: "top" });
      s.addText("Tarefas desenvolvidas pelo time durante o período. Todas registradas no Asana.", { x: 0.5, y: 1.05, w: 9, h: 0.4, fontSize: 11, color: "555555", italic: true, valign: "top" });
      const tarefas = ((sec.tarefas ?? sec.linhas) as Array<{ nome?: string; tarefa?: string; status: string; categoria: string }>) ?? [];
      if (tarefas.length > 0) {
        const rowsEntregas: TableRow[] = tarefas.map(t => [
          { text: t.nome ?? t.tarefa ?? "" }, { text: t.status ?? "Concluído" }, { text: t.categoria ?? "" },
        ]);
        const paginado = addPaginatedTable(pres, s, "Evolução e Inovação / Entregas", tableHeader("TAREFAS", "STATUS", "CATEGORIA"), rowsEntregas, {
          colW: [5.0, 1.4, 2.8], firstY: 1.55, contY: 1.1, fontSize: 10, minRowH: 0.38,
          subtitle: mesAno, source: 'asana', lastPageReserve: 0.72,
        });
        // Bolha "Total N" só na última página
        paginado.addShape("ellipse", { x: 8.95, y: 4.32, w: 0.65, h: 0.65, fill: { color: AZUL_MEDIO }, line: { color: AZUL_MEDIO } });
        paginado.addText(`Total\n${tarefas.length}`, { x: 8.95, y: 4.32, w: 0.65, h: 0.65, fontSize: 8, bold: true, color: BRANCO, align: "center", valign: "middle", margin: 0 });
      } else {
        emptyMsg(s, "Nenhuma entrega registrada para o período.");
      }
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
