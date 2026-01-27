

# Plano Corrigido: Reduzir Logo da Tela de Login

## Problema Identificado
O plano anterior modificou o arquivo errado (`Sidebar.tsx`). A logo que você deseja reduzir está na **página de login** (`LoginPage.tsx`), especificamente no painel azul à esquerda.

---

## Alterações Necessárias

### Arquivo: `src/pages/LoginPage.tsx`

#### 1. Logo Desktop - Painel Esquerdo (Linha 80)
```
Atual:  w-[480px] → 480px
Novo:   w-12      → 48px (redução de ~10x)
```

#### 2. Logo Mobile - Topo do Formulário (Linha 130)
```
Atual:  w-[400px] → 400px  
Novo:   w-10      → 40px (redução de ~10x)
```

---

## Resumo das Alterações

| Contexto | Tamanho Atual | Novo Tamanho |
|----------|---------------|--------------|
| Login Desktop (painel azul) | 480px | 48px |
| Login Mobile (topo) | 400px | 40px |

---

## Arquivos Não Alterados
- `src/components/layout/Sidebar.tsx` - Mantém as alterações já realizadas (w-8 e w-6)

---

## Resultado Esperado
- Logo proporcional no painel de login, harmonizando com o texto "BNP Contratos"
- Layout visual mais equilibrado na tela de entrada
- Sidebar do dashboard permanece com logo compacta conforme já alterado

