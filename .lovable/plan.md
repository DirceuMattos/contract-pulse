
# Revisao Visual do Modulo Squads -- Cards Coloridos + Lista Nominal RH

## Resumo

Reescrever a UI do `SquadsPage.tsx` para um layout estilo "dashboard de cards coloridos", onde cada card representa um projeto (Cliente/Contrato). Os cards terao header colorido por saude financeira, exibirao distribuicao por equipe com barras, e listarao recursos RH com **nome + cargo + dedicacao%** (sem regime de contratacao). Adicionar toggle Compacto/Detalhado.

---

## Alteracoes

### 1. `src/pages/SquadsPage.tsx` (reescrita significativa)

**Mudancas na UI:**

- **Remover toggle "Por Contrato / Por Cliente"** -- agora sempre mostra grid de cards por projeto; filtro por cliente permanece como filtro global
- **Adicionar toggle "Compacto / Detalhado"** no lugar do agrupamento
  - Compacto: mostra apenas barras de equipe + contagem de RH por equipe (ex.: "Desenvolvimento (3)")
  - Detalhado (default): mostra accordions por equipe com lista nominal de RH
- **Cards coloridos por saude financeira:**
  - Header com faixa de cor + borda lateral usando as variaveis CSS ja existentes (`--health-healthy`, `--health-attention`, `--health-critical`)
  - Saudavel: borda-esquerda verde + header tint verde
  - Atencao: borda-esquerda amarela + header tint amarelo
  - Critico: borda-esquerda vermelha + header tint vermelho
- **Grid responsivo:** `grid grid-cols-1 lg:grid-cols-2 gap-4`
- **Busca expandida:** pesquisa tambem em nome do recurso, nome do cliente e codigo do contrato (alem de cargo)

**Mudancas no conteudo do card:**

- Header: Cliente + Codigo Contrato + Badge Gov/Privado + Badge saude
- Mini-resumo: "Total alocado: X,XX FTE" + "RH: N"
- Corpo (Camada A): barras por equipe (mantidas como estao)
- Corpo (Camada B -- modo Detalhado): accordion por equipe listando cada RH como:
  ```
  Maria Silva -- Dev Full Stack -- 50%
  ```
  Formato: `nome -- cargo -- dedicacao%`
  - Se `nome` vazio: exibir "Sem nome"
  - Sem exibicao de tipo/regime (CLT/PJ) -- removido
  - Badge ">100%" mantido para dedicacao acima de 100%

**Mudancas na exportacao:**

- Remover coluna "Tipo" do export CSV/XLSX
- Adicionar coluna "Nome RH" (campo `nome` do recurso)
- Colunas finais: Cliente, Contrato, Equipe, Nome RH, Cargo/Funcao, Dedicacao (%), FTE

**Acoes no card (novas):**

- Botao "Ver contrato" -> navega para `/contratos/:id`
- Botao "Ver recursos" -> navega para `/contratos/:id` (aba recursos)

### 2. Nenhuma alteracao em outros arquivos

O campo `nome` ja existe no `Resource` (linha 125 de `types/index.ts`). As variaveis CSS de saude ja existem. Nao e necessario alterar tipos, mock data, rotas ou sidebar.

---

## Detalhes tecnicos

### Cores dos cards (implementacao CSS inline)

Usar classes condicionais baseadas em `healthStatus`:

```typescript
const healthCardStyles: Record<string, string> = {
  saudavel: 'border-l-4 border-l-[hsl(var(--health-healthy))]',
  atencao: 'border-l-4 border-l-[hsl(var(--health-attention))]',
  critico: 'border-l-4 border-l-[hsl(var(--health-critical))]',
};

const healthHeaderStyles: Record<string, string> = {
  saudavel: 'bg-[hsl(var(--health-healthy-bg))]',
  atencao: 'bg-[hsl(var(--health-attention-bg))]',
  critico: 'bg-[hsl(var(--health-critical-bg))]',
};
```

### Toggle Compacto/Detalhado

Estado `viewMode: 'compact' | 'detailed'` (default: `'detailed'`).

- Compacto: renderiza apenas barras de equipe; cada barra mostra tambem `(N)` com contagem de recursos; nao mostra accordions
- Detalhado: abre automaticamente todos os accordions por equipe, listando os componentes RH

### Linha de RH (modo Detalhado)

```tsx
<div className="flex items-center gap-2 text-sm py-1.5">
  <span className="font-medium">{r.nome || 'Sem nome'}</span>
  <span className="text-muted-foreground">--</span>
  <span className="text-muted-foreground">{r.cargo || 'Sem cargo'}</span>
  <span className="ml-auto tabular-nums font-medium">{r.percentualDedicacao}%</span>
  {r.percentualDedicacao > 100 && <Badge variant="destructive">&gt;100%</Badge>}
</div>
```

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/SquadsPage.tsx` | Mod | Reescrita visual: grid de cards coloridos, toggle compacto/detalhado, lista nominal RH, remocao de regime |

## Preservacao

- Toda logica de consolidacao (mapeamento cargo->equipe->team, calculos FTE) permanece identica
- Filtros por cliente, contrato e equipe permanecem
- Exportacao CSV/XLSX preservada (apenas ajuste de colunas)
- Nenhuma alteracao em tipos, rotas, sidebar, DataContext ou permissoes
- Campo `nome` do Resource ja existe; nao precisa de alteracao no modelo
