import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const SECTIONS = [
  { id: 'visao-geral',    label: 'Visão Geral' },
  { id: 'cards',          label: 'Lendo os Cards' },
  { id: 'filtros',        label: 'Filtros e Busca' },
  { id: 'editar-alloc',   label: 'Editar Alocação' },
  { id: 'realocar-rh',    label: 'Realocar RH' },
  { id: 'subprojetos',    label: '⭐ Subprojetos' },
  { id: 'criar-sp',       label: 'Criar Subprojeto' },
  { id: 'alocar-sp',      label: 'Alocar em Subprojeto' },
  { id: 'editar-sp',      label: 'Editar / Remover' },
  { id: 'duvidas',        label: 'Dúvidas Frequentes' },
];

function Callout({ type, children }: { type: 'tip' | 'info' | 'warn' | 'alert'; children: React.ReactNode }) {
  const styles = {
    tip:   'bg-green-50  border-green-400  text-green-900',
    info:  'bg-blue-50   border-blue-400   text-blue-900',
    warn:  'bg-amber-50  border-amber-400  text-amber-900',
    alert: 'bg-purple-50 border-purple-400 text-purple-900',
  };
  const icons = { tip: '💡', info: 'ℹ️', warn: '⚠️', alert: '⭐' };
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
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground border-b border-border last:border-b-0">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ id, title, highlight, children }: { id: string; title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 mb-12">
      <div className={`flex items-center gap-3 mb-5 pb-3 border-b-2 ${highlight ? 'border-purple-400' : 'border-primary/20'}`}>
        <h2 className={`text-lg font-bold ${highlight ? 'text-purple-700' : 'text-foreground'}`}>{title}</h2>
        {highlight && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Importante</span>}
      </div>
      {children}
    </div>
  );
}

