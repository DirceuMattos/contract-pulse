

# Plano: Reduzir Logo da Barra Lateral

## Objetivo
Reduzir o tamanho da logomarca BNP apenas no componente Sidebar, mantendo a logo da página de login inalterada.

---

## Alterações

### Arquivo: `src/components/layout/Sidebar.tsx`

#### 1. Logo no Drawer Mobile (Linha 75)
```
Atual:  w-[200px] → 200px
Novo:   w-8       → 32px
```

#### 2. Logo no Sidebar Desktop Expandido (Linha 168)
```
Atual:  w-[200px] → 200px
Novo:   w-8       → 32px
```

#### 3. Logo no Sidebar Colapsado (Linha 177)
```
Atual:  w-[120px] → 120px
Novo:   w-6       → 24px
```

---

## Resumo

| Contexto | Tamanho Atual | Novo Tamanho |
|----------|---------------|--------------|
| Sidebar Mobile (Drawer) | 200px | 32px |
| Sidebar Desktop Expandido | 200px | 32px |
| Sidebar Desktop Colapsado | 120px | 24px |

---

## Arquivos Não Alterados
- `src/pages/LoginPage.tsx` - Mantém logo em 480px (desktop) e 400px (mobile)

---

## Resultado Esperado
- Logo compacta na barra lateral, proporcional ao layout do menu
- Logo grande mantida na tela de login
- Melhor equilíbrio visual entre logo e itens de navegação

