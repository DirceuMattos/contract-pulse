// v2 - tutorial revisado e ampliado (agosto/2026)
import { Building2 } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o módulo de Clientes',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo <strong>Clientes</strong> é o cadastro central das organizações atendidas pela BNP. Ele existe antes
          de tudo: todo contrato precisa estar vinculado a um cliente já cadastrado, e o logotipo, o segmento e os dados
          de contato registrados aqui são reaproveitados em contratos, alertas e relatórios.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A tela mostra os clientes em cards, sempre em ordem alfabética pelo nome fantasia (ou pela razão social, quando
          não houver nome fantasia).
        </p>
        <DataTable headers={['Segmento', 'Quando usar']} rows={[
          ['Govtech / Governo', 'Prefeituras, secretarias, autarquias e demais órgãos públicos.'],
          ['Iniciativa Privada', 'Empresas privadas, associações e entidades do terceiro setor.'],
        ]} />
        <Callout type="info">
          O segmento do cliente não é o mesmo campo que o segmento do contrato. Um cliente Govtech pode ter contratos
          classificados de outra forma — quem manda nos indicadores da carteira é o segmento do contrato.
        </Callout>
      </>
    ),
  },
  {
    id: 'cards',
    label: 'Lendo os cards',
    title: 'Como ler um card de cliente',
    content: (
      <>
        <DataTable headers={['Elemento', 'O que significa']} rows={[
          ['Logotipo ou inicial', 'Logo enviado no cadastro. Sem logo, o sistema mostra a inicial do nome com uma cor gerada automaticamente.'],
          ['Nome em destaque', 'Nome fantasia. Se o cliente não tiver nome fantasia, aparece a razão social.'],
          ['CNPJ', 'Documento formatado, logo abaixo do nome.'],
          ['Cidade e UF', 'Aparecem apenas se o endereço foi preenchido.'],
          ['E-mail e telefone', 'Contatos principais cadastrados.'],
          ['Etiqueta Govtech ou Privado', 'Segmento do cliente.'],
          ['N contratos', 'Contagem apenas dos contratos ativos, ou seja, Em Operação e Em Implantação.'],
          ['Botão de três pontos', 'Abre o menu com Ver detalhes, Editar e Excluir, conforme a sua permissão.'],
        ]} />
        <Callout type="tip">
          O card inteiro é clicável e leva direto para a <strong>edição</strong> do cliente. Se você quer apenas
          consultar, use o menu de três pontos e escolha <strong>Ver detalhes</strong> — assim não corre o risco de
          alterar o cadastro sem querer. Para quem não tem permissão de edição, o card simplesmente não responde ao
          clique.
        </Callout>
        <Callout type="warn">
          O número de contratos no card conta só os ativos. Um cliente com apenas contratos encerrados aparece com{' '}
          <strong>0 contratos</strong>, e ainda assim não poderá ser excluído.
        </Callout>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Busca e filtros',
    title: 'Encontrar um cliente',
    content: (
      <>
        <DataTable headers={['Recurso', 'Como funciona']} rows={[
          ['Buscar por nome, fantasia ou CNPJ', 'Busca conforme você digita, em qualquer parte do texto. Vale para razão social, nome fantasia e CNPJ.'],
          ['Filtro de segmento', 'Opções Todos os segmentos, Govtech / Governo e Iniciativa Privada.'],
          ['Contador de resultados', 'Logo abaixo dos filtros, indica quantos clientes atendem à busca atual.'],
        ]} />
        <Callout type="tip">
          A busca por CNPJ compara o texto exatamente como ele foi salvo, <strong>com a pontuação</strong>. Digite os
          números com pontos e barra (ou apenas um trecho, como 12.345) — só os dígitos, sem pontuação, não encontram
          nada.
        </Callout>
      </>
    ),
  },
  {
    id: 'criar',
    label: 'Cadastrar',
    title: 'Cadastrar um novo cliente',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Clique em <strong>Novo Cliente</strong>, no canto superior direito. O formulário é dividido em quatro blocos:
          Identificação, Endereço, Contato e Informações Adicionais.
        </p>
        <Steps items={[
          { title: 'Preencha a Identificação', body: 'Razão Social, CNPJ e Segmento são obrigatórios. Nome Fantasia, Inscrição Estadual e Site são opcionais, mas o nome fantasia é o que aparece em quase todas as telas.' },
          { title: 'Envie o logotipo', body: 'No campo Logo do cliente, escolha uma imagem de até 2 MB. Ela aparece nos cards, nos contratos e nos relatórios gerados.' },
          { title: 'Use o CEP para o endereço', body: 'Digite o CEP e o sistema busca automaticamente logradouro, bairro, cidade e UF. Depois complete Número e Complemento.' },
          { title: 'Informe o Contato', body: 'Contato Principal e E-mail são obrigatórios. O telefone é opcional e formatado automaticamente.' },
          { title: 'Classifique com Tags', body: 'Em Informações Adicionais, digite a tag e pressione Enter para adicioná-la. As tags ajudam a agrupar clientes por característica interna.' },
          { title: 'Salve', body: 'Clique em Cadastrar Cliente. O cliente aparece imediatamente na listagem, já na posição alfabética correta.' },
        ]} />
        <Callout type="warn">
          O CNPJ é a chave do cadastro e não pode se repetir. Antes de criar, busque pelo CNPJ para ter certeza de que o
          cliente ainda não existe — cadastros duplicados dividem os contratos entre dois registros e distorcem a
          carteira.
        </Callout>
      </>
    ),
  },
  {
    id: 'editar',
    label: 'Editar',
    title: 'Editar um cliente existente',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Existem três caminhos para a mesma tela de edição: clicar no card, usar o menu de três pontos e escolher{' '}
          <strong>Editar</strong>, ou abrir o detalhe do cliente e clicar em <strong>Editar</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Todos os campos podem ser alterados, inclusive o logotipo. Ao terminar, use <strong>Salvar Alterações</strong>.
          As mudanças valem imediatamente para todas as telas que exibem o cliente.
        </p>
        <Callout type="info">
          Alguns perfis abrem o formulário em modo somente leitura: os campos ficam bloqueados e, no lugar de Cancelar e
          Salvar Alterações, aparece apenas o botão <strong>Fechar</strong>. Isso é esperado — a edição efetiva do
          cadastro é restrita a C-Level, Administrativo e Superadmin. O perfil RH também consta na regra do
          formulário, mas na prática não chega até ele, porque o módulo Clientes não faz parte do perfil.
        </Callout>
      </>
    ),
  },
  {
    id: 'detalhe',
    label: 'Detalhe do cliente',
    title: 'A tela de detalhe e seus contratos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A opção <strong>Ver detalhes</strong> abre uma página de consulta com duas abas.
        </p>
        <DataTable headers={['Aba', 'Conteúdo']} rows={[
          ['Dados Cadastrais', 'Blocos de Identificação e Contato, mais Informações Adicionais quando houver tags ou observações. No rodapé aparecem as datas de criação e da última atualização.'],
          ['Contratos', 'Lista todos os contratos do cliente, de qualquer status, com barra colorida de saúde, vigência e indicador de resultado. O número entre parênteses é a quantidade total.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Na aba de contratos, quem tem permissão de ver valores enxerga a margem percentual e a receita mensal; os
          demais perfis veem apenas a etiqueta <strong>Saudável</strong>, <strong>Atenção</strong> ou{' '}
          <strong>Crítico</strong>. Clicar em qualquer contrato abre o detalhe dele.
        </p>
        <Callout type="tip">
          Esta aba é a forma mais rápida de responder à pergunta &quot;o que temos hoje com este cliente?&quot;, porque
          inclui também contratos suspensos e encerrados, que não entram na contagem do card.
        </Callout>
      </>
    ),
  },
  {
    id: 'excluir',
    label: 'Excluir',
    title: 'Excluir um cliente',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A exclusão fica no menu de três pontos do card, em <strong>Excluir</strong>, e pede uma confirmação antes de
          concluir.
        </p>
        <Callout type="warn">
          Um cliente que possui contratos vinculados não pode ser excluído — de qualquer status, inclusive encerrados. O
          sistema recusa a operação e informa quantos contratos estão vinculados. Remova ou transfira esses contratos
          antes de tentar novamente.
        </Callout>
        <Callout type="info">
          Na maioria dos casos a exclusão não é a melhor saída. Encerrar os contratos e manter o cliente cadastrado
          preserva o histórico e permite retomar o relacionamento sem recadastrar nada.
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
          Ver o módulo e poder alterá-lo são coisas diferentes. A tabela abaixo resume o comportamento padrão de cada
          perfil.
        </p>
        <DataTable headers={['Perfil', 'Consultar', 'Criar', 'Editar de fato', 'Excluir']} rows={[
          ['Superadmin', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['C-Level', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['Administrativo', 'Sim', 'Sim', 'Sim', 'Sim'],
          ['RH', 'Não, o módulo não faz parte do perfil', 'Não', 'Não', 'Não'],
          ['Intermediário', 'Sim', 'Sim', 'Não, o formulário abre bloqueado', 'Sim'],
          ['Demo', 'Sim', 'Sim', 'Não, o formulário abre bloqueado', 'Sim'],
          ['Líder de Tribo, Coordenação de Suporte, Projetos e Produtos', 'Sim', 'Não', 'Não', 'Não'],
          ['Comercial, Jurídico, Leitor', 'Sim', 'Não', 'Não', 'Não'],
        ]} />
        <Callout type="info">
          Além do perfil, o administrador pode ligar e desligar cada ação por módulo na Gestão de Perfis. Por isso, dois
          usuários do mesmo perfil podem ver botões diferentes.
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
        ['Erro de CNPJ duplicado ao cadastrar', 'Já existe um cliente com esse CNPJ.', 'Busque pelo CNPJ na listagem; se for duplicidade real, use o cadastro existente em vez de criar outro.'],
        ['Não vejo o botão Novo Cliente', 'Seu perfil não tem a ação de criação neste módulo.', 'Solicite o cadastro a um perfil com permissão ou peça o ajuste ao administrador.'],
        ['Abri a edição mas os campos estão bloqueados', 'Seu perfil acessa o formulário em modo leitura; a edição é restrita a C-Level, Administrativo e Superadmin.', 'Clique em Fechar e solicite a alteração a um perfil autorizado.'],
        ['Busquei o CNPJ e não achei o cliente', 'A busca compara o texto com a pontuação, como foi salvo.', 'Digite o CNPJ formatado (12.345.678/0001-00) ou apenas um trecho dele.'],
        ['Cliquei no card e caí na tela de edição sem querer', 'O card inteiro é um atalho para a edição.', 'Use o menu de três pontos e a opção Ver detalhes quando quiser apenas consultar; para sair sem alterar, clique em Cancelar.'],
        ['Não consigo excluir o cliente', 'Existem contratos vinculados a ele, mesmo encerrados.', 'Abra o módulo Contratos, filtre pelo cliente e remova ou transfira os contratos antes de excluir.'],
        ['O card mostra 0 contratos, mas sei que existem', 'A contagem do card considera apenas contratos Em Operação e Em Implantação.', 'Abra Ver detalhes e vá até a aba Contratos, que lista todos os status.'],
        ['O logotipo não aparece no contrato ou no relatório', 'O contrato tem logo próprio, que tem prioridade sobre o do cliente, ou o arquivo excedeu o limite de 2 MB.', 'Reenvie uma imagem menor no cadastro do cliente ou ajuste o logo diretamente no contrato.'],
        ['O endereço não é preenchido ao digitar o CEP', 'O CEP está incompleto ou não foi localizado na consulta.', 'Confira os oito dígitos e, se necessário, preencha os campos de endereço manualmente.'],
      ]} />
    ),
  },
];

export default function HelpClientsPage() {
  return <HelpArticle title="Clientes" description="Cadastro central de clientes, contatos e vínculo com contratos" icon={Building2} sections={sections} />;
}
