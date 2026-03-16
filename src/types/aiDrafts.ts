export type DraftType = 'contract' | 'tr';
export type ContractVariant = 'govtech' | 'privado';
export type DraftStatus = 'rascunho' | 'finalizado';

export interface DraftContractAnswers {
  contratante: string;
  contratada: string;
  objeto: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  valorMensal: string;
  valorTotal: string;
  reajusteIndice: string;
  reajustePeriodicidade: string;
  renovacaoAutomatica: boolean;
  clausulas: {
    confidencialidade: boolean;
    lgpd: boolean;
    multaPenalidades: boolean;
    rescisao: boolean;
    sla: boolean;
  };
  slaResumo: string;
  observacoes: string;
}

export interface DraftTRAnswers {
  contextoJustificativa: string;
  objetoEscopo: string;
  requisitosFuncionais: string[];
  requisitosNaoFuncionais: string[];
  entregaveis: string[];
  prazoCronograma: string;
  criteriosAceitacao: string[];
  condicoesExecucao: string;
  observacoes: string;
}

export interface DraftDocReference {
  id: string;
  fileName: string;
  descriptionType: string;
  uploadedAt: string;
}

export interface Draft {
  id: string;
  type: DraftType;
  variant?: ContractVariant;
  clientId?: string;
  clientName?: string;
  contractId?: string;
  contractName?: string;
  answers: DraftContractAnswers | DraftTRAnswers;
  documentReferences: DraftDocReference[];
  generatedText: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export const emptyContractAnswers: DraftContractAnswers = {
  contratante: '',
  contratada: '',
  objeto: '',
  vigenciaInicio: '',
  vigenciaFim: '',
  valorMensal: '',
  valorTotal: '',
  reajusteIndice: 'IPCA',
  reajustePeriodicidade: 'anual',
  renovacaoAutomatica: false,
  clausulas: { confidencialidade: true, lgpd: true, multaPenalidades: true, rescisao: true, sla: false },
  slaResumo: '',
  observacoes: '',
};

export const emptyTRAnswers: DraftTRAnswers = {
  contextoJustificativa: '',
  objetoEscopo: '',
  requisitosFuncionais: [''],
  requisitosNaoFuncionais: [''],
  entregaveis: [''],
  prazoCronograma: '',
  criteriosAceitacao: [''],
  condicoesExecucao: '',
  observacoes: '',
};
