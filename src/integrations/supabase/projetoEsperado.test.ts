import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolverCredenciais, REF_ESPERADO } from './projetoEsperado';

const REF_ANTIGO = 'bjuxpqtsfnkaonczauxz';

describe('resolverCredenciais', () => {
  it('aceita o .env quando ele aponta para o projeto certo', () => {
    const r = resolverCredenciais(`https://${REF_ESPERADO}.supabase.co`, 'chave-qualquer');
    expect(r.veioDoAmbiente).toBe(true);
    expect(r.url).toContain(REF_ESPERADO);
    expect(r.chave).toBe('chave-qualquer');
  });

  it('IGNORA o .env quando ele aponta para o banco abandonado', () => {
    // Foi exatamente isto que colocou a producao no banco errado em 25/08.
    const r = resolverCredenciais(`https://${REF_ANTIGO}.supabase.co`, 'chave-do-banco-antigo');
    expect(r.veioDoAmbiente).toBe(false);
    expect(r.url).toContain(REF_ESPERADO);
    expect(r.url).not.toContain(REF_ANTIGO);
    expect(r.chave).not.toBe('chave-do-banco-antigo');
    expect(r.motivo).toContain(REF_ANTIGO);
  });

  it('cai nas constantes quando o .env some por completo', () => {
    for (const vazio of [undefined, '', '   ']) {
      const r = resolverCredenciais(vazio, vazio);
      expect(r.veioDoAmbiente).toBe(false);
      expect(r.url).toContain(REF_ESPERADO);
      expect(r.chave.length).toBeGreaterThan(100);
    }
  });

  it('não aceita URL certa com chave vazia', () => {
    const r = resolverCredenciais(`https://${REF_ESPERADO}.supabase.co`, '');
    expect(r.veioDoAmbiente).toBe(false);
  });

  it('a chave de emergência é do projeto esperado', () => {
    const { chave } = resolverCredenciais(undefined, undefined);
    const payload = JSON.parse(atob(chave.split('.')[1]));
    expect(payload.ref).toBe(REF_ESPERADO);
    expect(payload.role).toBe('anon');
  });
});

describe('a protecao continua ligada no client.ts', () => {
  // Catraca: o client.ts e um arquivo GERADO, e o Lovable ja o reescreveu uma
  // vez nesta semana. Se a regeneracao apagar a protecao, este teste falha
  // antes de a producao voltar a apontar para o banco errado.
  const client = readFileSync(resolve(process.cwd(), 'src/integrations/supabase/client.ts'), 'utf8');

  it('client.ts usa resolverCredenciais', () => {
    expect(client).toContain('resolverCredenciais');
  });

  it('as credenciais do cliente saem do resolvedor, e nao do .env cru', () => {
    // Precisao proposital: procurar "import.meta.env" no arquivo daria falso
    // positivo, porque o resolvedor recebe o .env como ENTRADA. O que importa
    // e de onde saem os valores usados no createClient.
    expect(client, 'SUPABASE_URL deixou de vir do resolvedor')
      .toMatch(/const SUPABASE_URL\s*=\s*credenciais\.url/);
    expect(client, 'SUPABASE_PUBLISHABLE_KEY deixou de vir do resolvedor')
      .toMatch(/const SUPABASE_PUBLISHABLE_KEY\s*=\s*credenciais\.chave/);
  });
});
