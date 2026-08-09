// v2 - tutorial revisado e ampliado (agosto/2026)
import { Upload } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o Importar / Exportar',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Importar / Exportar</strong> serve para dois movimentos: tirar dados do BNPHub em planilha
          (para análise, conferência ou backup) e colocar dados em lote a partir de um arquivo CSV ou Excel, sem
          precisar cadastrar registro por registro.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A página tem duas abas, <strong>Exportar</strong> e <strong>Importar</strong>. Cada uma pode estar liberada
          ou bloqueada conforme o seu perfil — veja a seção Permissões.
        </p>
        <Callout type="warn">
          A importação cria registros novos; ela não atualiza registros existentes nem apaga nada. Importar o mesmo
          arquivo duas vezes gera duplicidade.
        </Callout>
      </>
    ),
  },
  {
    id: 'exportar',
    label: 'Exportar',
    title: 'Exportar dados',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Na aba <strong>Exportar</strong> você escolhe o <strong>Tipo de Dado</strong> e o <strong>Formato</strong>. O
          seletor já mostra, entre parênteses, quantos registros existem de cada tipo.
        </p>
        <DataTable
          headers={['Tipo de Dado', 'O que sai no arquivo']}
          rows={[
            ['Clientes', 'Cadastro completo: razão social, nome fantasia, CNPJ, endereço, contato, segmento, tags e observações.'],
            ['Contratos', 'Dados contratuais, vigência, reajuste, modelo de receita, valores, objeto e responsáveis.'],
            ['Recursos', 'Recursos alocados nos contratos: tipo, nome, cargo, senioridade, custo, dedicação e período.'],
            ['Recursos Humanos', 'Cadastro mestre de pessoas: vínculo, cargo, departamento, admissão, situação, desligamento, contato e remuneração.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Formato</strong> há duas opções: <strong>Excel (.xlsx)</strong>, melhor para quem vai trabalhar a
          planilha, e <strong>CSV (.csv)</strong>, melhor para importar em outro sistema.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Antes de exportar, o quadro cinza mostra <strong>Total de registros a exportar</strong> e
          {' '}<strong>Colunas incluídas</strong> — use como conferência rápida. Depois é só clicar no botão
          {' '}<strong>Exportar</strong> seguido do nome do tipo escolhido. O arquivo é baixado com a data no nome.
        </p>
        <Callout type="warn">
          O conteúdo do arquivo respeita a sua permissão. Quem não pode ver valores financeiros exporta contratos e
          recursos <strong>sem</strong> as colunas de valor, custo e overrides. Na exportação de Recursos Humanos, quem
          não tem permissão de custos de RH recebe as colunas de remuneração e benefícios preenchidas com a palavra
          {' '}<strong>CONFIDENCIAL</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'importar',
    label: 'Importar',
    title: 'As quatro etapas da importação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A aba <strong>Importar</strong> conduz você por quatro etapas, exibidas no topo da tela:
          {' '}<strong>Upload</strong>, <strong>Mapeamento</strong>, <strong>Validação</strong> e
          {' '}<strong>Concluído</strong>. A etapa atual fica destacada e as já concluídas ganham um sinal verde.
        </p>
        <Steps
          items={[
            { title: 'Upload', body: 'Escolha o Tipo de Dado, baixe um template se precisar e selecione o arquivo CSV ou Excel.' },
            { title: 'Mapeamento', body: 'Diga qual coluna do seu arquivo corresponde a cada campo do sistema. Campos obrigatórios são marcados com asterisco.' },
            { title: 'Validação', body: 'O sistema separa o que está válido do que tem erro e mostra uma prévia antes de gravar qualquer coisa.' },
            { title: 'Concluído', body: 'A confirmação informa quantos registros entraram. O botão Nova Importação limpa a tela para o próximo arquivo.' },
          ]}
        />
        <Callout type="info">
          Na importação os tipos disponíveis são <strong>Clientes</strong>, <strong>Contratos</strong> e
          {' '}<strong>Recursos</strong>. Recursos Humanos é um tipo apenas de exportação; a manutenção de pessoas é
          feita no módulo de RH.
        </Callout>
      </>
    ),
  },
  {
    id: 'templates',
    label: 'Templates',
    title: 'Templates e campos obrigatórios',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Na etapa de Upload, antes de escolher o arquivo, use <strong>Template Excel</strong> ou
          {' '}<strong>Template CSV</strong>. O template é gerado com os cabeçalhos exatos que o sistema espera para o
          tipo de dado selecionado — começar por ele elimina quase todo retrabalho de mapeamento.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Os formatos aceitos no envio são <strong>CSV</strong> e <strong>Excel (.xlsx, .xls)</strong>. A primeira linha
          do arquivo precisa ser o cabeçalho.
        </p>
        <DataTable
          headers={['Tipo de Dado', 'Campos obrigatórios']}
          rows={[
            ['Clientes', 'Razão Social, CNPJ, Contato Principal, E-mail e Segmento (govtech/privado).'],
            ['Contratos', 'Código, Nome, ID do Cliente, Tipo, Segmento, Status, Data Início, Data Fim, Índice Reajuste, Data Base Reajuste, Modelo Receita, Objeto e Responsável Interno.'],
            ['Recursos', 'ID do Contrato, Tipo (clt/pj/outro), Nome, Custo Base, Percentual Dedicação (%) e Data Início.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Repare que alguns cabeçalhos já trazem, entre parênteses, os valores aceitos — por exemplo
          {' '}<strong>Tipo (sistema/infraestrutura/hibrido)</strong> ou
          {' '}<strong>Status (implantacao/operacao/suspenso/encerrado)</strong>. Datas usam o formato
          {' '}<strong>AAAA-MM-DD</strong> e listas, como Tags, são separadas por ponto e vírgula.
        </p>
        <Callout type="tip">
          Contratos exigem o <strong>ID do Cliente</strong> e Recursos exigem o <strong>ID do Contrato</strong>. Exporte
          primeiro Clientes (ou Contratos) para pegar esses identificadores e cole-os na planilha que você vai importar.
        </Callout>
      </>
    ),
  },
  {
    id: 'mapeamento',
    label: 'Mapeamento',
    title: 'Mapeamento de colunas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Assim que o arquivo é carregado, o sistema informa quantas linhas encontrou e tenta associar sozinho cada
          coluna do arquivo ao campo correspondente, comparando os nomes. A tela mostra duas colunas:
          {' '}<strong>Campo do Sistema</strong> e <strong>Coluna do Arquivo</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Revise linha a linha. Onde o sistema não conseguiu adivinhar, abra a lista e escolha a coluna certa; se um
          campo não existe no seu arquivo, deixe em <strong>Não mapear</strong>. Campos obrigatórios aparecem com
          asterisco vermelho e precisam obrigatoriamente de uma coluna.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O contador <strong>Campos obrigatórios mapeados</strong> mostra o progresso. Enquanto ele não estiver
          completo, o botão <strong>Validar e Prosseguir</strong> permanece desabilitado. O botão
          {' '}<strong>Cancelar</strong> (e o ícone de lixeira ao lado do nome do arquivo) descarta o arquivo e volta
          para o início.
        </p>
        <Callout type="tip">
          Se quase nada foi mapeado automaticamente, normalmente o arquivo não veio do template. Baixe o template,
          copie os dados para ele e recomece — sai mais rápido do que mapear tudo à mão.
        </Callout>
      </>
    ),
  },
  {
    id: 'validacao',
    label: 'Validação',
    title: 'Validação, erros e confirmação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Depois de <strong>Validar e Prosseguir</strong>, a tela mostra dois cartões:
          {' '}<strong>Registros válidos para importação</strong> e <strong>Registros com erros</strong>. Nada foi
          gravado ainda — esta é a hora de decidir.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Quando há problemas, aparece o quadro <strong>Erros de Validação</strong>, com a coluna
          {' '}<strong>Linha</strong> (o número da linha na sua planilha, já contando o cabeçalho) e a coluna
          {' '}<strong>Erro</strong>, que informa quais campos obrigatórios ficaram vazios. São exibidos os primeiros 20
          erros e, abaixo, quantos ainda restam.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O quadro <strong>Prévia dos Dados</strong> mostra os cinco primeiros registros que serão gravados. Confira se
          as colunas caíram no lugar certo. Se algo estiver trocado, use <strong>Voltar ao Mapeamento</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Para concluir, clique em <strong>Importar</strong> seguido da quantidade de registros. As linhas com erro são
          simplesmente ignoradas: corrija-as na planilha e importe só elas em um segundo arquivo.
        </p>
        <Callout type="warn">
          Não existe desfazer de importação. Em cargas grandes, importe primeiro um arquivo pequeno de teste, confira o
          resultado na tela do módulo correspondente e só então rode o arquivo completo.
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
          O módulo <strong>Importar/Exportar</strong> tem acesso restrito aos perfis <strong>C-Level</strong> e
          {' '}<strong>Superadmin</strong>. Dentro da tela, cada aba ainda tem sua própria regra.
        </p>
        <DataTable
          headers={['Ação', 'Quem pode', 'O que acontece com os demais']}
          rows={[
            ['Abrir o módulo', 'C-Level e Superadmin.', 'Os demais perfis veem o item no menu com um cadeado e recebem o aviso “Acesso restrito” ao clicar.'],
            ['Aba Exportar', 'Na prática, C-Level.', 'A regra da aba também cita Administrativo, mas esse perfil não abre o módulo. Superadmin abre a tela e encontra a aba desabilitada.'],
            ['Aba Importar', 'Perfis com permissão de edição.', 'Sem permissão de edição, a aba fica desabilitada.'],
            ['Colunas de valores de contratos e recursos', 'Perfis com permissão de ver valores.', 'As colunas sensíveis são removidas do arquivo exportado.'],
            ['Remuneração e benefícios em Recursos Humanos', 'Perfis com permissão de custos de RH.', 'As colunas saem preenchidas com CONFIDENCIAL.'],
          ]}
        />
        <Callout type="info">
          Depois de exportado, o arquivo sai do controle do sistema. Trate a planilha com o mesmo cuidado do dado
          original e compartilhe apenas com quem já teria permissão de ver aquele conteúdo dentro do BNPHub.
        </Callout>
      </>
    ),
  },
  {
    id: 'problemas',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable
        headers={['Sintoma', 'Causa provável', 'Solução']}
        rows={[
          ['A aba Exportar está apagada e não abre', 'Na prática apenas o perfil C-Level reúne acesso ao módulo e à aba.', 'Peça o arquivo a um C-Level.'],
          ['A aba Importar está apagada', 'Seu perfil não tem permissão de edição.', 'Solicite a importação a um perfil com permissão de edição.'],
          ['O botão Validar e Prosseguir não habilita', 'Falta mapear algum campo obrigatório.', 'Confira o contador de campos obrigatórios mapeados e complete os que faltam.'],
          ['Erro ao carregar arquivo', 'Formato não suportado ou planilha sem cabeçalho na primeira linha.', 'Use CSV, .xlsx ou .xls, com a primeira linha de cabeçalho — de preferência a partir do template.'],
          ['Quase nenhuma coluna foi reconhecida', 'Os cabeçalhos do arquivo não batem com os do sistema.', 'Baixe o Template Excel ou Template CSV e transfira os dados para ele.'],
          ['Muitas linhas em Registros com erros', 'Campos obrigatórios em branco.', 'Leia a coluna Erro, complete os campos na planilha e importe novamente apenas as linhas corrigidas.'],
          ['Contratos importados sem cliente', 'A coluna ID do Cliente veio vazia ou com o nome em vez do identificador.', 'Exporte Clientes, copie o identificador e use-o na coluna ID do Cliente.'],
          ['A planilha exportada não tem as colunas de valores', 'Seu perfil não tem permissão de ver valores financeiros.', 'Solicite a exportação a um perfil autorizado.'],
          ['Aparece CONFIDENCIAL na coluna de remuneração', 'Seu perfil não tem permissão de custos de RH.', 'Comportamento esperado. Peça o arquivo a quem tem a permissão.'],
          ['Registros duplicados depois da importação', 'O mesmo arquivo foi importado mais de uma vez.', 'A importação sempre cria registros novos. Exclua as duplicidades no módulo correspondente antes de repetir.'],
        ]}
      />
    ),
  },
];

export default function HelpImportExportPage() {
  return (
    <HelpArticle
      title="Importar / Exportar"
      description="Exportação em Excel ou CSV e importação em lote com validação"
      icon={Upload}
      sections={sections}
    />
  );
}
