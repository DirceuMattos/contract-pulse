

# Plano de Ajustes (9 itens)

## Resumo dos Itens

1. Adicionar "Extensão de Acessibilidade" na lista de categorias de Outros recursos (formulário de contratos)
2. Máscara de telefone no simulador e em todo o sistema
3. Máscara de valores monetários com 2 casas decimais e comportamento de edição correto
4. Permitir múltiplos tipos de demanda no simulador
5. Preferência de vínculo por função na tela de recursos do simulador (PO, Dev, QA = PJ; Suporte = CLT)
6. Adicionar "Extensão de Acessibilidade" em Outros Custos do simulador
7. Melhorar layout da listagem de pessoas no módulo RH
8. Incluir coluna Local de Atuação na aba Alocações do detalhe da pessoa
9. Auditar e corrigir erros de gravação no backend

---

## Detalhes Técnicos

### 1. Categoria "Extensão de Acessibilidade" (Recursos de Contratos)

- **Database**: Adicionar valor `'acessibilidade'` ao enum `other_cost_category` via migration.
- **`src/types/index.ts`**: Adicionar `'acessibilidade'` ao tipo `OtherCostCategory`.
- **`src/components/forms/ResourceForm.tsx`**: Adicionar `{ value: 'acessibilidade', label: 'Extensão de Acessibilidade' }` ao array `categoriaOptions`.

### 2. Máscara de Telefone

Criar uma função utilitária `formatPhoneInput(value: string)` que aplica a máscara `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX` conforme quantidade de dígitos. Aplicar nos seguintes pontos:
- **`src/components/calculator/Step1Identification.tsx`** — campo `responsavelClienteTelefone`
- **`src/components/forms/ContractForm.tsx`** — campo `responsavelClienteTelefone`
- **`src/components/forms/ClientForm.tsx`** — campo `telefone`
- **`src/components/hr/HRPersonForm.tsx`** — campo `celular`

A função extrai apenas dígitos, limita a 11 e formata progressivamente.

### 3. Máscara de Valores Monetários

