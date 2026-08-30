import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Prova de ponta a ponta da protecao do .env.
 *
 * Nao basta testar o resolvedor isolado: o que importa e o CLIENTE que a
 * aplicacao usa. Aqui o .env e envenenado exatamente como o Lovable o deixa
 * apos cada Publish, e verificamos para onde o cliente realmente aponta.
 *
 * Em 25/08 a producao passou a ler e escrever no banco abandonado por causa
 * disso, sem erro nenhum na tela. Este teste existe para que a proxima vez
 * falhe aqui, e nao em producao.
 */
describe('cliente Supabase com .env envenenado', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://bjuxpqtsfnkaonczauxz.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'chave-do-banco-antigo');
  });

  it('o cliente ignora o .env e usa o projeto correto', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    expect(url).toContain('shkovalhksqixbppcjnr');
    expect(url).not.toContain('bjuxpqtsfnkaonczauxz');
  });

  it('e com o .env correto, respeita o .env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://shkovalhksqixbppcjnr.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'chave-boa');
    const { supabase } = await import('@/integrations/supabase/client');
    const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    expect(url).toContain('shkovalhksqixbppcjnr');
  });
});
