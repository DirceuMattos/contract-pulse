import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatCNPJ, formatPhone } from '@/lib/calculations';
import { PageHeader } from '@/components/layout/PageHeader';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const cardColors = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-pink-500',
  'border-l-cyan-500',
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const { clients, contracts, deleteClient } = useData();
  const { canEdit, canCreate, canDelete, userRole } = useAuth();
  
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
      client.nomeFantasia?.toLowerCase().includes(search.toLowerCase()) ||
      client.cnpj.includes(search);
    
    const matchesSegment = segmentFilter === 'all' || client.segmento === segmentFilter;
    
    return matchesSearch && matchesSegment;
  });
  
  // Get contract count for each client
  const getContractCount = (clientId: string) => 
    contracts.filter(c => c.clientId === clientId && (c.status === 'operacao' || c.status === 'implantacao')).length;
  
  const handleDelete = () => {
    if (deleteId) {
      deleteClient(deleteId);
      toast.success('Cliente excluído com sucesso');
      setDeleteId(null);
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <PageHeader
        title="Clientes"
        description="Gerencie sua base de clientes"
        actions={canCreate ? (
          <Button onClick={() => navigate('/clientes/novo')} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        ) : undefined}
      />
      
      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            <SelectItem value="govtech">Govtech / Governo</SelectItem>
            <SelectItem value="privado">Iniciativa Privada</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>
      
      {/* Results count */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-muted-foreground">
          <span className="text-lg font-bold text-foreground">{filteredClients.length}</span>{' '}
          cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </p>
      </motion.div>
      
      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredClients.map((client, index) => {
            const contractCount = getContractCount(client.id);
            
            return (
              <motion.div key={client.id} variants={itemVariants}>
                <Card className={cn(
                  "card-elevated hover:shadow-md transition-shadow border-l-4",
                  cardColors[index % cardColors.length]
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ClientLogo nome={client.nomeFantasia || client.razaoSocial} logoUrl={client.logoUrl} size="md" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {client.nomeFantasia || client.razaoSocial}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatCNPJ(client.cnpj)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {canEdit && userRole !== 'lider_tribo' && (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}/editar`)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteId(client.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {client.cidade && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{client.cidade}, {client.uf}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.telefone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{formatPhone(client.telefone)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-xs',
                          client.segmento === 'govtech' ? 'segment-badge-gov' : 'segment-badge-private'
                        )}
                      >
                        {client.segmento === 'govtech' ? 'Govtech' : 'Privado'}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{contractCount} contrato{contractCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {search || segmentFilter !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search || segmentFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Comece cadastrando seu primeiro cliente'
                }
              </p>
              {canCreate && !search && segmentFilter === 'all' && (
                <Button onClick={() => navigate('/clientes/novo')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Cadastrar Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir cliente?"
        description="Esta ação não pode ser desfeita. O cliente e todos os seus contratos serão removidos permanentemente."
      />
    </motion.div>
  );
}
