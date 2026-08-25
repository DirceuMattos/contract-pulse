import { supabase } from '@/integrations/supabase/client';

/**
 * Chamada de RPC para funções que ainda não existem em types.ts (arquivo
 * gerado). Some quando os tipos forem regerados.
 *
 * POR QUE ESTE HELPER EXISTE, E NÃO UM CAST SOLTO
 * A primeira versão fazia assim:
 *
 *     const rpc = supabase.rpc as unknown as (...) => ...;
 *     rpc('minha_funcao', { ... });
 *
 * Isso desliga o método do objeto. Dentro do supabase-js, `rpc` usa `this`
 * para montar a URL, então a chamada estourava com
 * "Cannot read properties of undefined (reading 'rest')" — e como o App
 * importa todas as telas estaticamente, o erro derrubava a aplicação inteira
 * na tela branca, não só a tela que chamou.
 *
 * O cast aqui é no CLIENTE, não no método: `client.rpc(...)` continua sendo
 * chamada de método, com o `this` preservado. Nunca extraia `.rpc` para uma
 * variável.
 */
export function callRpc<TData = unknown>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: TData | null; error: { message: string } | null }> {
  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: TData | null; error: { message: string } | null }>;
  };
  return client.rpc(fn, args);
}
