import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const SECTIONS = [
  { id: 'visao-geral',  label: 'Visão Geral' },
  { id: 'cards',        label: 'Lendo os Cards' },
  { id: 'saude',        label: 'Indicadores de Saúde' },
  { id: 'filtros',      label: 'Filtros e Ordenação' },
  { id: 'criar',        label: 'Criar Contrato' },
  { id: 'editar',       label: 'Editar Contrato' },
  { id: 'recursos',     label: 'Recursos do Contrato' },
  { id: 'status',       label: 'Status do Contrato' },
  { id: 'perfis',       label: 'Perfis e Permissões' },
  { id: 'duvidas',      label: 'Dúvidas Frequentes' },
];

function Callout({ type, children }: { type: 'tip' | 'info' | 'warn'; children: React.ReactNode }) {
  const s = { tip: 'bg-green-50 border-green-400 text-green-900', info: 'bg-blue-50 border-blue-400 text-blue-900', warn: 'bg-amber-50 border-amber-400 text-amber-900' };
  const i = { tip: '💡', info: 'ℹ️', warn: '⚠️' };
  return <div className={`flex gap-3 p-3 rounded-md border-l-4 text-sm my-3 ${s[type]}`}><span className="shrink-0">{i[type]}</span><p className="m-0 leading-relaxed">{children}</p></div>;
}

function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="flex flex-col my-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 relative">
          {i < items.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />}
          <div className="w-8 h-8 rounded-full border-2 border-primary text-primary text-xs font-bold flex items-center justify-center shrink-0 z-10 bg-background">{i + 1}</div>
          <div className="pb-6 pt-1 flex-1"><p className="font-semibold text-sm text-foreground mb-1">{item.title}</p><p className="text-sm text-muted-foreground">{item.body}</p></div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted"><tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>{row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground border-b border-border last:border-b-0">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function SectionBlock({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 mb-12">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary/20"><h2 className="text-lg font-bold text-foreground">{title}</h2></div>
      {children}
    </div>
  );
}

