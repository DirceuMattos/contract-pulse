import { UserRole } from './index';
import { MODULE_CATALOG, ModuleKey, getDefaultModuleAccess } from './moduleAccess';

export interface ActionFlags {
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_view_values: boolean;
  can_view_hr_costs: boolean;
  can_allocate: boolean;
}

export type ActionFlagKey = keyof ActionFlags;
export type ModuleActionPermissions = Partial<Record<ModuleKey, ActionFlags>>;

export const ACTION_FLAG_LABELS: { key: ActionFlagKey; label: string }[] = [
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_create', label: 'Criar' },
  { key: 'can_delete', label: 'Excluir' },
  { key: 'can_export', label: 'Exportar' },
  { key: 'can_view_values', label: 'Ver valores' },
  { key: 'can_view_hr_costs', label: 'Custos RH' },
  { key: 'can_allocate', label: 'Alocar' },
];

export const EMPTY_ACTION_FLAGS: ActionFlags = {
  can_edit: false,
  can_create: false,
  can_delete: false,
  can_export: false,
  can_view_values: false,
  can_view_hr_costs: false,
  can_allocate: false,
};

export const DEFAULT_ACTION_FLAGS_BY_ROLE: Record<UserRole, ActionFlags> = {
  'c-level': { can_edit: true, can_create: true, can_delete: true, can_export: true, can_view_values: true, can_view_hr_costs: true, can_allocate: true },
  superadmin: { can_edit: true, can_create: true, can_delete: true, can_export: true, can_view_values: true, can_view_hr_costs: true, can_allocate: true },
  intermediario: { can_edit: true, can_create: true, can_delete: true, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: true },
  administrativo: { can_edit: true, can_create: true, can_delete: true, can_export: true, can_view_values: true, can_view_hr_costs: true, can_allocate: true },
  lider_tribo: { can_edit: true, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: true },
  rh: { can_edit: true, can_create: true, can_delete: true, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: true },
  juridico: { can_edit: false, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: false },
  comercial: { can_edit: false, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: false },
  demo: { can_edit: false, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: false },
  leitor: { can_edit: false, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: false },
  coordenacao_suporte: { can_edit: true, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: true },
  projetos_produtos: { can_edit: true, can_create: false, can_delete: false, can_export: false, can_view_values: false, can_view_hr_costs: false, can_allocate: false },
};

export function getDefaultActionFlagsForRole(role: UserRole): ActionFlags {
  return { ...DEFAULT_ACTION_FLAGS_BY_ROLE[role] };
}

export function getDefaultModuleActionPermissions(role: UserRole): ModuleActionPermissions {
  const access = getDefaultModuleAccess(role);
  const defaultFlags = getDefaultActionFlagsForRole(role);
  const permissions: ModuleActionPermissions = {};

  for (const mod of MODULE_CATALOG) {
    permissions[mod.key] = access[mod.key] ? { ...defaultFlags } : { ...EMPTY_ACTION_FLAGS };
  }

  return permissions;
}
