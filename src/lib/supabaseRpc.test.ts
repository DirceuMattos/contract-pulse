import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regressão do incidente de 24/08: a chamada de RPC estava sendo feita com o
 * método destacado do objeto (`const rpc = supabase.rpc; rpc(...)`), o que
 * perdia o `this` e estourava "Cannot read properties of undefined (reading
 * 'rest')" — derrubando a aplicação inteira, porque o App importa todas as
 * telas estaticamente.
 *
 * O teste finge um cliente que só funciona quando `rpc` é chamado COMO
 * MÉTODO, exatamente como o supabase-js real.
 */
const clienteFalso = {
  marcador: 'sou o cliente',
  rpc(this: { marcador?: string } | undefined, fn: string, args?: Record<string, unknown>) {
    // Reproduz a dependência de `this` do supabase-js.
    if (!this || !this.marcador) {
      throw new TypeError("Cannot read properties of undefined (reading 'rest')");
    }
    return Promise.resolve({ data: { fn, args } as unknown, error: null });
  },
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: clienteFalso }));

let callRpc: typeof import('./supabaseRpc').callRpc;

beforeEach(async () => {
  ({ callRpc } = await import('./supabaseRpc'));
});

describe('callRpc', () => {
  it('chama rpc preservando o this do cliente', async () => {
    await expect(callRpc('minha_funcao', { a: 1 })).resolves.toEqual({
      data: { fn: 'minha_funcao', args: { a: 1 } },
      error: null,
    });
  });

  it('funciona sem argumentos', async () => {
    const { data } = await callRpc('sem_args');
    expect(data).toEqual({ fn: 'sem_args', args: undefined });
  });

  it('demonstra o bug que este helper evita: método destacado perde o this', () => {
    const destacado = clienteFalso.rpc;
    expect(() => destacado('minha_funcao')).toThrow(/reading 'rest'/);
  });
});
