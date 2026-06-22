import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Mail, Shield, Search, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react';
import { SystemUser, SystemUserFormData } from '@/types/systemUser';
import { UserRole } from '@/types';
import { ModuleKey, MODULE_CATALOG, getDefaultModuleAccess, isRoleAllowedForModule } from '@/types/moduleAccess';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleFormValidationError } from '@/lib/formValidation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const passwordSchema = z.string()
  .min(12, 'Senha deve ter pelo menos 12 caracteres')
  .max(100)
  .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Deve conter pelo menos um caractere especial');

const userFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido').max(255),
  password: passwordSchema,
  role: z.enum(['c-level', 'intermediario', 'leitor', 'comercial', 'lider_tribo', 'juridico', 'rh', 'administrativo', 'demo', 'superadmin'] as const),
  active: z.boolean(),
});

const userEditSchema = userFormSchema.extend({
  password: passwordSchema.optional().or(z.literal('')),
});

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingUser: SystemUser | null;
}

const roleLabels: Record<UserRole, string> = {
  'c-level': 'C-Level / Admin',
  'intermediario': 'Intermediário',
  'leitor': 'Leitor',
  'comercial': 'Comercial',
  'lider_tribo': 'Líder de Tribo',
  'juridico': 'Jurídico',
  'rh': 'RH',
  'administrativo': 'Administrativo',
  'demo': 'Demo',
  'superadmin': 'Super Admin',
};

const roleDescriptions: Record<UserRole, string> = {
  'c-level': 'Acesso total com visualização de valores financeiros e gestão de usuários',
  'intermediario': 'Edição de dados operacionais sem visualização de valores',
  'leitor': 'Apenas visualização de dados sem valores financeiros',
  'comercial': 'Visão de contratos, squads e dashboard sem valores financeiros',
  'lider_tribo': 'Visão de squads e dashboard sem valores financeiros',
  'juridico': 'Visão de contratos, squads e dashboard sem valores financeiros',
  'rh': 'Visão de RH, squads e dashboard sem valores financeiros',
  'administrativo': 'Acesso controlado por flags de módulo',
  'demo': 'Acesso de demonstração apenas para visualização',
  'superadmin': 'Acesso total irrestrito a todos os módulos do sistema',
};

