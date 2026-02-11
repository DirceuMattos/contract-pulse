import { AccessLogSession } from '@/types';

function daysAgo(days: number, hours = 9, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function addHours(iso: string, h: number, m = 0): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + h, d.getMinutes() + m);
  return d.toISOString();
}

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.2',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) Chrome/119.0.0.0',
];

export const mockAccessLogs: AccessLogSession[] = [
  // usr-001 - Admin Master (8 sessions)
  {
    id: 'log-001', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(28, 8, 30), endedAt: addHours(daysAgo(28, 8, 30), 4, 15),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Usuarios'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-001', '/usuarios'],
    lastActivityAt: addHours(daysAgo(28, 8, 30), 4, 10),
  },
  {
    id: 'log-002', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(25, 9, 0), endedAt: addHours(daysAgo(25, 9, 0), 6, 30),
    modulesAccessed: ['Dashboard', 'Clientes', 'Cliente:Detalhe', 'Contratos', 'Configuracoes'],
    routesAccessed: ['/dashboard', '/clientes', '/clientes/cli-001', '/contratos', '/configuracoes'],
    lastActivityAt: addHours(daysAgo(25, 9, 0), 6, 25),
  },
  {
    id: 'log-003', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '10.0.1.50', userAgent: userAgents[2],
    startedAt: daysAgo(20, 14, 0), endedAt: addHours(daysAgo(20, 14, 0), 2, 45),
    modulesAccessed: ['Dashboard', 'Alertas', 'Contratos'],
    routesAccessed: ['/dashboard', '/alertas', '/contratos'],
    lastActivityAt: addHours(daysAgo(20, 14, 0), 2, 40),
  },
  {
    id: 'log-004', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(15, 10, 0), endedAt: addHours(daysAgo(15, 10, 0), 3, 0),
    modulesAccessed: ['Dashboard', 'Usuarios', 'Configuracoes', 'Importar/Exportar'],
    routesAccessed: ['/dashboard', '/usuarios', '/configuracoes', '/importar-exportar'],
    lastActivityAt: addHours(daysAgo(15, 10, 0), 2, 55),
  },
  {
    id: 'log-005', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(10, 8, 0), endedAt: addHours(daysAgo(10, 8, 0), 7, 30),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Contrato:Recursos', 'Clientes'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-002', '/contratos/ctr-002/recursos', '/clientes'],
    lastActivityAt: addHours(daysAgo(10, 8, 0), 7, 25),
  },
  {
    id: 'log-006', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '10.0.2.100', userAgent: userAgents[3],
    startedAt: daysAgo(5, 9, 30), endedAt: addHours(daysAgo(5, 9, 30), 5, 0),
    modulesAccessed: ['Dashboard', 'Alertas', 'Contratos', 'Contrato:Detalhe'],
    routesAccessed: ['/dashboard', '/alertas', '/contratos', '/contratos/ctr-003'],
    lastActivityAt: addHours(daysAgo(5, 9, 30), 4, 55),
  },
  {
    id: 'log-007', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(2, 8, 0), endedAt: addHours(daysAgo(2, 8, 0), 8, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Clientes', 'Usuarios', 'Configuracoes', 'Alertas'],
    routesAccessed: ['/dashboard', '/contratos', '/clientes', '/usuarios', '/configuracoes', '/alertas'],
    lastActivityAt: addHours(daysAgo(2, 8, 0), 7, 50),
  },
  {
    id: 'log-008', userId: 'usr-001', userNameSnapshot: 'Administrador Master',
    ipAddress: '192.168.1.10', userAgent: userAgents[0],
    startedAt: daysAgo(0, 8, 0), endedAt: null,
    modulesAccessed: ['Dashboard', 'Contratos'],
    routesAccessed: ['/dashboard', '/contratos'],
    lastActivityAt: daysAgo(0, 9, 15),
  },
  // usr-002 - João Pereira (8 sessions)
  {
    id: 'log-009', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(27, 9, 0), endedAt: addHours(daysAgo(27, 9, 0), 3, 30),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-001'],
    lastActivityAt: addHours(daysAgo(27, 9, 0), 3, 25),
  },
  {
    id: 'log-010', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(22, 10, 0), endedAt: addHours(daysAgo(22, 10, 0), 5, 0),
    modulesAccessed: ['Dashboard', 'Clientes', 'Cliente:Detalhe', 'Contratos', 'Contrato:Edicao'],
    routesAccessed: ['/dashboard', '/clientes', '/clientes/cli-002', '/contratos', '/contratos/ctr-002/editar'],
    lastActivityAt: addHours(daysAgo(22, 10, 0), 4, 50),
  },
  {
    id: 'log-011', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '10.0.3.15', userAgent: userAgents[2],
    startedAt: daysAgo(18, 13, 0), endedAt: addHours(daysAgo(18, 13, 0), 4, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Recursos'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-003/recursos'],
    lastActivityAt: addHours(daysAgo(18, 13, 0), 3, 55),
  },
  {
    id: 'log-012', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(12, 8, 30), endedAt: addHours(daysAgo(12, 8, 30), 6, 0),
    modulesAccessed: ['Dashboard', 'Alertas', 'Contratos', 'Contrato:Detalhe', 'Clientes'],
    routesAccessed: ['/dashboard', '/alertas', '/contratos', '/contratos/ctr-004', '/clientes'],
    lastActivityAt: addHours(daysAgo(12, 8, 30), 5, 50),
  },
  {
    id: 'log-013', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(8, 9, 0), endedAt: addHours(daysAgo(8, 9, 0), 4, 30),
    modulesAccessed: ['Dashboard', 'Contratos'],
    routesAccessed: ['/dashboard', '/contratos'],
    lastActivityAt: addHours(daysAgo(8, 9, 0), 4, 25),
  },
  {
    id: 'log-014', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '10.0.3.15', userAgent: userAgents[2],
    startedAt: daysAgo(4, 14, 0), endedAt: addHours(daysAgo(4, 14, 0), 3, 0),
    modulesAccessed: ['Dashboard', 'Clientes', 'Contratos', 'Importar/Exportar'],
    routesAccessed: ['/dashboard', '/clientes', '/contratos', '/importar-exportar'],
    lastActivityAt: addHours(daysAgo(4, 14, 0), 2, 55),
  },
  {
    id: 'log-015', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(1, 9, 0), endedAt: addHours(daysAgo(1, 9, 0), 7, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Contrato:Recursos', 'Alertas'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-001', '/contratos/ctr-001/recursos', '/alertas'],
    lastActivityAt: addHours(daysAgo(1, 9, 0), 6, 55),
  },
  {
    id: 'log-016', userId: 'usr-002', userNameSnapshot: 'João Pereira',
    ipAddress: '192.168.2.20', userAgent: userAgents[1],
    startedAt: daysAgo(0, 9, 30), endedAt: null,
    modulesAccessed: ['Dashboard'],
    routesAccessed: ['/dashboard'],
    lastActivityAt: daysAgo(0, 9, 45),
  },
  // usr-003 - Maria Santos (7 sessions)
  {
    id: 'log-017', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '192.168.3.30', userAgent: userAgents[3],
    startedAt: daysAgo(26, 10, 0), endedAt: addHours(daysAgo(26, 10, 0), 2, 0),
    modulesAccessed: ['Dashboard', 'Contratos'],
    routesAccessed: ['/dashboard', '/contratos'],
    lastActivityAt: addHours(daysAgo(26, 10, 0), 1, 55),
  },
  {
    id: 'log-018', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '192.168.3.30', userAgent: userAgents[3],
    startedAt: daysAgo(21, 14, 30), endedAt: addHours(daysAgo(21, 14, 30), 1, 30),
    modulesAccessed: ['Dashboard', 'Clientes', 'Cliente:Detalhe'],
    routesAccessed: ['/dashboard', '/clientes', '/clientes/cli-001'],
    lastActivityAt: addHours(daysAgo(21, 14, 30), 1, 25),
  },
  {
    id: 'log-019', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '10.0.4.25', userAgent: userAgents[0],
    startedAt: daysAgo(16, 9, 0), endedAt: addHours(daysAgo(16, 9, 0), 3, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Alertas'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-003', '/alertas'],
    lastActivityAt: addHours(daysAgo(16, 9, 0), 2, 55),
  },
  {
    id: 'log-020', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '192.168.3.30', userAgent: userAgents[3],
    startedAt: daysAgo(11, 10, 0), endedAt: addHours(daysAgo(11, 10, 0), 4, 30),
    modulesAccessed: ['Dashboard', 'Contratos', 'Clientes'],
    routesAccessed: ['/dashboard', '/contratos', '/clientes'],
    lastActivityAt: addHours(daysAgo(11, 10, 0), 4, 25),
  },
  {
    id: 'log-021', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '192.168.3.30', userAgent: userAgents[3],
    startedAt: daysAgo(7, 8, 30), endedAt: addHours(daysAgo(7, 8, 30), 5, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Contrato:Recursos'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-002', '/contratos/ctr-002/recursos'],
    lastActivityAt: addHours(daysAgo(7, 8, 30), 4, 55),
  },
  {
    id: 'log-022', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '10.0.4.25', userAgent: userAgents[0],
    startedAt: daysAgo(3, 13, 0), endedAt: addHours(daysAgo(3, 13, 0), 2, 30),
    modulesAccessed: ['Dashboard', 'Alertas'],
    routesAccessed: ['/dashboard', '/alertas'],
    lastActivityAt: addHours(daysAgo(3, 13, 0), 2, 25),
  },
  {
    id: 'log-023', userId: 'usr-003', userNameSnapshot: 'Maria Santos',
    ipAddress: '192.168.3.30', userAgent: userAgents[3],
    startedAt: daysAgo(1, 10, 0), endedAt: addHours(daysAgo(1, 10, 0), 3, 0),
    modulesAccessed: ['Dashboard', 'Clientes', 'Contratos'],
    routesAccessed: ['/dashboard', '/clientes', '/contratos'],
    lastActivityAt: addHours(daysAgo(1, 10, 0), 2, 55),
  },
  // usr-004 - Carlos Lima (7 sessions)
  {
    id: 'log-024', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '192.168.4.40', userAgent: userAgents[2],
    startedAt: daysAgo(24, 9, 0), endedAt: addHours(daysAgo(24, 9, 0), 4, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Contrato:Edicao'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-004', '/contratos/ctr-004/editar'],
    lastActivityAt: addHours(daysAgo(24, 9, 0), 3, 55),
  },
  {
    id: 'log-025', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '192.168.4.40', userAgent: userAgents[2],
    startedAt: daysAgo(19, 10, 30), endedAt: addHours(daysAgo(19, 10, 30), 3, 30),
    modulesAccessed: ['Dashboard', 'Clientes', 'Contratos'],
    routesAccessed: ['/dashboard', '/clientes', '/contratos'],
    lastActivityAt: addHours(daysAgo(19, 10, 30), 3, 25),
  },
  {
    id: 'log-026', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '10.0.5.60', userAgent: userAgents[1],
    startedAt: daysAgo(14, 8, 0), endedAt: addHours(daysAgo(14, 8, 0), 6, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Recursos', 'Alertas', 'Clientes'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-001/recursos', '/alertas', '/clientes'],
    lastActivityAt: addHours(daysAgo(14, 8, 0), 5, 55),
  },
  {
    id: 'log-027', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '192.168.4.40', userAgent: userAgents[2],
    startedAt: daysAgo(9, 9, 0), endedAt: addHours(daysAgo(9, 9, 0), 5, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-002'],
    lastActivityAt: addHours(daysAgo(9, 9, 0), 4, 55),
  },
  {
    id: 'log-028', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '192.168.4.40', userAgent: userAgents[2],
    startedAt: daysAgo(6, 13, 0), endedAt: addHours(daysAgo(6, 13, 0), 2, 0),
    modulesAccessed: ['Dashboard', 'Importar/Exportar'],
    routesAccessed: ['/dashboard', '/importar-exportar'],
    lastActivityAt: addHours(daysAgo(6, 13, 0), 1, 55),
  },
  {
    id: 'log-029', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '10.0.5.60', userAgent: userAgents[1],
    startedAt: daysAgo(3, 8, 30), endedAt: addHours(daysAgo(3, 8, 30), 4, 30),
    modulesAccessed: ['Dashboard', 'Contratos', 'Clientes', 'Alertas'],
    routesAccessed: ['/dashboard', '/contratos', '/clientes', '/alertas'],
    lastActivityAt: addHours(daysAgo(3, 8, 30), 4, 25),
  },
  {
    id: 'log-030', userId: 'usr-004', userNameSnapshot: 'Carlos Lima',
    ipAddress: '192.168.4.40', userAgent: userAgents[2],
    startedAt: daysAgo(1, 14, 0), endedAt: addHours(daysAgo(1, 14, 0), 3, 0),
    modulesAccessed: ['Dashboard', 'Contratos', 'Contrato:Detalhe', 'Contrato:Recursos'],
    routesAccessed: ['/dashboard', '/contratos', '/contratos/ctr-003', '/contratos/ctr-003/recursos'],
    lastActivityAt: addHours(daysAgo(1, 14, 0), 2, 55),
  },
];
