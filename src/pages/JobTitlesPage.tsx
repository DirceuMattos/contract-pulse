import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';

export default function JobTitlesPage() {
  const navigate = useNavigate();
  const { jobTitles, addJobTitle, updateJobTitle, deleteJobTitle, teams, getActiveTeams } = useData();
  const { canEdit } = useAuth();
  const activeTeams = getActiveTeams();

  const [jobTitleDialogOpen, setJobTitleDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<{ id: string; label: string; teamId?: string } | null>(null);
  const [jobTitleLabel, setJobTitleLabel] = useState('');
  const [jobTitleTeamId, setJobTitleTeamId] = useState<string>('');
  const [deleteJobTitleId, setDeleteJobTitleId] = useState<string | null>(null);

  const getTeamName = (teamId?: string) => {
    if (!teamId) return null;
    return teams.find(t => t.id === teamId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargos (RH)"
        description="Cadastre e mantenha cargos usados na calculadora e nos recursos humanos."
        animated={false}
        breadcrumbs={[
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Cargos' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {canEdit && (
              <Button onClick={() => {
                setEditingJobTitle(null);
                setJobTitleLabel('');
                setJobTitleTeamId('');
                setJobTitleDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cargo
              </Button>
            )}
          </div>
        }
      />

      {jobTitles.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum cargo cadastrado"
          description="Adicione cargos para padronizar a alocação de recursos humanos."
          actionLabel={canEdit ? 'Adicionar cargo' : undefined}
          onAction={canEdit ? () => {
            setEditingJobTitle(null);
            setJobTitleLabel('');
            setJobTitleTeamId('');
            setJobTitleDialogOpen(true);
          } : undefined}
          actionIcon={Plus}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Cargos Cadastrados</CardTitle>
            </div>
            <CardDescription>
              Cargos disponíveis para seleção no formulário de recursos. Cargos inativos não aparecem na lista.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobTitles.map(jt => {
                const team = getTeamName(jt.teamId);
                return (
                  <div key={jt.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={jt.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}>{jt.label}</span>
                      {!jt.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                      {team ? (
                        <Badge variant={team.isActive ? 'outline' : 'secondary'} className="text-xs">
                          {team.name}{!team.isActive && ' (Inativa)'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">---</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={jt.isActive}
                          onCheckedChange={(checked) => updateJobTitle(jt.id, { isActive: checked })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingJobTitle({ id: jt.id, label: jt.label, teamId: jt.teamId });
                          setJobTitleLabel(jt.label);
                          setJobTitleTeamId(jt.teamId || '');
                          setJobTitleDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteJobTitleId(jt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Title Dialog */}
      <Dialog open={jobTitleDialogOpen} onOpenChange={setJobTitleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingJobTitle ? 'Editar Cargo' : 'Adicionar Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Cargo *</Label>
              <Input
                value={jobTitleLabel}
                onChange={e => setJobTitleLabel(e.target.value)}
                placeholder="Ex: Desenvolvedor Backend"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              {activeTeams.length > 0 ? (
                <Select value={jobTitleTeamId} onValueChange={setJobTitleTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem equipe</SelectItem>
                    {activeTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma equipe cadastrada.{' '}
                  <Link to="/configuracoes/equipes" className="text-primary underline">
                    Cadastre uma equipe
                  </Link>
                </p>
              )}
              <p className="text-xs text-muted-foreground">Usada para organizar cargos e facilitar filtros e relatórios.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobTitleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!jobTitleLabel.trim()) {
                toast.error('Nome do cargo é obrigatório');
                return;
              }
              const teamId = jobTitleTeamId && jobTitleTeamId !== 'none' ? jobTitleTeamId : undefined;
              if (editingJobTitle) {
                updateJobTitle(editingJobTitle.id, { label: jobTitleLabel.trim(), teamId });
                toast.success('Cargo atualizado');
              } else {
                addJobTitle(jobTitleLabel.trim(), teamId);
                toast.success('Cargo adicionado');
              }
              setJobTitleDialogOpen(false);
            }}>
              {editingJobTitle ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job Title Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteJobTitleId}
        onOpenChange={(open) => !open && setDeleteJobTitleId(null)}
        onConfirm={() => {
          if (deleteJobTitleId) {
            deleteJobTitle(deleteJobTitleId);
            toast.success('Cargo removido');
            setDeleteJobTitleId(null);
          }
        }}
        title="Excluir cargo?"
        description="O cargo será removido da lista. Recursos existentes que usam este cargo não serão afetados."
      />
    </div>
  );
}