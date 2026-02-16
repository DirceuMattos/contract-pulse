

# Correcao: Tags coloridas e margem em R$ no card de saude do detalhe do contrato

## Problema

No primeiro card da pagina de detalhes do contrato (`ContractDetailPage.tsx`), o badge de saude usa classes aplicadas diretamente sobre o Badge default, fazendo com que o fundo primario sobreponha as cores padrao. Alem disso, o card exibe apenas a margem percentual, sem o valor em R$.

## Alteracoes no arquivo `src/pages/ContractDetailPage.tsx`

### 1. Badge de saude colorido (linhas 221-227)

Substituir o Badge atual por `variant="outline"` com `className={cn('border-0', hc.badgeClass)}`, usando `healthConfig` de `uiConstants.ts` em vez das variaveis locais `healthLabels`. Isso e o mesmo padrao ja aplicado com sucesso em `CalculatorPage.tsx`.

Tambem importar `healthConfig` de `@/lib/uiConstants` e adicionar `Tooltip`/`TooltipTrigger`/`TooltipContent` ao redor do badge para exibir o tooltip padrao.

### 2. Exibir margem em R$ ao lado do percentual (linhas 232-240)

Dentro do bloco `canViewValues`, adicionar o valor `health.resultadoMensal` (diferenca receita - custo) formatado com `formatCurrency` e precedido de sinal (+/-), na mesma linha ou logo abaixo do percentual. A cor segue a mesma logica condicional (verde/amarelo/vermelho).

Layout resultante:
```
Margem Mensal
18,5%  |  +R$ 12.345/mes
```

### 3. Remover variaveis locais redundantes

Remover `healthLabels` local (linhas 61-65) ja que `healthConfig` do `uiConstants` contem os mesmos labels e mais informacoes.

### Resumo tecnico

| Linha(s) | Mudanca |
|----------|---------|
| 1-55 (imports) | Adicionar import de `healthConfig` de `@/lib/uiConstants` |
| 61-65 | Remover `healthLabels` local |
| 221-227 | Badge com `variant="outline"` + `cn('border-0', healthConfig[health.status].badgeClass)` + Tooltip |
| 232-240 | Adicionar valor da margem mensal em R$ com cor condicional |

