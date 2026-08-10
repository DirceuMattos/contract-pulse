// v1 - exportação de tutorial da Central de Ajuda como HTML autossuficiente.
// Serve para publicar a documentação em plataformas internas (SPOT, wiki, intranet)
// sem precisar copiar e colar conteúdo à mão. O arquivo gerado não tem JavaScript,
// não faz requisição de rede e imprime bem (Ctrl+P gera um PDF limpo).

import type { ReactNode } from 'react';

export interface ExportSection {
  id: string;
  label: string;
  title: string;
  content: ReactNode;
}

export function slugifyTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Estilo do documento exportado. Independente do Tailwind: seleciona por elemento e
// pelos data-attributes que o HelpArticle emite. Algumas classes do app são usadas
// como seletor apenas para preservar ênfase de texto.
const CSS = `
:root{--azul:#1a4f8a;--azul-claro:#2d7fc1;--azul-suave:#eef4fb;--texto:#1c2430;--apoio:#5a6675;--borda:#dde3ea}
*{box-sizing:border-box}
body{margin:0;padding:32px 20px 64px;background:#f6f8fa;color:var(--texto);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.tutorial{max-width:820px;margin:0 auto;background:#fff;border:1px solid var(--borda);border-radius:12px;padding:40px 44px 32px}
.cabecalho{border-bottom:3px solid var(--azul);padding-bottom:20px;margin-bottom:28px}
.trilha{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--azul-claro);font-weight:600}
.cabecalho h1{margin:0 0 8px;font-size:30px;line-height:1.2;color:var(--azul)}
.subtitulo{margin:0;color:var(--apoio)}
.sumario{background:var(--azul-suave);border-radius:10px;padding:18px 22px;margin-bottom:32px}
.sumario-titulo{margin:0 0 10px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;font-weight:700;color:var(--azul)}
.sumario ol{margin:0;padding-left:20px;columns:2;column-gap:32px}
.sumario li{margin-bottom:5px;font-size:14px;break-inside:avoid}
.sumario a{color:var(--texto);text-decoration:none}
.sumario a:hover{color:var(--azul-claro);text-decoration:underline}
.secao{margin-bottom:40px;scroll-margin-top:20px}
.secao h2{display:flex;align-items:baseline;gap:12px;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid var(--borda);font-size:21px;line-height:1.3}
.secao-num{font-size:13px;font-weight:700;color:var(--azul-claro);letter-spacing:.05em}
.secao p{margin:0 0 12px;color:var(--apoio)}
.secao strong{font-weight:600;color:var(--texto)}
.secao p.font-semibold,.secao p.font-bold{color:var(--texto);font-weight:600}
.secao .text-xs{font-size:13px}
code{background:#f2f4f7;padding:1px 5px;border-radius:4px;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
ul{margin:0 0 14px;padding-left:22px;color:var(--apoio)}
ul li{margin-bottom:5px}
[data-h="steps"]{list-style:none;margin:20px 0;padding:0}
[data-h="step"]{display:flex;gap:14px;padding-bottom:18px;position:relative}
[data-h="step"]:not(:last-child)::before{content:"";position:absolute;left:15px;top:32px;bottom:0;width:2px;background:var(--borda)}
[data-h="step-num"]{flex:0 0 32px;width:32px;height:32px;border-radius:50%;border:2px solid var(--azul-claro);color:var(--azul-claro);background:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;position:relative;z-index:1}
[data-h="step-title"]{margin:5px 0 3px!important;font-weight:600;color:var(--texto)!important}
[data-h="step-body"]{margin:0!important;color:var(--apoio)}
[data-h="table-wrap"]{margin:18px 0;border:1px solid var(--borda);border-radius:8px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14.5px}
th{background:#f2f5f8;text-align:left;padding:10px 12px;font-weight:600;border-bottom:1px solid var(--borda);white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid #edf0f4;color:var(--apoio);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even){background:#fafbfc}
[data-h="callout"]{margin:16px 0;padding:14px 16px;border-left:4px solid;border-radius:0 8px 8px 0}
[data-h="callout"] p{margin:0;color:inherit}
[data-h="callout"]::before{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:4px}
[data-h="callout"][data-t="tip"]{background:#f0f9f2;border-color:#34a853;color:#14532d}
[data-h="callout"][data-t="tip"]::before{content:"Dica";color:#1e7233}
[data-h="callout"][data-t="info"]{background:var(--azul-suave);border-color:var(--azul-claro);color:#12395f}
[data-h="callout"][data-t="info"]::before{content:"Saiba mais";color:var(--azul)}
[data-h="callout"][data-t="warn"]{background:#fdf6e7;border-color:#e0a415;color:#6b4a00}
[data-h="callout"][data-t="warn"]::before{content:"Atenção";color:#8a6100}
.rodape{margin-top:40px;padding-top:18px;border-top:1px solid var(--borda);color:var(--apoio);font-size:13px}
.rodape p{margin:0 0 4px}
@media print{body{background:#fff;padding:0}.tutorial{border:none;border-radius:0;padding:0;max-width:none}.secao{page-break-inside:avoid}}
@media (max-width:640px){.tutorial{padding:24px 20px}.sumario ol{columns:1}.cabecalho h1{font-size:24px}}
`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Monta o documento HTML completo do tutorial.
 * Usa react-dom/server via import dinâmico para não pesar no bundle inicial.
 */
export async function buildHelpArticleHtml(
  title: string,
  description: string,
  sections: ExportSection[],
): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const data = new Date().toLocaleDateString('pt-BR');

  const sumario = sections
    .map((s) => `<li><a href="#${s.id}">${esc(s.label)}</a></li>`)
    .join('');

  const corpo = sections
    .map((s, i) => {
      const html = renderToStaticMarkup(s.content as React.ReactElement);
      return `<section id="${s.id}" class="secao">
    <h2><span class="secao-num">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h2>
    ${html}
  </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — BNPHub</title>
<style>${CSS}</style>
</head>
<body>
<article class="tutorial">
  <header class="cabecalho">
    <p class="trilha">BNPHub · Central de Ajuda</p>
    <h1>${esc(title)}</h1>
    <p class="subtitulo">${esc(description)}</p>
  </header>
  <nav class="sumario">
    <p class="sumario-titulo">Neste tutorial</p>
    <ol>${sumario}</ol>
  </nav>
  ${corpo}
  <footer class="rodape">
    <p>Extraído da Central de Ajuda do BNPHub em ${data}.</p>
    <p>Em caso de divergência entre este material e o sistema, o sistema prevalece — gere o arquivo novamente.</p>
  </footer>
</article>
</body>
</html>`;
}

/** Gera o arquivo e dispara o download no navegador. */
export async function downloadHelpArticleHtml(
  title: string,
  description: string,
  sections: ExportSection[],
): Promise<void> {
  const html = await buildHelpArticleHtml(title, description, sections);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bnphub-ajuda-${slugifyTitulo(title)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
