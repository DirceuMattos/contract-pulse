import { SystemUser } from '@/types/systemUser';

export const mockSystemUsers: SystemUser[] = [
  {
    id: 'usr-001',
    name: 'Administrador Master',
    email: 'admin@bnp.com.br',
    role: 'c-level',
    active: true,
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
  },
  {
    id: 'usr-002',
    name: 'João Pereira',
    email: 'joao.pereira@bnp.com.br',
    role: 'intermediario',
    active: true,
    createdAt: '2023-02-15T14:30:00Z',
    updatedAt: '2024-06-20T09:00:00Z',
    createdBy: 'usr-001',
  },
  {
    id: 'usr-003',
    name: 'Maria Santos',
    email: 'maria.santos@bnp.com.br',
    role: 'leitor',
    active: true,
    createdAt: '2023-03-20T11:00:00Z',
    updatedAt: '2024-05-10T16:45:00Z',
    createdBy: 'usr-001',
  },
  {
    id: 'usr-004',
    name: 'Carlos Lima',
    email: 'carlos.lima@bnp.com.br',
    role: 'intermediario',
    active: false,
    createdAt: '2023-06-10T08:30:00Z',
    updatedAt: '2024-07-01T14:20:00Z',
    createdBy: 'usr-001',
  },
];
