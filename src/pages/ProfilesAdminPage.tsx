/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import {
  MODULE_CATALOG,
  ModuleKey,
  isRoleAllowedForModule,
} from '@/types/moduleAccess';
import {
  ACTION_FLAG_LABELS,
  ActionFlagKey,
  ActionFlags,
  DEFAULT_ACTION_FLAGS_BY_ROLE,
  EMPTY_ACTION_FLAGS,
  ModuleActionPermissions,
  getDefaultModuleActionPermissions,
} from '@/types/modulePermissions';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// Mantém as MESMAS cores definidas em UsersPage (não editamos UsersPage).
const roleColors: Record<UserRole, string> = {
  'c-level': 'bg-primary/10 text-primary border-primary/20',
  'intermediario': 'bg-accent/50 text-accent-foreground border-accent',
  'leitor': 'bg-muted text-muted-foreground border-border',
  'comercial': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'lider_tribo': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'juridico': 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  'rh': 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  'administrativo': 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  'demo': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  'superadmin': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  'coordenacao_suporte': 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  'projetos_produtos': 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
};

const roleLabels: Record<UserRole, string> = {
  'c-level': 'C-Level / Admin',
  'intermediario': 'Intermediário',
  'leitor': 'Leitor',
  'comercial': 'Comercial',
  'lider_tribo': 'Líder de Tribo',
  'juridico': 'Jurídico',
  'rh': 'RH',
  'administrativo': 'Administrativo',
  'demo': 'Demonstração',
  'superadmin': 'Super Admin',
  'coordenacao_suporte': 'Coordenação Suporte',
  'projetos_produtos': 'Projetos-Produtos',
};

const ROLE_ORDER: UserRole[] = [
  'c-level',
  'superadmin',
  'intermediario',
  'administrativo',
  'lider_tribo',
  'coordenacao_suporte',
  'projetos_produtos',
  'rh',
  'juridico',
  'comercial',
  'demo',
  'leitor',
];

// Defaults espelhando ROLE_DEFAULT_MODULES de @/types/moduleAccess para "Resetar".
// Para roles não listados aqui (c-level, intermediario, leitor) ficam habilitados todos os módulos permitidos.
const ROLE_DEFAULT_MODULES: Partial<Record<UserRole, ModuleKey[]>> = {
  demo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'SQUADS', 'HR', 'CALCULATOR', 'HISTORY', 'DOCUMENTS', 'RESOURCES', 'IMPORT_EXPORT', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  comercial: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'SQUADS', 'CALCULATOR'],
  lider_tribo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  coordenacao_suporte: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  projetos_produtos: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS'],
  juridico: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL'],
  rh: ['DASHBOARD', 'ALERTS', 'SQUADS', 'HR', 'TRANSPORT', 'OVERTIME', 'JOB_REQUESTS', 'JOB_SKILLS'],
  administrativo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'HR', 'IMPORT_EXPORT', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  intermediario: ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'ALERTS', 'SQUADS', 'CALCULATOR', 'IMPORT_EXPORT', 'HR', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
  superadmin: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'SQUADS', 'CALCULATOR', 'USERS_ADMIN', 'ACCESS_LOGS', 'SETTINGS', 'PROFILES_ADMIN', 'IMPORT_EXPORT', 'HR', 'AI', 'AI_LOGS', 'RECEIVABLES', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
};

function defaultModulesFor(role: UserRole): ModuleKey[] {
  const explicit = ROLE_DEFAULT_MODULES[role];
  const allAllowed = MODULE_CATALOG
    .filter((m) => isRoleAllowedForModule(role, m.key))
    .map((m) => m.key);
  if (explicit) return explicit.filter((k) => isRoleAllowedForModule(role, k));
  return allAllowed;
}

interface RoleProfileRow extends ActionFlags {
  id?: string;
  role: UserRole;
  label: string;
  modules: ModuleKey[];
  moduleActions: ModuleActionPermissions;
}

