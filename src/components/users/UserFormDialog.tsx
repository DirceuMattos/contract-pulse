import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Mail, Shield } from 'lucide-react';
import { SystemUser, SystemUserFormData } from '@/types/systemUser';
import { UserRole } from '@/types';
import { useSystemUsers } from '@/contexts/SystemUsersContext';
import { useToast } from '@/hooks/use-toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const userFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100),
  role: z.enum(['c-level', 'intermediario', 'leitor'] as const),
  active: z.boolean(),
});

const userEditSchema = userFormSchema.extend({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100).optional().or(z.literal('')),
});

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingUser: SystemUser | null;
}

const roleDescriptions: Record<UserRole, string> = {
  'c-level': 'Acesso total com visualização de valores financeiros e gestão de usuários',
  'intermediario': 'Edição de dados operacionais sem visualização de valores',
  'leitor': 'Apenas visualização de dados sem valores financeiros',
};

export function UserFormDialog({ open, onClose, editingUser }: UserFormDialogProps) {
  const { addUser, updateUser, getUserByEmail } = useSystemUsers();
  const { toast } = useToast();
  const isEditing = !!editingUser;

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

  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        email: editingUser.email,
        password: '',
        role: editingUser.role,
        active: editingUser.active,
      });
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'leitor',
        active: true,
      });
    }
  }, [editingUser, form]);

  const onSubmit = (data: SystemUserFormData) => {
    if (isEditing) {
      // For editing, only include password if it was changed
      const updateData: Partial<SystemUserFormData> = {
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.active,
      };
      
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }

      const success = updateUser(editingUser.id, updateData);
      
      if (success) {
        toast({
          title: 'Usuário atualizado',
          description: `${data.name} foi atualizado com sucesso.`,
        });
        onClose();
      } else {
        toast({
          title: 'Erro ao atualizar',
          description: 'Este e-mail já está em uso por outro usuário.',
          variant: 'destructive',
        });
      }
    } else {
      // Check if email already exists
      const existingUser = getUserByEmail(data.email);
      if (existingUser) {
        form.setError('email', { message: 'Este e-mail já está cadastrado' });
        return;
      }

      const newUser = addUser(data);
      
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
      <DialogContent className="sm:max-w-[500px]">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    Mínimo de 6 caracteres
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
                      <SelectItem value="c-level">C-Level / Admin</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="leitor">Leitor</SelectItem>
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
