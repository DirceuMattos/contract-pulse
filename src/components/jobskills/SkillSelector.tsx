// v1 - seletor de skills reutilizável (perfil de skill e vaga avulsa)
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Skill, SkillType } from '@/hooks/useJobSkills';

interface Props {
  allSkills: Skill[];
  localSkills: Skill[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddLocal: (skill: Skill) => void;
}

export function SkillSelector({ allSkills, localSkills, selectedIds, onToggle, onAddLocal }: Props) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<SkillType>('hard');
  const [query, setQuery] = useState('');

  const pool = [...allSkills, ...localSkills];
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePool = normalizedQuery
    ? pool.filter((s) => s.nome.toLowerCase().includes(normalizedQuery))
    : pool;
  const hard = visiblePool
    .filter((s) => s.tipo === 'hard')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  const soft = visiblePool
    .filter((s) => s.tipo === 'soft')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const add = () => {
    const n = nome.trim();
    if (!n) return;
    const existing = pool.find((s) => s.nome.toLowerCase() === n.toLowerCase() && s.tipo === tipo);
    if (existing) { onToggle(existing.id); setNome(''); return; }
    onAddLocal({ id: `new:${Date.now()}`, nome: n, tipo, origem: 'manual', descricao: null });
    setNome('');
  };

  const Group = ({
    label,
    list,
    selectedLabel,
    color,
  }: {
    label: string;
    list: Skill[];
    selectedLabel: string;
    color: string;
  }) => {
    const selectedCount = list.filter((s) => selectedIds.has(s.id)).length;

    return (
      <div className="rounded-md border bg-muted/20 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-medium">{label}</Label>
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            {selectedCount}/{list.length} {selectedLabel}
          </span>
        </div>
        <div className="max-h-36 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">
            {list.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma skill deste tipo ainda</span> :
              list.map((s) => {
                const sel = selectedIds.has(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => onToggle(s.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${sel ? color + ' font-medium' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                    {s.nome}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar skill..."
        className="h-9"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Group
          label="Hard skills"
          list={hard}
          selectedLabel="selecionadas"
          color="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300"
        />
        <Group
          label="Soft skills"
          list={soft}
          selectedLabel="selecionadas"
          color="border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300"
        />
      </div>
      <div className="flex items-end gap-2 pt-1">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Adicionar nova skill</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Nome da skill" />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as SkillType)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="hard">Hard</option>
          <option value="soft">Soft</option>
        </select>
        <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