Problema atual: campos `type="number"` não exibem 2 casas decimais e causam problemas de edição no primeiro dígito à direita. A solução é criar um componente `CurrencyInput` que:
- Usa `type="text"` (não `type="number"`)
- Ao receber foco, mostra o valor "cru" para edição livre
- Ao perder foco (blur), formata com `toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Aceita vírgula como separador decimal

Aplicar em todos os campos de valor monetário nos seguintes componentes:
- `Step1Identification.tsx` (consultancyCost)
- `Step4Resources.tsx` (grossMonthly, valueMonthly)
- `Step5Results.tsx` (proposedMonthlyValue, proposedTotalValue)
- `ResourceForm.tsx` (custoBase)
- `ContractForm.tsx` (valorMensalReferencia, valorTotalContrato)

### 4. Tipo de Demanda Multi-select no Simulador

- **`src/types/index.ts`**: Alterar `demandType: DemandType` para `demandType: DemandType[]` em `SimulationQuestionnaire`.
- **`src/components/calculator/Step3Questionnaire.tsx`**: Substituir o `<Select>` por um conjunto de checkboxes (ou multi-select com badges) para permitir seleção múltipla.
- **`src/lib/simulationEngine.ts`**: Ajustar `generateSuggestedResources` e `getAppliedRules` para agregar perfis de todos os tipos de demanda selecionados (unindo os recursos HR de cada perfil, somando quantidades quando a função se repete).
- **`src/lib/dbMappers.ts`**: Ajustar serialização do campo `questionnaire` (já é JSONB, então suporta array naturalmente). Garantir retrocompatibilidade com dados existentes (string antiga vira array de 1 item).
- **Banco de dados**: Nenhuma alteração necessária (campo `questionnaire` é JSONB).

### 5. Preferência de Vínculo (PJ/CLT) por Função no Simulador

- **`src/lib/simulationEngine.ts`**: Criar um mapa `DEFAULT_HIRING_TYPE` indicando a preferência:
  ```
  'Product Owner' → 'pj'
  'Desenvolvedor' → 'pj'
  'QA' → 'pj'
  'Suporte' → 'clt'
  'Tech Lead' → 'pj' (manter CLT ou PJ conforme padrão)
  'UX Designer' → 'pj'
  'DevOps' → 'pj'
  ```
- Na função `generateSuggestedResources`, usar `DEFAULT_HIRING_TYPE[role]` em vez de `'clt'` hardcoded, e aplicar o percentual de encargos correspondente (CLT ou PJ).

### 6. "Extensão de Acessibilidade" nos Outros Custos do Simulador

- **`src/components/calculator/Step4Resources.tsx`**: No método `addOC`, alterar a categoria padrão ou apenas garantir que o campo seja editável com texto livre (atualmente `category` é string livre).
- **`src/lib/simulationEngine.ts`**: Opcionalmente, adicionar uma regra que sugira "Extensão de Acessibilidade" como custo adicional quando relevante — ou simplesmente deixar disponível para inclusão manual.

Os "Outros Custos" do simulador usam `category` como texto livre (não enum). Portanto, basta documentar a opção. Se quiser um dropdown, será necessário converter para select com opções pré-definidas incluindo "Extensão de Acessibilidade".

### 7. Melhorar Layout da Listagem de Pessoas (RH)

- **`src/pages/HRPeoplePage.tsx`**: Reduzir o tamanho da fonte das células da tabela (usar `text-xs` em vez de `text-sm`), condensar as colunas e possivelmente:
  - Usar `whitespace-nowrap` e `truncate` nos nomes
  - Reduzir padding das células com classes como `py-2`
  - Agrupar Remuneração + Benefícios em uma única coluna "Custo Total"
  - Limitar largura máxima da coluna "Nome" com `max-w-[180px] truncate`
  - Ajustar badges para tamanho menor (`text-xs`)

### 8. Local de Atuação na Aba Alocações

- **`src/pages/HRPersonDetailPage.tsx`**: Na aba "Alocações" (linhas 287-323), adicionar uma coluna "Local de Atuação" que exibe `person.localAtuacao`. Como a informação de local vem do cadastro da pessoa (não do recurso alocado), adicionar uma coluna fixa mostrando o valor de `person.localAtuacao`.

Observação: se o campo `localAtuacao` deveria ser por alocação (por contrato), seria necessário adicionar um campo `local_atuacao` na tabela `resources`. Pela descrição ("da planilha migrada, coluna Local_Atuacao"), parece que o valor está no cadastro do profissional e deve ser exibido na aba.

### 9. Auditoria e Correção de Erros de Gravação

A análise dos logs do banco mostra um erro recente: `invalid input syntax for type date: ""`. Isso indica que campos de data opcionais estão enviando strings vazias `""` em vez de `null` para o banco.

Pontos a corrigir:
- **`src/lib/dbMappers.ts`**: Em todos os mappers `*ToDb`, garantir que campos de data opcionais com valor `""` ou `undefined` sejam convertidos para `null`:
  - `contractToDb`: `data_fim`, `renewal_base_date`, `data_base_reajuste`
  - `resourceToDb`: `data_inicio`, `data_fim`
  - `hrPersonToDb`: `data_admissao`, `data_desligamento`
  - `simulationToDb`: `expected_start_date`

- **`src/contexts/SimulationContext.tsx`**: O `persistSimulation` deleta e re-insere rows filhas (HR items, other costs). Se a simulação tiver `id` gerado como `sim-${Date.now()}` mas o banco espera UUID, isso causa erro. Verificar se a coluna `id` aceita text ou exige UUID. A tabela `simulations.id` é `uuid` com default `gen_random_uuid()` — portanto, IDs como `sim-12345` causarão erro de tipo. Corrigir para usar `crypto.randomUUID()` em vez de `sim-${Date.now()}`.

- **Regra geral**: Criar uma função helper `emptyToNull(value)` que converte `""` → `null` e `undefined` → `null`, e aplicar em todos os campos nullable dos mappers.

- **SimulationContext**: O `upsert` com `.eq('id', sim.id)` não é a sintaxe correta para upsert no Supabase JS. O `.eq()` após `.upsert()` é desnecessário e pode causar problemas. Corrigir para usar apenas `.upsert(data, { onConflict: 'id' })`.

---

## Sequência de Implementação

1. Migration de banco (adicionar `'acessibilidade'` ao enum)
2. Criar helper `emptyToNull` e `formatPhoneInput` em `src/lib/utils.ts`
3. Criar componente `CurrencyInput`
4. Aplicar correções nos mappers (`dbMappers.ts`)
5. Corrigir geração de UUID no SimulationContext
6. Atualizar tipos (`index.ts`) — `OtherCostCategory`, `demandType` para array
7. Atualizar `simulationEngine.ts` — preferências PJ/CLT e multi-demanda
8. Atualizar UI do simulador (Step1, Step3, Step4, Step5)
9. Atualizar formulários (ResourceForm, ContractForm, ClientForm, HRPersonForm)
10. Melhorar layout da listagem RH
11. Adicionar localAtuacao na aba Alocações

