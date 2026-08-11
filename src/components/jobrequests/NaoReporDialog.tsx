// v2 - dialogo "Nao repor": escolha explicita entre vaga extinta e reposicao interna
import { useState, useEffect, useMemo } from 'react';
import { Check, UserCheck, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { useHR } from '@/contexts/HRContext';
import { useData } from '@/contexts/DataContext';
import type { ReplacementForVaga } from '@/hooks/usePendingReplacementsForVaga';

type Desfecho = 'extinta' | 'reposta_interna';

const DESFECHO_OPCOES: { value: Desfecho; label: string; hint: string; icon: typeof XCircle }[] = [
  {
    value: 'extinta',
    label: 'Vaga extinta',
    hint: 'A posição deixou de existir e não será reposta.',
    icon: XCircle,
  },
  {
    value: 'reposta_interna',
    label: 'Reposta por alguém de dentro',
    hint: 'Outra pessoa da equipe assumiu as atividades.',
    icon: UserCheck,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rep: ReplacementForVaga | null;
  // onConfirm recebe o id da pessoa que assumiu (ou null quando a vaga foi extinta)
  onConfirm: (rep: ReplacementForVaga, preenchidaPor: string | null) => void;
}

export function NaoReporDialog({ open, onOpenChange, rep, onConfirm }: Props) {
  const { hrPeople } = useHR();
  const { jobTitles } = useData();
  const [desfecho, setDesfecho] = useState<Desfecho | null>(null);
  const [pessoaId, setPessoaId] = useState<string>('');

  useEffect(() => {
    if (open) { setDesfecho(null); setPessoaId(''); }
  }, [open]);

  // Remanejamento interno raramente respeita o cargo: lista todos os ativos,
  // por nome, com o cargo ao lado para ajudar a escolher.
  const opcoesPessoas = useMemo<SearchableSelectOption[]>(() => {
    const cargoPorId = new Map(jobTitles.map((jt) => [jt.id, jt.label]));
    return hrPeople
      .filter((p) => p.situacao === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
      .map((p) => {
        const cargo = p.cargoId ? cargoPorId.get(p.cargoId) : undefined;
        return {
          value: p.id,
          label: cargo ? `${p.nome} — ${cargo}` : p.nome,
          searchText: [cargo, p.nivel].filter(Boolean).join(' '),
        };
      });
  }, [hrPeople, jobTitles]);

  if (!rep) return null;

  const podeConfirmar = desfecho === 'extinta' || (desfecho === 'reposta_interna' && pessoaId !== '');

  const confirmar = () => {
    if (!podeConfirmar) return;
    onConfirm(rep, desfecho === 'reposta_interna' ? pessoaId : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Não repor — {rep.pessoaNome}</DialogTitle>
          <DialogDescription>
            {rep.cargoLabel ?? 'Cargo não informado'}{rep.nivel ? ` · ${rep.nivel}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>O que aconteceu com esta posição?</Label>
            <div className="grid gap-2">
              {DESFECHO_OPCOES.map((opcao) => {
                const ativo = desfecho === opcao.value;
                const Icone = opcao.icon;
                return (
                  <button
                    key={opcao.value}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      setDesfecho(opcao.value);
                      if (opcao.value === 'extinta') setPessoaId('');
                    }}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                      ativo ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${ativo ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${ativo ? 'text-primary' : ''}`}>{opcao.label}</span>
                      <span className="block text-xs text-muted-foreground">{opcao.hint}</span>
                    </span>
                    {ativo && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {desfecho === 'reposta_interna' && (
            <div className="space-y-1.5">
              <Label>Quem assumiu?</Label>
              <SearchableSelect
                value={pessoaId}
                onValueChange={setPessoaId}
                options={opcoesPessoas}
                placeholder={opcoesPessoas.length ? 'Selecione o colaborador…' : 'Nenhum colaborador ativo'}
                searchPlaceholder="Buscar por nome ou cargo…"
                emptyMessage="Nenhum colaborador encontrado."
              />
              <p className="text-xs text-muted-foreground">
                Todos os colaboradores ativos, independentemente do cargo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!podeConfirmar}>
            {desfecho === 'reposta_interna' ? 'Registrar quem assumiu' : 'Confirmar vaga extinta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
