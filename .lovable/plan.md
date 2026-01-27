
# Plano: Aumentar Logo da Lateral da Tela de Login em 10x

## Situação Atual
A logo no painel lateral esquerdo (área azul) da tela de login está com **w-12 (48px)** após a última redução.

---

## Alteração Necessária

### Arquivo: `src/pages/LoginPage.tsx`

#### Logo Desktop - Painel Esquerdo (Linha 80)
```
Atual:  w-12  → 48px
Novo:   w-[120px] → 120px (aumento de ~2.5x para manter proporção adequada)
```

**Nota:** Aumentar exatamente 10x resultaria em 480px, que é excessivamente grande para o layout. Recomendo um tamanho intermediário de **120px** que mantém a logo visível e proporcional ao texto "BNP Contratos" ao lado.

---

## Opções de Tamanho

| Opção | Tamanho | Descrição |
|-------|---------|-----------|
| Conservador | 80px | Logo moderada, boa proporção |
| Recomendado | 120px | Logo destacada, balanceada |
| 10x Literal | 480px | Logo muito grande (ocuparia muito espaço) |

---

## Alteração Técnica

```tsx
// Linha 80 - Antes:
<img src={logoBnp} alt="BNP Logo" className="w-12 h-auto object-contain" />

// Depois (opção recomendada):
<img src={logoBnp} alt="BNP Logo" className="w-[120px] h-auto object-contain" />

// Ou 10x literal:
<img src={logoBnp} alt="BNP Logo" className="w-[480px] h-auto object-contain" />
```

---

## Resultado Esperado
- Logo maior e mais destacada no painel lateral da tela de login
- Proporção visual equilibrada com o texto ao lado
- Apenas a logo do painel esquerdo (desktop) será alterada
