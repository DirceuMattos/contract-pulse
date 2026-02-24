

# Plano de Ajustes (7 itens)

## 1. Toasts no topo da tela, com cor diferenciada, duração máxima de 3s

**Problema**: O `TOAST_REMOVE_DELAY` em `src/hooks/use-toast.ts` está definido como `1000000` (~16 minutos). O toast aparece na parte inferior da tela.

**Solução**:
- **`src/hooks/use-toast.ts`**: Alterar `TOAST_REMOVE_DELAY` de `1000000` para `3000` (3 segundos).
- **`src/components/ui/toast.tsx`**: Alterar a posição do `ToastViewport` de `bottom` para `top` (classes: `top-0` em vez de `bottom-0`, e `sm:top-auto sm:bottom-0` removido).

---

## 2. Análise do Consultor (IA) deve ser gravada na simulação

**Problema**: O `insightText` gerado pela IA em `Step5Results.tsx` é armazenado apenas em `useState` local e se perde ao navegar ou recarregar.

**Solução**:
- **Banco de dados**: Adicionar coluna `consultant_analysis text` na tabela `simulations` (nullable, default NULL).
- **`src/types/index.ts`**: Adicionar `consultantAnalysis?: string` ao tipo `ContractSimulation`.
- **`src/lib/dbMappers.ts`**: Mapear `consultant_analysis` ↔ `consultantAnalysis` em `simulationFromDb` e `simulationToDb`.
- **`src/components/calculator/Step5Results.tsx`**: Inicializar `insightText` com `data.consultantAnalysis ?? ''`. Após gerar a análise com sucesso, chamar um callback `onChange` para persistir o campo `consultantAnalysis` no objeto da simulação.
- **`src/pages/CalculatorWizardPage.tsx`**: Passar `onChange` para `Step5Results` e ao receber `consultantAnalysis`, chamar `onChange({ consultantAnalysis: text })`.

---

## 3. Recursos Humanos estimados devem permanecer gravados

**Problema**: Quando `usingSuggested` é `true`, apenas os itens "suggested" são gravados e os "custom" ficam vazios. Ao editar qualquer campo, o sistema copia os suggested para custom e muda `usingSuggested` para `false`, mas ao recarregar a simulação, se `usingSuggested` ainda era `true`, os custom são perdidos.

**Análise do código**: O `persistSimulation` em `SimulationContext.tsx` grava tanto `suggestedHR` (com `isSuggested: true`) quanto `customHR` (com `isSuggested: false`). O `simulationFromDb` recupera ambos corretamente. O mecanismo parece correto.

**Verificação adicional**: O problema pode estar no fato de que quando o usuário está em modo "suggested" e não fez edições, `customHR` é uma cópia dos suggested. Ao gravar, ambos são inseridos (duplicados). Ao recarregar, os itens `isSuggested: false` populam o `customHR` corretamente.

**Ação**: Garantir que ao salvar, se `usingSuggested === true`, os `customHR` sejam populados com cópia dos suggested (já feito no `createBlank` e no `onChange`). Nenhuma alteração necessária se o fluxo já funciona. Vou verificar se há algum bug no fluxo de persistência durante a implementação.

---

## 4. Corrigir cálculo do custo total na tabela de RH do simulador

**Problema**: Na linha 188 de `Step4Resources.tsx`, o custo total é calculado como:
```
quantity * grossMonthly * (1 + chargesPercent / 100)
```
Esse cálculo está correto conceitualmente (quantidade × salário bruto × (1 + encargos%)). Porém, quando o usuário altera `quantity`, `grossMonthly` ou `chargesPercent` via `updateHR`, o `onChange` copia todo o array e marca `usingSuggested: false`, mas o valor na interface pode estar usando os arrays "suggested" em vez dos "custom" recém-atualizados.

**Análise**: Na linha 35, `const hr = data.usingSuggested ? data.suggestedHR : data.customHR;`. Quando o usuário edita, `updateHR` chama `onChange({ customHR: list, usingSuggested: false })`, mas o `onChange` no `CalculatorWizardPage` faz `setData(prev => ({ ...prev, ...updates }))`. Isso deveria funcionar.

