import { UserRole } from './index';
import { ModuleKey } from './moduleAccess';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  moduleAccess?: Record<ModuleKey, boolean>;
}

export interface SystemUserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  moduleAccess?: Record<ModuleKey, boolean>;
}
