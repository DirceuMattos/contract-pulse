// v1 - exportar perfil de skill como texto editável (RH posta em redes)
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfileWithMeta } from '@/hooks/useJobSkills';

function montarTexto(p: ProfileWithMeta): string {
  const hard = (p.skills ?? []).filter((s) => s.tipo === 'hard').map((s) => s.nome);
  const soft = (p.skills ?? []).filter((s) => s.tipo === 'soft').map((s) => s.nome);
  const linhas: string[] = [];
  linhas.push(`🚀 Vaga: ${p.jobTitleLabel}${p.nivel ? ` — ${p.nivel}` : ''}`);
  linhas.push('');
  if (p.descricao) { linhas.push('📋 Sobre a vaga', p.descricao, ''); }
  if (p.atribuicoes) { linhas.push('✅ Atribuições', p.atribuicoes, ''); }
  if (hard.length) { linhas.push('🛠️ Hard skills', hard.map((s) => `• ${s}`).join('\n'), ''); }
  if (p.hard_skills_desc) { linhas.push(p.hard_skills_desc, ''); }
  if (soft.length) { linhas.push('🤝 Soft skills', soft.map((s) => `• ${s}`).join('\n'), ''); }
  if (p.soft_skills_desc) { linhas.push(p.soft_skills_desc, ''); }
  const reqs: string[] = [];
  if (p.anos_experiencia != null) reqs.push(`Experiência mínima: ${p.anos_experiencia} ano(s)`);
  if (p.idade_min != null || p.idade_max != null) {
    reqs.push(`Faixa etária: ${p.idade_min ?? '—'} a ${p.idade_max ?? '—'} anos`);
  }
  if (reqs.length) { linhas.push('📌 Requisitos', reqs.join('\n'), ''); }
  return linhas.join('\n').trim();
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ProfileWithMeta | null;
}

export function ExportProfileDialog({ open, onOpenChange, profile }: Props) {
  const [texto, setTexto] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && profile) { setTexto(montarTexto(profile)); setCopied(false); }
  }, [open, profile]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      toast.success('Texto copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar vaga</DialogTitle>
          <DialogDescription>
            Edite livremente e copie para postar nas redes. As alterações aqui não afetam o perfil salvo.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={16} className="font-mono text-xs" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={copiar}>
            {copied ? <><Check className="h-4 w-4 mr-2" />Copiado</> : <><Copy className="h-4 w-4 mr-2" />Copiar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
