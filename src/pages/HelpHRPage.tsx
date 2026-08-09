// v2 - tutorial revisado e ampliado (agosto/2026)
import { UsersRound } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'O que é o módulo de Recursos Humanos?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Recursos Humanos é o <strong>cadastro mestre das pessoas</strong> da BNP. A tela principal se chama{' '}
          <strong>Recursos Humanos</strong> e reúne pessoas de todos os vínculos: CLT, PJ, Cooperado, Sócio e Estagiário.
          Tudo o que outros módulos exibem sobre uma pessoa (nome, cargo, departamento, custo, situação) nasce aqui.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Por isso a regra de ouro é: <strong>o RH guarda quem a pessoa é</strong>; Squads e Contratos guardam{' '}
          <strong>onde ela trabalha</strong>. Se você precisa colocar alguém em um projeto, o lugar é Squads. Se o cargo,
          o departamento ou o salário mudaram de verdade, aí sim o lugar é o cadastro de RH.
        </p>
        <p className="text-sm text-muted-foreground mb-3">O módulo é formado por quatro telas:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Recursos Humanos</strong> — a lista de pessoas, com filtros, indicadores e ações de cadastro.</li>
          <li><strong>Ficha da pessoa</strong> — abre ao clicar em uma linha; tem as abas Resumo, Financeiro, Linha do Tempo e Alocações.</li>
          <li><strong>Dashboard RH</strong> — painel gerencial de headcount, custo e turnover.</li>
          <li><strong>Conciliação Feedz</strong> — auditoria do que a integração com o Feedz (TOTVS) alterou no cadastro.</li>
        </ul>
        <Callout type="info">
          Nem todo mundo enxerga tudo. Valores financeiros, a coluna Comitê e os botões de importação dependem do seu
          perfil. A seção Permissões, no fim deste tutorial, mostra exatamente quem pode o quê.
        </Callout>
      </>
    ),
  },
  {
    id: 'lista-filtros',
    label: 'Lista e filtros',
    title: 'Encontrar uma pessoa na lista',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A busca no topo procura por <strong>nome, matrícula ou observação</strong> — o campo tem o texto{' '}
          <strong>Buscar por nome, matrícula ou observação...</strong>. Para recortes maiores, use o bloco de filtros.
          O botão <strong>Mostrar filtros</strong> / <strong>Ocultar filtros</strong> abre e fecha esse bloco, e{' '}
          <strong>Limpar filtros</strong> só aparece quando existe algum filtro aplicado.
        </p>
        <Callout type="tip">
          Os filtros ficam guardados enquanto você navega pelo sistema. Se voltar ao RH e a lista parecer curta demais,
          o motivo quase sempre é um filtro antigo ainda ativo: clique em <strong>Limpar filtros</strong>.
        </Callout>
        <DataTable headers={['Filtro', 'Para que serve']} rows={[
          ['Situação', 'Todos, Ativo ou Inativo. Comece por aqui: por padrão a lista mostra Todos, inclusive desligados.'],
          ['Departamento', 'Lista os departamentos ativos. A opção geral é "Todos dept.".'],
          ['Vínculo', 'CLT, PJ, Cooperado, Sócio ou Estagiário.'],
          ['Regime', 'Remoto / Home Office, Híbrido ou Presencial.'],
          ['Cargo', 'Cargos ativos do catálogo. A opção geral é "Todos cargos".'],
          ['Comitê Gestor', 'Todos, "Com indicação", "Sem indicação" ou um mês específico. Só aparece para Superadmin, C-Level e Administrativo.'],
          ['Mês de Admissão', 'Mês do aniversário de casa, útil para ciclos de reajuste e reconhecimento.'],
          ['Benefício', 'Filtra quem tem determinado benefício na lista de benefícios detalhados.'],
          ['Local de Atuação', 'Locais já cadastrados nas pessoas.'],
          ['Projeto', 'Contratos que hoje têm alguém alocado; mostra só quem está naquele contrato.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Abaixo dos filtros existe a linha <strong>Marcadores:</strong>, com quatro caixas de seleção rápidas:{' '}
          <strong>Talentos</strong>, <strong>Guardiões</strong>, <strong>Em Avaliação</strong> e{' '}
          <strong>Sub-Dedicados</strong>. Elas somam-se aos filtros acima, e não os substituem.
        </p>
        <Callout type="tip">
          Para caçar cadastro incompleto, o atalho mais direto é o filtro <strong>Comitê Gestor</strong> com a opção{' '}
          <strong>Sem indicação</strong>, que lista quem ainda não tem mês de comitê definido. Para os demais campos,
          ordene a lista pela coluna correspondente: quem está sem cargo, sem local ou sem departamento aparece com{' '}
          <strong>—</strong> e se agrupa no começo ou no fim da ordenação.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Na tabela, clicar no cabeçalho ordena por <strong>Nome</strong>, <strong>Vínculo</strong>,{' '}
          <strong>Cargo</strong>, <strong>Local</strong>, <strong>Admissão</strong>, <strong>Tempo de Casa</strong>,{' '}
          <strong>Custo Total</strong>, <strong>Sit.</strong> e <strong>Comitê</strong>. Dois avisos aparecem direto na
          linha: a etiqueta laranja <strong>Sub-Dedicado</strong> com o percentual de dedicação (clique nela para ver
          contratos disponíveis e ir para o Squad) e, em pessoas inativas, a etiqueta{' '}
          <strong>alocação(ões) pendente(s)</strong>, que indica posições em contratos ainda ocupadas por quem já saiu.
        </p>
      </>
    ),
  },
  {
    id: 'cadastro',
    label: 'Cadastrar e importar',
    title: 'Cadastro individual, importações e correções',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os botões do topo da tela mudam conforme o perfil. Quem tem permissão de edição em RH vê o conjunto completo:
        </p>
        <DataTable headers={['Botão', 'O que faz']} rows={[
          ['Nova Pessoa', 'Abre o formulário de cadastro. Ao salvar, o sistema registra automaticamente um evento de admissão na linha do tempo.'],
          ['Importar', 'Abre "Importar Pessoas — RH". Aceita CSV ou XLSX e tem o botão "Baixar template" com o formato correto das colunas.'],
          ['Endereços', 'Abre "Importar Endereços via Planilha". O arquivo precisa das colunas Matrícula, CEP, Endereço, Número, Sem número, Complemento, Bairro, Município e UF.'],
          ['Correções', 'Abre "Aplicar Correções de RH": você envia um CSV, o sistema mostra as divergências encontradas e só aplica depois da sua revisão.'],
          ['Histórico', 'Abre "Histórico de Correções", onde é possível ver e reverter lotes de correções aplicados antes.'],
          ['Exportar', 'Gera uma planilha das pessoas que estão na tela — respeitando os filtros aplicados. Disponível para Superadmin, C-Level e Administrativo.'],
        ]} />
        <Callout type="warn">
          Na importação de pessoas existe a opção de <strong>substituir</strong> a base em vez de acrescentar. Quando ela
          está marcada, o botão vira <strong>Substituir e Importar</strong> e fica vermelho. Confira duas vezes antes de
          confirmar: substituir apaga o que existe hoje.
        </Callout>
        <Callout type="tip">
          A exportação segue o filtro atual. Se você quer a base inteira, clique em <strong>Limpar filtros</strong>{' '}
          antes de exportar; se quer só um departamento, filtre primeiro e exporte depois.
        </Callout>
      </>
    ),
  },
  {
    id: 'ficha',
    label: 'Ficha da pessoa',
    title: 'A ficha individual e suas abas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Clique na linha da pessoa (ou no ícone de olho) para abrir a ficha. No topo ficam os botões{' '}
          <strong>Voltar</strong>, <strong>Editar</strong> e, conforme o caso, <strong>Desligamento</strong> ou{' '}
          <strong>Reativar</strong>. O botão de câmera ao lado da foto permite trocar a imagem da pessoa.
        </p>
        <DataTable headers={['Aba', 'O que você encontra']} rows={[
          ['Resumo', 'Dados Profissionais e Dados Complementares, blocos de Admissão, Endereço e Desligamento, além do bloco "Destaque para Comitê Gestor em".'],
          ['Financeiro', 'Composição do custo da pessoa e a lista de Benefícios Detalhados. Só aparece para quem tem permissão de custos de RH.'],
          ['Linha do Tempo', 'Histórico de eventos da pessoa. Visível para C-Level, Superadmin e Demonstração.'],
          ['Alocações', 'Contratos e subprojetos em que a pessoa está alocada, com dedicação, início e fim.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Ainda no <strong>Resumo</strong> existem três chaves de marcação, que também servem como filtro na lista:{' '}
          <strong>Talento</strong> (recurso estratégico com atenção especial para retenção),{' '}
          <strong>Guardião</strong> (referência cultural e histórica da BNP) e <strong>Em Avaliação</strong>{' '}
          (profissional em período de avaliação de desempenho).
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A aba <strong>Linha do Tempo</strong> é o que explica <em>por que</em> um dado mudou. Quando você salva uma
          edição, o próprio sistema grava um evento para cada alteração relevante — vínculo, situação, cargo,
          departamento, local de atuação, nível, trilha, remuneração e benefícios. Alterações de remuneração e de
          benefícios entram como <strong>Reajuste</strong>; as demais entram como <strong>Observação</strong>. Também é
          possível lançar eventos manualmente pelo botão <strong>Novo Evento</strong>, escolhendo entre Reajuste,
          Bonificação, Benefício, Mudança de Cargo, Desligamento, Observação e Outro.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Na aba <strong>Alocações</strong>, o botão <strong>Atualizar alocações</strong> recarrega os vínculos com
          contratos e subprojetos — use-o quando alguém acabou de mexer no Squad e a ficha ainda mostra o dado antigo.
        </p>
        <Callout type="info">
          Se o cadastro for salvo mas o histórico falhar, a tela avisa: <strong>Dados salvos, mas o histórico não foi
          registrado.</strong> Os dados da pessoa estão corretos; o que faltou foi o registro na linha do tempo.
        </Callout>
      </>
    ),
  },
  {
    id: 'financeiro',
    label: 'Custos',
    title: 'Como o custo da pessoa é calculado',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os indicadores no topo da lista somam <strong>apenas as pessoas que estão no filtro atual</strong>. Isso é
          proposital: permite responder perguntas como &quot;quanto custa o departamento X&quot; sem sair da tela.
        </p>
        <DataTable headers={['Indicador da lista', 'O que representa']} rows={[
          ['Total Salários / Contratos', 'Soma da remuneração mensal das pessoas filtradas.'],
          ['Total Encargos (PJ / CLT)', 'Encargos calculados sobre os salários filtrados. Os percentuais vêm de Configurações e aparecem no próprio título do card.'],
          ['Total Benefícios', 'Soma dos benefícios das pessoas filtradas.'],
          ['Custo total com RH', 'Salários + encargos + benefícios.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Na aba <strong>Financeiro</strong> da ficha, a mesma lógica aparece pessoa a pessoa:
        </p>
        <DataTable headers={['Card da ficha', 'Significado']} rows={[
          ['Remuneração Mensal', 'Valor mensal de salário ou contrato da pessoa.'],
          ['Total Benefícios', 'Soma dos benefícios cadastrados.'],
          ['Remuneração Total', 'Remuneração mensal + benefícios.'],
          ['Encargos CLT (%) ou Encargos PJ (%)', 'Percentual aplicado somente sobre a remuneração mensal. Cooperado, Sócio e Estagiário não têm percentual aplicado.'],
          ['Custo total com RH', 'Remuneração total + encargos.'],
        ]} />
        <Callout type="warn">
          Encargos não incidem sobre benefícios. Se o valor parecer errado, confira antes o percentual em Configurações
          e o tipo de vínculo da pessoa — são as duas causas mais comuns de divergência.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Benefícios Detalhados</strong>, cada benefício pode ter a etiqueta{' '}
          <strong>Soma na Rem. Total</strong>, indicando que ele entra na composição da remuneração total da pessoa.
        </p>
      </>
    ),
  },
  {
    id: 'desligamento',
    label: 'Desligamento',
    title: 'Desligar alguém e cuidar da reposição',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O desligamento não é só marcar a pessoa como inativa: ele congela o tempo de casa, registra o motivo e{' '}
          <strong>abre automaticamente as pendências de reposição</strong> nos contratos em que a pessoa estava alocada.
          Por isso, use o botão <strong>Desligamento</strong> na ficha, e não a simples edição da situação.
        </p>
        <Steps items={[
          { title: 'Abra a ficha e clique em Desligamento', body: 'O botão vermelho só aparece para pessoas ativas e para os perfis Superadmin, RH e C-Level.' },
          { title: 'Decida o destino de cada alocação', body: 'Se a pessoa tiver alocações ativas, a tela lista os contratos e alerta sobre eles. Para cada um, escolha um substituto ou deixe "Nenhum (manter vago)".' },
          { title: 'Preencha os campos obrigatórios', body: 'Data de Desligamento, Tipo (Solicitou Dispensa, Desligado / Dispensado, Transferido ou Outro) e Motivo são obrigatórios. Observações é opcional.' },
          { title: 'Confirme', body: 'Clique em "Confirmar Desligamento". O tempo de casa é congelado na data informada e passa a exibir a etiqueta "Congelado" na ficha.' },
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          A partir daí, três coisas acontecem sozinhas:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>É criado um alerta crítico de <strong>Substituição necessária</strong> com o nome da pessoa.</li>
          <li>
            Em <strong>Squads</strong>, as posições afetadas passam a exibir <strong>Substituição Pendente</strong> e o
            botão <strong>Substituir</strong>.
          </li>
          <li>
            Em <strong>Requisição de Vagas</strong>, aparece o bloco <strong>Reposições pendentes</strong>, com um botão
            que abre a vaga já pré-preenchida com o cargo e o nível da pessoa desligada.
          </li>
        </ul>
        <Callout type="tip">
          Na lista de RH, a etiqueta laranja <strong>alocação(ões) pendente(s)</strong> ao lado de uma pessoa inativa é
          exatamente o sinal de que essa reposição ainda não foi tratada.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          Se o desligamento foi registrado por engano, o botão <strong>Reativar</strong> devolve a pessoa para a situação
          ativa e limpa data, tipo, motivo e observações do desligamento. Ele é restrito a Superadmin e C-Level.
        </p>
      </>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard RH',
    title: 'Dashboard RH: a visão gerencial',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Dashboard RH</strong> é uma tela separada da lista e responde a perguntas de gestão: quanto custa o
          time, quanto disso os contratos pagam e quanto a BNP absorve. No canto superior direito há o par de botões{' '}
          <strong>Quantidades</strong> e <strong>Valores</strong>, que troca a unidade dos gráficos entre número de
          pessoas e dinheiro. Ela tem três abas:
        </p>
        <DataTable headers={['Aba', 'O que mostra']} rows={[
          ['Visão geral', 'Os indicadores RHs ativos, Custo total com RH, Pago por contratos e Absorvido pela BNP, mais os gráficos Alocação financeira, Situação de alocação (100% alocados, Parciais, Sem alocação) e Custo BNP por área.'],
          ['Distribuições', 'Distribuição do time por área, por cargo / função, por forma de contratação, por nível, por local de atuação e por tempo de casa.'],
          ['Ciclo de pessoas', 'A "Curva de turnover - últimos 12 meses", com Entradas, Saídas e o percentual de turnover mês a mês, além da concentração e do custo por tempo de casa.'],
        ]} />
        <Callout type="info">
          Quem não tem permissão de custos de RH ainda consegue usar o painel: aparece o aviso{' '}
          <strong>Valores financeiros ocultos</strong>, o botão <strong>Valores</strong> não é oferecido e os gráficos
          passam a contar pessoas em vez de reais.
        </Callout>
        <p className="text-sm text-muted-foreground mb-3">
          <strong>Absorvido pela BNP</strong> é o número que mais gera dúvida: é a parcela do custo de RH que nenhum
          contrato está pagando — gente sem alocação ou com dedicação parcial. Quando ele sobe, o caminho é olhar o
          gráfico <strong>Custo BNP por área</strong> e, na lista de RH, o marcador <strong>Sub-Dedicados</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'feedz',
    label: 'Feedz',
    title: 'Sincronização com o Feedz e a Conciliação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Parte do cadastro chega automaticamente do Feedz (TOTVS). A sincronização é disparada em{' '}
          <strong>Configurações</strong>, no bloco <strong>Integração Feedz (TOTVS)</strong>, pelo botão{' '}
          <strong>Sincronizar agora</strong>. Existe ainda o botão <strong>Atualizar Datas Deslig.</strong>, que apenas
          acerta datas de desligamento. A chave de modo define o comportamento:
        </p>
        <DataTable headers={['Modo', 'Comportamento']} rows={[
          ['Estrito', 'Cargos e departamentos sem mapeamento geram pendência, para você decidir manualmente.'],
          ['Permissivo', 'Cargos e departamentos que não existem são criados automaticamente.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Cada execução vira uma linha no histórico, com Processados, Criados, Alterados, Desligados e Inconsistências.
          Para auditar o que mudou de verdade, use o botão <strong>Reconciliação Feedz</strong>, que abre a tela{' '}
          <strong>Conciliação Feedz</strong>. Ao abrir uma execução, o detalhe traz quatro abas:{' '}
          <strong>Criados</strong>, <strong>Alterados</strong>, <strong>Desligados</strong> e{' '}
          <strong>Inconsistências</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Nas três primeiras, cada linha mostra data, matrícula, nome e os campos tocados. O ícone de olho abre{' '}
          <strong>Campos alterados</strong> com o valor antes e depois, e o ícone de desfazer abre a janela{' '}
          <strong>Reverter registro</strong> — que só libera o botão depois de marcar{' '}
          <strong>Confirmo a reversão deste registro</strong>. Registros já revertidos ficam com a etiqueta{' '}
          <strong>Revertido</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A aba <strong>Inconsistências</strong> lista o que a integração não conseguiu resolver sozinha, com um código
          por motivo: <strong>Matrícula ausente</strong>, <strong>Matrícula duplicada no Feedz</strong>,{' '}
          <strong>Ativo com data de desligamento</strong>, <strong>Inativo sem data de desligamento</strong>,{' '}
          <strong>Combinação de status inválida</strong>, <strong>Múltiplos registros no sistema</strong> e{' '}
          <strong>Erro de processamento</strong>. Há <strong>Exportar CSV</strong> para essa aba e{' '}
          <strong>Exportar XLSX</strong> para a execução inteira.
        </p>
        <Callout type="warn">
          Antes de corrigir alguém à mão depois de uma sincronização, confira a Conciliação. Se o Feedz sobrescreveu um
          dado, reverter o registro na conciliação é mais seguro do que reeditar a ficha — a edição manual pode ser
          desfeita na próxima sincronização.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem pode o quê em RH',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O acesso ao módulo é liberado em <strong>Gestão de Perfis</strong>, mas algumas ações têm trava adicional
          fixada no sistema. A tabela abaixo reflete o comportamento real das telas.
        </p>
        <DataTable headers={['Ação', 'Quem pode']} rows={[
          ['Abrir a lista de RH', 'Qualquer perfil com o módulo Recursos Humanos habilitado.'],
          ['Abrir a ficha da pessoa', 'Todos, exceto Líder de Tribo, Coordenação Suporte e Projetos-Produtos, que ficam apenas na lista.'],
          ['Editar cadastro, Importar, Endereços, Correções e Histórico', 'Perfis com permissão de edição, exceto Líder de Tribo, Coordenação Suporte e Projetos-Produtos.'],
          ['Cadastrar Nova Pessoa', 'Perfis com permissão de criação (mesma exceção acima).'],
          ['Exportar a lista', 'Superadmin, C-Level e Administrativo.'],
          ['Ver custos, aba Financeiro e coluna Custo Total', 'Superadmin, C-Level, Administrativo e Demonstração.'],
          ['Ver e editar a coluna Comitê Gestor na lista', 'Superadmin, C-Level e Administrativo.'],
          ['Ver a aba Linha do Tempo', 'Superadmin, C-Level e Demonstração.'],
          ['Registrar Desligamento', 'Superadmin, RH e C-Level.'],
          ['Reativar pessoa desligada', 'Superadmin e C-Level.'],
          ['Trocar a foto da pessoa', 'Superadmin, C-Level, Administrativo e RH.'],
          ['Abrir o Dashboard RH', 'Superadmin, C-Level, RH e Administrativo.'],
        ]} />
        <Callout type="info">
          Perfis operacionais costumam precisar apenas de <strong>Alocar</strong> em Squads — não de edição no cadastro
          mestre. Liberar edição em RH para quem só precisa montar equipe é a causa mais comum de dado inconsistente.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable headers={['Sintoma', 'Causa provável', 'Solução']} rows={[
        ['A pessoa não aparece na lista', 'Filtro ativo de sessão anterior ou filtro de Situação em Ativo.', 'Clique em "Limpar filtros" e refaça a busca por nome ou matrícula.'],
        ['Não vejo os cards de custo nem a coluna Custo Total', 'Seu perfil não tem permissão de custos de RH.', 'Solicite ao Superadmin a ação "Custos RH" no módulo Recursos Humanos, em Gestão de Perfis.'],
        ['Clico na linha e a ficha não abre', 'Perfis Líder de Tribo, Coordenação Suporte e Projetos-Produtos ficam restritos à lista.', 'Use as informações da lista ou peça a um perfil autorizado os dados da ficha.'],
        ['Não encontro a aba Linha do Tempo', 'A aba é restrita a Superadmin, C-Level e Demonstração.', 'Peça o histórico a um desses perfis ou solicite revisão do seu perfil.'],
        ['Não aparece o botão Desligamento', 'A pessoa já está inativa ou seu perfil não é Superadmin, RH ou C-Level.', 'Confira a situação na ficha; se estiver ativa, peça o registro a um perfil autorizado.'],
        ['Pessoa desligada continua ocupando vaga no contrato', 'A reposição foi gerada mas ainda não foi tratada.', 'Vá a Squads e use "Substituir", ou abra a vaga pelo bloco "Reposições pendentes" em Requisição de Vagas.'],
        ['Editei a pessoa e o dado voltou ao valor antigo', 'A sincronização Feedz sobrescreveu o campo.', 'Abra Configurações, clique em "Reconciliação Feedz" e reverta o registro; se o caso se repetir, cadastre o mapeamento correto.'],
        ['Aviso "Dados salvos, mas o histórico não foi registrado"', 'O cadastro foi gravado, mas o evento da linha do tempo falhou.', 'Confira o dado na ficha e lance o evento manualmente em "Novo Evento", ou salve de novo após ajuste de permissão.'],
        ['A exportação veio com poucas pessoas', 'A exportação respeita os filtros da tela.', 'Limpe os filtros antes de exportar, ou ajuste o filtro para o recorte que você realmente quer.'],
        ['Tempo de casa parado em uma pessoa inativa', 'Comportamento esperado: o tempo congela na data do desligamento.', 'Nenhuma ação. A etiqueta "Congelado" na ficha confirma o cálculo.'],
        ['Custo total não bate com a soma que fiz', 'Encargos incidem apenas sobre a remuneração mensal, não sobre benefícios.', 'Confira o tipo de vínculo e os percentuais CLT/PJ em Configurações.'],
        ['Alocações da ficha desatualizadas', 'Mudança recente feita em Squads ainda não recarregada.', 'Na aba Alocações, clique em "Atualizar alocações".'],
      ]} />
    ),
  },
];

export default function HelpHRPage() {
  return <HelpArticle title="Recursos Humanos" description="Cadastro mestre, custos, desligamento, dashboard e Feedz" icon={UsersRound} sections={sections} />;
}
