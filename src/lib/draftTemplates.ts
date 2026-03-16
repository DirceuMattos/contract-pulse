import { DraftContractAnswers, DraftTRAnswers, DraftDocReference } from '@/types/aiDrafts';

function buildClausulas(answers: DraftContractAnswers): string {
  const sections: string[] = [];
  if (answers.clausulas.confidencialidade) {
    sections.push(`CLÁUSULA — CONFIDENCIALIDADE
As partes se obrigam a manter sigilo sobre todas as informações confidenciais trocadas em razão deste contrato, pelo prazo de 5 (cinco) anos após o término da vigência.`);
  }
  if (answers.clausulas.lgpd) {
    sections.push(`CLÁUSULA — PROTEÇÃO DE DADOS (LGPD)
As partes se comprometem a cumprir a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), adotando medidas técnicas e administrativas adequadas para proteger os dados pessoais tratados no âmbito deste contrato.`);
  }
  if (answers.clausulas.multaPenalidades) {
    sections.push(`CLÁUSULA — MULTAS E PENALIDADES
O descumprimento das obrigações contratuais sujeitará a parte infratora ao pagamento de multa de 10% (dez por cento) sobre o valor mensal do contrato, sem prejuízo de perdas e danos.`);
  }
  if (answers.clausulas.rescisao) {
    sections.push(`CLÁUSULA — RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação por escrito com antecedência mínima de 30 (trinta) dias.`);
  }
  if (answers.clausulas.sla && answers.slaResumo) {
    sections.push(`CLÁUSULA — ACORDO DE NÍVEL DE SERVIÇO (SLA)
${answers.slaResumo}`);
  }
  return sections.join('\n\n');
}

function buildReferences(docs: DraftDocReference[]): string {
  if (docs.length === 0) return '';
  return `\n\nREFERÊNCIAS\n${docs.map((d, i) => `${i + 1}. ${d.fileName} (${d.descriptionType}, ${new Date(d.uploadedAt).toLocaleDateString('pt-BR')})`).join('\n')}`;
}

// ─── Contract Templates ──────────────────────────────────────────

export function generateContractGovtech(answers: DraftContractAnswers, docs: DraftDocReference[]): string {
  return `CONTRATO ADMINISTRATIVO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: ${answers.contratante || '[CONTRATANTE]'}
CONTRATADA: ${answers.contratada || '[CONTRATADA]'}

CLÁUSULA PRIMEIRA — DO OBJETO
${answers.objeto || '[DESCREVER OBJETO]'}

CLÁUSULA SEGUNDA — DA VIGÊNCIA
O presente contrato terá vigência de ${answers.vigenciaInicio || '[DATA INÍCIO]'} a ${answers.vigenciaFim || '[DATA FIM]'}${answers.renovacaoAutomatica ? ', podendo ser prorrogado nos termos do art. 57 da Lei nº 8.666/93' : ''}.

CLÁUSULA TERCEIRA — DO VALOR E PAGAMENTO
Valor mensal: R$ ${answers.valorMensal || '[VALOR MENSAL]'}
${answers.valorTotal ? `Valor total estimado: R$ ${answers.valorTotal}` : ''}

CLÁUSULA QUARTA — DO REAJUSTE
O contrato será reajustado ${answers.reajustePeriodicidade === 'anual' ? 'anualmente' : answers.reajustePeriodicidade === 'mensal' ? 'mensalmente' : answers.reajustePeriodicidade}, pelo índice ${answers.reajusteIndice || 'IPCA'}.

${buildClausulas(answers)}

${answers.observacoes ? `OBSERVAÇÕES\n${answers.observacoes}` : ''}

Local e data: _______________, ___/___/______

_________________________________
CONTRATANTE

_________________________________
CONTRATADA${buildReferences(docs)}`;
}

