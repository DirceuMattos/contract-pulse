// v1 - dialogo "Nao repor": pergunta se foi preenchida e por quem
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHR } from '@/contexts/HRContext';
import type { ReplacementForVaga } from '@/hooks/usePendingReplacementsForVaga';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rep: ReplacementForVaga | null;
  // onConfirm recebe o id da pessoa que preencheu (ou null se apenas "não repor")
  onConfirm: (rep: ReplacementForVaga, preenchidaPor: string | null) => void;
}

export function NaoReporDialog({ open, onOpenChange, rep, onConfirm }: Props) {
  const { hrPeople } = useHR();
  const [jaPreenchida, setJaPreenchida] = useState(false);
  const [pessoaId, setPessoaId] = useState<string>('');

  useEffect(() => {
    if (open) { setJaPreenchida(false); setPessoaId(''); }
  }, [open]);

  if (!rep) return null;

  // Colabs ativos do mesmo cargo da vaga (candidatos a terem preenchido).
  const candidatos = hrPeople.filter(
    (p) => p.situacao === 'ativo' && rep.cargoId && p.cargoId === rep.cargoId,
  );

  const confirmar = () => {
    onConfirm(rep, jaPreenchida && pessoaId ? pessoaId : null);
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
          <div className="flex items-center gap-2">
            <Switch id="ja-preenchida" checked={jaPreenchida} onCheckedChange={setJaPreenchida} />
            <Label htmlFor="ja-preenchida">Esta vaga já foi preenchida</Label>
          </div>

          {jaPreenchida && (
            <div className="space-y-1.5">
              <Label>Preenchida por</Label>
              <Select value={pessoaId} onValueChange={setPessoaId}>
                <SelectTrigger>
                  <SelectValue placeholder={candidatos.length ? 'Selecione o colaborador…' : 'Nenhum colab ativo neste cargo'} />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rep.cargoId && candidatos.length === 0 && (
                <p className="text-xs text-muted-foreground">Não há colaboradores ativos neste cargo para selecionar.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar}>
            {jaPreenchida ? 'Registrar e não repor' : 'Marcar como não repor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