const MODULE_GROUPS: { title: string; keys: ModuleKey[] }[] = [
  { title: 'Geral', keys: ['DASHBOARD', 'ALERTS'] },
  { title: 'Clientes e Contratos', keys: ['CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'RESOURCES', 'HISTORY', 'DOCUMENTS', 'RECEIVABLES', 'CALCULATOR', 'REPORTS'] },
  { title: 'Recursos e Pessoas', keys: ['HR', 'SQUADS', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'] },
  { title: 'Setup', keys: ['SETTINGS', 'USERS_ADMIN', 'IMPORT_EXPORT', 'PROFILES_ADMIN', 'ACCESS_LOGS'] },
  { title: 'IA', keys: ['AI', 'AI_LOGS'] },
];

export default function ProfilesAdminPage() {
  const { loading, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Record<string, RoleProfileRow>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState<RoleProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      setLoadingData(true);
      const { data, error } = await (supabase as any)
        .from('role_profiles')
        .select('*');
      if (error) {
        toast.error('Erro ao carregar perfis: ' + error.message);
      } else {
        const { data: actionRows, error: actionError } = await (supabase as any)
          .from('role_module_permissions')
          .select('role, module_key, can_access, can_edit, can_create, can_delete, can_export, can_view_values, can_view_hr_costs, can_allocate');

        if (actionError) {
          toast.error('Erro ao carregar permissões por módulo: ' + actionError.message);
        }

        const actionMap: Record<string, ModuleActionPermissions> = {};
        for (const row of actionRows || []) {
          if (!row.can_access) continue;
          actionMap[row.role] ||= {};
          actionMap[row.role][row.module_key as ModuleKey] = {
            can_edit: !!row.can_edit,
            can_create: !!row.can_create,
            can_delete: !!row.can_delete,
            can_export: !!row.can_export,
            can_view_values: !!row.can_view_values,
            can_view_hr_costs: !!row.can_view_hr_costs,
            can_allocate: !!row.can_allocate,
          };
        }

        const map: Record<string, RoleProfileRow> = {};
        for (const r of data || []) {
          const role = r.role as UserRole;
          map[r.role] = {
            id: r.id,
            role,
            label: r.label,
            modules: (r.modules || []) as ModuleKey[],
            moduleActions: actionMap[r.role] || getDefaultModuleActionPermissions(role),
            can_edit: !!r.can_edit,
            can_create: !!r.can_create,
            can_delete: !!r.can_delete,
            can_export: !!r.can_export,
            can_view_values: !!r.can_view_values,
            can_view_hr_costs: !!r.can_view_hr_costs,
            can_allocate: !!r.can_allocate,
          };
        }
        setProfiles(map);
      }
      setLoadingData(false);
    })();
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  function buildRowFor(role: UserRole): RoleProfileRow {
    return profiles[role] || {
      role,
      label: roleLabels[role],
      modules: defaultModulesFor(role),
      moduleActions: getDefaultModuleActionPermissions(role),
      ...DEFAULT_ACTION_FLAGS_BY_ROLE[role],
    };
  }

  function openEdit(role: UserRole) {
    setEditing({ ...buildRowFor(role) });
  }

  function toggleModule(key: ModuleKey, checked: boolean) {
    if (!editing) return;
    const set = new Set(editing.modules);
    if (checked) set.add(key);
    else set.delete(key);
    const moduleActions = { ...editing.moduleActions };
    moduleActions[key] = checked ? (moduleActions[key] || { ...DEFAULT_ACTION_FLAGS_BY_ROLE[editing.role] }) : { ...EMPTY_ACTION_FLAGS };
    setEditing({ ...editing, modules: Array.from(set), moduleActions });
  }

  function setModuleFlag(moduleKey: ModuleKey, key: ActionFlagKey, value: boolean) {
    if (!editing || !editing.modules.includes(moduleKey)) return;
    const current = editing.moduleActions[moduleKey] || { ...DEFAULT_ACTION_FLAGS_BY_ROLE[editing.role] };
    setEditing({
      ...editing,
      moduleActions: {
        ...editing.moduleActions,
        [moduleKey]: { ...current, [key]: value },
      },
    });
  }

  function resetToDefault() {
    if (!editing) return;
    setEditing({
      ...editing,
      modules: defaultModulesFor(editing.role),
      moduleActions: getDefaultModuleActionPermissions(editing.role),
      ...DEFAULT_ACTION_FLAGS_BY_ROLE[editing.role],
    });
    toast.info('Valores padrão carregados (não salvos)');
  }
  function renderModulePermissionsTable(group: typeof MODULE_GROUPS[number]) {
    if (!editing) return null;

    return (
      <div key={group.title} className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {group.title}
        </h4>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[260px] text-xs">Módulo</TableHead>
                {ACTION_FLAG_LABELS.map(({ key, label }) => (
                  <TableHead key={key} className="w-[88px] text-center text-xs">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.keys.map((key) => {
                const mod = MODULE_CATALOG.find((m) => m.key === key);
                if (!mod) return null;
                const allowed = isRoleAllowedForModule(editing.role, key);
                const checked = allowed && editing.modules.includes(key);
                const flags = editing.moduleActions[key] || EMPTY_ACTION_FLAGS;
                const row = (
                  <TableRow key={key} className={!allowed ? 'bg-muted/20 opacity-60' : undefined}>
                    <TableCell className="py-2">
                      <label className={`flex items-center gap-2 text-sm font-medium ${allowed ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <Checkbox
                          checked={checked}
                          disabled={!allowed}
                          onCheckedChange={(v) => toggleModule(key, !!v)}
                        />
                        <span className="leading-tight">{mod.label}</span>
                      </label>
                    </TableCell>
                    {ACTION_FLAG_LABELS.map(({ key: actionKey, label }) => (
                      <TableCell key={actionKey} className="py-2 text-center">
                        <div className="flex justify-center">
                          <Switch
                            aria-label={`${label} em ${mod.label}`}
                            checked={checked && flags[actionKey]}
                            disabled={!allowed || !checked}
                            onCheckedChange={(v) => setModuleFlag(key, actionKey, v)}
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                );

                return allowed ? row : (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>{row}</TooltipTrigger>
                    <TooltipContent>Restrito pelo sistema</TooltipContent>
                  </Tooltip>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  async function propagateProfileChanges(role: UserRole, modules: ModuleKey[]): Promise<number> {
    const { data: usersWithRole, error: usersErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', role as any);
    if (usersErr) throw usersErr;
    const userIds = (usersWithRole || []).map((u: any) => u.user_id);
    if (userIds.length === 0) return 0;

    const { error: delErr } = await supabase
      .from('user_module_permissions')
      .delete()
      .in('user_id', userIds);
    if (delErr) throw delErr;

    if (modules.length > 0) {
      const rows = userIds.flatMap((uid: string) =>
        modules.map((m) => ({ user_id: uid, module_key: m, is_allowed: true }))
      );
      const { error: insErr } = await (supabase as any)
        .from('user_module_permissions')
        .insert(rows);
      if (insErr) throw insErr;
    }
    return userIds.length;
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        role: editing.role,
        label: editing.label,
        modules: editing.modules,
        can_edit: editing.can_edit,
        can_create: editing.can_create,
        can_delete: editing.can_delete,
        can_export: editing.can_export,
        can_view_values: editing.can_view_values,
        can_view_hr_costs: editing.can_view_hr_costs,
        can_allocate: editing.can_allocate,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from('role_profiles')
        .upsert(payload, { onConflict: 'role' });
      if (error) throw error;

      const { error: deleteActionError } = await (supabase as any)
        .from('role_module_permissions')
        .delete()
        .eq('role', editing.role);
      if (deleteActionError) throw deleteActionError;

      const actionRows = MODULE_CATALOG
        .filter((mod) => isRoleAllowedForModule(editing.role, mod.key))
        .map((mod) => {
          const hasAccess = editing.modules.includes(mod.key);
          const flags = hasAccess
            ? (editing.moduleActions[mod.key] || DEFAULT_ACTION_FLAGS_BY_ROLE[editing.role])
            : EMPTY_ACTION_FLAGS;
          return {
            role: editing.role,
            module_key: mod.key,
            can_access: hasAccess,
            can_edit: hasAccess && flags.can_edit,
            can_create: hasAccess && flags.can_create,
            can_delete: hasAccess && flags.can_delete,
            can_export: hasAccess && flags.can_export,
            can_view_values: hasAccess && flags.can_view_values,
            can_view_hr_costs: hasAccess && flags.can_view_hr_costs,
            can_allocate: hasAccess && flags.can_allocate,
            updated_at: new Date().toISOString(),
          };
        });

      if (actionRows.length > 0) {
        const { error: insertActionError } = await (supabase as any)
          .from('role_module_permissions')
          .insert(actionRows);
        if (insertActionError) throw insertActionError;
      }

      const affected = await propagateProfileChanges(editing.role, editing.modules);

      setProfiles((prev) => ({ ...prev, [editing.role]: { ...editing } }));
      toast.success(`Perfil atualizado e propagado para ${affected} usuário${affected === 1 ? '' : 's'}`);
      setEditing(null);
    } catch (e: any) {
      toast.error('Erro ao salvar perfil: ' + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Perfis"
          description="Configure módulos e permissões por perfil de usuário."
        />

        {loadingData ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ROLE_ORDER.map((role) => {
              const row = buildRowFor(role);
              return (
                <Card
                  key={role}
                  className="flex flex-col cursor-pointer hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(role)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openEdit(role);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{roleLabels[role]}</CardTitle>
                      <Badge variant="outline" className={roleColors[role]}>
                        {role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{row.modules.length}</span>{' '}
                      módulo{row.modules.length === 1 ? '' : 's'} habilitado
                      {row.modules.length === 1 ? '' : 's'}
                    </p>
                    <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openEdit(role); }} className="w-full">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
            {editing && (
              <>
                <SheetHeader>
                  <SheetTitle>Configurar perfil: {editing.label}</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  <section className="space-y-4">
                    {MODULE_GROUPS.map((group) => renderModulePermissionsTable(group))}
                  </section>

                </div>

                <SheetFooter className="mt-6 flex-col sm:flex-row gap-2">
                  <Button variant="ghost" onClick={resetToDefault} disabled={saving}>
                    Resetar para padrão
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar alterações
                  </Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
