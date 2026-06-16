## Objetivo
Substituir o conteúdo da Edge Function `supabase/functions/report-generate-pptx/index.ts` pelo código PPTX fornecido pelo usuário.

## Alteração
- **Arquivo**: `supabase/functions/report-generate-pptx/index.ts`
- **Ação**: Substituição completa do conteúdo pelo código fornecido na mensagem (gerador PPTX com 9 slides, paleta BNP, retorno binário com Content-Disposition attachment).

## Escopo
- Apenas o arquivo acima será modificado.
- Nenhum outro arquivo (frontend, backend, configurações, outras funções) será alterado.
- O frontend que consome esta função não será ajustado neste passo (o retorno mudou de JSON para binário, o que exigirá ajuste futuro no handler de download do client-side).