// v2 - tutorial revisado e ampliado (agosto/2026)
import { Bell } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que a Central de Alertas faz',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          A tela <strong>Alertas</strong> não é uma caixa de mensagens: nada é escrito à mão nem marcado como lido. Todos
          os alertas são <strong>calculados automaticamente</strong>, cruzando os dados dos contratos ativos com os
          parâmetros definidos em Configurações. O cálculo se refaz sempre que esses dados mudam.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          A consequência prática é importante: um alerta desaparece sozinho quando a causa é resolvida. Se você renovar
          um contrato, atualizar os recursos ou corrigir a margem, o alerta correspondente some na próxima visita — não
          existe botão de fechar ou arquivar.
        </p>
        <Callout type="info">
          Só entram no cálculo contratos com status <strong>Em Operação</strong> ou <strong>Em Implantação</strong>.
          Contratos suspensos ou encerrados não geram alertas.
        </Callout>
      </>
    ),
  },
  {
    id: 'deploy',
    label: 'Deploy e Infra',
    title: 'O card Saúde do Deploy e Infra',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          No topo da tela fica o card <strong>Saúde do Deploy &amp; Infra</strong>. Ele não fala de contratos: monitora se
          o próprio BNPHub está no ar. É a primeira coisa a olhar quando alguém relata que o sistema está lento ou fora
          do ar.
        </p>
        <DataTable headers={['Indicador', 'O que significa', 'Como ler']} rows={[
          ['Uptime (Site)', 'Verifica se a aplicação responde no navegador.', 'Verde e "Online" com o tempo de resposta em milissegundos; vermelho e "Offline" com o número de falhas seguidas.'],
          ['Backend (Cloud)', 'Verifica se o banco de dados e a autenticação respondem.', 'Verde e "Operacional" com a latência; vermelho e "Indisponível" com o número de falhas seguidas.'],
          ['Monitoramento ativo', 'Explica a frequência da verificação.', 'A checagem roda a cada 5 minutos e a linha "Última" mostra o horário da última execução.'],
        ]} />
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Verificar agora</strong> força uma checagem imediata, sem esperar o ciclo de 5 minutos. Use-o
          logo após um deploy ou quando alguém reportar instabilidade.
        </p>
        <Callout type="warn">
          O alerta crítico só é disparado após <strong>duas falhas consecutivas</strong>, para evitar barulho por causa de
          uma oscilação isolada de rede. Quando dispara, ele chega pelo sino de notificações e como notificação do
          navegador — não como um card na lista de alertas de contratos abaixo.
        </Callout>
      </>
    ),
  },
  {
    id: 'resumo',
    label: 'Cards de resumo',
    title: 'Os três cards de resumo',
    content: (
      <DataTable headers={['Card', 'O que mostra']} rows={[
        ['Alertas Críticos', 'Quantidade de alertas de severidade crítica em toda a carteira. Esse número ignora os filtros aplicados abaixo.'],
        ['Alertas de Atenção', 'Quantidade de alertas de severidade atenção em toda a carteira.'],
        ['Configurações de Alerta', 'Mostra os parâmetros em vigor: quantos dias antes o sistema avisa sobre Reajuste, sobre Vigência e a partir de quantos dias os recursos são considerados desatualizados.'],
      ]} />
    ),
  },
  {
    id: 'tipos',
    label: 'Tipos de alerta',
    title: 'Todos os tipos e quando cada um aparece',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Cada tipo tem uma regra própria. Conhecer a regra evita o erro mais comum: tentar resolver o alerta na tela
          errada.
        </p>
        <DataTable headers={['Tipo', 'Quando dispara', 'Severidade']} rows={[
          ['Déficit Financeiro', 'O contrato tem resultado mensal negativo.', 'Crítico'],
          ['Margem Baixa', 'Margem entre 0% e 5%.', 'Atenção'],
          ['Contrato Vencido', 'A data de término já passou e o contrato continua ativo.', 'Crítico'],
          ['Vigência Próxima do Fim', 'Faltam menos dias que o parâmetro de vigência. Não aparece se o status de renovação for Renovado.', 'Crítico até 30 dias ou quando o status é Sem Tratativa; caso contrário Atenção'],
          ['Renovação Próxima', 'A renovação prevista ocorre nos próximos 60 dias.', 'Crítico até 30 dias, senão Atenção'],
          ['Reajuste Próximo', 'A data base de reajuste está dentro do prazo de alerta do contrato ou do padrão do sistema.', 'Crítico até 30 dias, senão Atenção'],
          ['Recursos Desatualizados', 'Os recursos nunca foram cadastrados ou não são atualizados há mais dias que o parâmetro configurado.', 'Crítico ao passar do dobro do prazo, senão Atenção'],
          ['Tendência de Deterioração', 'A margem caiu de forma consecutiva nos últimos meses registrados.', 'Crítico se a queda for grande ou a margem ficar negativa, senão Atenção'],
          ['Concentração de Custo', 'Um único recurso responde por 40% ou mais do custo do contrato. Só é avaliado em contratos com pelo menos 3 recursos.', 'Crítico a partir de 60%, senão Atenção'],
          ['Contatos Incompletos', 'O contrato não tem responsável de CS nem responsável comercial. Esse tipo também acusa ocorrência crítica recente e risco contratual recente registrados no histórico.', 'Informativo ou Atenção'],
          ['Vínculos RH Quebrados', 'Existem recursos apontando para pessoas que não estão mais no cadastro de RH, o que deixa os custos desatualizados.', 'Atenção'],
          ['Site Offline (Uptime)', 'O monitoramento de infraestrutura detectou o site fora do ar.', 'Crítico'],
          ['Backend Indisponível', 'O monitoramento detectou o banco e a autenticação sem resposta.', 'Crítico'],
          ['Falha de Build/Deploy', 'Tipo disponível na lista de filtros para alertas de publicação.', 'Crítico'],
        ]} />
        <Callout type="tip">
          O alerta <strong>Vínculos RH Quebrados</strong> é o único que não pertence a um contrato específico: ele soma
          todos os recursos com vínculo perdido. Corrija-os na tela de Recursos de cada contrato afetado.
        </Callout>
      </>
    ),
  },
  {
    id: 'navegar',
    label: 'Filtros e abas',
    title: 'Filtrar, navegar e agir sobre um alerta',
    content: (
      <>
        <Steps items={[
          { title: 'Comece pela aba', body: 'As abas "Todos", "Críticos" e "Atenção" separam por gravidade. O número entre parênteses é o total da carteira.' },
          { title: 'Refine por tipo', body: 'O primeiro seletor lista todos os tipos de alerta. Escolha, por exemplo, "Reajuste Próximo" para preparar uma rodada de negociação.' },
          { title: 'Refine por severidade', body: 'O segundo seletor oferece Todas, Crítico e Atenção, e se combina com a aba escolhida.' },
          { title: 'Leia o card inteiro', body: 'Cada card traz título, descrição, o contrato e o cliente envolvidos e um bloco "Recomendação" com a ação sugerida.' },
          { title: 'Clique para agir', body: 'Clicar em qualquer parte do card abre o contrato correspondente, que é onde a correção acontece.' },
          { title: 'Limpe os filtros', body: 'Com qualquer filtro ativo aparece o botão "Limpar filtros", que devolve a lista completa.' },
        ]} />
        <Callout type="info">
          Se a lista aparecer vazia com a mensagem <strong>Nenhum alerta encontrado</strong>, confira antes de comemorar:
          pode ser filtro ativo demais. Sem filtros, a mensagem exibida é a de que todos os contratos estão em dia.
        </Callout>
      </>
    ),
  },
  {
    id: 'configurar',
    label: 'Configurar',
    title: 'Ajustar os parâmetros dos alertas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Os prazos que disparam os alertas não são fixos. O botão <strong>Configurar Alertas</strong>, no canto superior
          direito, leva para a tela de Configurações, onde ficam os dias de antecedência de reajuste, de vigência e o
          prazo de desatualização de recursos.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>Aumentar o prazo faz aparecerem mais alertas, com mais antecedência.</li>
          <li>Reduzir o prazo deixa a lista mais enxuta, mas encurta o tempo de reação.</li>
          <li>Cada contrato pode ter um prazo próprio de alerta de reajuste, que prevalece sobre o padrão do sistema.</li>
        </ul>
        <Callout type="warn">
          O botão <strong>Configurar Alertas</strong> só aparece para os perfis <strong>C-Level</strong> e{' '}
          <strong>Superadmin</strong>. Qualquer mudança feita ali vale para todos os usuários.
        </Callout>
      </>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Quem vê quais alertas',
    content: (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Quatro tipos de alerta expõem informação financeira e por isso são <strong>ocultados por completo</strong> de
          quem não tem permissão de ver valores: Déficit Financeiro, Margem Baixa, Tendência de Deterioração e
          Concentração de Custo. Eles somem tanto da lista quanto do seletor de tipos.
        </p>
        <DataTable headers={['Perfil', 'Acessa a tela', 'Vê alertas financeiros', 'Configura parâmetros']} rows={[
          ['Superadmin', 'Sim', 'Sim', 'Sim'],
          ['C-Level', 'Sim', 'Sim', 'Sim'],
          ['Administrativo', 'Sim', 'Sim', 'Não'],
          ['Demo', 'Sim', 'Sim', 'Não'],
          ['Líder de Tribo, Coordenação de Suporte, Projetos e Produtos', 'Sim', 'Não', 'Não'],
          ['RH, Intermediário', 'Sim', 'Não', 'Não'],
          ['Comercial, Jurídico, Leitor', 'Não, por padrão o módulo não faz parte do perfil', 'Não', 'Não'],
        ]} />
        <Callout type="warn">
          Os contadores <strong>Alertas Críticos</strong> e <strong>Alertas de Atenção</strong> contam a carteira inteira.
          Por isso, quem não vê alertas financeiros pode encontrar um contador maior do que a quantidade de cards
          listados — a diferença são justamente os alertas restritos.
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
        ['O contador mostra alertas, mas a lista aparece vazia', 'Há filtro de tipo ou severidade ativo, ou os alertas existentes são financeiros e o seu perfil não os vê.', 'Clique em "Limpar filtros" e volte para a aba "Todos"; se persistir, confirme sua permissão de ver valores.'],
        ['Resolvi o problema no contrato e o alerta continua', 'A tela ainda está com os dados carregados antes da correção.', 'Recarregue a página de Alertas para trazer os dados atualizados.'],
        ['Não encontro botão para dispensar ou marcar como lido', 'Os alertas são calculados, não cadastrados.', 'Corrija a causa no contrato; o alerta desaparece sozinho.'],
        ['Um contrato problemático não gera nenhum alerta', 'O status é Suspenso ou Encerrado, ou faltam datas no cadastro, como data de término e data base de reajuste.', 'Abra o contrato e complete as datas ou ajuste o status operacional.'],
        ['O alerta de vigência sumiu mesmo com o contrato perto de vencer', 'O status de renovação foi marcado como Renovado.', 'Confira o campo Status de Renovação na aba Vigência do contrato.'],
        ['Aparece "Vínculos RH Quebrados" mas não sei quais recursos', 'O alerta é consolidado e não aponta um contrato único.', 'Abra a tela de Recursos dos contratos e procure os recursos marcados com a etiqueta de link quebrado.'],
        ['O card de Deploy fica em "Verificando..." o tempo todo', 'A primeira checagem ainda não concluiu ou a conexão está instável.', 'Clique em "Verificar agora"; se continuar, teste a conexão e avise a equipe técnica.'],
        ['Não vejo o botão Configurar Alertas', 'Esse botão é exclusivo de C-Level e Superadmin.', 'Peça o ajuste dos prazos a um desses perfis.'],
      ]} />
    ),
  },
];

export default function HelpAlertsPage() {
  return <HelpArticle title="Alertas" description="Riscos, prazos e pendências detectados automaticamente" icon={Bell} sections={sections} />;
}