**Possível bug**: Ao alterar o `hiringType` (linha 65-67), o `chargesPercent` é atualizado. Porém, o valor exibido na coluna "Custo total" usa `item.chargesPercent` do array `hr`, que pode ser o array `suggestedHR` no primeiro render antes do state atualizar. Preciso verificar se o problema é de timing/state.

**Ação**: Revisar o fluxo e garantir que o `hr` renderizado sempre reflete o estado mais recente. Possivelmente o problema está em que `getSourceHR()` faz `JSON.parse(JSON.stringify(...))`, criando uma cópia desconectada, e o `onChange` atualiza `customHR` mas o componente ainda renderiza `suggestedHR` se o state de `usingSuggested` não foi atualizado a tempo.

---

## 5. Intermediário deve poder incluir e editar clientes e contratos

**Problema**: O `canEdit` em `AuthContext.tsx` (linha 122) já retorna `true` para `intermediario`. As RLS policies no banco já permitem INSERT e UPDATE para `intermediario`. O problema relatado anteriormente era sobre rotas de criação no `moduleAccess.ts`.

**Análise do `moduleAccess.ts`**: Linhas 89 e 95 mostram que `/contratos/novo` mapeia para `CONTRACTS` e `/clientes/novo` mapeia para `CLIENTS`, ambos com `roleRestrictions: []` (todos os roles podem acessar). Isso está correto.

**Verificação**: Preciso verificar se há algum outro bloqueio na UI que impede intermediários. O `ContractFormPage.tsx` (linha 32) verifica `canEdit`, que é `true` para intermediários. Parece correto.

**Ação**: Verificar se o problema persiste ou se foi resolvido em atualizações anteriores. Se necessário, garantir que os botões "Novo Cliente" e "Novo Contrato" sejam visíveis para intermediários nas páginas de listagem.

---

## 6. Data de término não obrigatória quando renovação automática está ligada

**Problema**: No `contractFormSchema` (linha 126), `dataFim` é sempre `z.string().min(1, 'Data de término é obrigatória')`. No banco, a coluna `data_fim` é `NOT NULL` com default `CURRENT_DATE + 1 year`.

**Solução**:
- **`src/lib/validators.ts`**: Alterar `dataFim` para `z.string().optional().or(z.literal(''))`. Mover a validação de obrigatoriedade para um `refine` condicional: se `renovacaoAutomatica === false`, `dataFim` deve ser preenchido.
- **`src/components/forms/ContractForm.tsx`**: Remover o asterisco `*` da label "Data de Término" e torná-lo condicional (mostrar `*` apenas se renovação automática estiver desligada).
- **Banco de dados**: Alterar a coluna `data_fim` para `nullable`: `ALTER TABLE contracts ALTER COLUMN data_fim DROP NOT NULL;`
- **`src/lib/dbMappers.ts`**: Aplicar `emptyToNull` no campo `data_fim` do `contractToDb`.

---

## 7. Alterar label "Data base para renovação" → "Data base para reajuste"

**Problema**: No `ContractForm.tsx` (linha 502), o campo `renewalBaseDate` tem a label "Data base para renovação", mas deveria ser "Data base para reajuste" para coincidir com o campo no bloco de Reajuste.

**Solução**:
- **`src/components/forms/ContractForm.tsx`**: Alterar a `FormLabel` de "Data base para renovação" para "Data base para reajuste" (linha 502). Também ajustar a `FormDescription` correspondente.

---

## Sequência de Implementação

1. Migration de banco (adicionar `consultant_analysis` text à tabela `simulations`; alterar `data_fim` para nullable em `contracts`)
2. Alterar `TOAST_REMOVE_DELAY` e posição do toast
3. Atualizar tipos e mappers para `consultantAnalysis`
4. Atualizar `Step5Results` para persistir análise do consultor
5. Revisar cálculo de custo total no `Step4Resources`
6. Alterar schema de validação para `dataFim` condicional
7. Alterar labels no `ContractForm`
8. Verificar permissões do intermediário