export default function HelpSquadsPage() {
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
        <Users className="w-4 h-4 text-primary" />
        <div>
          <h1 className="text-base font-bold leading-tight">Squads</h1>
          <p className="text-xs text-muted-foreground">Como atualizar e gerenciar equipes e subprojetos</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border overflow-y-auto p-3 gap-0.5">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className={`text-xs px-3 py-2 rounded-md transition-colors cursor-pointer ${
                s.id === 'subprojetos' || s.id === 'criar-sp' || s.id === 'alocar-sp' || s.id === 'editar-sp'
                  ? active === s.id ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-purple-600 hover:bg-purple-50'
                  : active === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
              {s.label}
            </a>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 max-w-3xl">

          <SectionBlock id="visao-geral" title="O que é o módulo de Squads?">
            <p className="text-sm text-muted-foreground mb-3">O módulo de Squads exibe a composição das equipes alocadas em cada contrato ativo — quem está no projeto, com qual cargo, percentual de dedicação e local de atuação.</p>
            <p className="text-sm text-muted-foreground mb-4">Contratos que possuem <strong>subprojetos</strong> são exibidos de forma diferente: cada subprojeto gera um card separado com a sua própria equipe, permitindo visualizar a composição por frente de trabalho.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-4 rounded-lg border border-border">
                <p className="font-semibold text-sm mb-1">📋 Contrato simples</p>
                <p className="text-xs text-muted-foreground">Um card por contrato. Mostra todos os recursos alocados diretamente no contrato, agrupados por equipe.</p>
              </div>
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                <p className="font-semibold text-sm mb-1 text-purple-700">🔀 Contrato com subprojetos</p>
                <p className="text-xs text-purple-700">Um card por subprojeto. Cada frente de trabalho tem sua própria equipe e alocações independentes.</p>
              </div>
            </div>
            <Callout type="info">O módulo exibe apenas contratos com status <strong>Em Operação</strong> ou <strong>Em Implantação</strong>.</Callout>
          </SectionBlock>

          <SectionBlock id="cards" title="Lendo os Cards de Squad">
            <p className="text-sm text-muted-foreground mb-4">Cada card representa um contrato ou subprojeto e mostra as informações da equipe alocada.</p>
            <DataTable
              headers={['Elemento', 'O que significa']}
              rows={[
                ['Nome do contrato / subprojeto', 'Identificação principal do card. Subprojetos mostram o nome do contrato seguido de "→ Nome do Subprojeto".'],
                ['Tag Subprojeto', 'Badge roxo que identifica cards de subprojeto dentro de um contrato maior.'],
                ['Cor da borda esquerda', 'Verde = operação normal · Vermelho = há recurso humano inativo no squad.'],
                ['FTE Total', 'Soma das dedicações de todos os membros (ex: 2,5 FTE = equivale a 2,5 pessoas em tempo integral).'],
                ['Nome · Cargo · Dedicação', 'Cada linha representa um membro do squad com seu cargo e percentual de alocação.'],
                ['Local de atuação', 'BNP (presencial na BNP) ou Cliente (atuando no cliente).'],
                ['Ver contrato / Ver recursos', 'Atalhos para as páginas de detalhe do contrato.'],
              ]}
            />
            <Callout type="warn">Cards com borda vermelha indicam que há um recurso humano inativo no squad. Acesse o contrato e regularize a situação para remover o alerta.</Callout>
          </SectionBlock>

          <SectionBlock id="filtros" title="Filtros e Busca">
            <p className="text-sm text-muted-foreground mb-4">Use os filtros no topo da tela para encontrar squads específicos:</p>
            <DataTable
              headers={['Filtro', 'Como usar']}
              rows={[
                ['Busca por nome', 'Digite o nome de uma pessoa, cargo ou cliente para filtrar os cards em tempo real.'],
                ['Cliente', 'Filtra todos os contratos de um cliente específico.'],
                ['Contrato', 'Filtra para exibir apenas um contrato. Quando selecionado, habilita o painel de gerenciamento de subprojetos (se aplicável).'],
                ['Equipe', 'Filtra membros por equipe interna (ex: Desenvolvimento, Suporte).'],
              ]}
            />
            <Callout type="tip">Para gerenciar subprojetos de um contrato, selecione-o no filtro <strong>Contrato</strong>. O painel de subprojetos aparece automaticamente à direita dos cards.</Callout>
          </SectionBlock>

          <SectionBlock id="editar-alloc" title="Editar Alocação de um Membro">
            <p className="text-sm text-muted-foreground mb-4">Para alterar o cargo, dedicação ou local de atuação de um membro do squad em um contrato simples (sem subprojetos):</p>
            <Steps items={[
              { title: 'Localize o card do contrato', body: 'Use o filtro de cliente ou contrato para encontrar o squad desejado.' },
              { title: 'Clique no ícone de edição do membro', body: 'No card, ao lado do nome de cada membro, clique no ícone de lápis (✏️) para abrir o diálogo de edição.' },
              { title: 'Ajuste os dados', body: 'Altere o cargo no contrato, o percentual de dedicação (%) e o local de atuação (BNP ou Cliente).' },
              { title: 'Salve', body: 'Clique em Salvar. A alteração é refletida imediatamente no card.' },
            ]} />
            <Callout type="info">Alterações de dedicação afetam o cálculo de FTE Total do card e os alertas de sub-dedicação no módulo de RH.</Callout>
          </SectionBlock>

          <SectionBlock id="realocar-rh" title="Realocar RH entre Projetos">
            <p className="text-sm text-muted-foreground mb-4">A realocação de pessoas fica na visão <strong>Por Recurso</strong>. Essa visão mostra cada colaborador e todos os projetos onde ele está alocado.</p>
            <Steps items={[
              { title: 'Mude para Por Recurso', body: 'No filtro Visão, selecione "Por Recurso". Os cards passam a ser agrupados por pessoa, e não por projeto.' },
              { title: 'Use o botão + no card da pessoa', body: 'O botão abre o fluxo "Adicionar a Projeto" para alocar o RH em outro contrato ou subprojeto, inclusive quando ele já está alocado em outro projeto.' },
              { title: 'Edite uma alocação existente', body: 'Use o ícone de lápis em uma linha de projeto para alterar dedicação, mover para outro projeto ou retirar a pessoa daquele projeto.' },
              { title: 'Substitua quando houver pendência', body: 'Quando o RH está inativo e existe substituição pendente, o botão "Substituir" aparece na linha da alocação.' },
            ]} />
            <Callout type="warn">Líder de Tribo e SuperAdmin usam esse fluxo para realocar RHs sem editar o cadastro mestre do RH e sem acessar valores financeiros. Para o Líder de Tribo, o perfil precisa ter a ação <strong>Alocar</strong> liberada no módulo <strong>Squads</strong>.</Callout>
          </SectionBlock>

          {/* ── SUBPROJETOS — SEÇÃO DESTACADA ── */}
          <SectionBlock id="subprojetos" title="⭐ Squads em Subprojetos — Como Funciona" highlight>
            <p className="text-sm text-muted-foreground mb-3">Subprojetos são <strong>frentes de trabalho independentes</strong> dentro de um contrato. Quando um contrato tem subprojetos configurados, cada subprojeto recebe seu próprio card de squad com equipe e alocações separadas.</p>
            <p className="text-sm text-muted-foreground mb-4">Isso é especialmente útil para contratos com múltiplas entregas paralelas, times distintos ou fases diferentes — como um contrato de desenvolvimento que tem equipes separadas para frontend, backend e suporte.</p>

            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 mb-4">
              <p className="font-semibold text-sm text-purple-800 mb-3">Exemplo prático — Contrato SCEIC:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <span>SCEIC → <strong>Subprojeto: SMAC</strong> — Squad: 3 devs, 1 analista</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <span>SCEIC → <strong>Subprojeto: SMCEC</strong> — Squad: 2 devs, 1 PO</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <span>SCEIC → <strong>Subprojeto: Fase Pro</strong> — Squad: 1 dev, 1 analista</span>
                </div>
              </div>
            </div>

            <DataTable
              headers={['Característica', 'Contrato simples', 'Contrato com subprojetos']}
              rows={[
                ['Visualização', '1 card por contrato', '1 card por subprojeto'],
                ['Alocações', 'Vinculadas ao contrato', 'Vinculadas ao subprojeto'],
                ['Gerenciamento', 'Via tela Contratos → Recursos', 'Via painel de subprojetos em Squads'],
                ['FTE', 'Soma de todos os recursos do contrato', 'Soma dos recursos do subprojeto'],
                ['Dedicação no RH', 'Computada em recursos do contrato', 'Computada em alocações do subprojeto'],
              ]}
            />
            <Callout type="alert">A dedicação de membros alocados em subprojetos é contabilizada separadamente dos recursos diretos do contrato. Um mesmo profissional pode estar alocado em múltiplos subprojetos — a soma total não deve ultrapassar 100%.</Callout>
          </SectionBlock>

          <SectionBlock id="criar-sp" title="Criar um Subprojeto" highlight>
            <p className="text-sm text-muted-foreground mb-4">Para criar um novo subprojeto em um contrato, siga os passos abaixo. É necessário ter perfil com permissão de edição.</p>
            <Steps items={[
              { title: 'Selecione o contrato no filtro', body: 'No topo da tela, use o filtro "Contrato" e selecione o contrato desejado. O painel de gerenciamento de subprojetos aparece automaticamente à direita.' },
              { title: 'Clique em "+ Novo Subprojeto"', body: 'No painel de subprojetos, clique no botão para abrir o formulário de criação.' },
              { title: 'Preencha o nome e status', body: 'Informe o nome do subprojeto (ex: "SMAC", "Fase Pro", "Módulo de Editais"). Escolha o status inicial: Ativo, Concluído ou Suspenso.' },
              { title: 'Adicione uma descrição (opcional)', body: 'Uma breve descrição ajuda a identificar o escopo do subprojeto.' },
              { title: 'Salve', body: 'O subprojeto é criado e aparece imediatamente no painel. Um novo card de squad será exibido assim que a primeira alocação for adicionada.' },
            ]} />
            <Callout type="warn">Subprojetos só aparecem como cards na tela de Squads quando têm pelo menos um membro alocado. Um subprojeto vazio não gera card.</Callout>
          </SectionBlock>

          <SectionBlock id="alocar-sp" title="Alocar Membros em um Subprojeto" highlight>
            <p className="text-sm text-muted-foreground mb-3">Há dois tipos de alocação em subprojetos: <strong>Recursos Humanos</strong> (colaboradores CLT ou PJ) e <strong>Recursos</strong> (licenças, ferramentas, posições genéricas).</p>
            <Callout type="alert">Alocações em subprojetos são independentes das alocações diretas no contrato. Um colaborador pode estar no squad do subprojeto sem estar listado como recurso direto do contrato — e vice-versa. Ambas as formas contam para o cálculo de dedicação no módulo de RH.</Callout>

            <h3 className="font-semibold text-sm mb-2 mt-4">Alocar um colaborador (RH)</h3>
            <Steps items={[
              { title: 'Abra o painel do subprojeto', body: 'Selecione o contrato no filtro e localize o subprojeto no painel lateral.' },
              { title: 'Clique em "+ RH" no subprojeto desejado', body: 'O botão abre o diálogo de alocação de pessoa. Apenas colaboradores ativos aparecem na lista.' },
              { title: 'Selecione o colaborador', body: 'Escolha o nome do colaborador. Colaboradores já alocados naquele subprojeto não aparecem na lista.' },
              { title: 'Defina o percentual de dedicação', body: 'Informe o percentual de dedicação (ex: 100%, 50%, 25%). Este valor é somado às demais alocações do colaborador para cálculo de sub-dedicação.' },
              { title: 'Salve', body: 'O colaborador aparece no card do subprojeto com o percentual informado.' },
            ]} />

            <h3 className="font-semibold text-sm mb-2 mt-4">Alocar um recurso (não-RH)</h3>
            <p className="text-sm text-muted-foreground mb-3">Use o botão <strong>"+ Recurso"</strong> no subprojeto para alocar posições genéricas, licenças ou recursos do tipo "outro" vinculados ao contrato.</p>
            <Callout type="info">Recursos do tipo CLT/PJ já vinculados a um colaborador (RH) não aparecem na lista de recursos — eles devem ser alocados pelo fluxo de RH acima.</Callout>
            <Callout type="warn">Se o botão de alocação não aparecer para um perfil autorizado, revise em Gestão de Perfis se o módulo <strong>Squads</strong> está habilitado e se a ação <strong>Alocar</strong> está ativa para esse perfil.</Callout>
          </SectionBlock>

          <SectionBlock id="editar-sp" title="Editar, Reordenar e Remover em Subprojetos" highlight>
            <h3 className="font-semibold text-sm mb-2">Editar dados do subprojeto</h3>
            <p className="text-sm text-muted-foreground mb-3">No painel do subprojeto, clique no ícone de lápis (✏️) ao lado do nome para editar o nome, descrição ou status do subprojeto.</p>
            <DataTable
              headers={['Status', 'Significado']}
              rows={[
                ['Ativo',     'Subprojeto em andamento. Aparece nos cards de Squads e nos cálculos de dedicação.'],
                ['Concluído', 'Trabalho finalizado. Ainda aparece no painel mas pode ser ocultado dos cards.'],
                ['Suspenso',  'Temporariamente pausado. Mantém a equipe alocada mas indica interrupção.'],
              ]}
            />

            <h3 className="font-semibold text-sm mb-2 mt-4">Editar alocação de um membro no subprojeto</h3>
            <Steps items={[
              { title: 'Expanda o subprojeto no painel', body: 'Clique no nome do subprojeto para expandir a lista de alocações.' },
              { title: 'Clique no ícone de edição da alocação', body: 'Ao lado de cada membro, clique no lápis para alterar o percentual de dedicação.' },
              { title: 'Salve', body: 'A alteração é refletida imediatamente no card e no cálculo de FTE.' },
            ]} />

            <h3 className="font-semibold text-sm mb-2 mt-4">Remover membro de um subprojeto</h3>
            <p className="text-sm text-muted-foreground mb-3">Clique no ícone de lixeira (🗑️) ao lado da alocação para remover o membro do subprojeto. A remoção é permanente e o percentual de dedicação desse membro será reduzido proporcionalmente.</p>

            <h3 className="font-semibold text-sm mb-2 mt-4">Excluir um subprojeto</h3>
            <p className="text-sm text-muted-foreground mb-3">No painel, clique no ícone de lixeira ao lado do nome do subprojeto. Uma confirmação será solicitada.</p>
            <Callout type="warn">Excluir um subprojeto remove também todas as alocações vinculadas a ele. Essa ação não pode ser desfeita. Certifique-se de que nenhum colaborador depende exclusivamente desse subprojeto para seu cálculo de dedicação.</Callout>
          </SectionBlock>

          <SectionBlock id="duvidas" title="Dúvidas Frequentes">
            {[
              { q: 'Criei um subprojeto mas não aparece card na tela de Squads', a: 'Subprojetos só geram cards quando têm pelo menos um membro alocado. Adicione a primeira alocação e o card aparecerá.' },
              { q: 'Um colaborador está com alerta de baixa dedicação mesmo alocado em subprojeto', a: 'Verifique se a alocação no subprojeto foi feita corretamente pelo painel de subprojetos. Alocações adicionadas via "Recursos" do contrato (não via subprojeto) podem não contabilizar corretamente no cálculo de dedicação.' },
              { q: 'Posso alocar o mesmo colaborador em múltiplos subprojetos?', a: 'Sim. Um colaborador pode estar em vários subprojetos com percentuais diferentes. A soma de todas as alocações (incluindo contratos diretos) não deve ultrapassar 100%.' },
              { q: 'O botão + para adicionar o RH em outro projeto não aparece', a: 'Confirme se você está na visão "Por Recurso" e se seu perfil tem a ação "Alocar" habilitada no módulo Squads. O fluxo de alocação não exige permissão para editar o cadastro mestre do RH.' },
              { q: 'O card de um subprojeto está vermelho', a: 'Há um recurso humano inativo naquele subprojeto. Acesse o painel de subprojetos, localize o membro inativo e remova a alocação ou regularize a situação no módulo de RH.' },
              { q: 'Não vejo o painel de subprojetos na tela', a: 'O painel só aparece quando um contrato específico está selecionado no filtro "Contrato" e esse contrato tem subprojetos configurados. Selecione o contrato no filtro do topo.' },
              { q: 'Quero mover um membro de um subprojeto para outro', a: 'Não é possível mover diretamente. Remova a alocação do subprojeto de origem e adicione-a no subprojeto de destino com o novo percentual.' },
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
