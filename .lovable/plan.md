
# Plano: Substituição da Logo BNP em Todo o Sistema

## Objetivo
Substituir o ícone placeholder `Building2` pela logo oficial da BNP em todas as páginas e componentes do sistema.

---

## Fase 1: Adicionar Logo ao Projeto

### 1.1 Copiar Arquivo
- Copiar a logo de `user-uploads://LOGO-BNP---3.png` para `src/assets/logo-bnp.png`
- Usar a pasta `src/assets` para melhor integração com React e bundling otimizado

---

## Fase 2: Atualizar Página de Login (LoginPage.tsx)

### 2.1 Logo Desktop (Painel Esquerdo)
**Localização**: Linhas 68-73
```
Atual: Ícone Building2 dentro de div com fundo branco/10
Novo:  Imagem da logo com tamanho apropriado (48x48px ou similar)
```
- Importar a logo como módulo ES6
- Substituir o ícone por `<img src={logoBnp} alt="BNP Logo" />`
- Ajustar classes para manter proporções

### 2.2 Logo Mobile (Topo do Formulário)
**Localização**: Linhas 130-138
```
Atual: Ícone Building2 menor (w-6 h-6)
Novo:  Imagem da logo redimensionada (32x32px ou 40x40px)
```
- Usar a mesma imagem importada
- Ajustar tamanho para versão mobile

---

## Fase 3: Atualizar Sidebar (Sidebar.tsx)

### 3.1 Logo no Drawer Mobile
**Localização**: Linhas 66-72
```
Atual: Building2 (w-5 h-5) dentro de div com fundo sidebar-primary
Novo:  Imagem da logo (32x32px)
```

### 3.2 Logo no Sidebar Desktop Expandido
**Localização**: Linhas 130-136
```
Atual: Building2 (w-5 h-5)
Novo:  Imagem da logo (32x32px)
```

### 3.3 Logo no Sidebar Desktop Colapsado
**Localização**: Linhas 143-147
```
Atual: Building2 (w-5 h-5) centralizado
Novo:  Imagem da logo (32x32px) centralizada
```

---

## Resumo de Alterações por Arquivo

| Arquivo | Alterações |
|---------|------------|
| `src/assets/logo-bnp.png` | **NOVO** - Arquivo da logo copiado |
| `src/pages/LoginPage.tsx` | Importar logo, substituir 2 ícones Building2 |
| `src/components/layout/Sidebar.tsx` | Importar logo, substituir 3 ícones Building2 |

---

## Detalhes Técnicos

### Importação da Logo
```tsx
import logoBnp from '@/assets/logo-bnp.png';
```

### Componente de Imagem
```tsx
<img 
  src={logoBnp} 
  alt="BNP Logo" 
  className="w-8 h-8 object-contain"
/>
```

### Tamanhos por Contexto
- **Login Desktop**: 48x48px (logo grande no painel esquerdo)
- **Login Mobile**: 40x40px (logo no topo do formulário)
- **Sidebar Expandido/Mobile**: 32x32px (logo compacta)
- **Sidebar Colapsado**: 32x32px (apenas a logo visível)

---

## Resultado Esperado
- Logo BNP oficial visível em todas as páginas
- Branding consistente em toda a aplicação
- Logo adaptada para diferentes tamanhos de tela
- Remoção completa do ícone placeholder Building2 dos locais de branding
