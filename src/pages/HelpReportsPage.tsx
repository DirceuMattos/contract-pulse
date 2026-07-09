import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const SECTIONS = [
  { id: 'visao-geral',  label: 'Visão Geral' },
  { id: 'perfis',       label: 'Perfis e Permissões' },
  { id: 'criar',        label: '1. Criar Relatório' },
  { id: 'editar',       label: '2. Editar Seções' },
  { id: 'sincronizar',  label: '3. Sincronizar Dados' },
  { id: 'status',       label: '4. Fluxo de Status' },
  { id: 'pptx',         label: '5. Gerar PPTX' },
  { id: 'secoes',       label: 'Seções — Referência' },
  { id: 'semaforo',     label: 'Semáforo de Integrações' },
  { id: 'duvidas',      label: 'Dúvidas Frequentes' },
];

function Callout({ type, children }: { type: 'tip' | 'info' | 'warn'; children: React.ReactNode }) {
  const styles = { tip: 'bg-green-50 border-green-400 text-green-900', info: 'bg-blue-50 border-blue-400 text-blue-900', warn: 'bg-amber-50 border-amber-400 text-amber-900' };
  const icons = { tip: '💡', info: 'ℹ️', warn: '⚠️' };
  return (
    <div className={`flex gap-3 p-3 rounded-md border-l-4 text-sm my-3 ${styles[type]}`}>
      <span className="shrink-0">{icons[type]}</span>
      <p className="m-0 leading-relaxed">{children}</p>
    </div>
  );
}

