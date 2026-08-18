import React, { useMemo, useState } from 'react';
import { Check, Copy, Info, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ProfileOption {
  role: string;
  label: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  profiles: ProfileOption[];
}

/** Converte "Head de Área" em "head_de_area". */
function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function timestamp() {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function CreateProfileDialog({ open, onClose, profiles }: Props) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const role = useMemo(() => slugify(label), [label]);
  const exists = profiles.some((p) => p.role === role);

  const fileName = `${timestamp()}_add_profile_${role || 'novo_perfil'}.sql`;

  const migration = useMemo(() => {
    if (!role) return '';
    const esc = (s: string) => s.replace(/'/g, "''");
    const copyBlock = copyFrom
      ? `
-- Copia os direitos de módulo do perfil '${copyFrom}'.
INSERT INTO public.role_module_permissions
  (role, module_key, can_access, can_edit, can_create, can_delete,
   can_export, can_view_values, can_view_hr_costs, can_allocate)
SELECT '${role}', s.module_key, s.can_access, s.can_edit, s.can_create, s.can_delete,
       s.can_export, s.can_view_values, s.can_view_hr_costs, s.can_allocate
  FROM public.role_module_permissions s
 WHERE s.role = '${copyFrom}'
ON CONFLICT (role, module_key) DO NOTHING;
`
      : `
-- Nenhum módulo liberado por padrão. Configure pela tela de Gestão de Perfis.
`;

    return `-- Perfil: ${esc(label)}
-- Gerado pela tela de Gestão de Perfis.
--
-- Aplicar em DUAS etapas: o PostgreSQL não permite usar um valor de enum na
-- mesma transação em que ele é criado. Rode o bloco 1, confirme, depois o 2.

-- ===== Bloco 1 =====
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS '${role}';

-- ===== Bloco 2 =====
INSERT INTO public.role_profiles (role, label, description, modules, active, is_system)
VALUES ('${role}', '${esc(label)}', ${description ? `'${esc(description)}'` : 'NULL'}, '[]'::jsonb, true, false)
ON CONFLICT (role) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description;
${copyBlock}`;
  }, [role, label, description, copyFrom]);

  function reset() {
    setLabel(''); setDescription(''); setCopyFrom(''); setCopied(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(migration);
      setCopied(true);
      toast.success('Migration copiada');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo perfil</DialogTitle>
          <DialogDescription>
            Perfis fazem parte da estrutura de segurança do banco, por isso nascem
            por migration versionada — e não por gravação direta da tela.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
          <span>
            Preencha abaixo e entregue a migration gerada a quem aplica as migrations.
            Depois de aplicada, o perfil aparece nesta tela e já pode ser configurado
            e atribuído a usuários.
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-label">Nome do perfil</Label>
            <Input
              id="profile-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Head de Área"
              maxLength={60}
            />
            {role && (
              <p className={`text-xs ${exists ? 'text-red-600' : 'text-muted-foreground'}`}>
                {exists
                  ? `Já existe um perfil com a chave "${role}".`
                  : <>Chave técnica: <code className="font-mono">{role}</code></>}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-description">Descrição (opcional)</Label>
            <Textarea
              id="profile-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que este perfil faz no sistema"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Começar com os direitos de (opcional)</Label>
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger><SelectValue placeholder="Nenhum — perfil sem módulos" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.role} value={p.role}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role && !exists && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-xs">{fileName}</Label>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre">
                {migration}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