export function UserFormDialog({ open, onClose, editingUser }: UserFormDialogProps) {
  const { addUser, updateUser, getUserByEmail } = useSystemUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isEditing = !!editingUser;

  const [moduleAccess, setModuleAccess] = useState<Record<ModuleKey, boolean>>(() =>
    getDefaultModuleAccess('leitor')
  );
  const [moduleSearch, setModuleSearch] = useState('');

  const form = useForm<SystemUserFormData>({
    resolver: zodResolver(isEditing ? userEditSchema : userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'leitor',
      active: true,
    },
  });

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        email: editingUser.email,
        password: '',
        role: editingUser.role,
        active: editingUser.active,
      });
      setModuleAccess(editingUser.moduleAccess ?? getDefaultModuleAccess(editingUser.role));
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'leitor',
        active: true,
      });
      setModuleAccess(getDefaultModuleAccess('leitor'));
    }
    setModuleSearch('');
  }, [editingUser, form]);

  // When role changes, reset moduleAccess to the default for the new role
  useEffect(() => {
    setModuleAccess(getDefaultModuleAccess(watchedRole));
  }, [watchedRole]);

  const toggleModule = (key: ModuleKey, value: boolean) => {
    // Anti-lockout: prevent admin from disabling their own USERS_ADMIN
    if (key === 'USERS_ADMIN' && isEditing && editingUser?.id === currentUser?.id && !value) {
      return;
    }
    setModuleAccess(prev => ({ ...prev, [key]: value }));
  };

  const activateAll = () => {
    const updated = { ...moduleAccess };
    for (const mod of MODULE_CATALOG) {
      if (isRoleAllowedForModule(watchedRole, mod.key)) {
        updated[mod.key] = true;
      }
    }
    setModuleAccess(updated);
  };

  const deactivateAll = () => {
    const updated = { ...moduleAccess };
    for (const mod of MODULE_CATALOG) {
      // Anti-lockout
      if (mod.key === 'USERS_ADMIN' && isEditing && editingUser?.id === currentUser?.id) continue;
      updated[mod.key] = false;
    }
    setModuleAccess(updated);
  };

  const resetToDefaults = () => {
    setModuleAccess(getDefaultModuleAccess(watchedRole));
  };

  const filteredModules = MODULE_CATALOG.filter(mod =>
    mod.label.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    mod.description.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const onSubmit = async (data: SystemUserFormData) => {
    if (isEditing) {
      const updateData: Partial<SystemUserFormData> = {
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.active,
        moduleAccess,
      };
      
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }

      try {
        await updateUser(editingUser.id, updateData);
        toast({
          title: 'Usuário atualizado',
          description: `${data.name} foi atualizado com sucesso.`,
        });
        onClose();
      } catch (e: any) {
        toast({
          title: 'Erro ao atualizar',
          description: e?.message || 'Não foi possível atualizar o usuário.',
          variant: 'destructive',
        });
      }
    } else {
      const existingUser = getUserByEmail(data.email);
      if (existingUser) {
        form.setError('email', { message: 'Este e-mail já está cadastrado' });
        return;
      }

      const dataWithAccess = { ...data, moduleAccess };
      const newUser = await addUser(dataWithAccess, currentUser?.id);
      
      if (newUser) {
        toast({
          title: 'Usuário criado',
          description: `${data.name} foi cadastrado com sucesso.`,
        });
        onClose();
      } else {
        toast({
          title: 'Erro ao criar usuário',
          description: 'Não foi possível criar o usuário.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do usuário abaixo.'
              : 'Preencha os dados para cadastrar um novo usuário no sistema.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleFormValidationError)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="João Silva" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="joao@empresa.com.br" 
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Mínimo 12 caracteres com maiúscula, minúscula, número e caractere especial
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil de acesso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecione o perfil" />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.entries(roleLabels) as [UserRole, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {roleDescriptions[field.value]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Usuário ativo</FormLabel>
                    <FormDescription>
                      Usuários inativos não podem fazer login
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Module Permissions Table */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissões por Módulo
                </h4>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={activateAll} className="gap-1">
                  <ToggleRight className="w-3 h-3" />
                  Ativar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deactivateAll} className="gap-1">
                  <ToggleLeft className="w-3 h-3" />
                  Desativar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetToDefaults} className="gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Restaurar padrão
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar módulo..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="pl-10 h-8 text-sm"
                />
              </div>

              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Módulo</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Descrição</TableHead>
                      <TableHead className="text-xs w-[80px] text-center">Acesso</TableHead>
                      <TableHead className="text-xs w-[120px]">Restrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModules.map((mod) => {
                      const roleAllowed = isRoleAllowedForModule(watchedRole, mod.key);
                      const isSelfAdmin = isEditing && editingUser?.id === currentUser?.id && mod.key === 'USERS_ADMIN';
                      const isDisabled = !roleAllowed || isSelfAdmin;

                      return (
                        <TableRow key={mod.key}>
                          <TableCell className="text-sm font-medium py-2">
                            <div className="flex items-center gap-1.5">
                              {mod.isSubmodule && <span className="text-muted-foreground text-xs">└</span>}
                              {mod.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2 hidden sm:table-cell">
                            {mod.description}
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex">
                                  <Switch
                                    checked={roleAllowed ? (moduleAccess[mod.key] ?? true) : false}
                                    onCheckedChange={(val) => toggleModule(mod.key, val)}
                                    disabled={isDisabled}
                                  />
                                </div>
                              </TooltipTrigger>
                              {isDisabled && (
                                <TooltipContent>
                                  {!roleAllowed
                                    ? 'Bloqueado pelo papel do usuário'
                                    : 'Não pode ser desativado para evitar bloqueio do sistema'}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-2">
                            {!roleAllowed && (
                              <Badge variant="secondary" className="text-[10px]">
                                Restrito por papel
                              </Badge>
                            )}
                            {isSelfAdmin && roleAllowed && (
                              <Badge variant="secondary" className="text-[10px]">
                                Anti-lockout
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
