

## Gerar Logo para Aprovação

Vou criar uma edge function `generate-logo` que usa o modelo `google/gemini-3-pro-image-preview` para gerar o ícone do sistema e retorná-lo como base64. Depois vou invocá-la para mostrar o resultado.

### Implementação

1. **Criar** `supabase/functions/generate-logo/index.ts` — edge function que chama a AI gateway com o prompt refinado focado em pessoas + tecnologia + azul predominante, e retorna a imagem base64
2. **Registrar** no `supabase/config.toml` com `verify_jwt = false`
3. **Deploy e invocar** para gerar a imagem
4. **Salvar como** `src/assets/logo-system-v5.png` e mostrar para aprovação

### Prompt de geração

> "Create a minimalist modern logo icon for a corporate system called BNPContractCore that manages contracts, finances and people. The icon should combine stylized human figures connected by digital network lines and nodes, representing the union of people and technology. Predominant color: royal blue (#1E40AF) with accents of bright blue (#2563EB) and subtle white details. Flat vector style, clean geometric shapes, no gradients, no text, transparent background. Suitable for display at 128px and 48px. Corporate tech aesthetic, professional and memorable."

### Após geração

A imagem será salva como asset e apresentada na conversa. Nenhuma alteração será feita nos componentes até aprovação explícita.

