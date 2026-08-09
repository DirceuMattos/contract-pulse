// v2 - reescrita didática completa (agosto/2026): campos reais do formulário, status corretos, reposições e perfis de skill.
import { ClipboardList } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'Como Vagas e Skills se conectam',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          São duas telas que trabalham juntas. <strong>Skills de Vagas</strong> é o catálogo: guarda os{' '}
          <strong>perfis de skill</strong> — o retrato de um cargo em um nível, com as competências esperadas.{' '}
          <strong>Requisição de Vagas</strong> é a operação: cada vaga aberta puxa um desses perfis e vira um processo
          com status.
        </p>
        <DataTable headers={['Tela', 'Serve para', 'Frequência de uso']} rows={[
          ['Skills de Vagas', 'Definir, por cargo e nível, quais hard e soft skills são esperadas.', 'Pouco — é cadastro estruturante, montado uma vez e revisado de tempos em tempos.'],
          ['Requisição de Vagas', 'Abrir a vaga, acompanhar o processo e registrar como foi preenchida.', 'Muito — é o dia a dia.'],
          ['Cargos (RH)', 'Manter a lista de cargos que alimenta os perfis de skill.', 'Pouco.'],
        ]} />
        <Callout type="tip">
          Investir uma vez nos perfis de skill economiza tempo em toda vaga futura: ao escolher o perfil, título,
          nível, anos de experiência e todas as skills já vêm preenchidos.
        </Callout>
      </>
    ),
  },
  {
    id: 'tela-vagas',
    label: 'A tela de vagas',
    title: 'Como ler a lista de vagas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          As vagas aparecem como <strong>cards em lista</strong> (não é quadro kanban). A ordenação é fixa: primeiro
          por status — Solicitado, Em avaliação, Aprovado em contratação, Suspenso e Preenchida — e, dentro de cada
          status, da mais recente para a mais antiga.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No topo ficam as <strong>pílulas de filtro por status</strong>, cada uma com a contagem: Todas, Solicitado,
          Em avaliação, Aprovado em contratação, Preenchida e Suspenso. Não há campo de busca nesta tela — use as
          pílulas.
        </p>
        <DataTable headers={['Elemento do card', 'O que mostra']} rows={[
          ['Título e badge de nível', 'O nome da vaga e o nível informado. Se a quantidade for maior que 1, aparece o badge “N vagas”.'],
          ['Cargo — descrição', 'O cargo em negrito seguido da descrição, cortada em duas linhas.'],
          ['Badge de status', 'A cor acompanha o status.'],
          ['Hard skills / Soft skills', 'Dois painéis (azul e verde) com até 4 tags cada; o excedente vira “+N”.'],
          ['Metadados', 'Anos de experiência, data de abertura, quem solicitou, modalidade, presença no cliente, viagens e benefícios.'],
          ['Badge “Preenchida: origem”', 'Só em vagas preenchidas — mostra se veio de hunting, da BNP ou de indicação.'],
          ['Ícones à direita', 'Exportar texto para redes, editar e (para alguns perfis) excluir.'],
        ]} />
        <Callout type="info">
          O card inteiro é clicável e abre a edição da vaga. Você não precisa acertar o ícone do lápis.
        </Callout>
      </>
    ),
  },
  {
    id: 'criar-vaga',
    label: 'Abrir uma vaga',
    title: 'Criar uma requisição de vaga',
    content: (
      <>
        <Steps items={[
          { title: 'Clique em “Nova vaga”', body: 'Botão no topo da tela de Requisição de Vagas.' },
          { title: 'Escolha o Perfil de skill', body: 'É o primeiro campo e o mais importante. Ao selecionar, ele preenche título, nível, anos de experiência e todas as skills do perfil. Se a vaga não se encaixa em nenhum cargo, use “Sem perfil (vaga avulsa)”.' },
          { title: 'Ajuste o Título da vaga', body: 'Campo obrigatório. Vem preenchido no formato “Cargo (Nível)” quando você escolhe um perfil.' },
          { title: 'Escreva a Descrição', body: 'Opcional com perfil; OBRIGATÓRIA em vaga avulsa — sem perfil, a descrição é a única fonte de contexto para quem for recrutar.' },
          { title: 'Preencha Nível, Anos de exp. e Quantidade', body: 'Nível é texto livre (Júnior, Pleno, Sênior, Especialista...). Quantidade vem 1 por padrão.' },
          { title: 'Informe as Condições de trabalho', body: 'Modalidade, presença no cliente, viagens e benefícios. Veja a seção seguinte.' },
          { title: 'Revise as Skills da vaga', body: 'Adicione ou remova conforme a necessidade real desta vaga — sem alterar o perfil original.' },
          { title: 'Salve', body: 'A vaga nasce no status “Solicitado” e RH, Administrativo, C-Level e Superadmin são notificados automaticamente.' },
        ]} />
        <Callout type="warn">
          Ao editar uma vaga e deixar o campo Perfil de skill como <strong>“Sem perfil (vaga avulsa)”</strong>, o
          vínculo com o cargo é apagado ao salvar. Se a vaga nasceu de uma reposição e você não quer perder o cargo,
          mantenha o perfil selecionado.
        </Callout>
        <Callout type="info">
          Não existem os campos “Área” nem um seletor fechado de senioridade. O que existe é o campo{' '}
          <strong>Nível</strong>, de texto livre — combine internamente uma nomenclatura para os relatórios ficarem
          consistentes.
        </Callout>
      </>
    ),
  },
  {
    id: 'condicoes',
    label: 'Condições',
    title: 'Modalidade, cliente, viagens e benefícios',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Este bloco é o que mais reduz retrabalho na triagem: candidato desalinhado com a modalidade ou com a
          presença no cliente é a causa mais frequente de processo perdido no fim.
        </p>
        <DataTable headers={['Campo', 'Como preencher']} rows={[
          ['Modalidade', 'Não informado, Home office, Presencial ou Híbrida. Use Híbrida quando houver alternância combinada.'],
          ['Dias presenciais no cliente', 'Chave liga/desliga. Ligue quando a pessoa precisar estar fisicamente no cliente com recorrência.'],
          ['Dias da semana no cliente', 'Só aparece com a chave ligada. Escreva a regra real: “terça e quinta” ou “3 dias a combinar”. Se ficar vazio, o card mostra “Cliente: dias a combinar”.'],
          ['Exige viagens', 'Ligue quando houver deslocamentos para implantação, reuniões ou visitas.'],
          ['Benefícios', 'Texto livre: vale refeição, plano de saúde, auxílio home office, bônus. Este texto vai direto para o anúncio exportado.'],
        ]} />
        <Callout type="tip">
          Escreva os benefícios já pensando na publicação — o texto é reaproveitado literalmente pelo exportador de
          vaga para redes sociais.
        </Callout>
      </>
    ),
  },
  {
    id: 'skills-na-vaga',
    label: 'Skills na vaga',
    title: 'Selecionar hard e soft skills',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O seletor tem três partes: as <strong>skills já selecionadas</strong> no topo (clique numa tag para
          remover), um campo <strong>“Buscar skill...”</strong> e as duas listas — <strong>Hard skills</strong> (azul)
          e <strong>Soft skills</strong> (verde). Clicar numa skill da lista a seleciona.
        </p>
        <DataTable headers={['Tipo', 'O que é', 'Exemplos']} rows={[
          ['Hard skills', 'Conhecimento técnico verificável: ferramentas, linguagens, plataformas, práticas.', 'React, Java, SQL, Azure, testes automatizados, atendimento N2.'],
          ['Soft skills', 'Comportamento e forma de trabalhar.', 'Comunicação, organização, negociação, relacionamento com cliente, trabalho em equipe.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Criar uma skill nova</p>
        <p className="text-sm text-muted-foreground mb-3">
          No fim do seletor há <strong>“Adicionar nova skill”</strong>: digite o nome, escolha Hard ou Soft e clique
          em <strong>+</strong> (Enter também funciona). A skill passa a existir no catálogo geral e fica disponível
          para todas as vagas e perfis.
        </p>
        <Callout type="warn">
          O catálogo de skills <strong>não tem tela de manutenção</strong>: uma vez criada, uma skill não pode ser
          renomeada nem excluída pela interface. Confira a grafia antes de adicionar — “Postgres”, “PostgreSQL” e
          “Postgre SQL” virariam três skills diferentes. O sistema evita duplicata exata (mesmo nome e mesmo tipo),
          mas não variações de escrita.
        </Callout>
        <Callout type="info">
          Uma mesma palavra pode existir como hard e como soft — são registros distintos. Antes de criar, use a busca
          para ver se já não existe algo equivalente.
        </Callout>
      </>
    ),
  },
  {
    id: 'status',
    label: 'Fluxo de status',
    title: 'Mover a vaga pelo processo',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>“Mover status”</strong>, no rodapé do card, mostra apenas os destinos válidos a partir do
          status atual.
        </p>
        <DataTable headers={['Status', 'Quando usar', 'Pode ir para']} rows={[
          ['Solicitado', 'Demanda registrada, ainda não assumida pelo RH.', 'Em avaliação, Suspenso'],
          ['Em avaliação', 'RH assumiu e está triando candidatos.', 'Aprovado em contratação, Suspenso'],
          ['Aprovado em contratação', 'Candidato escolhido, contratação em andamento.', 'Preenchida, Suspenso'],
          ['Preenchida', 'Processo concluído.', 'Suspenso'],
          ['Suspenso', 'Vaga pausada temporariamente.', 'Solicitado'],
        ]} />
        <Callout type="info">
          O perfil <strong>RH</strong> pode mover a vaga para qualquer status, sem seguir a sequência — para corrigir
          registros lançados fora de ordem. Os demais perfis seguem o fluxo acima.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Ao marcar como Preenchida</p>
        <p className="text-sm text-muted-foreground mb-3">
          Abre a janela <strong>“Como a vaga foi preenchida?”</strong>, com três opções obrigatórias:{' '}
          <strong>Empresa de Hunting</strong>, <strong>BNP</strong> (padrão) e <strong>BNP Indicação</strong>. Esse
          registro é o que permite medir depois qual canal de captação funciona melhor — preencha com atenção.
        </p>
        <Callout type="tip">
          Toda mudança de status fica registrada no <strong>Histórico de status</strong>, dentro da janela de edição
          da vaga, com data, hora e autor. Use-o para responder “por que essa vaga demorou”.
        </Callout>
      </>
    ),
  },
  {
    id: 'reposicoes',
    label: 'Reposições',
    title: 'Vagas que nascem de um desligamento',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Quando alguém é desligado no RH, o sistema cria automaticamente uma <strong>reposição pendente</strong> para
          cada alocação dessa pessoa. Elas aparecem na faixa âmbar{' '}
          <strong>“Reposições pendentes”</strong>, no topo da tela de vagas. Se a pessoa estava em vários projetos, o
          sistema agrupa e mostra <strong>uma linha por pessoa</strong>.
        </p>
        <DataTable headers={['Botão', 'O que faz']} rows={[
          ['Abrir vaga', 'Cria a requisição em um clique, já com título, cargo, nível e contrato herdados da pessoa desligada. A vaga nasce em “Solicitado”.'],
          ['Não repor', 'Abre a janela para encerrar a pendência sem abrir vaga.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">A janela “Não repor”</p>
        <p className="text-sm text-muted-foreground mb-3">
          Ela tem a chave <strong>“Esta vaga já foi preenchida”</strong>. Ligue quando alguém <em>já assumiu</em> o
          lugar (remanejamento interno, por exemplo) e escolha a pessoa em <strong>“Preenchida por”</strong> — a lista
          traz apenas colaboradores ativos do mesmo cargo. O sistema registra a vaga retroativamente como preenchida,
          preservando o histórico ex-colaborador → vaga → quem assumiu. Se ninguém assumiu, deixe a chave desligada e
          use <strong>“Marcar como não repor”</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O que sai da lista ativa vai para a segunda faixa âmbar,{' '}
          <strong>“Não repostas / Contratações avulsas”</strong>. Nada é apagado: ali existe o botão{' '}
          <strong>“Reverter”</strong>, que devolve a reposição para pendente, e <strong>“Ver vaga”</strong>, quando há
          vaga vinculada.
        </p>
        <Callout type="warn">
          O botão <strong>“Não reposta”</strong> (no rodapé do card de uma vaga) não é um status. Ele é de{' '}
          <em>repor / reposição</em>, e tira a vaga da lista ativa preservando todos os dados. É reversível.
        </Callout>
      </>
    ),
  },
  {
    id: 'exportar',
    label: 'Publicar a vaga',
    title: 'Gerar o texto para redes sociais',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O ícone de <strong>cópia</strong> no card (“Exportar texto para redes”) monta um anúncio pronto a partir do
          que já está cadastrado, com emojis e blocos organizados: sobre a vaga, detalhes da oportunidade, hard
          skills, soft skills, benefícios e observações.
        </p>
        <Steps items={[
          { title: 'Clique no ícone de cópia no card', body: 'Abre a janela “Exportar vaga” com o texto montado.' },
          { title: 'Edite à vontade', body: 'A caixa é editável. As alterações feitas ali NÃO alteram a vaga salva — servem só para essa publicação.' },
          { title: 'Clique em Copiar', body: 'O texto vai para a área de transferência, pronto para colar no LinkedIn ou onde for publicar.' },
        ]} />
        <Callout type="info">
          O texto é montado por um modelo fixo, sem uso de IA. Blocos vazios são omitidos automaticamente — se os
          benefícios não foram preenchidos, a seção simplesmente não aparece no anúncio.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3">
          Existe um exportador equivalente na tela de Skills, no card de cada perfil (ícone de compartilhar). Ele
          inclui também as <strong>Atribuições</strong> e a faixa etária de referência do perfil.
        </p>
      </>
    ),
  },
  {
    id: 'perfis-skill',
    label: 'Perfis de skill',
    title: 'A tela “Skills de Vagas”',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Cada card é um <strong>perfil</strong>, ou seja, a combinação <strong>cargo + nível</strong>. Existe apenas
          um perfil por combinação. O card mostra as skills marcadas, quantos colaboradores estão hoje naquele cargo e
          os anos de experiência de referência.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A busca aceita cargo, nível, descrição e nome de skill. As pílulas filtram entre <strong>Todos</strong>,{' '}
          <strong>Com perfil</strong> e <strong>A preencher</strong>. Abaixo dos cards existe o bloco{' '}
          <strong>“Cargos a preencher”</strong>: cargos ativos que ainda não têm perfil nenhum — clicar em um deles já
          abre o formulário com o cargo preenchido.
        </p>
        <DataTable headers={['Campo do perfil', 'Para que serve']} rows={[
          ['Cargo / função', 'Obrigatório. Tem sugestão dos cargos existentes — e se você digitar um cargo novo, ele é criado automaticamente no cadastro de cargos.'],
          ['Nível', 'Texto livre. É o que diferencia dois perfis do mesmo cargo.'],
          ['Descrição', 'Resumo do papel, reaproveitado no anúncio.'],
          ['Atribuições', 'O que a pessoa faz no dia a dia. Vai para o bloco “Atribuições” do anúncio exportado.'],
          ['Experiência Mínima (Default)', 'Anos de experiência sugeridos, herdados pela vaga. Vem 2 por padrão.'],
          ['Idade mín. / Idade máx. (Default)', 'Faixa de referência usada no anúncio. Vem 19 e 35 por padrão — revise conforme a realidade do cargo.'],
          ['Hard skills / Soft skills', 'As competências esperadas. É o coração do perfil.'],
          ['Descritor livre (hard e soft)', 'Texto complementar para nuances que as tags não capturam.'],
          ['Perfil ativo', 'Desligue em vez de apagar quando o perfil sair de uso — não existe exclusão de perfil.'],
        ]} />
        <Callout type="warn">
          Digitar um cargo inexistente <strong>cria o cargo</strong> no cadastro de RH. Confira a grafia antes de
          salvar para não gerar cargos duplicados como “Desenvolvedor Back-end” e “Desenvolvedor Backend”.
        </Callout>
        <Callout type="info">
          Perfis não podem ser excluídos pela interface — use a chave <strong>Perfil ativo</strong> para desativá-los.
        </Callout>
      </>
    ),
  },
  {
    id: 'cargos',
    label: 'Cargos',
    title: 'A base de cargos que sustenta tudo',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela de <strong>Cargos (RH)</strong> — acessível por Configurações ou pelo módulo de RH — mantém a lista
          usada nos perfis de skill, nas pessoas do RH e no simulador de contratos.
        </p>
        <DataTable headers={['Campo / ação', 'Detalhe']} rows={[
          ['Nome do Cargo', 'Obrigatório. É o rótulo que aparece em todo o sistema.'],
          ['Equipe', 'Opcional, mas recomendado: é o que agrupa as pessoas por equipe nos Squads e nos relatórios.'],
          ['Chave ativo/inativo', 'Cargos inativos deixam de aparecer nas listas de seleção, sem perder o histórico.'],
          ['Excluir cargo', 'Remove o cargo da lista. Pessoas e recursos que já usavam o cargo não são afetados.'],
        ]} />
        <Callout type="tip">
          Prefira <strong>desativar</strong> a excluir. Cargo inativo some das listas e mantém a rastreabilidade dos
          registros antigos.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode fazer o quê',
    content: (
      <>
        <DataTable headers={['Ação', 'Perfis']} rows={[
          ['Consultar vagas e perfis de skill', 'Todos os perfis com o módulo liberado (não liberado por padrão para Leitor, Comercial e Jurídico).'],
          ['Criar e editar vagas, mover status, tratar reposições', 'C-Level, Intermediário, Administrativo, RH, Líder de Tribo, Coordenação de Suporte, Superadmin e Demo.'],
          ['Excluir vaga', 'Somente Superadmin, RH e Administrativo.'],
          ['Criar e editar perfis de skill e cargos', 'Os mesmos perfis com permissão de edição.'],
          ['Mover status livremente, fora da sequência', 'RH.'],
        ]} />
        <Callout type="info">
          Toda criação de vaga e toda mudança de status disparam notificação no sistema para <strong>RH</strong>,{' '}
          <strong>Administrativo</strong>, <strong>C-Level</strong>, <strong>Superadmin</strong> e para quem
          solicitou a vaga.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Perguntas frequentes e como resolver',
    content: (
      <DataTable headers={['Sintoma', 'Causa provável', 'Solução']} rows={[
        ['“Vaga sem perfil de skill exige uma descrição”', 'Perfil marcado como “Sem perfil (vaga avulsa)” e descrição em branco.', 'Escreva a descrição ou selecione um perfil de skill.'],
        ['A vaga perdeu o cargo depois de editar', 'O campo Perfil de skill ficou em “Sem perfil” ao salvar.', 'Reabra a vaga e selecione o perfil correspondente.'],
        ['Não consigo mover para o status que quero', 'O fluxo só permite os destinos válidos a partir do status atual.', 'Siga a sequência, ou peça ao RH, que move livremente.'],
        ['A vaga sumiu da lista', 'Foi marcada como “Não reposta”.', 'Procure na faixa “Não repostas / Contratações avulsas” e use “Reverter”.'],
        ['Reposições pendentes repetidas para a mesma pessoa', 'O desligamento gera uma pendência por alocação.', 'A tela já agrupa por pessoa; tratar uma linha resolve todas as alocações dela.'],
        ['Criei uma skill com o nome errado', 'Não existe edição nem exclusão de skill na interface.', 'Crie a skill correta, deixe de usar a errada e registre o caso com o time técnico.'],
        ['“Perfil já existe” ao salvar', 'Já existe um perfil para aquele cargo + nível.', 'Edite o perfil existente em vez de criar outro.'],
        ['O anúncio exportado saiu incompleto', 'Blocos vazios são omitidos.', 'Volte à vaga, preencha benefícios/observações/skills e exporte de novo.'],
      ]} />
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas práticas',
    title: 'Como manter o módulo saudável',
    content: (
      <>
        <Steps items={[
          { title: 'Comece pelos perfis, não pelas vagas', body: 'Zerar o bloco “Cargos a preencher” faz toda vaga futura nascer bem descrita, em segundos.' },
          { title: 'Padronize a nomenclatura de nível', body: 'Como o campo é livre, combine o vocabulário (Júnior / Pleno / Sênior / Especialista) antes de espalhar variações.' },
          { title: 'Trate as reposições pendentes semanalmente', body: 'Cada pendência aberta é uma alocação vaga distorcendo o custo do contrato nos Squads.' },
          { title: 'Registre sempre a origem do preenchimento', body: 'É o único dado que permite avaliar hunting x captação própria x indicação.' },
          { title: 'Cuide do catálogo de skills', body: 'Ele não tem manutenção pela tela: cada skill mal escrita fica para sempre. Busque antes de criar.' },
          { title: 'Use Suspenso em vez de excluir', body: 'Vaga excluída perde o histórico; suspensa preserva o processo e pode ser retomada.' },
        ]} />
        <Callout type="tip">
          Quanto mais completos os campos de condições e skills, melhor o anúncio exportado — e menor o número de
          candidatos desalinhados chegando à triagem.
        </Callout>
      </>
    ),
  },
];

export default function HelpJobsPage() {
  return (
    <HelpArticle
      title="Vagas e Skills"
      description="Requisição de vagas, fluxo de status, reposições e catálogo de competências"
      icon={ClipboardList}
      sections={sections}
    />
  );
}
