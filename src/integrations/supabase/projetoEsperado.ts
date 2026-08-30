/**
 * Qual projeto Supabase a aplicação DEVE usar.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O `.env` do repositório deixou de ser confiável. O Lovable o reescreve a
 * cada Publish, apontando de volta para `bjuxpqtsfnkaonczauxz` — o banco
 * abandonado na migração de 22/08. Isso aconteceu três vezes em 25/08, e na
 * última a produção passou a ler e escrever na base errada, em silêncio, sem
 * nenhum erro na tela. Só a aba Network denunciou.
 *
 * Corrigir o arquivo no repositório não resolve, porque o Lovable sobrescreve
 * de novo. E corrigir no editor do Lovable deixou de ser possível: depois da
 * mudança de plano, o `.env` ficou somente leitura.
 *
 * COMO FUNCIONA
 * O `.env` continua sendo a fonte — quando aponta para o projeto certo. Se
 * apontar para outro, é ignorado e valem as constantes abaixo. Ou seja, o
 * arquivo pode ser corrompido à vontade que a aplicação não vai junto.
 *
 * ISSO É TEMPORÁRIO
 * Assim que a hospedagem sair do Lovable, as variáveis passam a vir do
 * Cloudflare Pages — onde a variável de ambiente vence o arquivo, verificado
 * em build real. Aí este arquivo vira só uma checagem de sanidade.
 *
 * A chave abaixo é a `anon`, pública por definição: ela já viaja dentro do
 * bundle que qualquer visitante baixa. Não é segredo, e não substitui a
 * `service_role`, que nunca deve aparecer no front.
 */
export const REF_ESPERADO = 'shkovalhksqixbppcjnr';

const URL_ESPERADA = `https://${REF_ESPERADO}.supabase.co`;
const CHAVE_ESPERADA =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoa292YWxoa3NxaXhicHBjam5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTczNjEsImV4cCI6MjA4NDU5MzM2MX0.b3mu6ou_oqcB2_NMvm9Bz9gNZBYshlGb2zmxVmgynZE';

export interface CredenciaisResolvidas {
  url: string;
  chave: string;
  /** true quando o .env foi aceito; false quando foi ignorado por apontar errado. */
  veioDoAmbiente: boolean;
  /** Preenchido só quando houve divergência, para registro no console. */
  motivo?: string;
}

/**
 * Decide de onde vêm as credenciais.
 *
 * Aceita o ambiente apenas se a URL contiver o ref esperado. Qualquer outra
 * coisa — vazio, indefinido, ou o projeto antigo — cai nas constantes.
 */
export function resolverCredenciais(
  urlDoAmbiente: string | undefined,
  chaveDoAmbiente: string | undefined,
): CredenciaisResolvidas {
  const url = (urlDoAmbiente ?? '').trim();
  const chave = (chaveDoAmbiente ?? '').trim();

  if (url.includes(REF_ESPERADO) && chave.length > 0) {
    return { url, chave, veioDoAmbiente: true };
  }

  const motivo = url.length === 0
    ? 'VITE_SUPABASE_URL vazia ou ausente'
    : `VITE_SUPABASE_URL aponta para outro projeto: ${url}`;

  return { url: URL_ESPERADA, chave: CHAVE_ESPERADA, veioDoAmbiente: false, motivo };
}
