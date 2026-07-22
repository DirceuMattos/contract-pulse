import { ClipboardList } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visao Geral',
    title: 'Para que serve o modulo de Vagas?',
    content: (
      <p className="text-sm text-muted-foreground">
        O modulo de Vagas organiza solicitacoes de contratacao ou reposicao, acompanha status, registra requisitos,
        skills, beneficios e condicoes de trabalho. Ele deve ser usado como ponto unico de acompanhamento da vaga.
      </p>
    ),
  },
  {
    id: 'criar',
    label: 'Criar Vaga',
    title: 'Criar uma solicitacao de vaga',
    content: (
      <Steps items={[
        { title: 'Clique em abrir vaga', body: 'Use o botao de criacao na tela de solicitacao de vagas.' },
        { title: 'Preencha dados principais', body: 'Informe titulo, area, senioridade, experiencia, justificativa e observacoes.' },
        { title: 'Informe condicoes de trabalho', body: 'Defina se e home office, presencial ou hibrida; se exige presenca no cliente; dias presenciais; viagens; e beneficios.' },
        { title: 'Selecione skills', body: 'Escolha hard e soft skills relevantes. As skills escolhidas aparecem destacadas para facilitar revisao.' },
        { title: 'Salve', body: 'A vaga entra no fluxo de acompanhamento e pode ser movida de status conforme evolui.' },
      ]} />
    ),
  },
  {
    id: 'condicoes',
    label: 'Condicoes',
    title: 'Campos de modalidade, cliente, viagens e beneficios',
    content: (
      <>
        <DataTable headers={['Campo', 'Como preencher']} rows={[
          ['Modalidade', 'Escolha Home office, Presencial ou Hibrida. Use Hibrida quando houver alternancia entre remoto e presencial.'],
          ['Presenca no cliente', 'Marque quando a pessoa precisara trabalhar fisicamente no cliente.'],
          ['Dias presenciais no cliente', 'Descreva os dias da semana ou a regra combinada, por exemplo: terca e quinta, ou 3x por semana.'],
          ['Viagens', 'Marque quando a vaga exigir deslocamentos para reunioes, implantacoes ou visitas.'],
          ['Beneficios', 'Campo textual para listar vale refeicao, plano de saude, auxilio home office, bonus ou outras condicoes.'],
        ]} />
        <Callout type="tip">Quanto mais claro for o campo de condicoes, menor a chance de retrabalho na triagem.</Callout>
      </>
    ),
  },
  {
    id: 'cards',
    label: 'Cards',
    title: 'Como ler os cards de vagas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os cards mostram as vagas por status. As cores acompanham a tag para facilitar identificacao visual.
          Vagas em aberto aparecem primeiro, depois suspensas e por fim preenchidas.
        </p>
        <DataTable headers={['Elemento', 'O que significa']} rows={[
          ['Cor do card', 'Acompanha a cor do status da vaga.'],
          ['Clique no card', 'Abre os detalhes da vaga, sem depender apenas do icone de edicao.'],
          ['Hard skills', 'Competencias tecnicas esperadas.'],
          ['Soft skills', 'Competencias comportamentais esperadas.'],
          ['Nao resposta', 'Botao que devolve uma vaga para a area de nao respondidas mantendo os dados cadastrados.'],
        ]} />
      </>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    title: 'Mover status da vaga',
    content: (
      <DataTable headers={['Status', 'Quando usar']} rows={[
        ['Solicitado', 'Quando a demanda foi registrada, mas ainda nao foi assumida para execucao.'],
        ['Aberta', 'Quando a vaga esta ativa e em busca de candidatos.'],
        ['Suspenso', 'Quando a vaga esta pausada temporariamente.'],
        ['Preenchida', 'Quando a vaga foi concluida com contratacao ou alocacao.'],
        ['Nao resposta', 'Quando a vaga precisa voltar para a area de demandas nao respondidas.'],
      ]} />
    ),
  },
  {
    id: 'skills',
    label: 'Skills',
    title: 'Hard e soft skills',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Skills ajudam a padronizar requisitos e evitam descricoes vagas. Use hard skills para ferramentas, linguagens
          e conhecimentos tecnicos. Use soft skills para comportamento, comunicacao, organizacao e colaboracao.
        </p>
        <DataTable headers={['Tipo', 'Exemplos']} rows={[
          ['Hard skills', 'React, Java, SQL, Azure, testes automatizados, atendimento N2.'],
          ['Soft skills', 'Comunicacao, organizacao, negociacao, relacionamento com cliente, trabalho em equipe.'],
        ]} />
        <Callout type="info">A vaga tambem pode gerar texto para publicacao, reaproveitando as informacoes preenchidas.</Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissoes',
    title: 'Quem pode excluir vagas',
    content: (
      <p className="text-sm text-muted-foreground">
        A exclusao de vagas e restrita a Superadmin, RH e Administrativo. Outros perfis podem acompanhar e movimentar
        conforme suas permissoes, mas nao devem remover registros.
      </p>
    ),
  },
  {
    id: 'proximos',
    label: 'Proximos passos',
    title: 'Evolucoes previstas',
    content: (
      <Callout type="info">
        Esta no backlog criar um canal de comunicacao do andamento das vagas com equipes operacionais.
      </Callout>
    ),
  },
];

export default function HelpJobsPage() {
  return <HelpArticle title="Vagas e Skills" description="Requisicao, acompanhamento e competencias de vagas" icon={ClipboardList} sections={sections} />;
}
