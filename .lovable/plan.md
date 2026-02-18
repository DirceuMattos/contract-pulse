

## Transformar campo "Nome/Pessoa" em Select com preenchimento automatico do custo

### Objetivo
Para recursos do tipo CLT ou PJ, o campo "Nome / Pessoa" deixara de ser um Input de texto livre e passara a ser um Select com a lista de pessoas ja cadastradas na base. Ao selecionar uma pessoa existente, o campo "Valor Mensal" sera preenchido automaticamente com o ultimo valor cadastrado para aquela pessoa, mas permanecera editavel.

### Como vai funcionar
1. Ao abrir o formulario de recurso CLT ou PJ, o campo "Nome / Pessoa" exibira um dropdown com todos os nomes distintos ja cadastrados na tabela `resources` (tipos `clt` e `pj`), junto com o ultimo custo base associado.
2. Ao selecionar um nome existente, o campo de custo mensal (custoBase) sera preenchido automaticamente com o valor mais recente daquela pessoa.
3. O usuario podera alterar livremente o valor preenchido -- ele serve apenas como sugestao.
4. Havera uma opcao "Outro..." no final da lista para digitar um nome novo (mesmo padrao do campo "Cargo").
5. Um botao "Lista" permitira voltar ao modo Select.
6. Para recursos do tipo "Outros", nada muda.

### Detalhes tecnicos

**1. Buscar nomes distintos com ultimo custo (`src/contexts/DataContext.tsx`)**
- Adicionar funcao que consulta a tabela `resources` e retorna uma lista de objetos `{ nome: string, custoBase: number }` para recursos do tipo `clt` ou `pj`.
- A query agrupara por nome e retornara o custo base do registro mais recente (`ORDER BY updated_at DESC`).
- Expor essa lista no contexto (ex: `distinctHRNames`).

**2. Alterar `src/components/forms/ResourceForm.tsx`**
- Importar a lista `distinctHRNames` do DataContext.
- Adicionar estado `customNome` (boolean), similar ao `customCargo` existente (linha 103).
- Verificar se o nome do recurso em edicao ja existe na lista (`existingNomeInList`), similar ao `existingCargoInList` (linha 106).
- Substituir o bloco do campo "nome" (linhas 226-243) por logica condicional:
  - Se `customNome === true` ou nome atual nao esta na lista: exibir Input + botao "Lista".
  - Caso contrario: exibir Select com nomes distintos + opcao "Outro...".
- Ao selecionar um nome no Select:
  - Preencher `field.onChange(nome)`.
  - Buscar o `custoBase` correspondente na lista e chamar `form.setValue('custoBase', valor)`.
- O campo "custoBase" continua sendo um Input numerico editavel -- nenhuma alteracao na sua renderizacao.
- A logica so se aplica quando `tipoAtual !== 'outro'`.

**3. Nenhuma mudanca no banco de dados**
- A consulta usa a tabela `resources` existente.
- Nao sao necessarias migracoes.

### Arquivos alterados
- `src/contexts/DataContext.tsx` -- adicionar funcao para buscar nomes distintos de RH com ultimo custo base
- `src/components/forms/ResourceForm.tsx` -- trocar Input por Select condicional no campo "nome" e preencher custoBase ao selecionar

### Experiencia do usuario
- Ao criar/editar recurso CLT ou PJ, o campo mostrara um dropdown com nomes como "Bianca Dezorzi", "Danilo Shiguenori", etc.
- Ao selecionar um nome, o campo de valor mensal sera preenchido com o ultimo valor registrado (ex: R$ 12.500,00), mas o usuario pode alterar.
- Selecionar "Outro..." permite digitar um nome e valor novos.
- Para recursos do tipo "Outros" (cloud, licencas), nenhuma alteracao.

