## Problema

No modo claro, os campos de formulário (Input, Textarea, Select) usam `bg-background` — exatamente a mesma cor do fundo da tela (`--background: 240 10% 95.5%`). E a borda (`--input: 256 1.3% 92.9%`) é ainda mais clara que o fundo, ficando praticamente invisível. Resultado: o campo "desaparece" no layout.

No modo escuro o problema não ocorre (o `--input` já é mais claro que o `--background`), então o ajuste fica restrito ao tema claro.

## Ajuste (mínimo e cirúrgico)

Duas mudanças apenas, sem mexer em nenhuma outra parte do sistema:

**1. `src/index.css` — token `--input` no `:root` (light mode)**
- Atual: `--input: 256 1.3% 92.9%` (mais claro que o fundo → invisível)
- Novo: `--input: 240 6% 82%` (cinza médio, contraste claro contra fundo e contra o branco do campo)
- Não altero o `--input` do `.dark`.

**2. `src/components/ui/input.tsx`, `textarea.tsx` e o trigger do `select.tsx`**
- Trocar `bg-background` por `bg-card` na classe base.
- `--card` já é `240 10% 98.5%` (quase branco) contra o fundo `95.5%` → cria a hierarquia "papel sobre superfície" que o usuário espera em formulários.
- Mantém todas as outras classes (altura, padding, focus ring, disabled, etc.) intocadas.
- No dark mode, `--card` continua escuro adequado, então o visual escuro não muda perceptivelmente.

## Fora de escopo (não vou tocar)

- Cores de fundo da página, sidebar, cards, botões, badges, gráficos.
- Variantes do shadcn que já sobrescrevem `bg-*` explicitamente (continuam como estão).
- Dark mode.
- Qualquer lógica de negócio ou layout.

## Resultado esperado

Campos de formulário em telas claras passam a aparecer como "ilhas" brancas com borda cinza nítida sobre o fundo levemente acinzentado — padrão consagrado de formulários (Linear, Notion, Stripe) — sem qualquer outra mudança visual no sistema.