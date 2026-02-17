import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { ContractForm } from '@/components/forms/ContractForm';
import { ContractFormData } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ContractFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getContract, addContract, updateContract } = useData();
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!id;
  const contract = id ? getContract(id) : undefined;

  // Redirect if not authorized or contract not found when editing
  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso negado</h2>
        <p className="text-muted-foreground mb-4">Você não tem permissão para criar ou editar contratos.</p>
        <Button onClick={() => navigate('/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }

  if (isEditing && !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Contrato não encontrado</h2>
        <p className="text-muted-foreground mb-4">O contrato solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }

  const handleSubmit = async (data: ContractFormData) => {
    setIsLoading(true);
    
    try {
      const contractData = {
        codigo: data.codigo,
        nome: data.nome,
        clientId: data.clientId,
        tipo: data.tipo,
        segmento: data.segmento,
        status: data.status,
        unidade: data.unidade,
        centroCusto: data.centroCusto,
        tags: data.tags,
        govSphere: data.govSphere,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        renovacaoAutomatica: data.renovacaoAutomatica,
        periodicidadeRenovacao: data.periodicidadeRenovacao,
        statusRenovacao: data.statusRenovacao,
        renewalTermMonths: data.renewalTermMonths,
        renewalBaseDate: data.renewalBaseDate,
        indiceReajuste: data.indiceReajuste,
        dataBaseReajuste: data.dataBaseReajuste,
        percentualFixo: data.percentualFixo,
        alertaReajusteDias: data.alertaReajusteDias,
        modeloReceita: data.modeloReceita,
        valorMensalReferencia: data.valorMensalReferencia,
        valorTotalContrato: data.valorTotalContrato,
        moeda: data.moeda,
        observacoesFinanceiras: data.observacoesFinanceiras,
        objeto: data.objeto,
        escopoOperacional: data.escopoOperacional,
        slas: data.slas,
        riscosPendencias: data.riscosPendencias,
        responsavelInterno: data.responsavelInterno,
        responsavelCS: data.responsavelCS,
        responsavelComercial: data.responsavelComercial,
      };

      if (isEditing && contract) {
        updateContract(contract.id, contractData);
        toast({
          title: 'Contrato atualizado',
          description: 'As informações do contrato foram salvas com sucesso.',
        });
        navigate(`/contratos/${contract.id}`);
      } else {
        const newContract = await addContract(contractData);
        toast({
          title: 'Contrato criado',
          description: 'O novo contrato foi cadastrado com sucesso.',
        });
        navigate(`/contratos/${newContract.id}`);
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o contrato. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && contract) {
      navigate(`/contratos/${contract.id}`);
    } else {
      navigate('/contratos');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? `Editando: ${contract?.nome}` 
              : 'Preencha os dados para cadastrar um novo contrato'
            }
          </p>
        </div>
      </div>

      {/* Form */}
      <ContractForm
        contract={contract}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
