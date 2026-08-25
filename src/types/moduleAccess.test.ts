import { describe, it, expect } from 'vitest';
import { getDefaultModuleAccess, isRoleAllowedForModule, MODULE_CATALOG } from './moduleAccess';

describe('perfil Projetos-Produtos', () => {
  const acesso = getDefaultModuleAccess('projetos_produtos');

  it('enxerga exatamente quatro módulos, e nenhum outro', () => {
    const liberados = Object.entries(acesso).filter(([, v]) => v).map(([k]) => k).sort();
    expect(liberados).toEqual(['JOB_REQUESTS', 'JOB_SKILLS', 'REPORTS', 'SQUADS']);
  });

  it('está fora do Dashboard de Contratos e dos Alertas', () => {
    // As Mensagens do sino continuam: o NotificationCenter vive no Header e não
    // depende do módulo ALERTS.
    expect(acesso.DASHBOARD).toBe(false);
    expect(acesso.ALERTS).toBe(false);
  });

  it('está fora de Clientes, Contratos e submódulos', () => {
    expect(acesso.CLIENTS).toBe(false);
    expect(acesso.CONTRACTS).toBe(false);
    expect(acesso.CONTRACT_DETAIL).toBe(false);
    expect(acesso.RESOURCES).toBe(false);
    expect(acesso.HISTORY).toBe(false);
    expect(acesso.DOCUMENTS).toBe(false);
  });

  it('está fora de RH, HEs e Deslocamentos', () => {
    expect(acesso.HR).toBe(false);
    expect(acesso.OVERTIME).toBe(false);
    expect(acesso.TRANSPORT).toBe(false);
  });

  it('continua fora dos módulos administrativos', () => {
    expect(acesso.USERS_ADMIN).toBe(false);
    expect(acesso.ACCESS_LOGS).toBe(false);
    expect(acesso.PROFILES_ADMIN).toBe(false);
    expect(acesso.SETTINGS).toBe(false);
    expect(acesso.IMPORT_EXPORT).toBe(false);
  });

  it('o login passa a cair em Squads', () => {
    const destino = MODULE_CATALOG.find(
      (m) => m.routes.length > 0 && !m.isSubmodule && acesso[m.key] && isRoleAllowedForModule('projetos_produtos', m.key),
    );
    expect(destino?.routes[0]).toBe('/squads');
  });
});

describe('nenhum outro perfil foi afetado pelo ajuste de Projetos-Produtos', () => {
  // Rede de seguranca depois do incidente de 25/08: mexer num perfil nao pode
  // encolher outro.
  const casos = [
    ['lider_tribo', ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'SQUADS', 'HR', 'OVERTIME', 'TRANSPORT', 'REPORTS', 'SUPPORT_COSTS']],
    ['administrativo', ['DASHBOARD', 'HR_DASHBOARD', 'CLIENTS', 'CONTRACTS', 'HR', 'OVERTIME', 'TRANSPORT', 'REPORTS']],
    ['c-level', ['DASHBOARD', 'HR_DASHBOARD', 'CLIENTS', 'CONTRACTS', 'HR', 'OVERTIME', 'TRANSPORT', 'REPORTS', 'USERS_ADMIN']],
    ['rh', ['HR_DASHBOARD', 'HR', 'OVERTIME', 'TRANSPORT', 'REPORTS']],
    ['coordenacao_suporte', ['DASHBOARD', 'CLIENTS', 'CONTRACTS', 'SQUADS', 'HR', 'REPORTS', 'EQUIPMENT']],
  ] as const;

  for (const [papel, modulos] of casos) {
    it(`${papel} continua com os módulos que já tinha`, () => {
      const acesso = getDefaultModuleAccess(papel);
      for (const m of modulos) {
        expect(acesso[m as keyof typeof acesso], `${papel} perdeu ${m}`).toBe(true);
      }
    });
  }
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
