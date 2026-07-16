// v4 - Skills de Vagas: paleta própria vívida (os tokens --chart-* do projeto são pastéis)
import { useState } from 'react';
import { Sparkles, Plus, Pencil, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useJobSkills, type ProfileWithMeta } from '@/hooks/useJobSkills';
import { JobSkillProfileDialog } from '@/components/jobskills/JobSkillProfileDialog';

// Paleta própria de cores sólidas e vívidas. Os tokens --chart-* do projeto
// são pastéis dessaturados (saturação 7–22%), então saíam "lavados" sobre
// texto branco. Estas cores têm contraste suficiente em tema claro e escuro.
const CARGO_PALETTE = [
  '#4F46E5', // indigo
  '#0EA5A4', // teal
  '#DB2777', // pink
  '#D97706', // amber
  '#2563EB', // blue
  '#16A34A', // green
  '#DC2626', // red
  '#7C3AED', // violet
];

// Cor estável por cargo: hash do nome → índice fixo na paleta.
function cargoColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return CARGO_PALETTE[h % CARGO_PALETTE.length];
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function JobSkillsPage() {
  const { canEdit } = useAuth();
  const { jobTitles } = useData();
  const { profiles, skills, loading, error, reload } = useJobSkills();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithMeta | null>(null);
  const [prefillCargo, setPrefillCargo] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setPrefillCargo(null); setDialogOpen(true); };
  const openEdit = (p: ProfileWithMeta) => { setEditing(p); setPrefillCargo(null); setDialogOpen(true); };
  const openForCargo = (cargoLabel: string) => { setEditing(null); setPrefillCargo(cargoLabel); setDialogOpen(true); };

  // Cargos ativos que ainda NÃO têm nenhum perfil de skill → aparecem como "a preencher".
  const cargoIdsComPerfil = new Set(profiles.map((p) => p.job_title_id));
  const cargosAPreencher = jobTitles
    .filter((jt) => jt.isActive && !cargoIdsComPerfil.has(jt.id))
    .sort((a, b) => a.label.localeCompare(b.label));

  const nada = !loading && profiles.length === 0 && cargosAPreencher.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills de Vagas"
        description="Catálogo de skills e perfis por cargo e nível, usados na requisição de vagas."
        animated={false}
        breadcrumbs={[{ label: 'Skills de Vagas' }]}
        actions={canEdit && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo perfil de skill
          </Button>
        )}
      />

      {error && (
        <Card><CardContent className="p-4 text-sm text-destructive">Erro ao carregar: {error}</CardContent></Card>
      )}

      {loading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : nada ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum cargo cadastrado"
          description="Cadastre cargos para definir seus perfis de skill."
        />
      ) : (
        <div className="space-y-6">
          {/* Perfis já definidos */}
          {profiles.length > 0 && (
            <div className="space-y-3">
              {profiles.map((p) => {
                const color = cargoColor(p.jobTitleLabel);
                return (
                <Card key={p.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-3 pl-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {initials(p.jobTitleLabel)}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{p.jobTitleLabel}</CardTitle>
                            {p.nivel && <Badge variant="secondary">{p.nivel}</Badge>}
                            {!p.is_active && <Badge variant="outline">Inativo</Badge>}
                          </div>
                          {p.descricao && <CardDescription className="line-clamp-2">{p.descricao}</CardDescription>}
                        </div>
                      </div>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pl-6 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(p.skills ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sem skills marcadas</span>
                      ) : (
                        (p.skills ?? []).map((s) => (
                          <Badge key={s.id} variant="outline"
                            className={s.tipo === 'hard' ? 'border-blue-400 text-blue-600 dark:text-blue-400' : 'border-emerald-400 text-emerald-600 dark:text-emerald-400'}>
                            {s.nome}
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.colabsLotados} colab(s) lotado(s)</span>
                      {p.anos_experiencia != null && <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {p.anos_experiencia} ano(s) de experiência</span>}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}

          {/* Cargos ainda sem perfil de skill */}
          {cargosAPreencher.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Cargos a preencher ({cargosAPreencher.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {cargosAPreencher.map((jt) => {
                  const color = cargoColor(jt.label);
                  return (
                  <button
                    key={jt.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => openForCargo(jt.label)}
                    className="group flex items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left text-sm hover:border-primary/50 hover:bg-muted/40 transition-colors disabled:opacity-60 disabled:cursor-default"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials(jt.label)}
                    </span>
                    <span className="flex-1 font-medium truncate">{jt.label}</span>
                    {canEdit && <Badge variant="outline" className="shrink-0">Definir</Badge>}
                  </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <JobSkillProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefillCargo={prefillCargo}
        allSkills={skills}
        onSaved={() => { setDialogOpen(false); reload(); }}
      />
    </div>
  );
}
