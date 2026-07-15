// v1 - módulo Skills de Vagas: listagem + CRUD básico
import { useState } from 'react';
import { Sparkles, Plus, Pencil, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useJobSkills, type ProfileWithMeta } from '@/hooks/useJobSkills';
import { JobSkillProfileDialog } from '@/components/jobskills/JobSkillProfileDialog';

export default function JobSkillsPage() {
  const { canEdit } = useAuth();
  const { profiles, skills, loading, error, reload } = useJobSkills();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithMeta | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: ProfileWithMeta) => { setEditing(p); setDialogOpen(true); };

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
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum perfil de skill cadastrado"
          description="Crie perfis de skill por cargo e nível para padronizar as contratações."
          actionLabel={canEdit ? 'Novo perfil de skill' : undefined}
          onAction={canEdit ? openNew : undefined}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <Card key={p.id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{p.jobTitleLabel}</CardTitle>
                      {p.nivel && <Badge variant="secondary">{p.nivel}</Badge>}
                      {!p.is_active && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    {p.descricao && <CardDescription className="line-clamp-2">{p.descricao}</CardDescription>}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(p.skills ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sem skills marcadas</span>
                  ) : (
                    (p.skills ?? []).map((s) => (
                      <Badge key={s.id} variant="outline"
                        className={s.tipo === 'hard' ? 'border-blue-400 text-blue-600' : 'border-emerald-400 text-emerald-600'}>
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
          ))}
        </div>
      )}

      <JobSkillProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        allSkills={skills}
        onSaved={() => { setDialogOpen(false); reload(); }}
      />
    </div>
  );
}
