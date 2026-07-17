// Exporta uma requisição de vaga como texto editável para divulgação.
import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { JobRequest } from '@/hooks/useJobRequests';

const MODALIDADE_LABELS: Record<NonNullable<JobRequest['modalidade_trabalho']>, string> = {
  remoto: 'Home office',
  presencial: 'Presencial',
  hibrido: 'Híbrida',
};

interface SkillSnapshot {
  id?: string;
  nome?: string;
  tipo?: 'hard' | 'soft';
}

function getSkills(request: JobRequest, tipo: 'hard' | 'soft'): string[] {
  if (!Array.isArray(request.skills_avulsas)) return [];
  return (request.skills_avulsas as SkillSnapshot[])
    .filter((skill) => skill.tipo === tipo && skill.nome)
    .map((skill) => skill.nome as string)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function montarTexto(vaga: JobRequest): string {
  const hard = getSkills(vaga, 'hard');
  const soft = getSkills(vaga, 'soft');
  const linhas: string[] = [];

  linhas.push(`🚀 Vaga: ${vaga.titulo}${vaga.nivel ? ` — ${vaga.nivel}` : ''}`);
  linhas.push('');

  if (vaga.descricao) {
    linhas.push('📋 Sobre a vaga', vaga.descricao, '');
  }

  const detalhes: string[] = [];
  if (vaga.jobTitleLabel) detalhes.push(`Função: ${vaga.jobTitleLabel}`);
  if (vaga.anos_experiencia != null) detalhes.push(`Experiência mínima: ${vaga.anos_experiencia} ano(s)`);
  if (vaga.quantidade > 1) detalhes.push(`Quantidade de vagas: ${vaga.quantidade}`);
  if (vaga.modalidade_trabalho) detalhes.push(`Modalidade: ${MODALIDADE_LABELS[vaga.modalidade_trabalho]}`);
  if (vaga.presenca_cliente_requerida) {
    detalhes.push(`Presença no cliente: ${vaga.dias_presenca_cliente || 'dias a combinar'}`);
  }
  if (vaga.viagens_requeridas) detalhes.push('Disponibilidade para viagens: sim');
  if (detalhes.length) {
    linhas.push('📌 Detalhes da oportunidade', detalhes.map((item) => `• ${item}`).join('\n'), '');
  }

  if (hard.length) {
    linhas.push('🛠️ Hard skills', hard.map((skill) => `• ${skill}`).join('\n'), '');
  }

  if (soft.length) {
    linhas.push('🤝 Soft skills', soft.map((skill) => `• ${skill}`).join('\n'), '');
  }

  if (vaga.beneficios) {
    linhas.push('🎁 Benefícios', vaga.beneficios, '');
  }

  if (vaga.observacoes) {
    linhas.push('📝 Observações', vaga.observacoes, '');
  }

  linhas.push('Interessados podem entrar em contato com o time de RH.');

  return linhas.join('\n').trim();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: JobRequest | null;
}

export function ExportJobRequestDialog({ open, onOpenChange, request }: Props) {
  const [texto, setTexto] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && request) {
      setTexto(montarTexto(request));
      setCopied(false);
    }
  }, [open, request]);

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

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar vaga</DialogTitle>
          <DialogDescription>
            Edite livremente e copie para postar nas redes. As alterações aqui não afetam a vaga salva.
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
