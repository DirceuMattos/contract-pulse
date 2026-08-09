// v2 - reescrita didática completa (agosto/2026): fluxos reais da tela, rótulos exatos, permissões e erros comuns.
import { Users } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'O que é o módulo Squads',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Squads é a tela que responde a uma pergunta simples: <strong>quem está trabalhando em qual contrato, e
          quanto do tempo dessa pessoa vai para lá</strong>. Ela não cadastra pessoas (isso é o módulo RH) e não
          cadastra contratos (isso é o módulo Contratos). Ela faz a ligação entre os dois.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Toda alocação tem uma <strong>dedicação em percentual</strong>. Uma pessoa 100% em um contrato equivale a
          1,00 FTE. Se ela estiver 50% em dois contratos, são 0,50 FTE em cada — e o total continua sendo uma pessoa.
          É assim que o sistema calcula custo por contrato e saúde financeira.
        </p>
        <DataTable headers={['Conceito', 'O que significa na prática']} rows={[
          ['Alocação', 'O vínculo entre uma pessoa do RH e um contrato (ou um subprojeto), com um percentual de dedicação.'],
          ['Dedicação (%)', 'Quanto do tempo da pessoa vai para aquele contrato. Vai de 1% a 100% por alocação.'],
          ['FTE', 'Equivalente a uma pessoa em tempo integral. 100% = 1,00 FTE; 50% = 0,50 FTE.'],
          ['Subprojeto', 'Uma frente de trabalho dentro do mesmo contrato (ex.: PROAC Direto e PROAC Indireto). É opcional.'],
          ['Equipe', 'Agrupamento do cargo da pessoa (Desenvolvimento, Dados, Suporte...). Vem do RH, não é escolhido aqui.'],
        ]} />
        <Callout type="info">
          Só aparecem na tela contratos com status <strong>Em Operação</strong> ou <strong>Em Implantação</strong>.
          Contratos suspensos ou encerrados ficam fora — se um contrato sumiu da lista, confira o status dele no
          módulo Contratos antes de suspeitar de erro.
        </Callout>
      </>
    ),
  },
  {
    id: 'duas-visoes',
    label: 'As duas visões',
    title: 'Por Projeto e Por Recurso: quando usar cada uma',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O primeiro filtro da tela é <strong>Visão</strong>, e ele muda completamente o que você vê. Escolher a visão
          certa economiza a maior parte do trabalho.
        </p>
        <DataTable headers={['Visão', 'Cada card é...', 'Use quando quiser']} rows={[
          ['Por Projeto (padrão)', 'Um contrato ou um subprojeto', 'Ver a composição de uma squad: quem está no contrato, por equipe, com FTE total.'],
          ['Por Recurso', 'Uma pessoa', 'Ver a vida de uma pessoa: em quantos projetos ela está, se está sobrecarregada ou ociosa.'],
        ]} />
        <Callout type="tip">
          Regra prática: <strong>alocar, mover e retirar pessoas é feito na visão Por Recurso.</strong> A visão Por
          Projeto é de leitura e diagnóstico. A exceção é o painel de Subprojetos, que só aparece na visão Por Projeto.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3">
          Na visão Por Projeto ainda existe o filtro <strong>Modo</strong>: <strong>Compacto</strong> mostra apenas as
          barras por equipe (o percentual é a fatia de <em>pessoas</em>); <strong>Detalhado</strong> abre a lista
          nominal de cada equipe (e o percentual passa a ser a fatia de <em>FTE</em>).
        </p>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros e leitura',
    title: 'Filtros, KPIs e como ler os cards',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A barra de filtros tem <strong>Visão</strong>, <strong>Cliente</strong>, <strong>Contrato</strong>,{' '}
          <strong>Buscar</strong> e <strong>Modo</strong>. Abaixo dela ficam os chips de equipe, que podem ser
          combinados (clique em vários) e limpos pelo chip <strong>✕ Limpar</strong>.
        </p>
        <Callout type="info">
          Ao trocar o <strong>Cliente</strong>, o filtro de <strong>Contrato</strong> volta para “Todos”
          automaticamente. É esperado — evita ficar com um contrato de outro cliente selecionado.
        </Callout>
        <p className="text-sm text-muted-foreground mt-4 mb-2 font-semibold text-foreground">Os quatro indicadores do topo</p>
        <DataTable headers={['Indicador', 'O que conta']} rows={[
          ['Contratos', 'Quantos contratos distintos aparecem no resultado atual.'],
          ['FTE Total', 'Soma das dedicações, em equivalentes de pessoa integral.'],
          ['RH Alocados', 'Quantas linhas de alocação existem — quem está em dois contratos conta duas vezes.'],
          ['Squads / Pessoas Únicas', 'Muda com a visão: número de cards de projeto, ou número de pessoas distintas.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-4 mb-2 font-semibold text-foreground">Sinais visuais nos cards</p>
        <DataTable headers={['Sinal', 'O que quer dizer', 'O que fazer']} rows={[
          ['Fundo âmbar + faixa “⚠️ N substituição(ões) pendente(s)”', 'Alguém alocado nesse contrato foi desligado no RH e a vaga continua aberta.', 'Substituir a pessoa ou remover a pendência (veja a seção Substituições).'],
          ['Badge “Colaborador Inativo”', 'A pessoa está como inativa no RH, mas a alocação continua existindo.', 'Atualizar a situação no RH ou retirar a alocação.'],
          ['Badge “Sub-Dedicado NN%”', 'A soma das dedicações da pessoa está abaixo do limite configurado (padrão 50%).', 'Verificar se falta registrar alguma alocação.'],
          ['Badge “>100%” / “Sobrecarregado”', 'A soma das dedicações passou de 100%.', 'O sistema não bloqueia — revise os percentuais.'],
          ['Ícone de alerta ao lado do nome', 'A alocação aponta para uma pessoa que não existe mais no RH Mestre (vínculo quebrado).', 'Refazer a alocação com a pessoa correta.'],
          ['Badge Saudável / Atenção / Crítico', 'Saúde financeira do contrato — vem do módulo Contratos, não do Squads.', 'Analisar no contrato, não aqui.'],
        ]} />
        <Callout type="tip">
          Nome, cargo e equipe exibidos aqui vêm sempre do <strong>RH Mestre</strong>. Se um cargo aparece errado no
          Squads, a correção é no cadastro da pessoa no RH — não adianta mexer na alocação.
        </Callout>
      </>
    ),
  },
  {
    id: 'alocar',
    label: 'Alocar pessoa',
    title: 'Alocar uma pessoa a um contrato',
    content: (
      <>
        <Steps items={[
          { title: 'Mude para a visão Por Recurso', body: 'No filtro “Visão”, clique em “Por Recurso”. Cada card passa a ser uma pessoa.' },
          { title: 'Encontre a pessoa', body: 'Use o campo “Buscar” (aceita nome, cargo ou cliente). Quem ainda não tem nenhuma alocação aparece com a caixa tracejada “Sem alocação em squads”.' },
          { title: 'Clique no botão + do card', body: 'Fica no canto superior direito do card da pessoa (dica: “Adicionar a outro projeto”). Abre a janela “Adicionar a Projeto”.' },
          { title: 'Escolha Contrato e, se houver, Subprojeto', body: 'O campo “Subprojeto” só fica habilitado quando o contrato usa subprojetos; nesse caso ele é obrigatório. Se o contrato não usa, o campo mostra “Não se aplica”.' },
          { title: 'Informe a Dedicação (%)', body: 'Vem 100 por padrão. Aceita de 1 a 100. Se a pessoa divide o tempo, coloque a fatia real deste contrato.' },
          { title: 'Clique em Incluir e depois em Adicionar', body: '“Incluir” joga o item na lista “Projetos selecionados”. Você pode repetir para vários projetos e salvar tudo de uma vez em “Adicionar Selecionados”.' },
        ]} />
        <Callout type="tip">
          Para alocar a mesma pessoa em <strong>vários contratos</strong>, não feche a janela: preencha, clique
          “Incluir”, troque o contrato, “Incluir” de novo. Só então salve. O sistema recusa incluir o mesmo projeto
          duas vezes (“Este colaborador já foi incluído para este projeto nesta seleção”).
        </Callout>
        <Callout type="warn">
          A soma das dedicações <strong>não é bloqueada</strong>. Dá para deixar alguém em 150% sem o sistema impedir —
          ele apenas marca “Sobrecarregado”. A conferência é humana.
        </Callout>
      </>
    ),
  },
  {
    id: 'mover',
    label: 'Mover e retirar',
    title: 'Alterar dedicação, mover de projeto ou retirar alguém',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Tudo isso acontece no mesmo lugar: visão <strong>Por Recurso</strong> → ícone de <strong>lápis</strong> na
          linha da alocação → janela <strong>“Editar Alocação”</strong>.
        </p>
        <DataTable headers={['Objetivo', 'O que fazer na janela']} rows={[
          ['Só mudar o percentual', 'Altere “Dedicação (%)”, deixe “Mover para outro projeto” em “Manter no mesmo contrato” e clique em Salvar.'],
          ['Mover para outro contrato', 'Escolha o contrato em “Mover para outro projeto”. Se ele usar subprojetos, o campo “Subprojeto de destino” aparece e é obrigatório. O botão passa a se chamar “Mover e Salvar”.'],
          ['Tirar a pessoa do projeto', 'Clique em “Retirar do Projeto” (botão vermelho, à esquerda).'],
        ]} />
        <Callout type="warn">
          <strong>“Retirar do Projeto” não pede confirmação.</strong> O clique já executa. Confira o nome e o projeto
          antes de clicar.
        </Callout>
        <Callout type="warn">
          Se você mover alguém para um contrato que <strong>não usa subprojetos</strong> a partir de uma alocação que
          estava em subprojeto, o sistema remove a alocação de origem e avisa: <em>“Adicione o recurso manualmente no
          contrato de destino”</em>. Ele não cria o vínculo no destino sozinho — você precisa fazer isso com o botão +.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>Para mover entre dois subprojetos do mesmo contrato</strong>, esta janela não serve (ela só lista
          outros contratos). Faça pelo botão <strong>+</strong> do card da pessoa: adicione o subprojeto de destino e
          depois retire a alocação antiga.
        </p>
      </>
    ),
  },
  {
    id: 'subprojetos',
    label: 'Subprojetos',
    title: 'Quando e como usar subprojetos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Use subprojetos quando <strong>um mesmo contrato atende frentes distintas com equipes separadas</strong> —
          por exemplo PROAC Direto e PROAC Indireto. Sem isso, todo mundo fica num balde único e você perde a visão de
          custo por frente.
        </p>
        <Steps items={[
          { title: 'Ligue os subprojetos no contrato', body: 'Isso não é feito aqui: vá em Contratos → editar o contrato → chave “Possui subprojetos / squads múltiplas?”. Confirme em “Entendi, ativar subprojetos”.' },
          { title: 'Volte ao Squads e selecione o contrato', body: 'O painel “Subprojetos” só aparece quando você escolhe um contrato específico no filtro (não funciona com “Todos”) e está na visão Por Projeto.' },
          { title: 'Crie o subprojeto', body: 'Botão “Adicionar Subprojeto”. Preencha Nome (obrigatório), Descrição (opcional) e Status.' },
          { title: 'Distribua as pessoas', body: 'Em cada subprojeto há duas listas: “Pessoas” e “Recursos”. Clique em “Adicionar” na lista correta e escolha quem entra, com a dedicação.' },
        ]} />
        <DataTable headers={['Status do subprojeto', 'Efeito']} rows={[
          ['Ativo', 'Aparece normalmente na grade e nas listas de seleção.'],
          ['Suspenso', 'Continua aparecendo na grade — usado para frentes temporariamente paradas.'],
          ['Encerrado', 'Some da grade de cards e deixa de ser oferecido ao alocar. O histórico permanece.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Pessoas x Recursos</p>
        <DataTable headers={['Lista', 'O que entra ali']} rows={[
          ['Pessoas', 'Colaboradores ativos do RH Mestre. É o caso normal.'],
          ['Recursos', 'Itens que não são pessoas do RH (licenças, terceiros, serviços) já cadastrados na aba Recursos do contrato como tipo “outro”. Pedem o campo “Valor mensal (R$)”.'],
        ]} />
        <Callout type="warn">
          Excluir um subprojeto <strong>apaga todas as alocações dentro dele</strong>. A confirmação avisa isso. As
          pessoas não são afetadas no RH, mas o vínculo com aquela frente se perde.
        </Callout>
      </>
    ),
  },
  {
    id: 'nao-distribuidos',
    label: 'Não distribuídos',
    title: 'A caixa âmbar “Pessoas do contrato ainda não distribuídas em subprojetos”',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          É o alerta mais importante do painel de Subprojetos — e o que mais gera dúvida. Ele lista pessoas que{' '}
          <strong>estão vinculadas ao contrato mas não a nenhuma frente dele</strong>. Elas contam no custo do
          contrato, mas ninguém sabe em qual frente estão trabalhando.
        </p>
        <p className="text-sm text-muted-foreground mb-3">Como isso acontece, normalmente:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>a pessoa foi alocada ao contrato <em>antes</em> de os subprojetos existirem;</li>
          <li>o contrato passou a usar subprojetos depois e a distribuição ainda não foi feita;</li>
          <li>alguém foi adicionado pela tela de Recursos do contrato, sem passar pelo Squads.</li>
        </ul>
        <DataTable headers={['Situação real', 'Ação correta']} rows={[
          ['A pessoa trabalha numa frente específica', 'Clique em “Adicionar” dentro do subprojeto certo e inclua a pessoa. Ela sai da caixa âmbar.'],
          ['A pessoa não deveria estar mais no contrato', 'Use “Remover do contrato” na própria linha. Isso não mexe no cadastro dela no RH.'],
          ['A pessoa atende o contrato inteiro, sem frente definida', 'Isso é legítimo. Mas hoje o sistema mantém o aviso; combine internamente uma frente “Geral” se quiser zerar a lista.'],
        ]} />
        <Callout type="warn">
          Atenção ao distribuir: adicionar a pessoa a um subprojeto <strong>não remove</strong> o vínculo antigo direto
          com o contrato. Ela sai da caixa âmbar, mas as duas fontes de dedicação passam a somar nos cálculos. Se ela
          era 100% no contrato e você a colocou 100% no subprojeto, ela vai aparecer como sobrecarregada. Ajuste ou
          remova o vínculo antigo.
        </Callout>
      </>
    ),
  },
  {
    id: 'substituicoes',
    label: 'Substituições',
    title: 'Quando alguém é desligado e a vaga fica aberta',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Ao desligar uma pessoa no RH, o sistema cria automaticamente uma <strong>pendência de substituição</strong>{' '}
          para cada alocação dela. É por isso que o card do contrato fica âmbar com a faixa “⚠️ N substituição(ões)
          pendente(s)” — o trabalho continua, mas não há mais ninguém alocado.
        </p>
        <Steps items={[
          { title: 'Vá para a visão Por Recurso', body: 'Localize a pessoa com o badge “Substituição Pendente”.' },
          { title: 'Escolha o caminho', body: '“Substituir” abre a janela para indicar quem assume; “Remover” encerra a pendência sem repor, deixando a alocação vaga.' },
          { title: 'Ao substituir, confira o percentual', body: 'A janela mostra as alocações a herdar com a opção “Manter mesmo percentual”. Desmarque se o substituto entrar com dedicação diferente.' },
        ]} />
        <Callout type="info">
          Os botões “Substituir” e “Remover” só aparecem para os perfis <strong>C-Level</strong>,{' '}
          <strong>Líder de Tribo</strong> e <strong>Superadmin</strong>. Se você não os vê, a pendência existe mas
          precisa ser tratada por esses perfis.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3">
          A pendência também alimenta o módulo de <strong>Vagas</strong>, onde é possível abrir a requisição de
          reposição em um clique. Veja o tutorial “Vagas e Skills”.
        </p>
      </>
    ),
  },
  {
    id: 'exportar',
    label: 'Exportar',
    title: 'Levar os dados para uma planilha',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Exportar</strong>, no topo da página, gera <strong>CSV</strong> ou <strong>XLSX</strong>{' '}
          com o que estiver na tela — os filtros aplicados valem para a exportação.
        </p>
        <DataTable headers={['Coluna', 'Conteúdo']} rows={[
          ['Cliente / Contrato', 'Identificação do projeto.'],
          ['Subprojeto', 'Preenchida apenas nas linhas que vêm de um subprojeto.'],
          ['Equipe', 'Equipe da pessoa, conforme o RH.'],
          ['Nome RH / Cargo-Função', 'Dados do cadastro mestre.'],
          ['Dedicação (%) / FTE', 'A alocação e seu equivalente em pessoa integral.'],
        ]} />
        <Callout type="tip">
          Quer o retrato completo da empresa? Deixe Cliente e Contrato em “Todos”, limpe os chips de equipe e exporte.
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
        <p className="text-sm text-muted-foreground mb-3">
          O acesso ao módulo é liberado em <strong>Gestão de Perfis</strong>, e cada ação tem sua própria permissão.
        </p>
        <DataTable headers={['Ação', 'Permissão necessária']} rows={[
          ['Abrir a tela e consultar', 'Acesso ao módulo Squads no perfil.'],
          ['Criar subprojeto', 'Permissão “Criar” em Squads.'],
          ['Editar subprojeto ou alocação', 'Permissão “Editar” em Squads.'],
          ['Excluir subprojeto ou alocação', 'Permissão “Excluir” em Squads.'],
          ['Adicionar pessoa a projeto/subprojeto', 'Permissão “Alocar” em Squads.'],
          ['Ver e editar “Valor mensal (R$)” dos recursos', 'Permissão “Ver valores”.'],
          ['Substituir colaborador / remover pendência', 'Perfil C-Level, Líder de Tribo ou Superadmin.'],
        ]} />
        <Callout type="warn">
          Se um botão aparece para você mas a ação falha com “Erro ao salvar subprojeto”, “Erro ao alocar item” ou o
          subprojeto some da tela sem motivo, o caso é de <strong>permissão no banco</strong>, e não de erro de uso.
          Isso é conhecido e ocorre com alguns perfis. Registre com o time técnico informando seu perfil e a ação
          exata — não insista repetindo a operação.
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
        ['O contrato não aparece na lista', 'Status diferente de Em Operação / Em Implantação.', 'Confira o status no módulo Contratos.'],
        ['O painel de Subprojetos não aparece', 'Filtro de Contrato em “Todos”, visão “Por Recurso”, ou contrato sem subprojetos ativados.', 'Selecione um contrato específico, use a visão Por Projeto e ative subprojetos no contrato.'],
        ['A pessoa não aparece na lista ao alocar', 'Só entram pessoas com situação “ativo” no RH, e quem já está naquele subprojeto é omitido.', 'Verifique a situação da pessoa no RH.'],
        ['Cargo ou equipe errados no card', 'O dado vem do RH Mestre.', 'Corrija o cadastro da pessoa em Recursos Humanos.'],
        ['Ícone de alerta “pessoa não encontrada no RH Mestre”', 'A alocação aponta para um cadastro que foi removido.', 'Retire a alocação e refaça com a pessoa correta.'],
        ['Pessoa marcada como sobrecarregada sem motivo', 'Vínculo antigo com o contrato somando com a alocação nova de subprojeto.', 'Remova o vínculo direto antigo (caixa âmbar “não distribuídas”).'],
        ['Card de subprojeto vazio ocupando espaço', 'Subprojeto sem ninguém alocado ainda aparece.', 'Aloque alguém ou mude o status para Encerrado.'],
        ['Sumiu gente ao filtrar por equipe', 'Os chips de equipe são cumulativos e ficam ativos entre buscas.', 'Clique em “✕ Limpar”.'],
      ]} />
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas práticas',
    title: 'Rotina recomendada',
    content: (
      <>
        <Steps items={[
          { title: 'Toda semana: zere as faixas âmbar', body: 'Substituições pendentes e pessoas não distribuídas são dívidas de cadastro — quanto mais tempo ficam, mais o custo por contrato fica errado.' },
          { title: 'Toda semana: revise sobrecarregados e sub-dedicados', body: 'Na visão Por Recurso, os dois badges apontam alocações que provavelmente não refletem a realidade.' },
          { title: 'Ao desligar alguém: trate a pendência no mesmo dia', body: 'Substituir ou remover. Deixar aberto distorce o FTE do contrato.' },
          { title: 'Ao ativar subprojetos: distribua tudo antes de seguir', body: 'Ativar e não distribuir é o cenário que mais gera número errado no relatório mensal.' },
          { title: 'Antes de fechar o mês: exporte e confira', body: 'A exportação é a forma mais rápida de bater a lista com o que a operação sabe de cor.' },
        ]} />
        <Callout type="tip">
          Uma pessoa alocada direto no contrato, sem subprojeto, <strong>não é um erro</strong> quando o contrato não
          usa subprojetos. O alerta só vale para contratos que ativaram frentes.
        </Callout>
      </>
    ),
  },
];

export default function HelpSquadsPage() {
  return (
    <HelpArticle
      title="Squads"
      description="Alocação de pessoas por contrato, subprojetos e dedicação"
      icon={Users}
      sections={sections}
    />
  );
}
