// v2 - tutorial revisado e ampliado (agosto/2026)
import { FileText } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o módulo de Contratos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo <strong>Contratos</strong> é o centro do BNPHub. É dele que saem a receita, o custo, a margem e a
          saúde que alimentam o Dashboard, os Alertas, os Relatórios e o módulo de Squads. Todo contrato pertence a um
          cliente já cadastrado e reúne vigência, reajuste, escopo, responsáveis, equipe alocada e documentos.
        </p>
        <DataTable headers={['Status operacional', 'Significado', 'Efeito prático']} rows={[
          ['Em Implantação', 'Contrato assinado, em fase de montagem da operação.', 'Entra no Dashboard, gera alertas e conta como contrato ativo.'],
          ['Em Operação', 'Contrato ativo e em execução normal.', 'Entra no Dashboard, gera alertas e conta como contrato ativo.'],
          ['Suspenso', 'Execução temporariamente paralisada.', 'Sai do Dashboard e dos alertas; o card fica com fundo escurecido na listagem.'],
          ['Encerrado', 'Contrato finalizado.', 'Sai do Dashboard e dos alertas, mas continua na listagem e no histórico do cliente.'],
        ]} />
        <Callout type="info">
          Encerrar um contrato é apenas mudar o <strong>Status Operacional</strong> para Encerrado. Isso preserva todo o
          histórico e é quase sempre preferível a excluir o registro.
        </Callout>
      </>
    ),
  },
  {
    id: 'lista',
    label: 'Lendo a lista',
    title: 'Como ler cada linha da listagem',
    content: (
      <>
        <DataTable headers={['Elemento', 'O que significa']} rows={[
          ['Barra colorida à esquerda', 'Saúde financeira: verde para Saudável, amarelo para Atenção, vermelho para Crítico.'],
          ['Logotipo', 'Logo do contrato; se não houver, o logo do cliente é usado.'],
          ['Nome e código', 'Nome do contrato e, ao lado, a etiqueta com o código interno.'],
          ['Etiquetas Encerrado ou Suspenso', 'Aparecem apenas nesses status e o card ganha fundo escurecido.'],
          ['Triângulo de atenção', 'O contrato tem pelo menos um alerta ativo. Os detalhes ficam no módulo Alertas ou na tela do contrato.'],
          ['Ícone de corrente partida', 'Contrato ativo sem vínculo Superlógica. Clicar nele abre a tela de conciliação.'],
          ['Cliente, data de término e responsável', 'Informações de contexto na linha inferior; algumas ficam ocultas em telas menores.'],
          ['Etiquetas de segmento e tipo', 'Gov, Privado ou Híbrido e Sistema, Infraestrutura ou Híbrido.'],
          ['Bloco à direita', 'Para quem vê valores: margem percentual e resultado mensal em reais. Para os demais: apenas a etiqueta de saúde.'],
          ['Botão de três pontos', 'Menu com Ver detalhes, Editar, Recursos e Excluir, conforme a permissão.'],
        ]} />
        <Callout type="warn">
          Assim como em Clientes, <strong>o card inteiro é um atalho para a edição</strong> do contrato. Para apenas
          consultar, use o menu de três pontos e escolha <strong>Ver detalhes</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros e ordenação',
    title: 'Filtrar e ordenar a carteira',
    content: (
      <>
        <DataTable headers={['Recurso', 'Como funciona']} rows={[
          ['Buscar por nome ou código', 'Pesquisa em tempo real no nome do contrato, no código e também no nome do cliente.'],
          ['Ordenação', 'Quatro opções: Saúde (padrão, críticos primeiro), Valor mensal decrescente, Margem percentual decrescente e Margem percentual crescente.'],
          ['Segmento', 'Todos, Govtech, Privado ou Híbrido.'],
          ['Tipo', 'Todos, Sistema, Infraestrutura ou Híbrido.'],
          ['Status operacional', 'Todos, Em Operação, Em Implantação, Suspenso ou Encerrado.'],
          ['Saúde financeira', 'Botões Saudável, Atenção e Crítico. Aceitam seleção múltipla: é possível ver Atenção e Crítico ao mesmo tempo.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Os filtros aplicados viram etiquetas logo abaixo da barra. Cada etiqueta tem um <strong>x</strong> que remove
          aquele filtro isoladamente — é assim que se limpa a seleção, filtro a filtro. O contador de resultados fica
          logo em seguida.
        </p>
        <Callout type="tip">
          A ordenação por <strong>Margem % ↑</strong> combinada com o filtro de saúde Crítico produz a lista de trabalho
          mais útil para reunião de carteira: os piores contratos primeiro.
        </Callout>
      </>
    ),
  },
  {
    id: 'exportar',
    label: 'Exportar',
    title: 'Exportar a carteira para planilha',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Exportar</strong>, no topo da tela, oferece duas opções: <strong>Exportar XLSX</strong> e{' '}
          <strong>Exportar CSV</strong>. A exportação respeita exatamente o que está na tela — filtros aplicados e ordem
          escolhida.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>Identificação: nome do contrato e nome do cliente.</li>
          <li>Datas: início, fim e data base de reajuste.</li>
          <li>Financeiro: margem em reais e em percentual, receita bruta, receita líquida, percentual de impostos e custo total.</li>
          <li>Equipe: quantidade de recursos CLT, PJ e Outros.</li>
        </ul>
        <Callout type="warn">
          O botão só aparece para <strong>Superadmin</strong>, <strong>C-Level</strong> e <strong>Administrativo</strong>.
          O arquivo contém valores financeiros de toda a carteira exportada — trate-o como documento confidencial.
        </Callout>
      </>
    ),
  },
  {
    id: 'criar',
    label: 'Criar e editar',
    title: 'Criar ou editar um contrato',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Use <strong>Novo Contrato</strong> para criar. O formulário é organizado em seções que abrem e fecham:
          Identificação, Vigência e Renovação, Reajuste, Receita, Escopo e Observações, e Responsáveis. Campos marcados
          com asterisco são obrigatórios, e ao tentar salvar o sistema abre automaticamente a seção que ainda tem
          pendência.
        </p>
        <Steps items={[
          { title: 'Considere partir do documento', body: 'Ao criar um contrato aparece o bloco "Preencher a partir de documento (IA)". Envie o contrato em PDF, DOCX ou imagem, clique em "Analisar e preencher" e a IA sugere os campos. Tudo fica destacado para você revisar antes de salvar.' },
          { title: 'Identificação', body: 'Código do Contrato, Nome do Contrato, Cliente, Tipo, Segmento e Status Operacional são obrigatórios. Aqui também ficam Unidade no cliente, Centro de Custo Interno, logo do contrato e a chave "Possui subprojetos / squads múltiplas?".' },
          { title: 'Vigência e Renovação', body: 'Data de Início é obrigatória. A Data de Término também é, a menos que a Renovação Automática esteja ligada. Informe ainda a Periodicidade de Renovação e o Status de Renovação: Em Negociação, Renovado ou Sem Tratativa.' },
          { title: 'Reajuste', body: 'Índice de Reajuste, Data Base de Reajuste e Alerta de Reajuste em dias antes são obrigatórios. Esse prazo em dias é o que faz o alerta de reajuste aparecer para este contrato específico.' },
          { title: 'Receita', body: 'Escolha o Modelo de Receita entre Receita Recorrente Mensal (MRR) e Receita Média Mensal, calculada pelo total dividido pela duração. Informe a moeda, o valor correspondente ao modelo e o percentual de Impostos sobre Faturamento.' },
          { title: 'Escopo e Responsáveis', body: 'O Objeto do Contrato é obrigatório. Escopo Operacional, SLAs e Riscos e Pendências alimentam relatórios e análises. Em Responsáveis, o Responsável Interno é obrigatório; preencher também P.O. / CS e Responsável Comercial evita o alerta de contatos incompletos.' },
          { title: 'Salve', body: 'Use Criar Contrato ou, na edição, Salvar Alterações. Ao final o sistema abre a tela de detalhe do contrato.' },
        ]} />
        <Callout type="warn">
          Ao ligar <strong>Possui subprojetos / squads múltiplas?</strong> em um contrato que já existia, o sistema
          oferece migrar os recursos atuais para subprojetos. A partir daí, a gestão das pessoas passa a ser feita no
          módulo Squads.
        </Callout>
        <Callout type="info">
          Se o percentual de impostos ficar em branco, o contrato usa o percentual padrão definido em Configurações. É
          por isso que dois contratos podem ter receitas líquidas diferentes com a mesma receita bruta.
        </Callout>
      </>
    ),
  },
  {
    id: 'detalhe',
    label: 'Detalhe do contrato',
    title: 'A tela de detalhe e suas abas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O detalhe abre com um cabeçalho de indicadores: <strong>Status de Saúde</strong> (com receita bruta, impostos,
          receita líquida e custo, para quem vê valores), <strong>Vigência</strong> com dias restantes,{' '}
          <strong>Próximo Reajuste</strong> e <strong>Última Atualização</strong> dos recursos. Logo abaixo aparecem os
          alertas ativos do contrato, cada um com sua recomendação.
        </p>
        <DataTable headers={['Aba', 'O que traz']} rows={[
          ['Resumo', 'Tendência de Margem, Distribuição de Custos por tipo de recurso e overhead, card de Recebíveis, card de Subprojetos e as tags do contrato.'],
          ['Recursos', 'Equipe alocada com o total entre parênteses, além do bloco de Overhead Alocado.'],
          ['Escopo', 'Objeto do Contrato, Escopo Operacional, SLAs e a lista de responsáveis.'],
          ['Vigência', 'Datas, renovação e informações de reajuste.'],
          ['Histórico', 'Linha do tempo de eventos do contrato. Só aparece para quem tem o submódulo Histórico liberado.'],
          ['Documentos', 'Anexos do contrato. Só aparece para quem tem o submódulo Documentos liberado.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          O card <strong>Recebíveis</strong>, na aba Resumo, mostra três situações: <strong>Em dia</strong>,{' '}
          <strong>Atrasado</strong> com o valor e os dias de atraso, ou <strong>Sem vínculo</strong>. Neste último caso o
          botão <strong>Vincular assinatura</strong> leva à conciliação com o Superlógica — enquanto isso não é feito, o
          contrato não é acompanhado financeiramente.
        </p>
        <Callout type="tip">
          Os botões <strong>Recursos</strong> e <strong>Editar</strong> ficam no canto superior direito desta tela e são
          o caminho mais curto para agir sobre o contrato que você acabou de analisar.
        </Callout>
      </>
    ),
  },
  {
    id: 'recursos',
    label: 'Recursos e squads',
    title: 'Recursos do contrato e ligação com Squads',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Recursos do Contrato</strong> é onde o custo nasce. Ela abre com quatro cards —{' '}
          <strong>Saúde</strong>, <strong>Receita Mensal</strong>, <strong>Custo Mensal Total</strong> e{' '}
          <strong>Total de Recursos</strong> — seguidos da abertura de custo por CLT, PJ, Outros e Overhead.
        </p>
        <DataTable headers={['Tipo de recurso', 'Quando usar', 'Campos principais']} rows={[
          ['RH - CLT', 'Colaborador com vínculo CLT.', 'Nome da pessoa vinda do RH Mestre, cargo, senioridade, salário bruto mensal e percentual de dedicação.'],
          ['RH - PJ', 'Prestador pessoa jurídica.', 'Nome da pessoa, cargo, valor mensal contratado e percentual de dedicação.'],
          ['Outros', 'Cloud, licenças, equipamentos, terceiros e consultorias.', 'Categoria, descrição, valor mensal e recorrência.'],
        ]} />
        <Steps items={[
          { title: 'Adicione um recurso', body: 'Clique em "Adicionar Recurso", escolha o tipo e preencha os campos. Para CLT e PJ, a pessoa vem do cadastro de RH — isso mantém custo e cargo sempre atualizados.' },
          { title: 'Ou reaproveite outro contrato', body: 'O botão "Importar de outro contrato" copia a estrutura de equipe de um contrato semelhante, poupando cadastro repetido.' },
          { title: 'Organize a lista', body: 'Ordene por Custo mensal, Função/Cargo, Nome ou Tipo. Com mais de cinco recursos aparece também o campo "Buscar por nome...".' },
          { title: 'Fique atento às etiquetas', body: '"RH" indica vínculo saudável com o cadastro mestre; "Legado" indica recurso ainda sem vínculo; "Link quebrado" e "Colaborador Inativo" indicam custo possivelmente desatualizado.' },
          { title: 'Conserte os vínculos', body: 'No recurso marcado como Legado, use o botão de corrente para escolher a pessoa correspondente no RH Mestre e clicar em "Vincular".' },
        ]} />
        <Callout type="warn">
          Quando o contrato usa subprojetos, aparece o aviso <strong>Este contrato usa alocação por subprojeto</strong>.
          Nesse caso as pessoas não são editadas aqui: elas são consolidadas na linha{' '}
          <strong>Recursos Humanos (via Subprojetos)</strong> e a gestão acontece no módulo Squads, pelos botões{' '}
          <strong>Ir para Squads</strong> ou <strong>Ver nos Squads</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'overhead',
    label: 'Overhead',
    title: 'Rateio de overhead no custo do contrato',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Além dos recursos alocados, cada contrato absorve uma fatia dos custos centrais da BNP — administrativo,
          infraestrutura, governança, indiretos e consultoria. Essa fatia aparece como{' '}
          <strong>Overhead alocado</strong> na Distribuição de Custos e como card <strong>Overhead</strong> na tela de
          Recursos, sempre com o percentual do rateio e o valor correspondente.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O cálculo é automático, feito a partir do pool de overhead central e do peso do contrato. O link{' '}
          <strong>Ver rateio</strong> leva às Configurações, onde o pool é mantido.
        </p>
        <Callout type="warn">
          Quando o overhead aparece como <strong>Indisponível</strong>, o contrato ficou de fora do rateio e o sistema
          informa o motivo logo abaixo. Enquanto isso não é resolvido, o custo mostrado está subestimado e a margem,
          otimista.
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
        <DataTable headers={['Perfil', 'Ver valores', 'Criar', 'Editar de fato', 'Gerenciar recursos', 'Excluir', 'Exportar']} rows={[
          ['Superadmin', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['C-Level', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['Administrativo', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['Demo', 'Sim', 'Sim', 'Não, o formulário abre bloqueado', 'Sim', 'Sim', 'Não'],
          ['Intermediário', 'Não', 'Sim', 'Não, o formulário abre bloqueado', 'Sim', 'Sim', 'Não'],
          ['Líder de Tribo', 'Não', 'Não', 'Não, o formulário abre bloqueado', 'Edita alocações existentes, sem adicionar nem excluir', 'Não', 'Não'],
          ['Coordenação de Suporte', 'Não', 'Não', 'Não, o formulário abre bloqueado', 'Edita alocações existentes, sem adicionar nem excluir', 'Não', 'Não'],
          ['Projetos e Produtos', 'Não', 'Não', 'Não', 'Não', 'Não', 'Não'],
          ['Comercial, Jurídico, Leitor', 'Não', 'Não', 'Não', 'Não', 'Não', 'Não'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Há ainda uma restrição adicional dentro dos valores: os custos de pessoas, ou seja, CLT e PJ, dependem da
          permissão específica de custos de RH. Quem não a possui vê três traços no lugar do valor, mesmo enxergando os
          demais números do contrato. Isso é proposital: permite que a liderança realoque pessoas sem acessar
          remuneração.
        </p>
        <Callout type="info">
          Cada ação pode ser ligada ou desligada por módulo na Gestão de Perfis. Se o seu acesso não bate com a tabela,
          é provável que exista uma configuração específica para o seu usuário.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Problemas comuns e como resolver',
    content: (
      <DataTable headers={['Sintoma', 'Causa provável', 'Solução']} rows={[
        ['O contrato sumiu do Dashboard e dos Alertas', 'O status foi alterado para Suspenso ou Encerrado.', 'Abra o contrato e confira o campo Status Operacional na seção Identificação.'],
        ['Abri a edição mas os campos estão bloqueados', 'A edição efetiva é restrita a C-Level, RH, Administrativo e Superadmin, mesmo que o botão apareça.', 'Clique em Fechar e solicite a alteração a um perfil autorizado.'],
        ['Cliquei na linha e caí na edição sem querer', 'O card inteiro é atalho para a edição.', 'Use o menu de três pontos e escolha Ver detalhes; para sair sem alterar, clique em Cancelar.'],
        ['A margem está pior do que eu esperava', 'O custo inclui a parcela de overhead central, além dos recursos alocados.', 'Confira a linha Overhead alocado na Distribuição de Custos para separar as duas parcelas.'],
        ['Aparece um ícone de corrente partida no contrato', 'O contrato está ativo mas não tem assinatura vinculada no Superlógica.', 'Clique no ícone ou use "Vincular assinatura" no card Recebíveis para fazer a conciliação.'],
        ['Adicionei uma pessoa no contrato e ela não aparece na lista', 'O contrato usa alocação por subprojeto, e nesse modo as pessoas são consolidadas em uma única linha.', 'Use "Ir para Squads" e gerencie a alocação pelo subprojeto correspondente.'],
        ['O overhead aparece como Indisponível', 'O contrato ficou fora do rateio do pool central.', 'Leia o motivo exibido no card e ajuste o cadastro do contrato ou o pool em Configurações.'],
        ['Vejo receita e margem, mas os custos de CLT e PJ aparecem como ---', 'Falta a permissão específica de custos de RH.', 'Continue a análise pelos totais; para ver remuneração, solicite a permissão ao administrador.'],
        ['Não encontro o botão Exportar', 'A exportação é limitada a Superadmin, C-Level e Administrativo.', 'Peça o arquivo a um desses perfis.'],
        ['Não consigo limpar todos os filtros de uma vez', 'A listagem de contratos remove filtros pelas etiquetas individuais.', 'Clique no x de cada etiqueta ativa e volte os seletores para Todos.'],
      ]} />
    ),
  },
];

export default function HelpContractsPage() {
  return <HelpArticle title="Contratos" description="Cadastro, saúde financeira, recursos e integrações do contrato" icon={FileText} sections={sections} />;
}
