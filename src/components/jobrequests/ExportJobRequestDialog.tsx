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
import { REGIME_META, type JobRequest } from '@/hooks/useJobRequests';

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

// Skills gravadas sem nome no snapshot (apenas o id) nao aparecem no anuncio.
// Contamos para avisar quem esta publicando, em vez de omitir em silencio.
function contarSkillsSemNome(request: JobRequest): number {
  if (!Array.isArray(request.skills_avulsas)) return 0;
  return (request.skills_avulsas as SkillSnapshot[]).filter((skill) => !skill.nome).length;
}

function montarTexto(vaga: JobRequest): string {
  const hard = getSkills(vaga, 'hard');
  const soft = getSkills(vaga, 'soft');
  const linhas: string[] = [];

  // Cabecalho: cargo, nivel e, quando houver mais de uma posicao, a quantidade.
  const plural = vaga.quantidade > 1 ? `${vaga.quantidade} vagas` : 'Vaga';
  linhas.push(`🚀 ${plural}: ${vaga.titulo}${vaga.nivel ? ` — ${vaga.nivel}` : ''}`);
  linhas.push('');

  if (vaga.descricao) {
    linhas.push('📋 Sobre a vaga', vaga.descricao, '');
  }

  // Campo "O que buscamos e como sera o seu dia a dia" (coluna observacoes).
  // Deixou de ser nota interna: e conteudo escrito para o candidato ler.
  if (vaga.observacoes) {
    linhas.push('🔎 O que buscamos e como será o seu dia a dia', vaga.observacoes, '');
  }

  // NUNCA publicar: valor_previsto, prazo_contratacao e motivo_abertura.
  // Sao dados internos da requisicao — orcamento e a razao da abertura nao
  // interessam (nem convem) ao candidato.
  const detalhes: string[] = [];
  if (vaga.jobTitleLabel && vaga.jobTitleLabel !== vaga.titulo) {
    detalhes.push(`Função: ${vaga.jobTitleLabel}`);
  }
  if (vaga.area_atuacao) detalhes.push(`Área de atuação: ${vaga.area_atuacao}`);
  if (vaga.regime_contratacao) {
    detalhes.push(`Regime de contratação: ${REGIME_META[vaga.regime_contratacao] ?? vaga.regime_contratacao}`);
  }
  if (vaga.nivel) detalhes.push(`Nível: ${vaga.nivel}`);
  if (vaga.anos_experiencia != null) {
    detalhes.push(`Experiência mínima: ${vaga.anos_experiencia} ano(s)`);
  }
  if (vaga.quantidade > 1) detalhes.push(`Número de posições: ${vaga.quantidade}`);
  if (vaga.modalidade_trabalho) {
    detalhes.push(`Modalidade: ${MODALIDADE_LABELS[vaga.modalidade_trabalho]}`);
  }
  if (vaga.presenca_cliente_requerida) {
    detalhes.push(`Presença no cliente: ${vaga.dias_presenca_cliente || 'dias a combinar'}`);
  }
  // As respostas negativas tambem sao informacao para quem se candidata:
  // "sem viagens" e "sem exigencia de diploma" atraem candidato, e o silencio
  // sobre elas gera duvida que volta como pergunta para o RH.
  detalhes.push(
    vaga.viagens_requeridas
      ? 'Disponibilidade para viagens: sim'
      : 'Disponibilidade para viagens: não é necessária'
  );
  if (vaga.formacao_requerida) {
    detalhes.push(`Formação acadêmica: ${vaga.formacao_detalhe || 'exigida'}`);
  } else {
    detalhes.push('Formação acadêmica: não é pré-requisito');
  }
  if (vaga.equipamento_bnp === true) {
    detalhes.push('Equipamento de trabalho: fornecido pela BNP');
  } else if (vaga.equipamento_bnp === false) {
    detalhes.push('Equipamento de trabalho: por conta do profissional');
  }
  if (detalhes.length) {
    linhas.push('📌 Detalhes da oportunidade', detalhes.map((item) => `• ${item}`).join('\n'), '');
  }

  if (hard.length) {
    linhas.push('🛠️ Conhecimentos técnicos', hard.map((skill) => `• ${skill}`).join('\n'), '');
  }

  if (soft.length) {
    linhas.push('🤝 Competências comportamentais', soft.map((skill) => `• ${skill}`).join('\n'), '');
  }

  if (vaga.diferenciais) {
    linhas.push('✨ Diferenciais desejáveis', vaga.diferenciais, '');
  }

  if (vaga.beneficios) {
    linhas.push('🎁 O que oferecemos', vaga.beneficios, '');
  }

  linhas.push('📩 Interessados podem entrar em contato com o time de RH da BNP Soluções em TI.');

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
  const skillsSemNome = request ? contarSkillsSemNome(request) : 0;

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
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {texto.length} caracteres
            {texto.length > 3000 && ' — acima do limite de alguns feeds; considere encurtar'}
          </span>
          {skillsSemNome > 0 && (
            <span className="text-amber-600 dark:text-amber-500">
              {skillsSemNome} skill(s) sem nome não entraram no texto
            </span>
          )}
        </div>
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
