import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Calendar,
  Pencil,
  Tag,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { useResolvedResources } from '@/hooks/useResolvedResources';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCNPJ, formatPhone, formatDate, calculateContractHealth, formatCurrency, formatPercentage } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { HealthStatus } from '@/types';

const healthLabels: Record<HealthStatus, string> = {
  saudavel: 'Saudável',
  atencao: 'Atenção',
  critico: 'Crítico',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, getContractsByClient, resources: _rawResources, settings } = useData();
  const { resolvedResources: resources } = useResolvedResources();
  const { getAllocation } = useOverheadPool();
  const { canEdit, canViewValues, userRole } = useAuth();
  
  const client = id ? getClient(id) : undefined;
  const clientContracts = id ? getContractsByClient(id) : [];
  
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground mb-4">O cliente solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/clientes')}>Voltar para Clientes</Button>
      </div>
    );
  }
  
  // Calculate health for contracts
  const contractsWithHealth = clientContracts.map(contract => {
    const health = calculateContractHealth(contract, resources, settings, [], getAllocation(contract.id).value);
    return { contract, health };
  });
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <ClientLogo
              nome={client.nomeFantasia || client.razaoSocial}
              logoUrl={client.logoUrl}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {client.nomeFantasia || client.razaoSocial}
              </h1>
              <p className="text-muted-foreground">{formatCNPJ(client.cnpj)}</p>
            </div>
          </div>
        </div>
        {canEdit && userRole !== 'lider_tribo' && (
          <Button onClick={() => navigate(`/clientes/${id}/editar`)} className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({clientContracts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dados" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Razão Social</p>
                  <p className="font-medium">{client.razaoSocial}</p>
                </div>
                {client.nomeFantasia && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nome Fantasia</p>
                    <p className="font-medium">{client.nomeFantasia}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CNPJ</p>
                  <p className="font-medium">{formatCNPJ(client.cnpj)}</p>
                </div>
                {client.inscricaoEstadual && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inscrição Estadual</p>
                    <p className="font-medium">{client.inscricaoEstadual}</p>
                  </div>
                )}
                {client.site && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={client.site} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {client.site}
                    </a>
                  </div>
                )}
                <div className="pt-2">
                  <Badge 
                    className={cn(
                      'text-sm',
                      client.segmento === 'govtech' ? 'segment-badge-gov' : 'segment-badge-private'
                    )}
                  >
                    {client.segmento === 'govtech' ? 'Govtech / Governo' : 'Iniciativa Privada'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contato Principal</p>
                  <p className="font-medium">{client.contatoPrincipal}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                    {client.email}
                  </a>
                </div>
                {client.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{formatPhone(client.telefone)}</span>
                  </div>
                )}
                {(client.cidade || client.logradouro) && (
                  <div className="flex items-start gap-2 pt-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      {client.logradouro && (
                        <p>
                          {client.logradouro}
                          {client.numero && `, ${client.numero}`}
                          {client.complemento && ` - ${client.complemento}`}
                        </p>
                      )}
                      {client.bairro && <p>{client.bairro}</p>}
                      {client.cidade && (
                        <p>{client.cidade}{client.uf && ` - ${client.uf}`}</p>
                      )}
                      {client.cep && <p className="text-muted-foreground">{client.cep}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Tags and Observations */}
          {(client.tags.length > 0 || client.observacoes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {client.observacoes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{client.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Criado em {formatDate(client.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Atualizado em {formatDate(client.updatedAt)}</span>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="contratos" className="space-y-4">
          {contractsWithHealth.length > 0 ? (
            <div className="space-y-3">
              {contractsWithHealth.map(({ contract, health }) => (
                <Card 
                  key={contract.id} 
                  className="card-elevated hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/contratos/${contract.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-1.5 h-12 rounded-full shrink-0',
                        health.status === 'saudavel' && 'bg-health-healthy',
                        health.status === 'atencao' && 'bg-health-attention',
                        health.status === 'critico' && 'bg-health-critical',
                      )} />
                      <ClientLogo
                        nome={client.nomeFantasia || client.razaoSocial}
                        logoUrl={contract.logoUrl}
                        fallbackLogoUrl={client.logoUrl}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold truncate">{contract.nome}</h3>
                          <Badge variant="secondary" className="text-xs">{contract.codigo}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Vigência: {formatDate(contract.dataInicio)} a {contract.dataFim ? formatDate(contract.dataFim) : 'Indeterminado'}
                        </p>
                      </div>
                      <div className="text-right">
                        {canViewValues ? (
                          <>
                            <p className={cn(
                              'text-lg font-bold',
                              health.margemPercentual >= 15 && 'text-health-healthy',
                              health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                              health.margemPercentual < 0 && 'text-health-critical',
                            )}>
                              {formatPercentage(health.margemPercentual)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(health.receitaMensal)}/mês
                            </p>
                          </>
                        ) : (
                          <Badge className={cn(
                            health.status === 'saudavel' && 'health-badge-healthy',
                            health.status === 'atencao' && 'health-badge-attention',
                            health.status === 'critico' && 'health-badge-critical',
                          )}>
                            {healthLabels[health.status]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-elevated">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contrato</h3>
                <p className="text-muted-foreground mb-4">Este cliente ainda não possui contratos cadastrados.</p>
                {canEdit && (
                  <Button onClick={() => navigate('/contratos/novo')} className="gap-2">
                    Criar Contrato
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
