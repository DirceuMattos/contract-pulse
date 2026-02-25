

# Plano: Ajustes nos Filtros e Scroll da Listagem RH

**Arquivo unico**: `src/pages/HRPeoplePage.tsx`

## 1. Quebrar filtros em 2 linhas

Reorganizar a grid de filtros de uma unica linha `xl:grid-cols-8` para duas linhas logicas:
- **Linha 1**: Campo de busca (col-span maior) + Situacao + Departamento + Vinculo
- **Linha 2**: Cargo + Comite Gestor + Admissao (input month) + Botao "Limpar filtros"

Usar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` para que os campos se distribuam naturalmente em 2 linhas em telas grandes, sem forcar 8 colunas comprimidas.

## 2. Botao de limpeza de filtros

Adicionar uma funcao `handleClearFilters` que reseta todos os estados:
- `search` → `''`
- `filterSituacao` → `'ativo'` (valor padrao)
- `filterTeam` → `''`
- `filterCargo` → `''`
- `filterVinculo` → `''`
- `filterComite` → `''`
- `filterAdmissao` → `''`

Calcular `hasActiveFilters` (boolean) para mostrar o botao apenas quando algum filtro estiver diferente do padrao. Renderizar um `<Button variant="outline">` com icone `X` e texto "Limpar" na segunda linha dos filtros.

## 3. Adicionar opcao "Cooperado" no filtro de vinculo

No `<Select>` de vinculo (linha 217-223), adicionar:
```
<SelectItem value="cooperado">Cooperado</SelectItem>
```

## 4. Corrigir label do filtro de Comite

O item 4 da solicitacao menciona "2o campo filtro de indicacao" — parece referir-se ao filtro de Comite Gestor ja existente. Verificar que o placeholder/label esta claro ("Comitê Gestor").

## 5. Remover scroll vertical, manter apenas horizontal

O `ScrollArea` atual com `max-h-[calc(100vh-340px)]` esta criando um container com scroll vertical interno que conflita com o scroll da pagina. Remover a restricao de `max-h` do ScrollArea para que a tabela ocupe sua altura natural (sem scroll vertical interno). Manter apenas o scroll horizontal com `overflow-x-auto` no wrapper da tabela:

Substituir `<ScrollArea className="max-h-[calc(100vh-340px)]">` por um simples `<div className="overflow-x-auto">` com `<div className="min-w-[1100px]">` dentro, eliminando o ScrollArea/ScrollBar do Radix que estava causando o problema do scroll vertical.

## 6. Filtro de admissao

O filtro de admissao ja existe no codigo (linhas 241-254) com `<input type="month">`. Ele sera mantido e reposicionado na nova disposicao de 2 linhas para ficar visivel.

## Resumo das alteracoes

1. Grid de filtros: de `xl:grid-cols-8` para layout em 2 linhas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
2. Novo botao "Limpar filtros" com logica `hasActiveFilters`
3. `<SelectItem value="cooperado">Cooperado</SelectItem>` no filtro de vinculo
4. Remover `ScrollArea`/`max-h`, usar `overflow-x-auto` simples para scroll horizontal sem scroll vertical interno

