// v2 - tutorial revisado e ampliado (agosto/2026)
import { Sparkles } from 'lucide-react';
import { Callout, DataTable, HelpArticle, HelpSection, Steps } from '@/components/help/HelpArticle';

const sections: HelpSection[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    title: 'O que é o módulo de IA e Análises',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          O módulo reúne quatro telas que ajudam a enxergar o que está acontecendo no portfólio e a
          produzir documentos com mais rapidez. Duas delas (<strong>Análise de Contratos</strong> e{' '}
          <strong>Análise de Recursos</strong>) trabalham com regras determinísticas sobre os dados já
          cadastrados no Hub: elas não inventam texto, apenas aplicam critérios fixos e mostram o
          resultado. A tela de <strong>Minutas</strong> pode usar templates ou realmente acionar a IA.
          E <strong>Fontes e Logs</strong> guarda o histórico de tudo o que a IA executou.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Análise de Contratos</strong> — riscos, reajustes e vencimentos próximos.</li>
          <li><strong>Análise de Recursos</strong> — carga da equipe, sobrecarga e ociosidade.</li>
          <li><strong>Minutas</strong> — geração de minuta de contrato e de termo de referência.</li>
          <li><strong>Fontes e Logs</strong> — auditoria das execuções, evidências e aprovação.</li>
        </ul>
        <Callout type="info">
          No alto da tela aparece o selo <strong>Simulação (Etapa 1)</strong>. Ele lembra que o módulo
          está em evolução: use os resultados como apoio à decisão, sempre com conferência humana.
        </Callout>
      </div>
    ),
  },
  {
    id: 'acesso',
    label: 'Como acessar',
    title: 'Como chegar às telas (não há item no menu lateral)',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Este é o ponto que mais gera dúvida: o módulo de IA <strong>não tem item no menu lateral</strong>.
          O acesso é feito digitando o endereço no navegador ou salvando um favorito. Depois de entrar em
          qualquer uma das telas, as demais ficam disponíveis nas abas do topo.
        </p>
        <DataTable
          headers={['Tela', 'Endereço', 'Aba correspondente']}
          rows={[
            ['Entrada do módulo', '/ai', 'Abre direto em Análise de Contratos'],
            ['Análise de Contratos', '/ai/contracts-analysis', 'Análise de Contratos'],
            ['Análise de Recursos', '/ai/resources-analysis', 'Análise de Recursos'],
            ['Minutas', '/ai/drafts', 'Minutas'],
            ['Fontes e Logs', '/ai/logs', 'Fontes e Logs'],
          ]}
        />
        <Callout type="tip">
          A aba <strong>Fontes e Logs</strong> só aparece para quem tem o submódulo liberado. Se você não
          a enxerga, veja a seção Permissões mais abaixo.
        </Callout>
      </div>
    ),
  },
  {
    id: 'analise-contratos',
    label: 'Análise de Contratos',
    title: 'Análise de Contratos',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          A tela começa vazia, com a mensagem <strong>Nenhuma análise gerada</strong>. Isso é proposital:
          a análise só roda quando você pede, para sempre usar a foto mais recente dos contratos. Clique em{' '}
          <strong>Gerar análise</strong> no canto superior direito.
        </p>
        <p className="text-sm text-muted-foreground mb-3">Depois de gerada, a tela mostra:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>
            <strong>Filtros</strong>: campo <strong>Buscar contrato ou cliente...</strong>, seletor de
            cliente, <strong>Segmento</strong> (GovTech ou Privado) e <strong>Saúde</strong> (Saudável,
            Atenção, Crítico).
          </li>
          <li>
            <strong>Quatro indicadores</strong>: <strong>Contratos críticos</strong>,{' '}
            <strong>Em atenção</strong>, <strong>Reajustes próximos (60d)</strong> e{' '}
            <strong>Vencimentos próximos (60d)</strong>.
          </li>
          <li>
            <strong>Top Recomendações</strong>: lista priorizada com o motivo e a ação sugerida para cada
            contrato.
          </li>
          <li>
            <strong>Um cartão por contrato</strong>, com <strong>Diagnóstico</strong> (o que foi observado)
            e <strong>Ações sugeridas</strong> (o que fazer), além dos botões{' '}
            <strong>Abrir contrato</strong> e <strong>Ver rateio</strong>.
          </li>
        </ul>
        <Callout type="tip">
          O botão <strong>Copiar resumo</strong>, dentro de Top Recomendações, copia o relatório em texto
          para a área de transferência — pronto para colar em um e-mail ou ata. Ele respeita os filtros
          aplicados, então filtre antes de copiar se quiser um recorte específico.
        </Callout>
      </div>
    ),
  },
  {
    id: 'analise-recursos',
    label: 'Análise de Recursos',
    title: 'Análise de Recursos Alocados',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Mesma lógica da anterior: clique em <strong>Gerar análise</strong> para montar o retrato atual da
          alocação. O objetivo é responder duas perguntas do dia a dia — quem está sobrecarregado e onde
          existe capacidade sobrando.
        </p>
        <DataTable
          headers={['Bloco', 'O que mostra']}
          rows={[
            ['Mapa de Carga por Equipe', 'Total de FTE e número de membros por equipe, com aviso quando há contratos em situação crítica.'],
            ['Sobrecarga', 'Pessoas com dedicação somada acima de 100%.'],
            ['Ociosidade', 'Pessoas com dedicação somada abaixo de 30%.'],
            ['Comitê Gestor — Mês Atual', 'Quem participa do comitê no mês corrente.'],
            ['Aniversários de Empresa — Mês Atual', 'Quantos anos de casa cada pessoa completa no mês.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          A chave <strong>Mostrar nomes</strong> troca o nome da pessoa pelo cargo. Ela já vem ligada para
          perfis administrativos e desligada para os demais — útil quando você precisa apresentar a análise
          para um público mais amplo sem expor nomes. O seletor de equipe filtra o mapa de carga e o botão{' '}
          <strong>Copiar resumo</strong> exporta o texto do que está na tela.
        </p>
      </div>
    ),
  },
  {
    id: 'minutas',
    label: 'Minutas',
    title: 'Minutas de contrato e termo de referência',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          A tela tem duas abas: <strong>Nova Minuta</strong> e <strong>Rascunhos</strong> (com o número de
          rascunhos salvos). A criação é um passo a passo.
        </p>
        <Steps
          items={[
            { title: 'Escolha o tipo', body: 'Minuta de Contrato (variante GovTech ou Privado) ou Termo de Referência.' },
            { title: 'Informe o contexto', body: 'Cliente e contrato são opcionais, mas ao escolher um contrato o sistema preenche automaticamente objeto, vigência, valores e índice de reajuste. Ative Usar documentos anexados como referência para marcar quais anexos a IA pode consultar.' },
            { title: 'Responda o questionário', body: 'Campos marcados com asterisco são os essenciais. No Termo de Referência, use Adicionar para incluir mais requisitos, entregáveis e critérios de aceitação.' },
            { title: 'Gere o texto', body: 'Gerar minuta (template) monta o documento a partir do modelo padrão, sem IA. Gerar minuta com IA aciona a inteligência artificial, que lê os documentos selecionados e escreve o texto citando as fontes.' },
            { title: 'Revise e salve', body: 'O texto abre em um editor livre. Use Copiar para levar para outro editor e Salvar rascunho para guardar no Hub. Voltar ao questionário permite ajustar respostas e gerar de novo.' },
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Quando você usa a geração com IA, a coluna da direita exibe <strong>Evidências usadas</strong>{' '}
          (documento, página e trecho que embasaram o texto) e <strong>Pendências</strong> (informações que
          faltaram). Trate as pendências como uma lista de conferência antes de enviar a minuta adiante.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Na aba <strong>Rascunhos</strong>, cada item tem <strong>Abrir</strong>,{' '}
          <strong>Duplicar</strong> (bom para criar variações a partir de uma base aprovada) e o ícone de
          lixeira para excluir.
        </p>
        <Callout type="warn">
          O botão <strong>Exportar PDF</strong> está marcado como <strong>Em breve</strong> e permanece
          desabilitado. Por enquanto, use <strong>Copiar</strong> e cole o conteúdo no editor de texto da
          sua preferência.
        </Callout>
      </div>
    ),
  },
  {
    id: 'logs',
    label: 'Fontes e Logs',
    title: 'Fontes e Logs: auditoria das execuções',
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Toda execução de IA fica registrada como um <strong>run</strong>. Esta tela existe para
          governança: saber quem pediu o quê, com quais documentos, o que saiu e se foi aprovado. Para
          perfis administrativos, ela se divide em três abas.
        </p>
        <DataTable
          headers={['Aba', 'Para que serve']}
          rows={[
            ['Runs', 'Lista das execuções, com filtros por tipo, status, aprovação e usuário.'],
            ['Extração', 'Acompanhamento da leitura dos documentos anexados: Na fila, Processando, Concluído, Falha e Sem texto, além do bloco Falhas Recentes.'],
            ['Templates', 'Modelos usados nas minutas, com a versão ativa, o histórico de versões e a edição do texto.'],
          ]}
        />
        <p className="text-sm text-muted-foreground mb-3">
          Na tabela de <strong>Runs</strong> as colunas são <strong>Data</strong>, <strong>Tipo</strong>,{' '}
          <strong>Usuário</strong>, <strong>Status</strong>, <strong>Aprovação</strong>,{' '}
          <strong>Docs</strong> (documentos internos usados), <strong>Ext.</strong> (fontes externas) e{' '}
          <strong>Ações</strong>. Clique em qualquer linha para abrir o painel lateral com o detalhe:
          resumo (usuário, modelo, versão do template), <strong>Entrada (Input)</strong>,{' '}
          <strong>Evidências Internas</strong>, <strong>Fontes Externas</strong>,{' '}
          <strong>Saída (Output)</strong> e <strong>Pendências</strong>.
        </p>
        <p className="text-sm text-muted-foreground mb-3">No painel de detalhe, perfis administrativos podem:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li><strong>Aprovar</strong> ou <strong>Rejeitar</strong> o run (a rejeição permite registrar uma justificativa).</li>
          <li><strong>Exportar pacote</strong> — gera o arquivo com o run e as evidências, para anexar a um processo.</li>
          <li><strong>Replay</strong> — reexecuta a mesma entrada e cria um novo run marcado como <strong>replay</strong>, útil para comparar resultados. Disponível apenas para runs de minuta.</li>
        </ul>
        <p className="text-sm text-muted-foreground mb-3">
          O botão <strong>Reindexar documentos</strong>, no topo da tela, manda o sistema ler os anexos que
          ainda não foram processados. É o passo a executar quando a IA não encontra o conteúdo de um
          documento recém-enviado.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Em <strong>Templates</strong>, o botão <strong>Editar</strong> abre o modelo em Markdown com os
          campos entre chaves. Ao salvar, marque <strong>Publicar como nova versão</strong> para preservar o
          modelo anterior — assim os documentos antigos continuam rastreáveis à versão com que foram gerados.
        </p>
      </div>
    ),
  },
  {
    id: 'permissoes',
    label: 'Permissões',
    title: 'Permissões: quem pode o quê',
    content: (
      <div>
        <DataTable
          headers={['Ação', 'Quem pode']}
          rows={[
            ['Abrir Análise de Contratos, Análise de Recursos e Minutas', 'Perfis com o módulo IA / Análises liberado. Por padrão: Superadmin, C-Level e Demo.'],
            ['Abrir a aba Fontes e Logs', 'Somente Superadmin e C-Level (o submódulo IA Logs é restrito a esses dois perfis).'],
            ['Aprovar ou rejeitar um run', 'Superadmin e C-Level.'],
            ['Exportar pacote e Replay', 'Superadmin e C-Level.'],
            ['Abas Extração e Templates e o botão Reindexar documentos', 'Superadmin e C-Level.'],
            ['Filtrar os runs por usuário', 'Superadmin e C-Level. Os demais veem os filtros de tipo, status e aprovação.'],
            ['Ver nomes na Análise de Recursos', 'Todos podem ligar a chave Mostrar nomes; ela já vem ligada para Superadmin e C-Level.'],
          ]}
        />
        <Callout type="info">
          A liberação do módulo é feita em <strong>Setup</strong> → <strong>Perfis</strong>. Se a sua área
          precisa de acesso, peça ao administrador do Hub — não existe autoatendimento aqui.
        </Callout>
      </div>
    ),
  },
  {
    id: 'boas-praticas',
    label: 'Boas práticas',
    title: 'Boas práticas e limites',
    content: (
      <div>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
          <li>
            <strong>Dado ruim, análise ruim.</strong> As análises leem o que está cadastrado em contratos,
            clientes e RH. Datas de vigência, valores e alocações desatualizados produzem recomendações
            desatualizadas.
          </li>
          <li>
            <strong>Minuta gerada não é minuta aprovada.</strong> Todo texto produzido é um ponto de
            partida e precisa de revisão jurídica antes de sair da BNP.
          </li>
          <li>
            <strong>Confira as evidências.</strong> Quando a IA cita um documento, o trecho usado aparece na
            lateral. Ler esses trechos é a forma mais rápida de checar se a conclusão faz sentido.
          </li>
          <li>
            <strong>Fontes externas são referência.</strong> O próprio detalhe do run avisa que elas não
            substituem análise jurídica.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'problemas-comuns',
    label: 'Problemas comuns',
    title: 'Problemas comuns',
    content: (
      <DataTable
        headers={['Sintoma', 'Causa provável', 'Solução']}
        rows={[
          ['Não encontro o módulo no menu lateral', 'O módulo de IA não possui item de menu.', 'Acesse pelo endereço /ai no navegador e salve um favorito. As demais telas ficam nas abas do topo.'],
          ['A tela mostra "Nenhuma análise gerada"', 'A análise não roda sozinha, para sempre usar dados atuais.', 'Clique em "Gerar análise" no canto superior direito.'],
          ['A aba "Fontes e Logs" não aparece', 'Seu perfil não tem o submódulo IA Logs, restrito a Superadmin e C-Level.', 'Solicite a liberação ao administrador do Hub.'],
          ['Não vejo os botões Aprovar, Exportar pacote ou as abas Extração e Templates', 'Essas ações são exclusivas de Superadmin e C-Level.', 'Peça a um administrador que execute a ação ou solicite a mudança de perfil.'],
          ['A minuta gerada com IA veio sem evidências', 'Nenhum documento foi marcado como referência ou os anexos ainda não foram lidos pelo sistema.', 'Ative "Usar documentos anexados como referência", marque os arquivos e peça a um administrador para usar "Reindexar documentos".'],
          ['A lista de Pendências da minuta veio grande', 'Campos importantes do questionário ficaram em branco.', 'Volte ao questionário, preencha os campos marcados com asterisco e gere novamente.'],
          ['O botão "Exportar PDF" está desabilitado', 'A exportação em PDF está marcada como "Em breve".', 'Use "Copiar" e cole o texto no editor de sua preferência.'],
          ['Um documento aparece como "Falha" na aba Extração', 'O arquivo não pôde ser lido (imagem sem texto, PDF protegido ou arquivo corrompido).', 'Veja a mensagem em "Falhas Recentes", reenvie o documento em formato legível e reindexe.'],
          ['A lista de runs está vazia', 'Ainda não houve execução registrada de IA.', 'Gere uma minuta com "Gerar minuta com IA"; o run aparece na lista em seguida.'],
          ['Não vejo o botão Replay em um run', 'Replay existe apenas para runs de minuta de contrato e de termo de referência.', 'Para análises, basta gerar novamente na própria tela.'],
        ]}
      />
    ),
  },
];

export default function HelpAIPage() {
  return (
    <HelpArticle
      title="IA / Análises"
      description="Análises de contratos e recursos, minutas e rastreabilidade das execuções"
      icon={Sparkles}
      sections={sections}
    />
  );
}
