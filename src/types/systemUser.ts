import { UserRole } from './index';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SystemUserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}
