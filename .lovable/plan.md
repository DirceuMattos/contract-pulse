
# Plano: Aumentar Logo da Tela de Login para 300px

## Situação Atual
A logo no painel lateral esquerdo (área azul/gradiente) da tela de login está com **w-[200px]** (200px).

---

## Alteração Necessária

### Arquivo: `src/pages/LoginPage.tsx`

**Linha 80:**
```tsx
// Antes:
<img src={logoBnp} alt="BNP Logo" className="w-[200px] h-auto object-contain" />

// Depois:
<img src={logoBnp} alt="BNP Logo" className="w-[300px] h-auto object-contain" />
```

---

## Resultado Esperado
- Logo maior e mais destacada no painel lateral esquerdo da tela de login
- Aumento de 200px para 300px (50% maior)
- Apenas a logo desktop será afetada (a logo mobile permanece inalterada)

---

## Arquivos Alterados
- `src/pages/LoginPage.tsx` - Linha 80
