import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const SECTIONS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'cards',       label: 'Lendo os Cards' },
  { id: 'filtros',     label: 'Filtros e Busca' },
  { id: 'criar',       label: 'Cadastrar Cliente' },
  { id: 'editar',      label: 'Editar Cliente' },
  { id: 'excluir',     label: 'Excluir Cliente' },
  { id: 'perfis',      label: 'Perfis e Permissões' },
  { id: 'duvidas',     label: 'Dúvidas Frequentes' },
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

export default function HelpClientsPage() {
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
        <Building2 className="w-4 h-4 text-primary" />
        <div><h1 className="text-base font-bold leading-tight">Clientes</h1><p className="text-xs text-muted-foreground">Como cadastrar e gerenciar clientes</p></div>
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

          <SectionBlock id="visao-geral" title="O que é o módulo de Clientes?">
            <p className="text-sm text-muted-foreground mb-3">O módulo de Clientes é o cadastro central de todas as organizações com as quais a BNP mantém ou manteve relacionamento contratual. Cada cliente pode ter um ou mais contratos vinculados.</p>
            <p className="text-sm text-muted-foreground mb-4">Os clientes são exibidos em cards ordenados alfabeticamente, com informações de contato, segmento e quantidade de contratos ativos.</p>
            <DataTable headers={['Segmento', 'Descrição']} rows={[['Govtech', 'Órgãos públicos, prefeituras, secretarias e entidades governamentais.'], ['Privado', 'Empresas privadas, associações e entidades do terceiro setor.']]} />
          </SectionBlock>

          <SectionBlock id="cards" title="Lendo os Cards de Cliente">
            <DataTable headers={['Elemento', 'O que significa']} rows={[
              ['Logo / Inicial', 'Logotipo do cliente ou inicial do nome em cor gerada automaticamente.'],
              ['Nome fantasia', 'Nome principal exibido no card. Se não houver nome fantasia, exibe a razão social.'],
              ['CNPJ', 'Número do CNPJ formatado.'],
              ['Cidade / Estado', 'Localização do cliente, quando cadastrada.'],
              ['E-mail', 'E-mail principal de contato.'],
              ['Telefone', 'Telefone principal de contato.'],
              ['Badge Govtech / Privado', 'Indica o segmento do cliente.'],
              ['N contratos', 'Quantidade de contratos ativos (Em Operação ou Em Implantação).'],
            ]} />
          </SectionBlock>

          <SectionBlock id="filtros" title="Filtros e Busca">
            <p className="text-sm text-muted-foreground mb-4">Use os filtros no topo da tela para localizar clientes rapidamente:</p>
            <DataTable headers={['Filtro', 'Como usar']} rows={[
              ['Campo de busca', 'Pesquisa por nome fantasia, razão social ou CNPJ em tempo real.'],
              ['Segmento', 'Filtra por Govtech ou Privado.'],
            ]} />
            <Callout type="tip">A busca funciona por qualquer parte do nome — não é necessário digitar o nome completo.</Callout>
          </SectionBlock>

          <SectionBlock id="criar" title="Cadastrar um Novo Cliente">
            <p className="text-sm text-muted-foreground mb-4">Clique em <strong>+ Novo Cliente</strong> no canto superior direito para abrir o formulário de cadastro.</p>
            <Steps items={[
              { title: 'Preencha a Razão Social e o CNPJ', body: 'Campos obrigatórios. O CNPJ deve ser único no sistema — não é possível cadastrar dois clientes com o mesmo CNPJ.' },
              { title: 'Informe o Nome Fantasia (opcional)', body: 'Se preenchido, será exibido como nome principal nos cards e em todo o sistema.' },
              { title: 'Selecione o segmento', body: 'Govtech para clientes do setor público, Privado para demais.' },
              { title: 'Preencha os dados de contato', body: 'E-mail, telefone, endereço e cidade são opcionais mas ajudam na identificação e comunicação.' },
              { title: 'Faça upload do logotipo (opcional)', body: 'Formatos aceitos: PNG, JPG. O logo aparecerá nos cards, relatórios e PPTX gerados.' },
              { title: 'Salve', body: 'O cliente é cadastrado e aparece imediatamente na listagem em ordem alfabética.' },
            ]} />
            <Callout type="info">Somente perfis com permissão de criação (C-Level, Administrativo, Superadmin) visualizam o botão "+ Novo Cliente".</Callout>
          </SectionBlock>

          <SectionBlock id="editar" title="Editar um Cliente">
            <p className="text-sm text-muted-foreground mb-4">Para editar os dados de um cliente, clique no menu <strong>⋯</strong> no canto do card e selecione <strong>Editar</strong>, ou acesse a página de detalhe do cliente e clique em <strong>Editar</strong>.</p>
            <p className="text-sm text-muted-foreground mb-4">Todos os campos do cadastro podem ser alterados, incluindo o logotipo. As alterações são refletidas imediatamente em todo o sistema — cards, contratos, relatórios e PPTX.</p>
            <Callout type="warn">Acesso ao módulo não significa permissão de edição. Perfis sem a ação <strong>Editar</strong> em Clientes podem consultar os dados, mas não alteram o cadastro.</Callout>
          </SectionBlock>

          <SectionBlock id="excluir" title="Excluir um Cliente">
            <p className="text-sm text-muted-foreground mb-4">Para excluir um cliente, clique no menu <strong>⋯</strong> e selecione <strong>Excluir</strong>. Uma confirmação será solicitada antes da exclusão.</p>
            <Callout type="warn">Não é possível excluir um cliente que possui contratos vinculados. Remova ou encerre todos os contratos do cliente antes de excluí-lo. O sistema exibirá uma mensagem informando quantos contratos estão vinculados.</Callout>
            <Callout type="info">A exclusão é permanente. Considere apenas encerrar os contratos e manter o cadastro do cliente para fins de histórico.</Callout>
          </SectionBlock>

          <SectionBlock id="perfis" title="Perfis e Permissões">
            <DataTable headers={['Ação', 'C-Level / Admin / Superadmin', 'Líder de Tribo / Coord. Suporte / Proj. Produtos']} rows={[
              ['Ver clientes',        '✔ Sim', '✔ Sim'],
              ['Buscar e filtrar',    '✔ Sim', '✔ Sim'],
              ['Cadastrar cliente',   '✔ Sim', '✖ Não'],
              ['Editar cliente',      '✔ Sim', '✖ Não'],
              ['Excluir cliente',     '✔ Sim', '✖ Não'],
              ['Ver detalhe completo','✔ Sim', '✔ Sim'],
            ]} />
          </SectionBlock>

          <SectionBlock id="duvidas" title="Dúvidas Frequentes">
            {[
              { q: 'Não consigo cadastrar um cliente — aparece erro de CNPJ duplicado', a: 'Já existe um cliente cadastrado com esse CNPJ. Use a busca para localizá-lo. Se for um cadastro duplicado, exclua o incorreto antes de criar um novo.' },
              { q: 'O logotipo do cliente não aparece nos relatórios', a: 'Certifique-se de que o logo foi enviado no formato correto (PNG ou JPG) e que o contrato está vinculado ao cliente correto. O logo do contrato tem prioridade sobre o logo do cliente.' },
              { q: 'Não vejo o botão "+ Novo Cliente"', a: 'Seu perfil não possui permissão de criação. Entre em contato com o administrador para verificar suas permissões.' },
              { q: 'Consigo ver o cliente, mas não consigo editar', a: 'Isso é esperado quando seu perfil tem acesso ao módulo, mas não tem a ação "Editar" habilitada para Clientes. Apenas C-Level, RH, Administrativo e Superadmin devem alterar esse cadastro.' },
              { q: 'Tentei excluir um cliente mas apareceu mensagem de erro', a: 'O cliente possui contratos vinculados. Acesse o módulo de Contratos, encerre ou remova os contratos desse cliente e tente excluí-lo novamente.' },
              { q: 'Como altero o segmento de um cliente de Govtech para Privado?', a: 'Acesse a edição do cliente, localize o campo Segmento e altere para o valor desejado. Salve as alterações.' },
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
