import { describe, it, expect } from 'vitest';
import { getDefaultModuleAccess, isRoleAllowedForModule, MODULE_CATALOG } from './moduleAccess';

describe('perfil Projetos-Produtos', () => {
  const acesso = getDefaultModuleAccess('projetos_produtos');

  it('não enxerga o Dashboard de Contratos, Alertas nem Requisição de Vagas', () => {
    expect(acesso.DASHBOARD).toBe(false);
    expect(acesso.ALERTS).toBe(false);
    expect(acesso.JOB_REQUESTS).toBe(false);
  });

  it('mantém o que continua sendo do escopo dele', () => {
    expect(acesso.CLIENTS).toBe(true);
    expect(acesso.CONTRACTS).toBe(true);
    expect(acesso.SQUADS).toBe(true);
    expect(acesso.REPORTS).toBe(true);
    expect(acesso.JOB_SKILLS).toBe(true);
  });

  it('continua fora dos módulos administrativos', () => {
    expect(acesso.USERS_ADMIN).toBe(false);
    expect(acesso.ACCESS_LOGS).toBe(false);
    expect(acesso.PROFILES_ADMIN).toBe(false);
    expect(acesso.SETTINGS).toBe(false);
  });

  it('sobra ao menos um módulo de página inteira para servir de destino após o login', () => {
    const destino = MODULE_CATALOG.find(
      (m) => m.routes.length > 0 && !m.isSubmodule && acesso[m.key] && isRoleAllowedForModule('projetos_produtos', m.key),
    );
    expect(destino?.routes[0]).toBe('/clientes');
  });
});

describe('Logs de Acesso', () => {
  it('é exclusivo do Superadmin', () => {
    expect(isRoleAllowedForModule('superadmin', 'ACCESS_LOGS')).toBe(true);
    for (const papel of ['c-level', 'administrativo', 'rh', 'lider_tribo', 'projetos_produtos', 'demo'] as const) {
      expect(isRoleAllowedForModule(papel, 'ACCESS_LOGS')).toBe(false);
    }
  });
});

describe('Head de Área', () => {
  const acesso = getDefaultModuleAccess('head');

  it('enxerga requisição de equipamentos e relatórios mensais, e nada além', () => {
    const liberados = Object.entries(acesso).filter(([, v]) => v).map(([k]) => k).sort();
    expect(liberados).toEqual(['EQUIPMENT_REQUESTS', 'REPORTS']);
  });

  it('REPORTS não é mais negado na camada de roleRestrictions', () => {
    // Era aqui que a liberação morria: sem 'head' na lista do módulo, nenhuma
    // configuração de banco ou de tela conseguia abrir os relatórios.
    expect(isRoleAllowedForModule('head', 'REPORTS')).toBe(true);
  });

  it('passa a ter um módulo de página inteira, então o login tem destino', () => {
    const destino = MODULE_CATALOG.find(
      (m) => m.routes.length > 0 && !m.isSubmodule && acesso[m.key] && isRoleAllowedForModule('head', m.key),
    );
    expect(destino?.routes[0]).toBe('/relatorios');
  });
});
