import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MODULE_CATALOG, getModuleKeyForRoute } from './moduleAccess';

/**
 * Catraca contra a falha de 25/08.
 *
 * O MainLayout e a UNICA barreira de rota do sistema (so 6 das 65 paginas tem
 * AccessGuard proprio), e ele decide chamando getModuleKeyForRoute. Rota que
 * esse mapa nao reconhece passa livre: qualquer usuario autenticado alcanca a
 * tela digitando a URL, ainda que o menu nao mostre o item.
 *
 * Foi assim que Gestao de Perfis, Deslocamentos, Horas Extras, Requisicao de
 * Vagas e Skills ficaram abertas a todos os perfis.
 */

/** Rotas que devem mesmo passar sem modulo: publicas ou de conta/ajuda. */
const LIBERADAS_DE_PROPOSITO = new Set([
  '/', '*',
  '/login', '/esqueci-senha', '/redefinir-senha', '/trocar-senha',
  '/seguranca', '/trust',
]);
const PREFIXOS_LIBERADOS = ['/ajuda'];

function rotasDoApp(): string[] {
  // resolve a partir da raiz do projeto: import.meta.url vira URL http sob o Vite
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  return [...new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]))];
}

function concreta(rota: string): string {
  return rota.replace(/:[A-Za-z]+/g, 'abc-123');
}

describe('toda rota do App tem porteiro', () => {
  it('nenhuma rota de modulo passa sem ser reconhecida', () => {
    const semPorteiro = rotasDoApp().filter((r) => {
      if (LIBERADAS_DE_PROPOSITO.has(r)) return false;
      if (PREFIXOS_LIBERADOS.some((p) => r.startsWith(p))) return false;
      return getModuleKeyForRoute(concreta(r)) === undefined;
    });
    expect(semPorteiro, `rotas alcancaveis por URL sem checagem de modulo: ${semPorteiro.join(', ')}`).toEqual([]);
  });
});

describe('as rotas declaradas no catalogo resolvem para o proprio modulo', () => {
  for (const mod of MODULE_CATALOG) {
    for (const rota of mod.routes) {
      it(`${mod.key}: ${rota}`, () => {
        expect(getModuleKeyForRoute(concreta(rota))).toBe(mod.key);
      });
    }
  }
});

describe('as telas sensiveis nao ficam sem porteiro', () => {
  const casos: Array<[string, string]> = [
    ['/usuarios/perfis', 'PROFILES_ADMIN'],
    ['/usuarios/logs', 'ACCESS_LOGS'],
    ['/usuarios', 'USERS_ADMIN'],
    ['/configuracoes', 'SETTINGS'],
    ['/importar-exportar', 'IMPORT_EXPORT'],
    ['/adm-transportes', 'TRANSPORT'],
    ['/horas-extras', 'OVERTIME'],
    ['/requisicao-vagas', 'JOB_REQUESTS'],
    ['/skills-vagas', 'JOB_SKILLS'],
  ];
  for (const [rota, modulo] of casos) {
    it(`${rota} -> ${modulo}`, () => {
      expect(getModuleKeyForRoute(rota)).toBe(modulo);
    });
  }
});