function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="flex flex-col my-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 relative">
          {i < items.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />}
          <div className="w-8 h-8 rounded-full border-2 border-primary text-primary text-xs font-bold flex items-center justify-center shrink-0 z-10 bg-background">{i + 1}</div>
          <div className="pb-6 pt-1 flex-1">
            <p className="font-semibold text-sm text-foreground mb-1">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted">
          <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground border-b border-border">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 mb-12">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary/20">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function HelpReportsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('visao-geral');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { const v = entries.find(e => e.isIntersecting); if (v) setActive(v.target.id); },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ajuda')}><ArrowLeft className="w-4 h-4" /></Button>
        <BookOpen className="w-4 h-4 text-primary" />
        <div>
          <h1 className="text-base font-bold leading-tight">Relatórios Mensais</h1>
          <p className="text-xs text-muted-foreground">Guia do Usuário</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border overflow-y-auto p-3 gap-0.5">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className={`text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${active === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 max-w-3xl">

          <SectionBlock id="visao-geral" title="O que são os Relatórios Mensais?">
            <p className="text-sm text-muted-foreground mb-3">Os Relatórios Mensais consolidam as informações de cada contrato ao longo do mês — entregas, indicadores, squad, histórico de chamados, reuniões e muito mais.</p>
            <p className="text-sm text-muted-foreground mb-4">Cada relatório é composto por <strong>seções</strong>. Algumas são preenchidas automaticamente pelas integrações, outras manualmente pela equipe.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border">
                <p className="font-semibold text-sm mb-1">🤖 Seções automáticas</p>
                <p className="text-xs text-muted-foreground">Preenchidas ao sincronizar: Entregas, Tarefas Priorizadas, Indicadores, Histórico TR, Demonstrativo de Horas e outras vindas das ferramentas integradas.</p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <p className="font-semibold text-sm mb-1">✏️ Seções manuais</p>
                <p className="text-xs text-muted-foreground">Preenchidas pela equipe: Capa, Sumário, Objetivo, Glossário, Ambientes, Oportunidades e Fatores de Atenção, entre outras.</p>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock id="perfis" title="Perfis e Permissões">
            <DataTable
              headers={['Ação', 'Líder de Tribo', 'Projetos e Produtos', 'C-Level / Superadmin']}
              rows={[
                ['Ver relatórios','✔ Sim','✔ Sim','✔ Sim'],
                ['Criar relatório','✔ Sim','✔ Sim','✔ Sim'],
                ['Editar (Rascunho)','✔ Sim','✔ Sim','✔ Sim'],
                ['Editar (Em Revisão)','✔ Sim','✖ Somente leitura','✔ Sim'],
                ['Editar (Aprovado/Publicado)','✖ Bloqueado','✖ Bloqueado','⚠ Somente C-Level/Superadmin'],
                ['Sincronizar dados','✔ Sim','✔ Sim','✔ Sim'],
                ['Gerar PPTX','✔ Sim','✔ Sim','✔ Sim'],
                ['Mover para Em Revisão','✔ Sim','✖ Não','✔ Sim'],
                ['Aprovar / Publicar','✖ Não','✖ Não','✔ Sim'],
              ]}
            />
          </SectionBlock>

          <SectionBlock id="criar" title="1. Criar um Novo Relatório">
            <p className="text-sm text-muted-foreground mb-4">Acesse <strong>Relatórios Mensais</strong> no menu lateral e clique em <strong>+ Novo Relatório</strong>.</p>
            <Steps items={[
              { title: 'Selecione o contrato', body: 'Escolha o contrato para o qual o relatório será gerado. Apenas contratos ativos aparecem na lista.' },
              { title: 'Escolha o mês e o ano', body: 'Se já existir um relatório para esse período, o sistema redireciona automaticamente para o existente.' },
              { title: 'Copiar do mês anterior (opcional)', body: 'Se existir um relatório anterior, o sistema pergunta se você deseja copiar as seções manuais. As seções automáticas sempre começam vazias.' },
              { title: 'Clique em Criar', body: 'O relatório é criado como Rascunho e você é redirecionado para a tela de edição. A sincronização inicia em segundo plano.' },
            ]} />
            <Callout type="tip">Aproveite a opção de cópia — ela traz Objetivo, Glossário e outras seções fixas do mês anterior, economizando tempo.</Callout>
          </SectionBlock>

          <SectionBlock id="editar" title="2. Editar as Seções do Relatório">
            <p className="text-sm text-muted-foreground mb-4">A tela de edição tem duas colunas: à esquerda a lista de seções com indicadores; à direita o editor da seção selecionada.</p>
            <h3 className="font-semibold text-sm mb-2">Indicadores de preenchimento</h3>
            <DataTable headers={['Ícone', 'Significado']} rows={[['⬜','Seção vazia — ainda não preenchida'],['🟡','Preenchimento parcial — alguns campos obrigatórios faltando'],['✅','Seção completa']]} />
            <h3 className="font-semibold text-sm mb-2 mt-4">Salvamento automático</h3>
            <p className="text-sm text-muted-foreground mb-3">Não existe botão "Salvar". Cada alteração é salva automaticamente após 800ms. O indicador <em>"Salvando dados..."</em> aparece no cabeçalho enquanto há alterações pendentes.</p>
            <h3 className="font-semibold text-sm mb-2">Ocultar slide no PPTX</h3>
            <p className="text-sm text-muted-foreground mb-3">Cada seção tem o toggle <strong>"Ocultar slide na geração do PPT"</strong>. Ative para excluir aquela seção do arquivo final.</p>
            <h3 className="font-semibold text-sm mb-2">Copiar do mês anterior</h3>
            <p className="text-sm text-muted-foreground mb-3">Use o botão <strong>Copiar mês anterior</strong> no cabeçalho para copiar seções manuais do relatório mais recente do mesmo contrato.</p>
            <Callout type="info">Ao navegar entre seções, qualquer edição não salva é gravada imediatamente antes da troca.</Callout>
          </SectionBlock>

          <SectionBlock id="sincronizar" title="3. Sincronizar Dados das Integrações">
            <p className="text-sm text-muted-foreground mb-4">Clique em <strong>🔄 Sincronizar Dados</strong>. Um painel mostra o resultado de cada integração:</p>
            <DataTable headers={['Ícone', 'Significado']} rows={[['✅ Verde','Sincronizado com sucesso'],['❌ Vermelho','Falha — o motivo aparece abaixo do nome'],['⚠️ Amarelo','Ignorado — ex: nenhum projeto Asana configurado']]} />
            <h3 className="font-semibold text-sm mb-2 mt-4">Integrações disponíveis</h3>
            <ul className="space-y-2 mb-4">
              {[['📋 Asana','Importa entregas concluídas no mês e tarefas priorizadas.'],['🎙️ Fireflies','Importa reuniões e transcrições filtradas por domínio ou palavras-chave.'],['🎫 Milvus','Importa tickets e demonstrativo de horas via MCP.'],['🔷 Azure DevOps','Importa work items e histórico de TR do projeto configurado.']].map(([t,d]) => (
                <li key={t} className="flex gap-3 p-3 rounded-lg border border-border list-none">
                  <div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                </li>
              ))}
            </ul>
            <Callout type="warn">Se uma integração aparecer com erro, verifique com o administrador se as configurações do contrato estão corretas.</Callout>
          </SectionBlock>

          <SectionBlock id="status" title="4. Fluxo de Status do Relatório">
            <Steps items={[
              { title: 'Rascunho — Estado inicial', body: 'Líderes de Tribo e Projetos e Produtos podem editar livremente e sincronizar dados.' },
              { title: 'Em Revisão — Enviado para revisão', body: 'Líderes ainda editam. Projetos e Produtos passa a somente leitura. C-Level e Superadmin podem aprovar ou devolver para Rascunho.' },
              { title: 'Aprovado — Ninguém pode editar', body: 'Apenas C-Level ou Superadmin podem publicar ou reabrir.' },
              { title: 'Publicado — Relatório finalizado', body: 'Bloqueado para todos. Apenas o Superadmin pode alterar o status se necessário.' },
            ]} />
            <Callout type="info">Quando bloqueado, um aviso em destaque aparece na tela informando o motivo e quem pode reabrir.</Callout>
          </SectionBlock>

          <SectionBlock id="pptx" title="5. Gerar o PPTX">
            <p className="text-sm text-muted-foreground mb-4">Clique em <strong>⬇ Gerar PPTX</strong> no cabeçalho. O download inicia automaticamente.</p>
            <Steps items={[
              { title: 'Revise os indicadores', body: 'Certifique-se de que as seções que devem entrar estão como ✅ ou 🟡. Seções com "Ocultar slide" ativo não entram.' },
              { title: 'Clique em Gerar PPTX', body: 'O botão mostra "Gerando..." enquanto o arquivo é montado.' },
              { title: 'Download automático', body: 'O arquivo é baixado com o nome do contrato e mês/ano. Abra no PowerPoint ou Google Slides para revisar.' },
            ]} />
            <Callout type="tip">O PPTX pode ser gerado em qualquer status — não é necessário que o relatório esteja Publicado.</Callout>
          </SectionBlock>

          <SectionBlock id="secoes" title="Seções do Relatório — Referência Completa">
            <DataTable
              headers={['Seção', 'Origem', 'Descrição']}
              rows={[
                ['Capa','Manual','Identificação: projeto, cliente, número do contrato, criado por, revisado por.'],
                ['Sumário','Manual','Índice do relatório.'],
                ['Glossário de Termos','Manual','Definição dos termos técnicos.'],
                ['Objetivo','Manual','Objetivo geral do contrato e do relatório.'],
                ['Indicadores do Relatório','Auto — Asana/Milvus','KPIs do período.'],
                ['Ambientes Implementados','Manual','Lista dos ambientes em produção.'],
                ['Ambientes — Detalhamento','Manual','Detalhes técnicos dos ambientes.'],
                ['Histórico TR','Auto — Azure DevOps','Tickets e work items do período.'],
                ['Histórico TR — Aderência','Auto — Azure DevOps','Métricas de aderência ao SLA.'],
                ['Evolução e Inovação','Auto — Asana','Distribuição das entregas por categoria.'],
                ['Demonstrativo de Horas','Auto — Milvus','Horas por tipo de atendimento.'],
                ['Eficiência Operacional','Manual','Análise qualitativa da operação.'],
                ['Eficiência e Previsibilidade','Auto — Asana','Lead time e frequência de deploy.'],
                ['Desempenho da Aplicação','Manual','Uptime, incidentes e performance.'],
                ['Engajamento do Usuário','Manual','Métricas de uso da plataforma.'],
                ['Maturidade da Plataforma','Manual','Radar de maturidade técnica.'],
                ['Treinamentos / Reuniões','Auto — Fireflies','Reuniões realizadas no período.'],
                ['Oportunidades e Atenção','Manual','Pontos de melhoria e riscos identificados.'],
                ['Tarefas Priorizadas','Auto — Asana','Backlog e tarefas em andamento.'],
                ['Entregas','Auto — Asana','Tarefas concluídas no período.'],
              ]}
            />
          </SectionBlock>

          <SectionBlock id="semaforo" title="Semáforo de Integrações">
            <p className="text-sm text-muted-foreground mb-4">Na listagem, cada contrato exibe quatro pontos coloridos. A ordem é: <strong>Asana · Fireflies · Milvus · Azure DevOps</strong>.</p>
            <div className="space-y-3 mb-4">
              {[
                { dots: ['bg-green-500','bg-green-500','bg-green-500','bg-green-500'], label: 'Todas as integrações configuradas' },
                { dots: ['bg-gray-300','bg-green-500','bg-green-500','bg-green-500'], label: 'Asana não configurado' },
                { dots: ['bg-green-500','bg-gray-300','bg-green-500','bg-green-500'], label: 'Fireflies não configurado' },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex gap-1.5">{row.dots.map((c, j) => <div key={j} className={`w-3 h-3 rounded-full ${c}`} />)}</div>
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                </div>
              ))}
            </div>
            <Callout type="warn">Um ponto cinza indica integração não configurada. Solicite ao administrador que configure os IDs na tela ⚙️ do contrato.</Callout>
          </SectionBlock>

          <SectionBlock id="duvidas" title="Dúvidas Frequentes">
            {[
              { q: 'O relatório foi criado mas as seções automáticas estão vazias', a: 'A sincronização acontece em segundo plano. Aguarde alguns segundos e clique em 🔄 Sincronizar Dados.' },
              { q: 'Tentei sincronizar mas uma integração deu erro', a: 'Verifique o painel de resultados. O erro mostra o motivo exato. Repasse ao administrador.' },
              { q: 'Não consigo mais editar o relatório', a: 'O relatório está em Aprovado ou Publicado. Solicite ao C-Level ou Superadmin que altere o status.' },
              { q: 'Quero aproveitar o conteúdo do mês anterior', a: 'Ao criar, o sistema oferece a opção de cópia. Se já criado, use o botão Copiar mês anterior no cabeçalho.' },
              { q: 'Criei o relatório no mês errado', a: 'Delete o relatório incorreto (só em Rascunho) e crie um novo para o mês correto.' },
              { q: 'O PPTX gerou sem alguma seção', a: 'Verifique se o toggle "Ocultar slide" está ativado naquela seção. Desative-o e gere novamente.' },
            ].map((item, i) => (
              <div key={i} className="mb-4 pb-4 border-b border-border last:border-0">
                <h3 className="font-semibold text-sm text-foreground mb-1">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </SectionBlock>

        </main>
      </div>
    </div>
  );
}
