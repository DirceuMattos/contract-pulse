// v2 - reescrita didática completa (agosto/2026): seções conforme SECTION_META, integrações, import externo e merge manual.
import { FileBarChart2 } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    title: 'O que é o relatório mensal',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          É o documento que a BNP entrega ao cliente todo mês, contrato a contrato. O módulo existe para que esse
          documento seja montado <strong>uma vez, de forma colaborativa</strong>, com parte do conteúdo vindo
          automaticamente das ferramentas que a equipe já usa — e o resultado final saia em PowerPoint.
        </p>
        <p className="text-sm text-muted-foreground mb-3">O ciclo de um mês, em quatro passos:</p>
        <Steps items={[
          { title: 'Criar o relatório do mês', body: 'Escolhendo contrato, mês e ano. Opcionalmente já trazendo o conteúdo manual do mês anterior.' },
          { title: 'Sincronizar os dados automáticos', body: 'Asana, Fireflies, Milvus e Azure DevOps preenchem as seções que dependem deles.' },
          { title: 'Escrever a análise humana', body: 'As seções manuais — objetivo, painel executivo, oportunidades, indicadores — são o valor do relatório.' },
          { title: 'Revisar, aprovar e gerar o PPTX', body: 'O status controla quem ainda pode editar; o PPTX é gerado no fim.' },
        ]} />
        <Callout type="info">
          Existe um relatório por <strong>contrato + mês + ano</strong>. O sistema não deixa criar duplicado — se você
          tentar, ele avisa e leva você ao relatório que já existe.
        </Callout>
      </>
    ),
  },
  {
    id: 'listagem',
    label: 'Tela de listagem',
    title: 'Como a lista de relatórios está organizada',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os relatórios ficam agrupados <strong>por contrato</strong>, em ordem alfabética, com os grupos fechados. Ao
          abrir um grupo, os meses aparecem em <strong>ordem crescente</strong> (do mais antigo para o mais recente).
        </p>
        <DataTable headers={['Elemento', 'O que é']} rows={[
          ['Semáforo de 4 bolinhas', 'Estado das integrações do contrato, na ordem Asana · Fireflies · Milvus · Azure DevOps. Verde = configurado, cinza = não configurado. Passe o mouse para ver qual é qual.'],
          ['Ícone de engrenagem', 'Abre a configuração de template daquele contrato (só C-Level e Superadmin).'],
          ['Cards de mês', 'Mostram Mês/Ano, a barra “Preenchimento” (seções com conteúdo ÷ total) e os badges.'],
          ['Badge “Importado”', 'Aquele mês usa um arquivo externo em vez das seções do sistema.'],
          ['Badge de status', 'Rascunho, Em Revisão ou Liberado.'],
          ['“Ver meses anteriores (N)”', 'Link vermelho acima dos cards. Por padrão só os 6 meses mais recentes aparecem.'],
          ['Menu ⋯ do card', 'Abrir, Duplicar e — para C-Level/Superadmin e apenas em Rascunho — Excluir.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3">
          Os filtros <strong>Ano</strong>, <strong>Mês</strong> e <strong>Status</strong> valem para todos os
          contratos ao mesmo tempo. O filtro de Mês é útil no fechamento: coloque o mês corrente e veja de relance
          quais contratos ainda estão em Rascunho.
        </p>
        <Callout type="tip">
          Ao sair de um relatório pelo botão de voltar, a lista <strong>reabre o grupo daquele contrato e rola até
          ele</strong>. Você não precisa procurar de novo.
        </Callout>
      </>
    ),
  },
  {
    id: 'criar',
    label: 'Criar relatório',
    title: 'Criar, duplicar ou copiar do mês anterior',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Existem três formas de começar um mês, e elas <strong>não fazem a mesma coisa</strong>. Escolher errado é a
          causa mais comum de “o relatório veio vazio” ou “veio com dado velho”.
        </p>
        <DataTable headers={['Caminho', 'Onde fica', 'O que ele traz']} rows={[
          ['Novo Relatório', 'Botão no topo da listagem', 'Cria o mês escolhido com as seções configuradas para o contrato, vazias.'],
          ['Novo Relatório + “Sim, copiar seções manuais”', 'Dentro do mesmo diálogo', 'Igual ao anterior, mas traz o texto das seções MANUAIS do mês anterior. Não traz dados sincronizados.'],
          ['Duplicar', 'Menu ⋯ do card do mês', 'Cria o MÊS SEGUINTE ao card duplicado com TODAS as seções copiadas — manuais e sincronizadas.'],
          ['Copiar mês anterior', 'Botão dentro do editor', 'Sobre um relatório já aberto, traz todas as seções não vazias do mês anterior.'],
        ]} />
        <Steps items={[
          { title: 'Clique em “Novo Relatório”', body: 'No topo da tela de relatórios.' },
          { title: 'Escolha o contrato', body: 'O campo tem busca por digitação e lista contratos não encerrados, em ordem alfabética.' },
          { title: 'Escolha Mês e Ano', body: 'Já vêm preenchidos com o período atual.' },
          { title: 'Decida sobre o mês anterior', body: 'Se houver conteúdo manual anterior, aparece uma caixa azul. “Sim, copiar seções manuais” vem marcado — é o padrão recomendado, pois glossário, objetivo e ambientes mudam pouco.' },
          { title: 'Clique em Criar', body: 'O relatório nasce em Rascunho, o sistema já dispara Asana e Fireflies em segundo plano e abre o editor.' },
        ]} />
        <Callout type="warn">
          Ao <strong>Duplicar</strong>, os números sincronizados do mês antigo vêm junto. É proposital (serve de base
          comparativa), mas você <strong>precisa sincronizar</strong> depois, senão publica o mês novo com dados do mês
          passado.
        </Callout>
      </>
    ),
  },
  {
    id: 'editor',
    label: 'O editor',
    title: 'Como o editor funciona',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          À esquerda fica a lista numerada das seções; à direita, o formulário da seção selecionada. A divisória entre
          as duas pode ser arrastada e a largura escolhida fica salva para as próximas vezes.
        </p>
        <DataTable headers={['Sinal na lista de seções', 'Significado']} rows={[
          ['⬜', 'Seção vazia.'],
          ['🟡', 'Seção parcialmente preenchida.'],
          ['✅', 'Seção completa.'],
          ['Badge “Manual”', 'O conteúdo é escrito por você.'],
          ['Badge “Auto” + fonte (📋 Asana, 🔥 Fireflies, 🎫 Milvus, 🔷 Azure DevOps)', 'A seção é alimentada por integração — e ainda assim pode ser editada.'],
        ]} />
        <Callout type="warn">
          <strong>Não existe botão “Salvar”.</strong> O editor salva sozinho cerca de 1 segundo depois que você para de
          digitar; enquanto isso aparece “Salvando...” no topo. Antes de fechar a aba, confira que esse aviso sumiu.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Ocultar um slide</p>
        <p className="text-sm text-muted-foreground mb-3">
          Toda seção (exceto a Capa) tem a chave <strong>“Ocultar slide na geração do PPT”</strong>. Use quando a
          seção não se aplica àquele mês: ela continua no sistema, mas não vira slide.
        </p>
        <Callout type="info">
          Ao abrir um relatório em <strong>Rascunho</strong> cuja última sincronização passou de 24 horas, o sistema
          sincroniza sozinho, em silêncio. Se os números mudaram sem você pedir, foi isso.
        </Callout>
      </>
    ),
  },
  {
    id: 'secoes',
    label: 'As seções',
    title: 'Referência das seções, na ordem do relatório',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A ordem abaixo é fixa e é a mesma do PPTX. As seções marcadas como configuráveis podem ser desligadas por
          contrato (veja “Configurar template”).
        </p>
        <DataTable headers={['#', 'Seção', 'Origem']} rows={[
          ['1', 'Capa', 'Automática (dados do contrato e do cliente)'],
          ['2', 'Sumário', 'Manual — gerado na exportação a partir das seções ativas'],
          ['3', 'Glossário de Termos', 'Manual'],
          ['4', 'Objetivo', 'Manual'],
          ['5', 'Indicadores do Relatório', 'Manual'],
          ['6', 'Ambientes Implementados', 'Manual'],
          ['7', 'Ambientes — Detalhamento', 'Manual'],
          ['8', 'Histórico TR', 'Manual'],
          ['9', 'Histórico TR — Aderência Global', 'Manual'],
          ['10', 'Painel Executivo', 'Manual'],
          ['11', 'Evolução e Inovação', 'Asana'],
          ['12', 'Equipe do Projeto', 'Manual'],
          ['13', 'Eficiência Operacional', 'Milvus (helpdesk)'],
          ['14', 'Eficiência e Previsibilidade', 'Azure DevOps (e parte do Asana)'],
          ['15', 'Desempenho da Aplicação', 'Manual'],
          ['16', 'Engajamento do Usuário', 'Manual'],
          ['17', 'Maturidade da Plataforma', 'Manual'],
          ['18', 'Treinamentos / Reuniões', 'Fireflies'],
          ['19', 'Oportunidades e Fatores de Atenção', 'Manual'],
          ['20', 'Tarefas Priorizadas', 'Asana'],
          ['21', 'Entregas', 'Asana'],
        ]} />
        <Callout type="tip">
          As seções de <strong>Desempenho da Aplicação</strong> e <strong>Engajamento do Usuário</strong> aceitam
          imagem colada com Ctrl+V. Elas ficam marcadas como “Temporário” — use imagens leves, pois são gravadas
          dentro do próprio relatório.
        </Callout>
      </>
    ),
  },
  {
    id: 'sincronizar',
    label: 'Sincronizar',
    title: 'O botão “Sincronizar Dados” e o que cada integração traz',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão dispara as integrações em paralelo e abre o painel <strong>“Resultado da Sincronização”</strong>, com
          uma linha por fonte: ✅ sucesso, ⚠️ ignorado (configuração faltando) ou ❌ erro com a mensagem.
        </p>
        <DataTable headers={['Fonte', 'Alimenta', 'Precisa estar configurado', 'O que ela filtra']} rows={[
          ['Asana', 'Entregas, Tarefas Priorizadas, Evolução e Inovação', 'IDs de projeto do Asana', 'Lê as colunas do quadro. Concluídas no mês viram Entregas; em andamento e planejadas viram Priorizadas.'],
          ['Fireflies', 'Treinamentos / Reuniões', 'Domínio de e-mail do cliente OU palavras-chave', 'Só entram reuniões com participante do domínio do cliente ou com a palavra-chave no título. Palavras com menos de 4 letras exigem correspondência exata.'],
          ['Milvus (helpdesk)', 'Eficiência Operacional', 'Nomes de cliente no Milvus', 'Chamados abertos no mês, por nome de cliente. Calcula total, tipos, % de SLA e bugs.'],
          ['Azure DevOps', 'Eficiência e Previsibilidade', 'Nome do projeto E ao menos uma tag', 'Work items fechados no mês. A tag é conferida de forma exata, porque projetos são compartilhados entre clientes.'],
        ]} />
        <Callout type="warn">
          Se uma integração não estiver configurada, ela <strong>não traz nada</strong> — e isso é proposital. Antes,
          um filtro frouxo podia trazer reuniões e tarefas de outros clientes para dentro do relatório. Ver “Ignorado”
          no painel significa “configure o contrato”, não “deu erro”.
        </Callout>
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Re-sincronizar uma seção só</p>
        <p className="text-sm text-muted-foreground mb-3">
          Nas seções de Asana e Fireflies existe o botão <strong>“Re-sincronizar”</strong>, que atualiza apenas
          aquela seção. Ele avisa que seu conteúdo manual será mantido e que podem surgir itens duplicados para você
          revisar — é o comportamento esperado (veja a seção seguinte).
        </p>
        <Callout type="info">
          Milvus voltando zerado mesmo com o cliente configurado? O sistema grava um diagnóstico técnico do retorno da
          API. Acione o time técnico informando o contrato e o mês — não é preciso reconfigurar nada por conta própria.
        </Callout>
      </>
    ),
  },
  {
    id: 'manual-vs-sync',
    label: 'Manual x Sync',
    title: 'Por que aparecem itens duplicados (e por que isso é bom)',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A regra de ouro do módulo: <strong>a sincronização nunca apaga nem altera o que você escreveu</strong>. Em
          troca, quando a fonte traz uma versão do mesmo item, os dois aparecem lado a lado para você decidir.
        </p>
        <DataTable headers={['O que você vê', 'O que significa', 'O que fazer']} rows={[
          ['Coluna “Origem” com badge Manual (verde)', 'A linha foi escrita ou editada por você. Está protegida de futuras sincronizações.', 'Nada — ela permanece.'],
          ['Coluna “Origem” com badge Sync (azul)', 'A linha veio da integração. Será substituída na próxima sincronização.', 'Se quiser preservá-la, basta editar qualquer campo dela: ela vira Manual.'],
          ['Aviso âmbar “Itens duplicados destacados”', 'A sincronização trouxe uma versão nova ao lado da sua.', 'Compare as duas linhas âmbar e remova a que não deve permanecer.'],
          ['“seu valor: X · sync trouxe: Y” + botão “Adotar valor do sync”', 'Um número que você digitou diverge do número coletado.', 'Confira e, se o número da fonte estiver certo, clique em adotar.'],
        ]} />
        <Callout type="tip">
          Apagar uma linha é sempre respeitado — inclusive linhas que vieram da integração. Se você removeu algo de
          propósito, ele não volta “por teimosia” do sistema.
        </Callout>
      </>
    ),
  },
  {
    id: 'template',
    label: 'Configurar template',
    title: 'Configuração por contrato',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Pela engrenagem (na listagem ou no editor) você chega à <strong>Configuração do Template</strong>, disponível
          para <strong>C-Level</strong> e <strong>Superadmin</strong>. É aqui que se define o que cada contrato usa.
        </p>
        <p className="text-sm text-muted-foreground mb-2 font-semibold text-foreground">Seções ativas</p>
        <p className="text-sm text-muted-foreground mb-3">
          Marque só as seções que fazem sentido para aquele cliente. Desmarcar afeta os relatórios{' '}
          <strong>criados dali em diante</strong> — meses já existentes não são alterados.
        </p>
        <p className="text-sm text-muted-foreground mb-2 font-semibold text-foreground">Integrações</p>
        <DataTable headers={['Campo', 'Como preencher']} rows={[
          ['IDs de Projetos no Asana (um por linha)', 'O número que aparece na URL do projeto, depois de /project/. Pode ter vários.'],
          ['Domínio de e-mail do cliente', 'Só o domínio, sem @ — por exemplo prefeitura.sp.gov.br. É o filtro mais confiável do Fireflies.'],
          ['Palavras-chave Fireflies', 'Separadas por vírgula. Servem para reuniões sem participante do cliente. Prefira palavras longas e específicas.'],
          ['Clientes Milvus (um por linha)', 'O nome do cliente exatamente como está cadastrado no Milvus.'],
          ['Azure DevOps — Nome do Projeto', 'O nome exato do projeto na organização bnpdesenvolvimento.'],
          ['Azure DevOps — Tags de filtro', 'Ao menos uma tag é obrigatória. Sem tag, a integração não roda — projetos são compartilhados entre clientes e viria dado errado.'],
        ]} />
        <Callout type="warn">
          O texto de ajuda do campo de tags do Azure ainda diz que é possível deixar vazio. <strong>Não é.</strong> Sem
          tag, a sincronização retorna “ignorado”.
        </Callout>
      </>
    ),
  },
  {
    id: 'import-externo',
    label: 'Importar externo',
    title: 'Quando o relatório do mês vem pronto de fora',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Alguns meses o relatório é produzido fora do BNPHub — um PPT montado pela equipe, um PDF exigido pelo
          cliente. Nesse caso, use <strong>“Importar relatório”</strong> no topo do editor. O mês passa a ser
          representado por esse arquivo.
        </p>
        <Steps items={[
          { title: 'Abra o relatório do mês', body: 'Ele não precisa estar vazio.' },
          { title: 'Clique em “Importar relatório”', body: 'Selecione o arquivo. Qualquer formato é aceito (PPT, PPTX, PDF, DOCX...).' },
          { title: 'Confira o card âmbar', body: 'O relatório passa a exibir “Relatório importado de fonte externa” com a versão atual.' },
        ]} />
        <DataTable headers={['O que muda no mês importado', 'Detalhe']} rows={[
          ['As seções somem da tela', 'Elas continuam gravadas, mas não são exibidas nem editadas.'],
          ['“Sincronizar Dados” fica desabilitado', 'Com o aviso “Desativado: relatório importado de fonte externa”.'],
          ['O card na listagem ganha o badge “Importado”', 'Para identificar de longe.'],
          ['Só aquele mês é afetado', 'Meses anteriores e futuros seguem normais.'],
        ]} />
        <p className="text-sm text-muted-foreground mt-3 mb-2 font-semibold text-foreground">Versões e reversão</p>
        <p className="text-sm text-muted-foreground mb-3">
          Cada envio cria uma <strong>nova versão</strong> (v1, v2, v3...), e todas ficam disponíveis para download —
          nada é sobrescrito. Use <strong>“Enviar nova versão”</strong> quando o arquivo for corrigido.{' '}
          <strong>“Remover importação”</strong> apaga todas as versões e devolve o mês ao modo normal, com seções e
          sincronização de volta.
        </p>
        <DataTable headers={['Ação', 'Perfis']} rows={[
          ['Importar, enviar nova versão, baixar', 'Superadmin, C-Level, Líder de Tribo, Projetos e Produtos, Administrativo, Coordenação de Suporte'],
          ['Remover importação (reverter)', 'Superadmin, C-Level, Líder de Tribo'],
        ]} />
        <Callout type="info">
          O botão “Gerar PPTX” continua funcionando num mês importado, mas ele gera a partir das seções guardadas no
          sistema — não do arquivo que você enviou. Para entregar o arquivo importado, baixe-o pela lista de versões.
        </Callout>
      </>
    ),
  },
  {
    id: 'status',
    label: 'Fluxo de status',
    title: 'Rascunho, Em Revisão e Liberado',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O status não é decorativo: ele <strong>controla quem ainda pode editar o conteúdo</strong>.
        </p>
        <DataTable headers={['Status', 'Quando usar', 'Quem pode editar o conteúdo']} rows={[
          ['Rascunho', 'Em elaboração. É o estado inicial.', 'Superadmin, C-Level, Líder de Tribo, Projetos e Produtos'],
          ['Em Revisão', 'Conteúdo pronto, aguardando conferência.', 'Superadmin, C-Level, Líder de Tribo'],
          ['Liberado', 'Validado e pronto para entrega ao cliente.', 'Ninguém — o relatório fica travado'],
        ]} />
        <DataTable headers={['Perfil', 'Transições que pode fazer']} rows={[
          ['Superadmin, C-Level e Líder de Tribo', 'Qualquer status, em qualquer direção — inclusive reabrir um relatório já liberado.'],
          ['Demais perfis', 'Nenhuma — o seletor fica desabilitado.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3 font-semibold text-foreground">Avisos automáticos</p>
        <DataTable headers={['Ao mover para', 'Quem é avisado']} rows={[
          ['Em Revisão', 'Líder de Tribo, Administrativo e Projetos e Produtos — para conferir o conteúdo.'],
          ['Liberado', 'Líder de Tribo, Administrativo e Projetos e Produtos — para providenciar a entrega.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          O aviso chega de duas formas: no sino de notificações e como uma faixa no topo das telas, visível para
          Superadmin, Líder de Tribo, Projetos e Produtos e Administrativo. Clicar em{' '}
          <strong>Abrir relatório</strong> leva direto ao mês em questão e dispensa o aviso.
        </p>
        <Callout type="warn">
          Passar para <strong>Liberado</strong> trava a edição para todos. Para corrigir algo depois, um C-Level,
          Líder de Tribo ou Superadmin precisa devolver o relatório para Em Revisão.
        </Callout>
      </>
    ),
  },
  {
    id: 'pptx',
    label: 'Gerar PPTX',
    title: 'Exportar a apresentação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>“Gerar PPTX”</strong> monta a apresentação no próprio navegador e baixa o arquivo, com nome
          no padrão <code className="text-xs">relatorio-nome-do-contrato-mes-ano.pptx</code>.
        </p>
        <DataTable headers={['Comportamento', 'Detalhe']} rows={[
          ['Uma seção por slide', 'Na ordem da referência de seções, com Capa no início e slide de encerramento no fim.'],
          ['Seções ocultadas não viram slide', 'A chave “Ocultar slide na geração do PPT” é respeitada.'],
          ['Tabelas longas se dividem', 'As tabelas longas — Treinamentos, Entregas, Tarefas Priorizadas e Equipe do Projeto — geram slides extras automaticamente.'],
          ['Slides sem dados trazem aviso', 'Por exemplo: “Nenhuma entrega registrada para o período.”'],
          ['Logo do cliente', 'Usa o logo do contrato e, na falta dele, o do cliente.'],
          ['Rodapé de fonte', 'Slides sincronizados indicam a origem: Asana, Fireflies, Milvus ou Azure DevOps.'],
        ]} />
        <Callout type="tip">
          Gere o PPTX <strong>depois</strong> de sincronizar e revisar. Como a geração é instantânea, o hábito
          saudável é gerar uma prévia, ler os slides e voltar ao editor para ajustar o que ficou estranho.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem acessa e quem faz o quê',
    content: (
      <>
        <DataTable headers={['Ação', 'Perfis']} rows={[
          ['Acessar o módulo', 'C-Level, Superadmin, Líder de Tribo, Administrativo, Coordenação de Suporte, Projetos e Produtos'],
          ['Criar relatório e sincronizar', 'Os mesmos perfis com acesso ao módulo'],
          ['Editar conteúdo', 'Depende do status — veja a tabela do fluxo de status'],
          ['Aprovar e publicar', 'C-Level e Superadmin'],
          ['Excluir relatório', 'C-Level e Superadmin, e somente em Rascunho'],
          ['Configurar template do contrato', 'C-Level e Superadmin'],
          ['Importar arquivo externo', 'Superadmin, C-Level, Líder de Tribo, Projetos e Produtos, Administrativo, Coordenação de Suporte'],
          ['Remover importação', 'Superadmin, C-Level, Líder de Tribo'],
        ]} />
        <Callout type="warn">
          Se o editor aceitar seu texto mas aparecer <strong>“Erro ao salvar”</strong>, é permissão no banco e não erro
          de uso. Anote o perfil, o contrato e o mês e acione o time técnico — reescrever o texto não resolve.
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
        ['“Relatório já existe” ao criar', 'Já há relatório para aquele contrato/mês/ano.', 'O sistema leva você ao existente. Use-o.'],
        ['Duplicar não funcionou', 'O mês seguinte já tem relatório.', 'Abra o mês seguinte e use “Copiar mês anterior” dentro dele.'],
        ['Seção sincronizada vazia', 'Integração não configurada para aquele contrato.', 'Abra a engrenagem e preencha os campos da integração.'],
        ['Vieram reuniões de outro cliente', 'Palavra-chave genérica ou curta demais no Fireflies.', 'Prefira o domínio de e-mail do cliente e palavras-chave longas e específicas.'],
        ['Azure DevOps não trouxe nada', 'Falta a tag de filtro, ou a tag não confere exatamente.', 'Preencha ao menos uma tag idêntica à usada nos work items.'],
        ['Milvus zerado com cliente configurado', 'Divergência no retorno da API.', 'Acione o time técnico informando contrato e mês — há um diagnóstico gravado.'],
        ['Item apareceu duas vezes', 'A sincronização trouxe a versão nova ao lado da sua.', 'Remova a linha que não deve permanecer (as duplicadas ficam em âmbar).'],
        ['Não consigo editar nada', 'O relatório está Liberado, ou seu perfil não edita no status atual.', 'Peça a um C-Level, Líder de Tribo ou Superadmin para devolvê-lo a Em Revisão.'],
        ['As seções sumiram da tela', 'O mês está marcado como importado de fonte externa.', 'Use “Remover importação” para voltar ao modo normal.'],
        ['Um mês antigo não aparece', 'A lista mostra só os 6 meses mais recentes.', 'Clique em “Ver meses anteriores”.'],
      ]} />
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas práticas',
    title: 'Rotina de fechamento mensal',
    content: (
      <>
        <Steps items={[
          { title: 'Início do mês: crie os relatórios do período', body: 'Com “copiar seções manuais” marcado, para não reescrever glossário, objetivo e ambientes.' },
          { title: 'Confira o semáforo de integrações', body: 'Bolinha cinza significa dado que não virá sozinho. Configure antes de começar a escrever.' },
          { title: 'Sincronize e só depois escreva', body: 'Assim você analisa em cima dos números reais, e não reescreve texto que a sincronização vai contextualizar.' },
          { title: 'Trate as duplicidades no mesmo dia', body: 'Deixar itens duplicados acumular torna a revisão final muito mais cara.' },
          { title: 'Gere uma prévia do PPTX antes de mandar para revisão', body: 'Erros de formatação e seções vazias aparecem no slide, não na tela de edição.' },
          { title: 'Mova o status conscientemente', body: 'Em Revisão avisa quem confere; Liberado avisa quem entrega e trava a edição. Só libere quando estiver pronto.' },
        ]} />
        <Callout type="tip">
          O relatório é lido pelo cliente. As seções automáticas dizem <em>o que</em> foi feito; as manuais — Painel
          Executivo, Oportunidades e Fatores de Atenção — dizem <em>o que isso significa</em>. É nelas que está o
          valor percebido da entrega.
        </Callout>
      </>
    ),
  },
];

export default function HelpReportsPage() {
  return (
    <HelpArticle
      title="Relatórios Mensais"
      description="Criar, sincronizar, revisar e exportar o relatório mensal de cada contrato"
      icon={FileBarChart2}
      sections={sections}
    />
  );
}
