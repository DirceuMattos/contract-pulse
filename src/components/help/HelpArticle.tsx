// v2 - acrescenta o botão "Baixar HTML" (publicação em plataforma interna) e os
// data-attributes que dão estrutura ao arquivo exportado sem depender do Tailwind.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadHelpArticleHtml } from '@/lib/exportHelpHtml';

export interface HelpSection {
  id: string;
  label: string;
  title: string;
  content: React.ReactNode;
}

interface HelpArticleProps {
  title: string;
  description: string;
  icon: LucideIcon;
  sections: HelpSection[];
}

export function Callout({ type, children }: { type: 'tip' | 'info' | 'warn'; children: React.ReactNode }) {
  const styles = {
    tip: 'bg-green-50 border-green-400 text-green-900',
    info: 'bg-blue-50 border-blue-400 text-blue-900',
    warn: 'bg-amber-50 border-amber-400 text-amber-900',
  };

  return (
    <div data-h="callout" data-t={type} className={`p-3 rounded-md border-l-4 text-sm my-3 ${styles[type]}`}>
      <p className="m-0 leading-relaxed">{children}</p>
    </div>
  );
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div data-h="steps" className="flex flex-col my-4">
      {items.map((item, index) => (
        <div data-h="step" key={item.title} className="flex gap-4 relative">
          {index < items.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />}
          <div data-h="step-num" className="w-8 h-8 rounded-full border-2 border-primary text-primary text-xs font-bold flex items-center justify-center shrink-0 z-10 bg-background">
            {index + 1}
          </div>
          <div className="pb-6 pt-1 flex-1">
            <p data-h="step-title" className="font-semibold text-sm text-foreground mb-1">{item.title}</p>
            <p data-h="step-body" className="text-sm text-muted-foreground">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div data-h="table-wrap" className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-3 py-2 text-muted-foreground border-b border-border last:border-b-0">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HelpArticle({ title, description, icon: Icon, sections }: HelpArticleProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Gera um arquivo HTML independente deste tutorial, para publicar em plataforma
  // interna (SPOT, wiki) ou salvar em PDF. Sempre reflete a versão atual do sistema.
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadHelpArticleHtml(title, description, sections);
      toast.success('Tutorial exportado', { description: 'Arquivo HTML pronto para publicar ou imprimir em PDF.' });
    } catch {
      toast.error('Não foi possível exportar o tutorial');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ajuda')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Icon className="w-4 h-4 text-primary" />
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight truncate">{title}</h1>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0 gap-2"
          onClick={handleExport}
          disabled={exporting}
          title="Baixa este tutorial como um arquivo HTML independente, para publicar em plataforma interna ou salvar em PDF"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Gerando...' : 'Baixar HTML'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border overflow-y-auto p-3 gap-0.5">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                active === section.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 max-w-3xl">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-20 mb-12">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary/20">
                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              </div>
              {section.content}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
