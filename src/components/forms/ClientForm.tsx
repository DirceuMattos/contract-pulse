import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Plus, X, Upload, Trash2 } from 'lucide-react';
import { Client } from '@/types';
import { clientFormSchema, ClientFormData } from '@/lib/validators';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleFormValidationError } from '@/lib/formValidation';
import { supabase } from '@/integrations/supabase/client';
import { ClientLogo } from '@/components/clients/ClientLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface ClientFormProps {
  client?: Client;
  mode: 'create' | 'edit';
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Mask utilities
function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  }
  return cleaned
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
}

function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
}

export function ClientForm({ client, mode }: ClientFormProps) {
  const navigate = useNavigate();
  const { addClient, updateClient } = useData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(client?.logoUrl);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canEditClientForm = userRole === 'c-level' || userRole === 'rh' || userRole === 'administrativo' || userRole === 'superadmin';
  const isReadOnly = mode === 'edit' && !canEditClientForm;

  const uploadLogoForClient = useCallback(async (clientId: string, file: File): Promise<string | null> => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${clientId}/logo.${ext}`;
    const { error } = await supabase.storage
      .from('client-logos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: 'Erro ao enviar logo', description: error.message, variant: 'destructive' });
      return null;
    }
    return path;
  }, [toast]);

  const handleLogoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;

    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Tamanho máximo 2MB.', variant: 'destructive' });
      return;
    }
    // Edit mode: upload immediately
    if (client?.id) {
      setIsUploadingLogo(true);
      const path = await uploadLogoForClient(client.id, file);
      setIsUploadingLogo(false);
      if (path) {
        setLogoUrl(path);
        toast({ title: 'Logo atualizada' });
      }
    } else {
      // Create mode: defer upload until client exists
      setPendingLogoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setLogoUrl(objectUrl);
    }
  }, [client?.id, uploadLogoForClient, toast, isReadOnly]);

  const handleLogoRemove = useCallback(async () => {
    if (isReadOnly) return;

    if (client?.id && logoUrl && !logoUrl.startsWith('blob:') && !/^https?:/i.test(logoUrl)) {
      await supabase.storage.from('client-logos').remove([logoUrl]);
    }
    setLogoUrl(undefined);
    setPendingLogoFile(null);
  }, [client?.id, logoUrl, isReadOnly]);

  const fetchAddressByCep = useCallback(async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: 'CEP não encontrado', description: 'Verifique o CEP informado.', variant: 'destructive' });
        return;
      }
      form.setValue('logradouro', data.logradouro || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.localidade || '');
      form.setValue('uf', data.uf || '');
    } catch {
      toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o endereço.', variant: 'destructive' });
    } finally {
      setIsFetchingCep(false);
    }
  }, [toast]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      razaoSocial: client?.razaoSocial || '',
      nomeFantasia: client?.nomeFantasia || '',
      cnpj: client?.cnpj || '',
      inscricaoEstadual: client?.inscricaoEstadual || '',
      site: client?.site || '',
      cep: client?.cep || '',
      logradouro: client?.logradouro || '',
      numero: client?.numero || '',
      complemento: client?.complemento || '',
      bairro: client?.bairro || '',
      cidade: client?.cidade || '',
      uf: client?.uf || '',
      contatoPrincipal: client?.contatoPrincipal || '',
      email: client?.email || '',
      telefone: client?.telefone || '',
      segmento: client?.segmento || undefined,
      tags: client?.tags || [],
      observacoes: client?.observacoes || '',
    },
  });

  const tags = form.watch('tags');

  const addTag = () => {
    if (isReadOnly) return;

    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      form.setValue('tags', [...tags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (isReadOnly) return;

    form.setValue('tags', tags.filter(t => t !== tagToRemove));
  };

  const onSubmit = async (data: ClientFormData) => {
    if (isReadOnly) return;

    setIsSubmitting(true);
    try {
      const clientData = {
        razaoSocial: data.razaoSocial,
        cnpj: data.cnpj,
        contatoPrincipal: data.contatoPrincipal,
        email: data.email,
        segmento: data.segmento,
        tags: data.tags,
        nomeFantasia: data.nomeFantasia || undefined,
        inscricaoEstadual: data.inscricaoEstadual || undefined,
        site: data.site || undefined,
        cep: data.cep || undefined,
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        cidade: data.cidade || undefined,
        uf: data.uf || undefined,
        telefone: data.telefone || undefined,
        observacoes: data.observacoes || undefined,
        logoUrl: logoUrl && !logoUrl.startsWith('blob:') ? logoUrl : undefined,
      };
      
      if (mode === 'create') {
        const newClient = await addClient(clientData);
        // Upload deferred logo now that we have an id
        if (pendingLogoFile) {
          const path = await uploadLogoForClient(newClient.id, pendingLogoFile);
          if (path) {
            await updateClient(newClient.id, { logoUrl: path });
          }
        }
        toast({
          title: 'Cliente criado',
          description: `${data.nomeFantasia || data.razaoSocial} foi cadastrado com sucesso.`,
        });
        navigate(`/clientes/${newClient.id}`);
      } else if (client) {
        updateClient(client.id, clientData);
        toast({
          title: 'Cliente atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
        navigate(`/clientes/${client.id}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const errorCode = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      const isDuplicate = errorMessage.includes('idx_clients_cnpj_unique') ||
                          errorCode === '23505' ||
                          errorMessage.includes('duplicate key');
      toast({
        title: isDuplicate ? 'CNPJ já cadastrado' : 'Erro',
        description: isDuplicate 
          ? 'Já existe um cliente com este CNPJ. Verifique o cadastro existente.'
          : 'Não foi possível salvar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create' 
              ? 'Preencha os dados para cadastrar um novo cliente' 
              : `Editando ${client?.nomeFantasia || client?.razaoSocial}`}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, handleFormValidationError)} className="space-y-6">
          <fieldset disabled={isReadOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
          {/* Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="razaoSocial"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Razão social completa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeFantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome fantasia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo upload */}
              <FormItem className="md:col-span-2">
                <FormLabel>Logo do cliente</FormLabel>
                <div className="flex items-center gap-4">
                  {logoUrl?.startsWith('blob:') ? (
                    <img src={logoUrl} alt="Preview" className="w-16 h-16 rounded-lg object-contain bg-white border" />
                  ) : (
                    <ClientLogo
                      nome={form.watch('nomeFantasia') || form.watch('razaoSocial') || '?'}
                      logoUrl={logoUrl}
                      size="lg"
                    />
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLogoRemove}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG até 2MB.</p>
              </FormItem>

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="00.000.000/0000-00" 
                        {...field}
                        onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inscricaoEstadual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input placeholder="Inscrição estadual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segmento"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Segmento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="govtech">Govtech / Governo</SelectItem>
                        <SelectItem value="privado">Iniciativa Privada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="00000-000" 
                          {...field}
                          onChange={(e) => {
                            const masked = maskCEP(e.target.value);
                            field.onChange(masked);
                            const digits = masked.replace(/\D/g, '');
                            if (digits.length === 8) fetchAddressByCep(digits);
                          }}
                        />
                        {isFetchingCep && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Sala, Andar, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UF_OPTIONS.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contatoPrincipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato Principal *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato" {...field} />
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
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tags and Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma tag e pressione Enter"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações sobre o cliente..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/clientes')}>
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {mode === 'create' ? 'Cadastrar Cliente' : 'Salvar Alterações'}
            </Button>
            )}
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
