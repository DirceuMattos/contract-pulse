// v2 - tutorial revisado e ampliado (agosto/2026)
import { LayoutDashboard } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'Para que serve o Dashboard Contratos?',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O <strong>Dashboard Contratos</strong> é a tela de leitura rápida da carteira. Ele responde três perguntas de
          gestão: quantos contratos temos, quais estão em risco e quanto a carteira está gerando de resultado.
          Nenhum dado é editado aqui — tudo o que aparece vem dos cadastros de Contratos, Recursos, RH e do rateio de
          overhead central.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          O dashboard considera apenas contratos <strong>ativos</strong>, ou seja, com status <strong>Em Operação</strong> ou{' '}
          <strong>Em Implantação</strong>. Contratos <strong>Suspensos</strong> e <strong>Encerrados</strong> ficam de fora
          de todos os números — se um contrato sumiu do painel, comece verificando o status dele.
        </p>
        <Callout type="info">
          Os valores financeiros (receita, custo, margem e resultado) aparecem somente para perfis autorizados a ver
          valores. Quem não tem essa permissão continua enxergando todos os indicadores operacionais.
        </Callout>
      </>
    ),
  },
  {
    id: 'filtros',
    label: 'Filtros',
    title: 'Filtros de cliente, contrato e saúde',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os três filtros do topo funcionam em cascata e valem para tudo o que aparece abaixo deles: cards, lista de
          contratos e gráficos. Isso é importante porque o mesmo número muda de significado conforme o recorte aplicado.
        </p>
        <Steps items={[
          { title: 'Escolha o cliente', body: 'O primeiro botão abre uma busca por razão social ou CNPJ. Selecione "Todos os clientes" para voltar à carteira inteira.' },
          { title: 'Escolha o contrato', body: 'O segundo botão lista apenas os contratos do cliente selecionado, com código, nome e período de vigência. Trocar de cliente reseta esse filtro para "Todos os contratos".' },
          { title: 'Escolha a faixa de saúde', body: 'Os botões "Todos", "Saudável", "Atenção" e "Crítico" recortam a carteira por resultado. Só um deles fica ativo por vez.' },
          { title: 'Limpe quando terminar', body: 'Quando houver qualquer filtro aplicado, aparece o botão "Limpar filtros" ao lado. Ele devolve os três filtros para "Todos" de uma vez.' },
        ]} />
        <Callout type="warn">
          Os filtros ficam salvos no seu navegador. Ao voltar ao dashboard depois, você reencontra exatamente o recorte
          que deixou aplicado — inclusive no dia seguinte. Se os números parecerem menores do que o esperado, confira se
          um filtro antigo continua ativo e use <strong>Limpar filtros</strong>.
        </Callout>
      </>
    ),
  },
  {
    id: 'superlogica',
    label: 'Aviso Superlógica',
    title: 'Banner de contratos sem vínculo Superlógica',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Logo abaixo dos filtros pode aparecer um aviso em amarelo com o texto{' '}
          <strong>N contratos ativos sem vínculo Superlógica</strong>. Ele conta os contratos Em Operação ou Em
          Implantação que ainda não foram amarrados a uma assinatura no Superlógica.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Enquanto esse vínculo não existir, as faturas daquele contrato não são sincronizadas e ele fica de fora do
          acompanhamento de recebíveis e inadimplência. O botão <strong>Conciliar agora</strong> leva direto para a tela
          de conciliação, onde a assinatura é associada ao contrato.
        </p>
        <Callout type="info">
          Esse banner só aparece para quem tem acesso ao módulo <strong>Recebíveis</strong>. Se você não o vê, não
          significa que está tudo conciliado — significa que esse acompanhamento não faz parte do seu perfil.
        </Callout>
      </>
    ),
  },
  {
    id: 'kpis',
    label: 'KPIs',
    title: 'Como ler os quatro cards do topo',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os dois primeiros cards são iguais para todo mundo. Os dois últimos mudam conforme a sua permissão de ver
          valores: quem tem permissão enxerga dinheiro, quem não tem enxerga contagem.
        </p>
        <DataTable headers={['Card', 'Quem vê', 'Como interpretar']} rows={[
          ['Total de Contratos', 'Todos', 'Contratos ativos dentro do filtro atual. A linha inferior separa Govtech, Privado e Híbrido.'],
          ['Saúde do Portfólio', 'Todos', 'Número grande = contratos saudáveis. A linha inferior mostra quantos estão em atenção e quantos em crítico.'],
          ['Receita Mensal Líquida', 'Perfis com permissão de valores', 'Receita bruta menos impostos de faturamento. A linha inferior repete a receita bruta e o custo total.'],
          ['Margem Total', 'Perfis com permissão de valores', 'Receita líquida menos custo total. A linha inferior mostra quanto isso representa em percentual da receita líquida.'],
          ['Clientes Ativos', 'Perfis sem permissão de valores', 'Substitui a receita. Conta os clientes com contrato ativo em toda a carteira — este número não muda com os filtros.'],
          ['Tipos de Contrato', 'Perfis sem permissão de valores', 'Substitui a margem. Número grande = contratos do tipo Sistema; a linha inferior traz Infra e Híbrido.'],
        ]} />
        <Callout type="tip">
          Compare sempre o card <strong>Total de Contratos</strong> com o contador da lista logo abaixo. Se os dois
          divergem, é porque há um filtro de saúde ativo recortando a lista.
        </Callout>
      </>
    ),
  },
  {
    id: 'saude',
    label: 'Saúde',
    title: 'Como a saúde de cada contrato é definida',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A saúde do contrato é puramente financeira: o sistema calcula a <strong>margem percentual</strong> do contrato
          e compara com os dois limiares definidos em Configurações. Vigência, alertas e pendências não entram nessa
          classificação — eles aparecem no módulo de Alertas.
        </p>
        <DataTable headers={['Faixa', 'Regra', 'Leitura de gestão']} rows={[
          ['Saudável', 'Margem percentual igual ou acima do limiar saudável configurado.', 'Monitoramento de rotina.'],
          ['Atenção', 'Margem entre o limiar de atenção e o limiar saudável.', 'Revisar escopo, alocação e custos antes que vire prejuízo.'],
          ['Crítico', 'Margem abaixo do limiar de atenção, incluindo margem negativa.', 'Ação imediata da gestão: renegociação, redução de alocação ou revisão de preço.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          O bloco <strong>Contratos por saúde</strong> mostra as três colunas lado a lado com os contratos que sustentam
          cada número. Cada linha traz código, nome, cliente, segmento e tipo — e, para quem vê valores, o{' '}
          <strong>Resultado</strong> mensal em reais. Clicar em qualquer linha abre o detalhe daquele contrato.
        </p>
        <Callout type="tip">
          Use esse bloco antes de qualquer reunião de carteira: ele transforma o número do card em uma lista concreta de
          contratos, já ordenada com os críticos no topo.
        </Callout>
      </>
    ),
  },
  {
    id: 'graficos',
    label: 'Gráficos',
    title: 'Os três gráficos de distribuição',
    content: (
      <>
        <DataTable headers={['Gráfico', 'O que mostra']} rows={[
          ['Saúde dos Contratos', 'Rosca com a proporção entre Saudável, Atenção e Crítico. Passar o mouse mostra a quantidade de contratos.'],
          ['Por Segmento', 'Barras horizontais com a quantidade de contratos em Govtech, Privado e Híbrido.'],
          ['Por Tipo', 'Barras horizontais com a quantidade de contratos de Sistema, Infraestrutura e Híbrido.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          Para perfis que veem valores, cada gráfico ganha um rodapé com o <strong>Resultado</strong> de cada grupo em
          reais. É assim que se descobre, por exemplo, que um segmento tem poucos contratos mas concentra boa parte do
          resultado — ou o contrário.
        </p>
        <Callout type="info">
          Grupos sem nenhum contrato no filtro atual simplesmente não são desenhados. Um gráfico com menos fatias do que
          o esperado normalmente é efeito do filtro, não falta de dado.
        </Callout>
      </>
    ),
  },
  {
    id: 'custos',
    label: 'Custos',
    title: 'Como o custo e o resultado são calculados',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O custo mensal de cada contrato tem duas partes: o custo dos recursos alocados e a parcela de{' '}
          <strong>overhead central</strong> rateada para aquele contrato. O resultado é a receita líquida menos esse
          custo total.
        </p>
        <DataTable headers={['Componente', 'Regra']} rows={[
          ['Receita bruta', 'Valor mensal de referência do contrato, conforme o modelo de receita cadastrado.'],
          ['Impostos de faturamento', 'Percentual do próprio contrato; se não houver, usa o percentual padrão das Configurações.'],
          ['Custo dos recursos', 'Remuneração mensal mais encargos sobre a remuneração, mais benefícios, aplicado o percentual de dedicação.'],
          ['Subprojetos', 'Quando o contrato usa subprojetos, as alocações entram no custo sem duplicar a mesma pessoa no contrato principal.'],
          ['Overhead central', 'Parcela do pool de overhead da BNP rateada para o contrato e somada ao custo mensal.'],
        ]} />
        <Callout type="warn">
          Encargos incidem apenas sobre a remuneração, nunca sobre benefícios. E o custo mostrado aqui é sempre a parcela
          alocada aos contratos ativos filtrados — por isso ele é naturalmente menor que o custo total do módulo de RH.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem enxerga o quê no dashboard',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          O acesso ao dashboard é liberado para praticamente todos os perfis, mas a exibição de valores é controlada
          separadamente. Há ainda uma regra específica: no Dashboard Contratos o perfil <strong>Administrativo</strong>{' '}
          não vê valores, mesmo tendo essa permissão em outras telas.
        </p>
        <DataTable headers={['Perfil', 'Acessa o dashboard', 'Vê receita, custo e margem']} rows={[
          ['Superadmin', 'Sim', 'Sim'],
          ['C-Level', 'Sim', 'Sim'],
          ['Demo', 'Sim', 'Sim'],
          ['Administrativo', 'Sim', 'Não, por regra específica desta tela'],
          ['Líder de Tribo, Coordenação de Suporte, Projetos e Produtos', 'Sim', 'Não'],
          ['RH, Comercial, Jurídico, Intermediário, Leitor', 'Sim', 'Não'],
        ]} />
        <Callout type="info">
          Quem não vê valores continua vendo saúde, quantidades, distribuição e a lista de contratos por saúde. O
          diagnóstico continua possível — só não aparecem os números em reais.
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
        ['Um contrato conhecido não aparece em lugar nenhum', 'O status dele é Suspenso ou Encerrado, e o dashboard só considera Em Operação e Em Implantação.', 'Abra o contrato pelo módulo Contratos e confira o campo Status Operacional.'],
        ['Os números vieram menores do que o esperado ao abrir a tela', 'Filtros de cliente, contrato ou saúde ficaram salvos da sessão anterior.', 'Clique em "Limpar filtros" e confira os números novamente.'],
        ['Não vejo receita, custo nem margem', 'Seu perfil não tem permissão de ver valores, ou você é do perfil Administrativo, que não vê valores nesta tela.', 'Use os cards Clientes Ativos e Tipos de Contrato; se precisar dos valores, peça ajuste ao administrador.'],
        ['O total do card difere da quantidade listada abaixo', 'Há um filtro de saúde ativo recortando a lista de contratos.', 'Clique em "Todos" no filtro de saúde para ver a carteira completa.'],
        ['O custo parece alto para um contrato pequeno', 'A parcela de overhead central rateada está somada ao custo dos recursos.', 'Abra o contrato e veja a linha "Overhead alocado" na aba Resumo para separar as duas parcelas.'],
        ['O banner de vínculo Superlógica não some', 'Ainda existem contratos ativos sem assinatura vinculada.', 'Clique em "Conciliar agora" e vincule cada contrato listado à assinatura correspondente.'],
        ['Contrato aparece como Crítico mas a operação vai bem', 'A saúde considera apenas a margem financeira, não a satisfação do cliente nem a entrega.', 'Revise custo dos recursos, dedicação e valor mensal do contrato; use o módulo de Alertas para o risco operacional.'],
      ]} />
    ),
  },
];

export default function HelpDashboardPage() {
  return <HelpArticle title="Dashboard Contratos" description="Indicadores, filtros e leitura da carteira de contratos" icon={LayoutDashboard} sections={sections} />;
}