export function generateContractPrivado(answers: DraftContractAnswers, docs: DraftDocReference[]): string {
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado:

CONTRATANTE: ${answers.contratante || '[CONTRATANTE]'}
CONTRATADA: ${answers.contratada || '[CONTRATADA]'}

Têm entre si justo e contratado o seguinte:

1. OBJETO
${answers.objeto || '[DESCREVER OBJETO]'}

2. VIGÊNCIA
Este contrato terá vigência de ${answers.vigenciaInicio || '[DATA INÍCIO]'} a ${answers.vigenciaFim || '[DATA FIM]'}${answers.renovacaoAutomatica ? ', renovando-se automaticamente por períodos iguais e sucessivos, salvo manifestação contrária com 30 dias de antecedência' : ''}.

3. VALOR E CONDIÇÕES DE PAGAMENTO
Valor mensal: R$ ${answers.valorMensal || '[VALOR MENSAL]'}
${answers.valorTotal ? `Valor total: R$ ${answers.valorTotal}` : ''}
Pagamento até o 5º dia útil do mês subsequente à prestação dos serviços.

4. REAJUSTE
O valor será reajustado ${answers.reajustePeriodicidade === 'anual' ? 'anualmente' : answers.reajustePeriodicidade}, com base no índice ${answers.reajusteIndice || 'IPCA'}.

${buildClausulas(answers)}

${answers.observacoes ? `OBSERVAÇÕES\n${answers.observacoes}` : ''}

E por estarem assim justos e contratados, assinam o presente em 2 (duas) vias.

Local e data: _______________, ___/___/______

_________________________________
CONTRATANTE

_________________________________
CONTRATADA${buildReferences(docs)}`;
}

// ─── TR Templates ────────────────────────────────────────────────

function formatList(items: string[]): string {
  return items.filter(i => i.trim()).map((item, i) => `${i + 1}. ${item}`).join('\n');
}

export function generateTRPadrao(answers: DraftTRAnswers, docs: DraftDocReference[]): string {
  return `TERMO DE REFERÊNCIA

1. CONTEXTO E JUSTIFICATIVA
${answers.contextoJustificativa || '[CONTEXTO]'}

2. OBJETO E ESCOPO
${answers.objetoEscopo || '[OBJETO]'}

3. REQUISITOS FUNCIONAIS
${formatList(answers.requisitosFuncionais) || '[REQUISITOS FUNCIONAIS]'}

4. REQUISITOS NÃO FUNCIONAIS
${formatList(answers.requisitosNaoFuncionais) || '[REQUISITOS NÃO FUNCIONAIS]'}

5. ENTREGÁVEIS
${formatList(answers.entregaveis) || '[ENTREGÁVEIS]'}

6. PRAZO E CRONOGRAMA
${answers.prazoCronograma || '[PRAZO]'}

7. CRITÉRIOS DE ACEITAÇÃO
${formatList(answers.criteriosAceitacao) || '[CRITÉRIOS]'}

8. CONDIÇÕES DE EXECUÇÃO
${answers.condicoesExecucao || '[CONDIÇÕES]'}

${answers.observacoes ? `9. OBSERVAÇÕES\n${answers.observacoes}` : ''}${buildReferences(docs)}`;
}

export function generateTRCompleto(answers: DraftTRAnswers, docs: DraftDocReference[]): string {
  return `TERMO DE REFERÊNCIA — VERSÃO COMPLETA

1. INTRODUÇÃO E CONTEXTUALIZAÇÃO
${answers.contextoJustificativa || '[CONTEXTO]'}

2. DEFINIÇÃO DO OBJETO
${answers.objetoEscopo || '[OBJETO]'}

3. ESPECIFICAÇÕES TÉCNICAS

3.1. Requisitos Funcionais
${formatList(answers.requisitosFuncionais) || '[REQUISITOS FUNCIONAIS]'}

3.2. Requisitos Não Funcionais
${formatList(answers.requisitosNaoFuncionais) || '[REQUISITOS NÃO FUNCIONAIS]'}

4. ENTREGÁVEIS E MARCOS
${formatList(answers.entregaveis) || '[ENTREGÁVEIS]'}

5. CRONOGRAMA DE EXECUÇÃO
${answers.prazoCronograma || '[PRAZO]'}

6. CRITÉRIOS DE ACEITAÇÃO E QUALIDADE
${formatList(answers.criteriosAceitacao) || '[CRITÉRIOS]'}

7. OBRIGAÇÕES E CONDIÇÕES DE EXECUÇÃO
${answers.condicoesExecucao || '[CONDIÇÕES]'}

8. GESTÃO E FISCALIZAÇÃO
A fiscalização do contrato será exercida por servidor designado pela CONTRATANTE.

9. DISPOSIÇÕES GERAIS
${answers.observacoes || 'Casos omissos serão resolvidos de comum acordo entre as partes.'}${buildReferences(docs)}`;
}
