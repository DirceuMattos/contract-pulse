import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  Eye,
  MoreHorizontal,
  Activity,
  Power,
  PowerOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { SystemUser } from '@/types/systemUser';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { UserFormDialog } from '@/components/users/UserFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';

const roleLabels: Record<UserRole, string> = {
  'c-level': 'C-Level / Admin',
  'intermediario': 'Intermediário',
  'leitor': 'Leitor',
  'comercial': 'Comercial',
  'lider_tribo': 'Líder de Tribo',
  'juridico': 'Jurídico',
  'rh': 'RH',
  'administrativo': 'Administrativo',
  'demo': 'Demonstração',
  'superadmin': 'Super Admin',
  'coordenacao_suporte': 'Coordenação Suporte',
  'projetos_produtos': 'Projetos-Produtos',
};

const roleIcons: Record<UserRole, React.ElementType> = {
  'c-level': ShieldCheck,
  'intermediario': Shield,
  'leitor': Eye,
  'comercial': Briefcase,
  'lider_tribo': Shield,
  'juridico': Shield,
  'rh': Shield,
  'administrativo': Shield,
  'demo': Eye,
  'superadmin': ShieldCheck,
  'coordenacao_suporte': Shield,
  'projetos_produtos': Shield,
};

const roleColors: Record<UserRole, string> = {
  'c-level': 'bg-primary/10 text-primary border-primary/20',
  'intermediario': 'bg-accent/50 text-accent-foreground border-accent',
  'leitor': 'bg-muted text-muted-foreground border-border',
  'comercial': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'lider_tribo': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'juridico': 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  'rh': 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  'administrativo': 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  'demo': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  'superadmin': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  'coordenacao_suporte': 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  'projetos_produtos': 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
};

function UsersPageInner() {
  const { user: currentUser, canEdit } = useAuth();
  const { users, deleteUser, toggleUserStatus, getMaintenanceStatus, setMaintenanceMode } = useSystemUsers();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'status' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceLockedCount, setMaintenanceLockedCount] = useState(0);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    getMaintenanceStatus().then((status) => {
      setMaintenanceEnabled(status.enabled);
      setMaintenanceLockedCount(status.lockedCount);
    });
  }, [getMaintenanceStatus, isSuperAdmin]);

  const handleSort = (col: 'name' | 'role' | 'status') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: 'name' | 'role' | 'status' }) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const sortedUsers = React.useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort((a, b) => {
      if (sortBy) {
        let av = '';
        let bv = '';
        if (sortBy === 'name') { av = a.name; bv = b.name; }
        else if (sortBy === 'role') { av = roleLabels[a.role]; bv = roleLabels[b.role]; }
        else if (sortBy === 'status') { av = a.active ? '1' : '0'; bv = b.active ? '1' : '0'; }
        const cmp = av.localeCompare(bv, 'pt-BR');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      // Padrão: ordem alfabética por nome
      return a.name.localeCompare(b.name, 'pt-BR');
    });
    return arr;
  }, [filteredUsers, sortBy, sortDir]);

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleDelete = (user: SystemUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Você não pode excluir a si mesmo.');
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const success = await deleteUser(userToDelete.id);
      if (success) {
        toast.success(`${userToDelete.name} foi removido do sistema.`);
      } else {
        toast.error('Não foi possível excluir o usuário.');
      }
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleToggleStatus = async (user: SystemUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Você não pode desativar a si mesmo.');
      return;
    }
    
    const success = await toggleUserStatus(user.id);
    if (success) {
      toast.success(`${user.name} foi ${user.active ? 'desativado' : 'ativado'}.`);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!isSuperAdmin) return;
    setMaintenanceBusy(true);
    try {
      const result = await setMaintenanceMode(!maintenanceEnabled);
      if (!result) {
        toast.error('Não foi possível alterar o modo manutenção.');
        return;
      }

      const nextStatus = await getMaintenanceStatus();
      setMaintenanceEnabled(nextStatus.enabled);
      setMaintenanceLockedCount(nextStatus.lockedCount);

      if (result.enabled) {
        toast.success(`Sistema em manutenção. ${result.lockedCount || 0} usuário(s) desativado(s).`);
      } else {
        toast.success(`Sistema reativado. ${result.unlockedCount || 0} usuário(s) reativado(s).`);
      }
    } finally {
      setMaintenanceBusy(false);
      setMaintenanceDialogOpen(false);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingUser(null);
  };

  // Only c-level or superadmin can access this page
  if (currentUser?.role !== 'c-level' && currentUser?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Acesso Restrito
          </h2>
          <p className="text-muted-foreground">
            Apenas usuários C-Level podem gerenciar usuários do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuários do Sistema"
        description="Gerencie os usuários e suas permissões de acesso"
        animated={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <Button
                type="button"
                variant={maintenanceEnabled ? 'destructive' : 'outline'}
                onClick={() => setMaintenanceDialogOpen(true)}
                disabled={maintenanceBusy}
                className="gap-2"
              >
                {maintenanceEnabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                {maintenanceEnabled ? 'Reativar sistema' : 'Modo manutenção'}
              </Button>
            )}
            <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Usuário
            </Button>
          </div>
        }
      />

      {isSuperAdmin && maintenanceEnabled && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Sistema em manutenção: {maintenanceLockedCount} usuário(s) bloqueado(s) por esta ação.
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.active).length}
              </p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => !u.active).length}
              </p>
              <p className="text-sm text-muted-foreground">Inativos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'c-level').length}
              </p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Usuário
                  <SortIcon col="name" />
                </button>
              </TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('role')}
                  className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Perfil
                  <SortIcon col="role" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('status')}
                  className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Status
                  <SortIcon col="status" />
                </button>
              </TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => {
                const RoleIcon = roleIcons[user.role];
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                         {user.id === currentUser?.id && (
                            <span className="text-xs text-primary">Você</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[user.role]}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            {user.active ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/usuarios/logs?userId=${user.id}`)}>
                            <Activity className="w-4 h-4 mr-2" />
                            Logs de acessos
                          </DropdownMenuItem>
                          {user.id !== currentUser?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Form Dialog */}
      <UserFormDialog
        open={formOpen}
        onClose={handleCloseForm}
        editingUser={editingUser}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Excluir usuário?"
        description={`Tem certeza que deseja excluir ${userToDelete?.name}? Esta ação não pode ser desfeita.`}
      />
      <AlertDialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {maintenanceEnabled ? 'Reativar acesso ao sistema?' : 'Colocar sistema em manutenção?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {maintenanceEnabled
                ? 'Os usuários desativados pelo modo manutenção serão reativados. Usuários que já estavam inativos antes permanecerão inativos.'
                : 'Todos os usuários ativos serão desativados, exceto você. Use esta opção apenas durante janelas de manutenção.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={maintenanceBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleMaintenance} disabled={maintenanceBusy}>
              {maintenanceEnabled ? 'Reativar sistema' : 'Ativar manutenção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { AccessGuard as __AccessGuard } from '@/components/layout/AccessGuard';
export default function UsersPage() {
  return (
    <__AccessGuard moduleKey="USERS_ADMIN">
      <UsersPageInner />
    </__AccessGuard>
  );
}
