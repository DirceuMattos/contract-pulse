// v2 - tutorial revisado e ampliado (agosto/2026)
import { Calculator } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o Simulador de Contratos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Simulador de Contratos</strong> ajuda a responder, antes de assinar, se um contrato fecha a conta.
          A partir do escopo e do nível de complexidade, ele sugere a equipe necessária, calcula o custo mensal, propõe
          um preço e mostra a margem resultante.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Simulações vivem em uma área própria: elas <strong>não</strong> criam contratos, clientes nem recursos. São
          cenários de negociação, salvos como <strong>Rascunho</strong> e, quando perdem a validade, marcados como
          {' '}<strong>Arquivado</strong>.
        </p>
        <Callout type="info">
          Os percentuais de encargos CLT, impostos PJ e impostos sobre faturamento usados nos cálculos vêm da tela
          {' '}<strong>Configurações</strong>. Se eles mudarem lá, as simulações passam a ser calculadas com os novos
          valores.
        </Callout>
      </>
    ),
  },
  {
    id: 'lista',
    label: 'Lista de simulações',
    title: 'A lista de simulações',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela inicial mostra todas as simulações em cartões. Cada cartão traz o nome, o cliente, uma etiqueta de
          saúde (<strong>Saudável</strong>, <strong>Atenção</strong> ou <strong>Crítico</strong>) e quatro números:
          {' '}<strong>Tipo</strong>, <strong>Prazo</strong>, <strong>Margem R$</strong> (resultado por mês) e
          {' '}<strong>Margem</strong> em percentual. A borda colorida à esquerda repete a classificação de saúde.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Para localizar, use o campo <strong>Buscar por nome ou cliente...</strong> e os dois filtros: tipo
          {' '}(<strong>Governo</strong> ou <strong>Privado</strong>) e situação (<strong>Rascunho</strong> ou
          {' '}<strong>Arquivado</strong>).
        </p>
        <DataTable
          headers={['Ação', 'Onde fica', 'O que faz']}
          rows={[
            ['Nova simulação', 'Botão no topo da página.', 'Abre o assistente em branco, no Passo 1.'],
            ['Recalcular todas', 'Botão no topo da página.', 'Reprocessa todas as simulações com os parâmetros atuais do sistema.'],
            ['Abrir', 'Dentro do cartão.', 'Reabre a simulação no assistente para edição.'],
            ['Recalcular', 'Ícone de setas circulares no cartão.', 'Reprocessa apenas aquela simulação.'],
            ['Duplicar', 'Ícone de cópia no cartão.', 'Cria uma cópia para testar uma variação sem perder a original.'],
            ['Arquivar / restaurar', 'Ícone de caixa no cartão.', 'Alterna entre Arquivado e Rascunho.'],
            ['Excluir', 'Ícone de lixeira no cartão.', 'Pede confirmação e apaga em definitivo — não pode ser desfeito.'],
          ]}
        />
        <Callout type="tip">
          Use <strong>Recalcular todas</strong> depois de alterar encargos ou impostos em Configurações. Assim as
          simulações antigas voltam a refletir a realidade atual antes de você comparar cenários.
        </Callout>
      </>
    ),
  },
  {
    id: 'assistente',
    label: 'O assistente',
    title: 'O assistente de 4 passos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Criar ou editar uma simulação acontece dentro de um assistente com quatro etapas, exibidas na barra do topo:
        </p>
        <Steps
          items={[
            { title: 'Identificação', body: 'Nome, cliente, tipo de contrato, prazo e descrição do escopo. É aqui que fica a importação de TR/Edital com IA.' },
            { title: 'Complexidade', body: 'Nível de complexidade e o questionário técnico que orienta a sugestão automática de equipe.' },
            { title: 'Recursos', body: 'A estrutura de custos: pessoas, outros custos e overhead. Tudo editável.' },
            { title: 'Resultado', body: 'Precificação sugerida, indicadores, comparativo de cenários e a análise consultiva.' },
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Navegue pelos botões <strong>Anterior</strong> e <strong>Próximo</strong>, ou clicando direto em um passo já
          visitado na barra — passos ainda não alcançados ficam bloqueados. O botão <strong>Salvar</strong> está
          disponível em qualquer etapa, e no último passo aparece <strong>Concluir</strong>, que salva e volta para a
          lista.
        </p>
        <Callout type="warn">
          O <strong>Nome da simulação</strong> é obrigatório para salvar. Sem ele, o sistema exibe
          {' '}<strong>Preencha o nome da simulação</strong> e nada é gravado.
        </Callout>
      </>
    ),
  },
  {
    id: 'passo-1',
    label: 'Passo 1',
    title: 'Passo 1 — Identificação e análise do documento',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os campos obrigatórios são <strong>Nome da simulação</strong>, <strong>Cliente</strong>,
          {' '}<strong>Tipo de contrato</strong>, <strong>Prazo (meses)</strong> e
          {' '}<strong>Descrição do escopo</strong>. Escolhendo o tipo <strong>Governo</strong>, aparece também o campo
          {' '}<strong>Esfera</strong> (Municipal, Estadual ou Federal).
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Há ainda campos opcionais úteis: <strong>Data estimada de início</strong>, o bloco
          {' '}<strong>Responsável no Cliente</strong> (nome, e-mail e telefone) e
          {' '}<strong>Custo de consultoria previsto (mensal)</strong>. Este último, quando informado, entra
          automaticamente na composição de custos, no Passo 3, como uma linha de <strong>Consultoria Comercial</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          No topo do passo existe o bloco <strong>Importar TR/Edital com IA</strong>. Clique em
          {' '}<strong>Selecionar arquivo</strong> e envie o edital ou termo de referência: a IA lê o documento e
          preenche os campos que conseguiu identificar. São aceitos arquivos <strong>PDF</strong> ou
          {' '}<strong>DOCX</strong>, com no máximo <strong>20MB</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Depois da análise, cada campo preenchido ganha uma etiqueta de origem, e um cartão de
          {' '}<strong>Cobertura da análise</strong> resume a qualidade do resultado e lista os
          {' '}<strong>Campos pendentes de revisão</strong>.
        </p>
        <DataTable
          headers={['Etiqueta', 'Significado', 'O que fazer']}
          rows={[
            ['documento', 'O valor foi encontrado explicitamente no arquivo enviado.', 'Confira por amostragem e siga.'],
            ['referência', 'Foi deduzido a partir de contratos internos parecidos.', 'Revise: é uma comparação, não o texto do edital.'],
            ['estimativa', 'A IA arbitrou um valor plausível.', 'Revise obrigatoriamente antes de usar em negociação.'],
            ['pendente', 'Não foi possível identificar no documento.', 'Preencha manualmente.'],
          ]}
        />
        <Callout type="warn">
          A análise do documento é um acelerador de digitação, não uma fonte de verdade. Nenhuma proposta deve sair sem
          revisão humana dos campos marcados como estimativa ou pendente.
        </Callout>
      </>
    ),
  },
  {
    id: 'passo-2',
    label: 'Passo 2',
    title: 'Passo 2 — Complexidade e questionário',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Este passo é o motor da sugestão automática: as respostas daqui definem quais perfis, em que quantidade e com
          que custos aparecem no Passo 3. Vale investir tempo aqui — errar aqui contamina todo o resto.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Nível de complexidade</strong> (<strong>Baixa</strong>, <strong>Média</strong> ou
          {' '}<strong>Alta</strong>) é obrigatório e também influencia a margem-alvo usada na precificação.
        </p>
        <DataTable
          headers={['Pergunta', 'Opções']}
          rows={[
            ['Tipo de demanda (selecione um ou mais)', 'Sustentação / Manutenção, Evolução incremental, Novo sistema, Implantação + customização.'],
            ['Criticidade', 'Baixa, Média, Alta.'],
            ['Integrações', 'Nenhuma, 1–2, 3–5, mais de 5.'],
            ['Número de módulos', '1–2, 3–5, 6–10, mais de 10.'],
            ['Volume de usuários', 'Menos de 200, 200–2.000, 2.000–20.000, mais de 20.000.'],
            ['SLA / Suporte', 'Horário comercial, 12×5, 24×7.'],
            ['Prazo de entrega', 'Flexível, Moderado, Agressivo.'],
            ['Dependência de campo', 'Chave que indica necessidade de implantação presencial.'],
          ]}
        />
        <Callout type="tip">
          <strong>Tipo de demanda</strong> aceita mais de uma marcação e pelo menos uma precisa continuar selecionada.
          Um contrato que implanta e depois sustenta deve ter as duas opções marcadas.
        </Callout>
      </>
    ),
  },
  {
    id: 'passo-3',
    label: 'Passo 3',
    title: 'Passo 3 — Estrutura de recursos',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O passo abre com a sugestão automática montada a partir do questionário. O subtítulo indica em que modo você
          está: <strong>Exibindo sugestão automática. Edite para personalizar.</strong> ou
          {' '}<strong>Recursos personalizados.</strong>. Qualquer edição passa a simulação para o modo personalizado, e
          o botão <strong>Resetar</strong> devolve a sugestão original.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O bloco recolhível <strong>Como foi calculado</strong> explica quais regras do questionário geraram aquela
          equipe. Use-o para justificar a proposta internamente.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          São três quadros de custo:
        </p>
        <DataTable
          headers={['Quadro', 'Campos', 'Observação']}
          rows={[
            ['Recursos Humanos', 'Função, Tipo (CLT ou PJ), Qtd, Salário bruto, Encargos% e Custo total.', 'Ao trocar o tipo, o percentual de encargos é ajustado automaticamente conforme Configurações.'],
            ['Outros Custos', 'Categoria, Descrição e Valor mensal.', 'Categorias disponíveis incluem Cloud, Infraestrutura, Observabilidade, Plantão, Viagens, Licenças, Equipamentos, Extensão de Acessibilidade, Inteligência Artificial e Outros.'],
            ['Overhead (%)', 'Infraestrutura, Administrativo e Governança.', 'Percentuais aplicados sobre a base de custo da simulação.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Cada quadro tem <strong>Adicionar</strong> para criar linhas e uma lixeira para removê-las. Se você informou
          o custo de consultoria no Passo 1, ele aparece em Outros Custos como uma linha destacada, com a observação
          {' '}<strong>Custo informado no Passo 1</strong>; para alterá-lo, volte ao Passo 1.
        </p>
        <Callout type="info">
          Quando a equipe veio da análise de um documento, aparece uma etiqueta indicando a origem — equipe extraída do
          documento, baseada em contratos internos ou estimativa a revisar manualmente.
        </Callout>
      </>
    ),
  },
  {
    id: 'passo-4',
    label: 'Passo 4',
    title: 'Passo 4 — Precificação e recomendação',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O quadro <strong>Valor do Contrato &amp; Precificação</strong> é onde a negociação encontra a conta. Informe o
          {' '}<strong>Valor mensal do contrato</strong> que está sendo discutido com o cliente. Se você deixar em
          branco, o sistema usa o valor sugerido e avisa isso logo abaixo do campo.
        </p>
        <DataTable
          headers={['Informação', 'O que significa']}
          rows={[
            ['Valor total sugerido', 'Valor mensal sugerido multiplicado pelo prazo sugerido.'],
            ['Prazo sugerido', 'Prazo recomendado a partir do tipo de demanda; contratos de governo recebem prazo maior.'],
            ['Margem-alvo', 'Margem esperada, definida pelo nível de complexidade da simulação.'],
            ['Break-even mensal', 'Valor mensal em que a operação apenas se paga, com margem zero.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Logo abaixo, o quadro <strong>Recomendação de Precificação</strong> compara três números lado a lado:
          {' '}<strong>Mínimo viável (break-even)</strong>, <strong>Valor recomendado</strong> e
          {' '}<strong>Valor proposto pelo cliente</strong>. A cor da borda e a mensagem de resumo mudam conforme o
          caso: valor abaixo do mínimo mostra o tamanho do déficit mensal; valor entre o mínimo e o recomendado avisa
          que a margem ficou reduzida; valor igual ou acima do recomendado confirma que a proposta está na faixa
          saudável.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A faixa de indicadores traz <strong>Receita bruta</strong>, <strong>Impostos</strong>,
          {' '}<strong>Receita líquida</strong>, <strong>Custo mensal</strong>, <strong>Resultado</strong> e
          {' '}<strong>Margem</strong>, esta última acompanhada da etiqueta <strong>Saudável</strong>,
          {' '}<strong>Atenção</strong> ou <strong>Deficitário</strong>.
        </p>
        <Callout type="tip">
          Em negociação, o número mais forte não é a margem: é o <strong>Mínimo viável</strong>. Ele mostra
          objetivamente a partir de que valor o contrato deixa de dar prejuízo.
        </Callout>
      </>
    ),
  },
  {
    id: 'cenarios',
    label: 'Cenários e IA',
    title: 'Cenários e Análise do Consultor',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Comparativo de cenários</strong> mantém a mesma receita e varia os custos, para mostrar o quanto a
          proposta aguenta de imprevisto:
        </p>
        <DataTable
          headers={['Cenário', 'Premissa', 'Leitura']}
          rows={[
            ['Conservador', 'Custos 10% acima do estimado.', 'É o teste de estresse. Se aqui ficar deficitário, a proposta é arriscada.'],
            ['Base', 'Custos conforme estimado.', 'O cenário planejado.'],
            ['Otimista', 'Custos abaixo do estimado.', 'O melhor caso — nunca deve ser a base da negociação.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          A tabela mostra Custo total, Resultado, Margem e Status de cada cenário, e o gráfico
          {' '}<strong>Resultado mensal por cenário</strong> apresenta a mesma comparação visualmente.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Por fim, o bloco <strong>Análise do Consultor</strong> usa IA para comentar riscos, oportunidades e
          recomendações da proposta. Clique em <strong>Gerar análise</strong> — depois de gerada, o botão muda para
          {' '}<strong>Gerar novamente</strong> e o texto fica salvo junto da simulação. Se a análise vier de um
          documento importado, o bloco <strong>Observações Extraídas do Documento</strong> também aparece no topo do
          passo.
        </p>
        <Callout type="warn">
          A análise de IA pode falhar por limite de requisições ou créditos insuficientes; nesses casos a própria tela
          informa o motivo. Trate o texto gerado como apoio à decisão, e não como parecer final.
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
          O acesso ao <strong>Simulador de Contratos</strong> depende da liberação do módulo para o seu perfil. Por
          padrão ele está disponível para C-Level, Superadmin, Comercial e Demo. Quem não tem a liberação vê a
          mensagem <strong>Acesso restrito</strong> ao tentar abrir a tela.
        </p>
        <DataTable
          headers={['Perfil', 'O que consegue fazer']}
          rows={[
            ['C-Level e Superadmin', 'Uso completo: criar, editar, duplicar, arquivar, excluir, recalcular e gerar a análise de IA.'],
            ['Comercial', 'Uso completo do simulador, dentro da liberação padrão do perfil.'],
            ['Demo', 'Uso completo, em base de demonstração.'],
            ['Intermediário', 'Bloqueado: a tela exibe Acesso restrito, com a mensagem de que o módulo está disponível apenas para C-Level e Leitores.'],
            ['Demais perfis', 'Só acessam se o módulo Simulador de Contratos for liberado para o perfil na Gestão de Perfis.'],
          ]}
        />
        <Callout type="warn">
          O simulador exibe custos, salários e margens para qualquer pessoa que consiga abri-lo — não existe aqui o
          filtro de “ver valores” que outros módulos aplicam. Por isso, liberar este módulo equivale a liberar acesso a
          informação financeira sensível.
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
          ['“Acesso restrito” ao abrir o simulador', 'Perfil Intermediário, que é bloqueado na tela, ou módulo não liberado para o perfil.', 'Solicite a simulação a um perfil autorizado ou peça a liberação do módulo na Gestão de Perfis.'],
          ['“Preencha o nome da simulação”', 'O campo Nome da simulação está vazio.', 'Volte ao Passo 1, preencha o nome e salve de novo.'],
          ['Não consigo clicar em um passo mais à frente', 'Passos ainda não visitados ficam bloqueados na barra.', 'Avance com o botão Próximo até chegar ao passo desejado.'],
          ['Alterei o questionário e perdi minhas edições de recursos', 'Enquanto a simulação está em modo de sugestão automática, mudar o questionário regenera a estrutura.', 'Faça primeiro o questionário e só depois personalize os recursos.'],
          ['Editei recursos e quero a sugestão de volta', 'A simulação passou para o modo personalizado.', 'Use o botão Resetar no Passo 3.'],
          ['O custo de consultoria não pode ser editado no Passo 3', 'Ele vem do campo do Passo 1 e aparece como linha informativa.', 'Volte ao Passo 1 e ajuste Custo de consultoria previsto (mensal).'],
          ['A margem mudou sozinha em simulações antigas', 'Os percentuais de encargos e impostos foram alterados em Configurações.', 'Comportamento esperado. Use Recalcular todas para alinhar todas as simulações.'],
          ['Erro na análise do documento', 'Arquivo fora do formato aceito ou acima de 20MB.', 'Envie um PDF ou DOCX com até 20MB.'],
          ['A análise preencheu campos errados', 'Os campos vieram como estimativa ou referência, não do texto do documento.', 'Verifique as etiquetas de origem e o cartão Cobertura da análise, e corrija manualmente.'],
          ['“Limite de requisições atingido” ou “Créditos insuficientes”', 'Restrição do serviço de IA usado na Análise do Consultor.', 'Aguarde alguns instantes e tente de novo, ou acione o time responsável pelos créditos.'],
          ['Excluí uma simulação por engano', 'A exclusão é definitiva e não tem desfazer.', 'Refaça a simulação. Para evitar, prefira arquivar em vez de excluir.'],
        ]}
      />
    ),
  },
];

export default function HelpCalculatorPage() {
  return (
    <HelpArticle
      title="Simulador de Contratos"
      description="Assistente de 4 passos, custos, precificação e cenários de viabilidade"
      icon={Calculator}
      sections={sections}
    />
  );
}