export default function HelpContractsPage() {
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
        <FileText className="w-4 h-4 text-primary" />
        <div><h1 className="text-base font-bold leading-tight">Contratos</h1><p className="text-xs text-muted-foreground">Como gerenciar contratos, recursos e saúde financeira</p></div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border overflow-y-auto p-3 gap-0.5">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className={`text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${active === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {s.label}
            </a>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-6 max-w-3xl">

          <SectionBlock id="visao-geral" title="O que é o módulo de Contratos?">
            <p className="text-sm text-muted-foreground mb-3">O módulo de Contratos é o coração operacional do BNPHub. Reúne todos os contratos ativos, seu desempenho financeiro, composição de equipe, alertas e documentos associados.</p>
            <p className="text-sm text-muted-foreground mb-4">Cada contrato está vinculado a um cliente e pode conter recursos humanos, subprojetos, histórico de reajustes e documentos. O sistema calcula automaticamente indicadores de saúde com base nos dados cadastrados.</p>
            <DataTable headers={['Status', 'Significado']} rows={[
              ['Em Operação',   'Contrato ativo em pleno funcionamento.'],
              ['Em Implantação','Contrato em fase inicial de implementação.'],
              ['Proposta',      'Proposta comercial em negociação.'],
              ['Suspenso',      'Contrato temporariamente paralisado.'],
              ['Encerrado',     'Contrato finalizado. Não aparece nas listagens padrão.'],
            ]} />
          </SectionBlock>

          <SectionBlock id="cards" title="Lendo os Cards de Contrato">
            <DataTable headers={['Elemento', 'O que significa']} rows={[
              ['Logo / Cliente',        'Logotipo do cliente vinculado ao contrato.'],
              ['Nome do contrato',      'Nome completo do contrato.'],
              ['Código',                'Código interno de identificação do contrato.'],
              ['Badge de status',       'Indica o status atual (Em Operação, Em Implantação, etc.).'],
              ['Indicador de saúde',    '🟢 Saudável · 🟡 Atenção · 🔴 Crítico — calculado automaticamente.'],
              ['Valor mensal',          'Receita mensal do contrato (visível apenas para perfis com acesso a valores).'],
              ['Margem',                'Percentual de margem do contrato (visível apenas para perfis com acesso a valores).'],
              ['Alertas',               'Ícones de alerta para vencimento próximo, reajuste pendente ou margem baixa.'],
              ['Vigência',              'Datas de início e fim do contrato.'],
            ]} />
            <Callout type="info">Valores financeiros (receita, margem, custos) são visíveis apenas para C-Level, Administrativo e Superadmin.</Callout>
          </SectionBlock>

          <SectionBlock id="saude" title="Indicadores de Saúde do Contrato">
            <p className="text-sm text-muted-foreground mb-4">O sistema calcula automaticamente a saúde de cada contrato com base em múltiplos critérios:</p>
            <DataTable headers={['Indicador', 'Saudável 🟢', 'Atenção 🟡', 'Crítico 🔴']} rows={[
              ['Margem', '≥ margem mínima configurada', 'Próximo da margem mínima', 'Abaixo da margem mínima'],
              ['Vencimento', '> 90 dias', '30–90 dias', '< 30 dias'],
              ['Recursos', 'Equipe completa', 'Algum recurso inativo', 'Recurso crítico inativo'],
              ['Reajuste', 'Em dia', 'Reajuste próximo', 'Reajuste vencido'],
            ]} />
            <Callout type="tip">O filtro de saúde no topo da tela permite visualizar rapidamente todos os contratos críticos ou em atenção, facilitando a priorização de ações.</Callout>
          </SectionBlock>

          <SectionBlock id="filtros" title="Filtros e Ordenação">
            <p className="text-sm text-muted-foreground mb-4">Use os filtros no topo da tela para navegar pelos contratos:</p>
            <DataTable headers={['Filtro / Ordenação', 'Como usar']} rows={[
              ['Busca',           'Pesquisa por nome do contrato, código ou nome do cliente em tempo real.'],
              ['Segmento',        'Filtra por Govtech ou Privado.'],
              ['Status',          'Filtra por status do contrato (Em Operação, Proposta, etc.).'],
              ['Saúde',           'Filtra por indicador de saúde (Saudável, Atenção, Crítico). Múltipla seleção.'],
              ['Alertas',         'Filtra contratos com alertas específicos (vencimento, reajuste, margem).'],
              ['Ordenação',       'Ordena por Saúde (padrão), Valor Mensal (↓), Margem (↑ ou ↓).'],
            ]} />
            <Callout type="tip">Os filtros podem ser combinados. Um contador mostra quantos filtros estão ativos. Clique em "Limpar filtros" para redefinir tudo.</Callout>
          </SectionBlock>

          <SectionBlock id="criar" title="Criar um Novo Contrato">
            <p className="text-sm text-muted-foreground mb-4">Clique em <strong>+ Novo Contrato</strong> para abrir o formulário.</p>
            <Steps items={[
              { title: 'Vincule ao cliente', body: 'Selecione o cliente na lista. Apenas clientes já cadastrados aparecem. Se o cliente não existir, cadastre-o primeiro no módulo de Clientes.' },
              { title: 'Preencha o nome e código', body: 'O nome é o identificador principal do contrato. O código é o número ou referência interna (ex: "025/2026").' },
              { title: 'Defina o status inicial', body: 'Geralmente "Em Implantação" para contratos novos ou "Proposta" para negociações em andamento.' },
              { title: 'Informe os dados financeiros', body: 'Valor mensal, data de início, data de fim e índice de reajuste. Estes dados alimentam os indicadores de saúde e os alertas automáticos.' },
              { title: 'Configure o segmento e tipo', body: 'Govtech ou Privado. Isso afeta os filtros e relatórios.' },
              { title: 'Salve', body: 'O contrato é criado e aparece na listagem. Você pode adicionar recursos, documentos e subprojetos após a criação.' },
            ]} />
            <Callout type="info">Somente perfis com permissão de criação visualizam o botão "+ Novo Contrato".</Callout>
          </SectionBlock>

          <SectionBlock id="editar" title="Editar um Contrato">
            <p className="text-sm text-muted-foreground mb-3">Para editar um contrato, acesse a página de detalhe do contrato (clique no card) e clique em <strong>Editar</strong>. Também é possível clicar no menu <strong>⋯</strong> no card da listagem.</p>
            <p className="text-sm text-muted-foreground mb-4">Os dados editáveis incluem: nome, código, status, valores financeiros, datas, segmento, logotipo e configurações de alerta.</p>
            <Callout type="warn">Perfis Líder de Tribo, Coordenação de Suporte e Projetos e Produtos não possuem permissão de edição de contratos.</Callout>
          </SectionBlock>

          <SectionBlock id="recursos" title="Gerenciar Recursos do Contrato">
            <p className="text-sm text-muted-foreground mb-4">Acesse a tela de <strong>Recursos</strong> pelo menu do contrato ou pelo botão "Ver recursos" nos cards de Squad. Aqui você gerencia a equipe alocada diretamente no contrato.</p>
            <DataTable headers={['Tipo de recurso', 'Descrição']} rows={[
              ['CLT',   'Colaborador contratado como CLT. Contabiliza no cálculo de dedicação do RH.'],
              ['PJ',    'Colaborador contratado como Pessoa Jurídica. Também contabiliza na dedicação.'],
              ['Outro', 'Licença de software, ferramenta, posição genérica ou recurso não-humano.'],
            ]} />
            <h3 className="font-semibold text-sm mb-2 mt-4">Adicionar recurso</h3>
            <Steps items={[
              { title: 'Clique em "+ Adicionar Recurso"', body: 'Na tela de recursos do contrato.' },
              { title: 'Defina o tipo', body: 'CLT, PJ ou Outro.' },
              { title: 'Preencha nome, cargo e dedicação', body: 'Para CLT e PJ, informe o percentual de dedicação (%). Para vincular a um colaborador do RH, selecione o nome na lista.' },
              { title: 'Informe o local de atuação', body: 'BNP ou Cliente.' },
              { title: 'Salve', body: 'O recurso aparece na equipe do contrato e no módulo de Squads.' },
            ]} />
            <Callout type="info">Recursos do tipo CLT/PJ vinculados a um colaborador do módulo de RH têm sua dedicação contabilizada automaticamente nos alertas de sub-dedicação.</Callout>
          </SectionBlock>

          <SectionBlock id="status" title="Status do Contrato">
            <p className="text-sm text-muted-foreground mb-4">O status define onde o contrato aparece nos filtros e quais cálculos são aplicados:</p>
            <DataTable headers={['Status', 'Aparece em Squads?', 'Gera alertas?', 'Aparece nos filtros padrão?']} rows={[
              ['Em Operação',    '✔ Sim', '✔ Sim', '✔ Sim'],
              ['Em Implantação', '✔ Sim', '✔ Sim', '✔ Sim'],
              ['Proposta',       '✖ Não', '✖ Não', '✔ Sim'],
              ['Suspenso',       '✖ Não', '✔ Sim', '✔ Sim'],
              ['Encerrado',      '✖ Não', '✖ Não', '✖ Não (filtro manual)'],
            ]} />
            <Callout type="warn">Para encerrar um contrato, altere o status para "Encerrado". O contrato sai de todas as listagens padrão mas permanece no histórico e pode ser encontrado aplicando o filtro de status manualmente.</Callout>
          </SectionBlock>

          <SectionBlock id="perfis" title="Perfis e Permissões">
            <DataTable headers={['Ação', 'C-Level / Admin / Superadmin', 'Líder de Tribo', 'Proj. Produtos / Coord. Suporte']} rows={[
              ['Ver contratos',          '✔ Sim', '✔ Sim', '✔ Sim'],
              ['Ver valores financeiros', '✔ Sim', '✖ Não', '✖ Não'],
              ['Criar contrato',         '✔ Sim', '✖ Não', '✖ Não'],
              ['Editar contrato',        '✔ Sim', '✖ Não', '✖ Não'],
              ['Gerenciar recursos',     '✔ Sim', '✖ Não', '✖ Não'],
              ['Excluir contrato',       '✔ Sim', '✖ Não', '✖ Não'],
              ['Exportar dados',         '✔ Sim', '✖ Não', '✖ Não'],
            ]} />
          </SectionBlock>

          <SectionBlock id="duvidas" title="Dúvidas Frequentes">
            {[
              { q: 'O contrato está com indicador vermelho mas parece estar em ordem', a: 'Verifique os alertas específicos no card — pode ser vencimento próximo, reajuste pendente ou recurso humano inativo na equipe. Clique no contrato para ver os detalhes do cálculo de saúde.' },
              { q: 'Não consigo ver os valores financeiros do contrato', a: 'Valores financeiros são visíveis apenas para C-Level, Administrativo e Superadmin. Entre em contato com o administrador se precisar de acesso.' },
              { q: 'Quero buscar contratos de um cliente específico', a: 'No campo de busca, digite o nome do cliente. O sistema pesquisa por nome do contrato, código e nome do cliente simultaneamente.' },
              { q: 'Como arquivar um contrato sem excluí-lo?', a: 'Altere o status para "Encerrado". O contrato sairá das listagens padrão mas ficará disponível no histórico através do filtro de status.' },
              { q: 'Adicionei um recurso no contrato mas não aparece no módulo de Squads', a: 'O módulo de Squads exibe apenas contratos com status "Em Operação" ou "Em Implantação". Verifique se o status do contrato está correto.' },
              { q: 'Como exportar a lista de contratos?', a: 'No topo da tela de contratos, clique no botão de exportação (ícone de planilha). Os dados são exportados em formato Excel com base nos filtros ativos.' },
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
