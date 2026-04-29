## Timeline: gerar evento de "reajuste" para mudanças em remuneração/benefícios

Alterar apenas `src/pages/HRPersonDetailPage.tsx`, dentro de `handleEdit` (linhas 153–172).

### Comportamento atual
Toda mudança detectada (incluindo remuneração e benefícios) entra na lista `changes` e é gravada como evento `ocorrencia: 'observacao'`.

### Mudança
1. Capturar separadamente a string da mudança de remuneração (`remuneracaoChange`) e a de benefícios (`beneficiosChange`), continuando a empurrá-las em `changes`.
2. No loop de criação de eventos, para cada `change`:
   - Se for `remuneracaoChange` ou `beneficiosChange` → `ocorrencia: 'reajuste'`; caso contrário → mantém `'observacao'`.
   - Se for `remuneracaoChange` → incluir `remuneracaoApos: data.remuneracaoMensal`.
   - Se for `beneficiosChange` → incluir `beneficiosApos: data.beneficios`.
   - `atualizarRemuneracao: false` mantido (pois `updatePerson` já foi chamado antes).
   - `descricao` permanece exatamente a mesma já gerada.

Nenhuma outra parte da `handleEdit` ou de qualquer outro arquivo será modificada.