

## Criação da Logomarca do Sistema BNPContractCore

### Contexto

O sistema é um core empresarial que gerencia contratos, finanças e pessoas. A logo da BNP (logo-bnp.png) deve ser **mantida** — a nova logomarca do sistema será um **ícone complementar** que coexiste com a logo corporativa.

### Abordagem

1. **Gerar o ícone do sistema** via edge function usando o modelo `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — rápido e alta qualidade). O ícone será minimalista/moderno: formas geométricas representando contratos e conexões, paleta verde-esmeralda (#10B981) e azul-escuro, fundo transparente, estilo flat.

2. **Salvar o ícone** no bucket `contract-documents` como `system-assets/logo-system.png` e também copiar para `public/logo-system.png` para uso como favicon.

3. **Distribuição no layout** — BNP logo + ícone do sistema lado a lado:

```text
SIDEBAR EXPANDIDA:
┌──────────────────────────┐
│ [BNP Logo]  [Ícone] BNP │
│             Contratos    │
└──────────────────────────┘

SIDEBAR COLAPSADA:
┌────────┐
│ [Ícone]│
└────────┘

LOGIN (painel esquerdo):
┌───────────────────────────────┐
│ [BNP Logo 300px]              │
│ [Ícone] BNPContractCore      │
└───────────────────────────────┘

LOGIN (mobile):
┌─────────────────────┐
│ [BNP Logo] [Ícone]  │
│ BNPContractCore     │
└─────────────────────┘
```

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/generate-logo/index.ts` | Edge function para gerar ícone via AI e retornar base64 |
| `src/pages/LoginPage.tsx` | Adicionar ícone do sistema ao lado da logo BNP |
| `src/components/layout/Sidebar.tsx` | Ícone do sistema na sidebar (expandida: ao lado da logo BNP; colapsada: só o ícone) |
| `index.html` | Atualizar favicon para o novo ícone |

### Fluxo de implementação

1. Criar edge function `generate-logo` que chama a AI gateway com prompt descritivo, recebe o base64 da imagem e salva no storage
2. Criar uma página/botão admin (ou executar uma vez) para gerar e salvar o ícone
3. Referenciar a imagem salva no storage nos componentes (sidebar, login, favicon)
4. Manter a logo BNP em todas as posições atuais — o ícone do sistema é um complemento

### Prompt de geração da logomarca

> "Create a minimalist modern logo icon for a corporate contract management system called BNPContractCore. The icon should use geometric shapes suggesting contracts, connections between people, and financial management. Use emerald green (#10B981) and dark navy blue (#1E3A5F) colors. Flat design, clean lines, suitable for 48px and 128px sizes. White/transparent background. No text in the icon."

