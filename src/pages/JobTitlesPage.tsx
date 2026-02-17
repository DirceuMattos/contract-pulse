import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export default function JobTitlesPage() {
  const navigate = useNavigate();
  const { jobTitles, addJobTitle, updateJobTitle, deleteJobTitle } = useData();
  const { canEdit } = useAuth();

  const [jobTitleDialogOpen, setJobTitleDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<{ id: string; label: string } | null>(null);
  const [jobTitleLabel, setJobTitleLabel] = useState('');
  const [deleteJobTitleId, setDeleteJobTitleId] = useState<string | null>(null);

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
              {jobTitles.map(jt => (
                <div key={jt.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <span className={jt.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}>{jt.label}</span>
                    {!jt.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={jt.isActive}
                        onCheckedChange={(checked) => updateJobTitle(jt.id, { isActive: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingJobTitle({ id: jt.id, label: jt.label });
                        setJobTitleLabel(jt.label);
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
              ))}
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
              <Label>Nome do Cargo</Label>
              <Input
                value={jobTitleLabel}
                onChange={e => setJobTitleLabel(e.target.value)}
                placeholder="Ex: Desenvolvedor Backend"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobTitleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!jobTitleLabel.trim()) {
                toast.error('Nome do cargo é obrigatório');
                return;
              }
              if (editingJobTitle) {
                updateJobTitle(editingJobTitle.id, { label: jobTitleLabel.trim() });
                toast.success('Cargo atualizado');
              } else {
                addJobTitle(jobTitleLabel.trim());
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
