import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';

export default function TeamsPage() {
  const navigate = useNavigate();
  const { teams, jobTitles, addTeam, updateTeam, deleteTeam } = useData();
  const { canEdit } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; description?: string; isActive: boolean; sortOrder: number } | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamActive, setTeamActive] = useState(true);
  const [teamSortOrder, setTeamSortOrder] = useState(0);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamDescription('');
    setTeamActive(true);
    setTeamSortOrder(Math.max(...teams.map(t => t.sortOrder), 0) + 1);
    setDialogOpen(true);
  };

  const openEditDialog = (team: { id: string; name: string; description?: string; isActive: boolean; sortOrder: number }) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamActive(team.isActive);
    setTeamSortOrder(team.sortOrder);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      toast.error('Nome da equipe é obrigatório');
      return;
    }
    const isDuplicate = teams.some(t => t.name.toLowerCase() === trimmed.toLowerCase() && t.id !== editingTeam?.id);
    if (isDuplicate) {
      toast.error('Já existe uma equipe com esse nome');
      return;
    }

    if (editingTeam) {
      updateTeam(editingTeam.id, { name: trimmed, description: teamDescription.trim() || undefined, isActive: teamActive, sortOrder: teamSortOrder });
      toast.success('Equipe atualizada');
    } else {
      addTeam(trimmed, teamDescription.trim() || undefined, teamSortOrder);
      toast.success('Equipe adicionada');
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTeamId) return;
    const success = deleteTeam(deleteTeamId);
    if (success) {
      toast.success('Equipe removida');
    } else {
      toast.error('Não é possível excluir: há cargos vinculados a esta equipe. Desative-a em vez disso.');
    }
    setDeleteTeamId(null);
  };

  const getLinkedJobsCount = (teamId: string) => jobTitles.filter(jt => jt.teamId === teamId).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipes"
        description="Organize cargos em equipes para facilitar filtros e relatórios."
        animated={false}
        breadcrumbs={[
          { label: 'Configurações', href: '/configuracoes' },
          { label: 'Equipes' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {canEdit && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Equipe
              </Button>
            )}
          </div>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma equipe cadastrada"
          description="Adicione equipes para organizar seus cargos."
          actionLabel={canEdit ? 'Adicionar equipe' : undefined}
          onAction={canEdit ? openCreateDialog : undefined}
          actionIcon={Plus}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Equipes Cadastradas</CardTitle>
            </div>
            <CardDescription>
              Equipes usadas para organizar cargos e facilitar filtros e relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.sort((a, b) => a.sortOrder - b.sortOrder).map(team => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs min-w-[2rem] justify-center">#{team.sortOrder}</Badge>
                        <span className={team.isActive ? 'text-foreground font-medium' : 'text-muted-foreground line-through'}>{team.name}</span>
                        {!team.isActive && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                        <Badge variant="outline" className="text-xs">{getLinkedJobsCount(team.id)} cargo{getLinkedJobsCount(team.id) !== 1 ? 's' : ''}</Badge>
                      </div>
                      {team.description && (
                        <p className="text-sm text-muted-foreground truncate">{team.description}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={team.isActive}
                        onCheckedChange={(checked) => updateTeam(team.id, { isActive: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(team)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTeamId(team.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Editar Equipe' : 'Adicionar Equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Índice *</Label>
              <Input
                type="number"
                value={teamSortOrder}
                onChange={e => setTeamSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Equipe *</Label>
              <Input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Ex: Engenharia"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={teamDescription}
                onChange={e => setTeamDescription(e.target.value)}
                placeholder="Descrição opcional da equipe"
                rows={2}
              />
            </div>
            {editingTeam && (
              <div className="flex items-center justify-between">
                <Label>Ativa</Label>
                <Switch checked={teamActive} onCheckedChange={setTeamActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>
              {editingTeam ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTeamId}
        onOpenChange={(open) => !open && setDeleteTeamId(null)}
        onConfirm={handleDelete}
        title="Excluir equipe?"
        description="A equipe será removida permanentemente. Se houver cargos vinculados, a exclusão será bloqueada."
      />
    </div>
  );
}