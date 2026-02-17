
# Ajustes: Edicao de Recursos, Sidebar Light Mode, Tabela de Cargos

Tres correcoes/melhorias incrementais, sem alterar backend ou fluxos existentes.

---

## 1. Sidebar -- corrigir cores no modo claro

### Problema
No modo claro (light mode), a sidebar tem fundo escuro (`--sidebar-background: 222 47% 11%`) mas o `--sidebar-foreground` aponta para uma cor escura (`265 4% 12.9%`), tornando os itens de menu invisiveis. Apenas o item ativo (usando `--sidebar-primary`) fica legivel.

### Solucao
Alterar as variaveis CSS de sidebar no `:root` (light mode) em `src/index.css`:
- `--sidebar-foreground`: mudar para cor clara (`210 40% 98%`) para contraste com fundo escuro
- `--sidebar-primary`: mudar para cor de destaque clara (`162 63% 50%` ou similar emerald)
- `--sidebar-primary-foreground`: manter claro
- `--sidebar-accent`: fundo semi-transparente claro (`222 47% 18%`)
- `--sidebar-accent-foreground`: texto claro
- `--sidebar-border`: ajustar para borda sutil sobre fundo escuro (`0 0% 100% / 10%`)

Arquivo: `src/index.css` (linhas 89-98 no bloco `:root`)

---

## 2. Recursos do contrato -- edicao conforme nivel de acesso

### Situacao atual
O botao "Adicionar Recurso" e os botoes de edicao/exclusao ja estao condicionados a `canEdit` (c-level e intermediario). Porem, para recursos de RH (CLT/PJ), usuarios que nao sao c-level nao deveriam poder editar/excluir, pois nao podem ver os custos.

### Ajuste
Em `src/pages/ContractResourcesPage.tsx`:
- Para recursos do tipo `clt` ou `pj`: condicionar botoes de edicao/exclusao a `canEdit && canViewHRCosts` (apenas C-Level pode editar RH)
- Para recursos do tipo `outro`: manter `canEdit` como esta (C-Level e Intermediario)
- O botao "Adicionar Recurso" no header permanece visivel para `canEdit`, mas o formulario `ResourceForm` ja separa por tipo

### Linhas afetadas
- Linhas 449-468 (botoes de acao por recurso): adicionar condicao `!(isHR && !canViewHRCosts)` ao `canEdit`

---

## 3. Tabela de Cargos -- select no formulario de recursos + CRUD em Configuracoes

### O que muda
Substituir o campo de texto livre "Cargo / Papel" no `ResourceForm` por um `Select` alimentado por uma lista de cargos gerenciavel.

### Implementacao

**a) Tipo e dados mock**
- Adicionar tipo `JobTitle` em `src/types/index.ts`: `{ id: string; label: string; isActive: boolean }`
- Adicionar lista mock `defaultJobTitles` em `src/data/mockData.ts` com cargos iniciais: Desenvolvedor Frontend, Desenvolvedor Backend, Desenvolvedor Full Stack, Analista de Sistemas, Analista de Dados, DBA, Tech Lead, Scrum Master, Product Owner, Gerente de Projetos, Arquiteto de Software, DevOps Engineer, QA / Tester, UX Designer, Analista de Suporte

**b) DataContext**
- Adicionar estado `jobTitles` com CRUD (add, update, delete, getActive) em `src/contexts/DataContext.tsx`
- Persistir em localStorage com chave `bnp_job_titles`
- Incluir no `resetToDemo`

**c) ResourceForm**
- Em `src/components/forms/ResourceForm.tsx`, substituir o `Input` do campo "Cargo" (linhas 239-251) por um `Select` populado com os cargos ativos do contexto
- Adicionar opcao "Outro..." que permite digitar um cargo customizado em um Input (fallback)
- O campo `cargo` do recurso continua sendo uma string (compativel com dados existentes)

**d) Configuracoes -- secao Cargos**
- Em `src/pages/SettingsPage.tsx`, adicionar um novo `Card` "Tabela de Cargos" com:
  - Lista dos cargos existentes com botoes editar/excluir
  - Botao "Adicionar Cargo"
  - Dialog simples para criar/editar cargo (campo label)
  - Toggle ativo/inativo por cargo
- Visivel e editavel apenas para `canEdit` (C-Level)
- Cargos inativos nao aparecem no select do ResourceForm

---

## Resumo de arquivos

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/index.css` | Mod | Corrigir variaveis de cor da sidebar no light mode |
| `src/types/index.ts` | Mod | Adicionar tipo `JobTitle` |
| `src/data/mockData.ts` | Mod | Adicionar `defaultJobTitles` |
| `src/contexts/DataContext.tsx` | Mod | Adicionar estado e CRUD de `jobTitles` |
| `src/components/forms/ResourceForm.tsx` | Mod | Campo cargo como Select com fallback |
| `src/pages/SettingsPage.tsx` | Mod | Secao de gerenciamento de cargos |
| `src/pages/ContractResourcesPage.tsx` | Mod | Condicionar edicao de RH a `canViewHRCosts` |

## Ordem de implementacao

1. Sidebar (CSS) -- correcao rapida e isolada
2. Permissao de edicao de recursos -- alteracao pontual
3. Tabela de cargos -- tipo + mock + contexto + form + configuracoes
