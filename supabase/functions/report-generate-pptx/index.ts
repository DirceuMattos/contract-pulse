import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pptxgen from 'https://esm.sh/pptxgenjs@3.12.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEADER_BG = '1A4F8A';
const TABLE_HEADER = '2D7FC1';
const CLOSING_BG = 'E6F0FA';
const STATUS_COLORS: Record<string, string> = {
  'Alta Performance': '22C55E',
  'Adequado': 'EAB308',
  'Atenção': 'F97316',
  'Crítico': 'EF4444',
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const LABELS: Record<string, string> = {
  capa: 'Capa', sumario: 'Sumário', objetivo: 'Objetivo', historico_tr: 'Histórico TR',
  painel_executivo: 'Painel Executivo', evolucao_inovacao: 'Evolução e Inovação',
  entregas: 'Entregas', priorizadas: 'Priorizadas', demonstrativo_horas: 'Demonstrativo de Horas',
  eficiencia_operacional: 'Eficiência Operacional', eficiencia_previsibilidade: 'Eficiência e Previsibilidade',
  desempenho_aplicacao: 'Desempenho da Aplicação', engajamento_usuario: 'Engajamento do Usuário',
  maturidade_plataforma: 'Maturidade da Plataforma', treinamentos_reunioes: 'Treinamentos e Reuniões',
  oportunidades_atencao: 'Oportunidades e Fatores de Atenção',
};

function addHeader(slide: any, pres: any, title: string) {
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: HEADER_BG } });
  slide.addText(title, { x: 0.3, y: 0.05, w: 9, h: 0.5, fontSize: 18, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
}

function addSection(pres: any, sectionKey: string, content: any) {
  const slide = pres.addSlide();
  addHeader(slide, pres, LABELS[sectionKey] ?? sectionKey);
  let y = 0.9;
  if (sectionKey === 'objetivo') {
    slide.addText(String(content?.texto ?? ''), { x: 0.5, y, w: 9, h: 5, fontSize: 14, fontFace: 'Calibri' });
  } else if (sectionKey === 'painel_executivo') {
    const items = [
      ['Histórico TR', content?.historicoTr], ['Evolução e Inovação', content?.evolucaoInovacao],
      ['Eficiência Operacional', content?.eficienciaOperacional], ['Eficiência e Previsibilidade', content?.eficienciaPrevisibilidade],
      ['Desempenho da Aplicação', content?.desempenhoAplicacao], ['Engajamento do Usuário', content?.engajamentoUsuario],
    ];
    items.forEach(([label, status], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7, yy = 1 + row * 1.4;
      slide.addShape(pres.ShapeType.roundRect, { x, y: yy, w: 4.3, h: 1.2, fill: { color: 'F5F5F5' }, line: { color: 'CCCCCC' } });
      slide.addText(String(label), { x: x + 0.2, y: yy + 0.1, w: 4, h: 0.4, fontSize: 12, bold: true, fontFace: 'Calibri' });
      slide.addText(String(status ?? '-'), {
        x: x + 0.2, y: yy + 0.55, w: 4, h: 0.5, fontSize: 14, bold: true,
        color: STATUS_COLORS[status] ?? '666666', fontFace: 'Calibri',
      });
    });
  } else if (Array.isArray(content?.linhas) && (sectionKey === 'entregas' || sectionKey === 'priorizadas')) {
    const rows = [
      [{ text: 'Tarefa', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Status', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Categoria', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Assignee', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } }],
      ...content.linhas.slice(0, 15).map((l: any) => [l.tarefa, l.status, l.categoria, l.assignee]),
    ];
    slide.addTable(rows, { x: 0.3, y, w: 9.4, fontSize: 10, fontFace: 'Calibri', border: { type: 'solid', color: 'CCCCCC', pt: 0.5 } });
  } else if (sectionKey === 'demonstrativo_horas' && Array.isArray(content?.linhas)) {
    const rows = [
      [{ text: 'Recurso', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Serviços', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Unidade', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Qtd.', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } }],
      ...content.linhas.map((l: any) => [l.recurso, l.servicos, l.unidade, String(l.quantidade)]),
    ];
    slide.addTable(rows, { x: 0.3, y, w: 9.4, fontSize: 10, fontFace: 'Calibri', border: { type: 'solid', color: 'CCCCCC', pt: 0.5 } });
    slide.addText(String(content?.legenda ?? ''), { x: 0.3, y: 6.5, w: 9.4, h: 0.5, fontSize: 9, italic: true, color: '666666' });
  } else if (sectionKey === 'treinamentos_reunioes' && Array.isArray(content?.linhas)) {
    const rows = [
      [{ text: 'Tipo', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Data', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Descrição', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } }],
      ...content.linhas.map((l: any) => [l.tipo, l.data, l.descricao]),
    ];
    slide.addTable(rows, { x: 0.3, y, w: 9.4, fontSize: 10, fontFace: 'Calibri', border: { type: 'solid', color: 'CCCCCC', pt: 0.5 } });
  } else if (sectionKey === 'oportunidades_atencao' && Array.isArray(content?.linhas)) {
    const rows = [
      [{ text: 'Descrição', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } },
       { text: 'Tipo', options: { bold: true, color: 'FFFFFF', fill: TABLE_HEADER } }],
      ...content.linhas.map((l: any) => [l.descricao, l.tipo]),
    ];
    slide.addTable(rows, { x: 0.3, y, w: 9.4, fontSize: 11, fontFace: 'Calibri', border: { type: 'solid', color: 'CCCCCC', pt: 0.5 } });
  } else {
    // Generic: render key/values
    const lines: string[] = [];
    Object.entries(content ?? {}).forEach(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number') lines.push(`${k}: ${v}`);
    });
    slide.addText(lines.join('\n') || '(seção em branco)', { x: 0.5, y, w: 9, h: 5, fontSize: 12, fontFace: 'Calibri' });
    if (content?.analise) slide.addText(`Análise: ${content.analise}`, { x: 0.5, y: 5, w: 9, h: 1.5, fontSize: 11, italic: true, fontFace: 'Calibri' });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reportId } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: report, error: rErr } = await supabase.from('monthly_reports').select('*').eq('id', reportId).single();
    if (rErr) throw rErr;
    const { data: sections } = await supabase.from('report_sections').select('*').eq('report_id', reportId).order('created_at');
    const { data: contract } = await supabase.from('contracts').select('*').eq('id', report.contract_id).single();
    const { data: client } = await supabase.from('clients').select('*').eq('id', contract?.client_id).maybeSingle();

    const pres = new (pptxgen as any)();
    pres.layout = 'LAYOUT_WIDE';
    pres.title = `Relatório Mensal - ${contract?.nome ?? ''} - ${MONTHS[report.month - 1]}/${report.year}`;

    // Cover slide
    const cover = pres.addSlide();
    cover.background = { color: HEADER_BG };
    cover.addText('RELATÓRIO MENSAL DE ATIVIDADES', { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
    cover.addText(contract?.nome ?? '', { x: 0.5, y: 3, w: 12, h: 1, fontSize: 26, color: 'FFFFFF', fontFace: 'Calibri' });
    cover.addText(client?.nome_fantasia || client?.razao_social || '', { x: 0.5, y: 4, w: 12, h: 0.6, fontSize: 18, color: 'CADCFC', fontFace: 'Calibri' });
    cover.addText(`${MONTHS[report.month - 1]} / ${report.year}`, { x: 0.5, y: 5, w: 12, h: 0.6, fontSize: 18, color: 'FFFFFF', fontFace: 'Calibri' });

    // Content sections
    for (const s of (sections ?? [])) {
      if (s.section_key === 'capa') continue;
      addSection(pres, s.section_key, s.content);
    }

    // Closing slide
    const closing = pres.addSlide();
    closing.background = { color: CLOSING_BG };
    closing.addText('Obrigado!', { x: 0.5, y: 2.5, w: 12, h: 1.5, fontSize: 48, bold: true, color: HEADER_BG, align: 'center', fontFace: 'Calibri' });
    closing.addText('BNP — Soluções Digitais', { x: 0.5, y: 4, w: 12, h: 0.7, fontSize: 20, color: HEADER_BG, align: 'center', fontFace: 'Calibri' });

    const base64 = await pres.write({ outputType: 'base64' });
    const filename = `relatorio-${report.year}-${String(report.month).padStart(2, '0')}-${(contract?.nome ?? 'contrato').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.pptx`;

    return new Response(JSON.stringify({ fileBase64: base64, filename }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
