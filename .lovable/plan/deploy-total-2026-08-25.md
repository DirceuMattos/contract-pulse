# Deploy Total

## Objetivo
Realizar o deploy completo do projeto: backend (edge functions) + frontend (publicação).

## Passos

1. **Verificar achados de segurança** — rodar `security--get_scan_results` e confirmar que não há findings críticos abertos. Se houver críticos, parar e reportar antes de publicar.
2. **Deploy das Edge Functions** — listar as funções em `supabase/functions/` e fazer o deploy de todas via `supabase--deploy_edge_functions`.
3. **Publicar o frontend** — chamar `preview_ui--publish` para atualizar https://bnphub.com.

## Critério de parada
Sem findings críticos → prosseguir com deploy e publicação. Caso apareça algum finding crítico, interromper e avisar o usuário.
