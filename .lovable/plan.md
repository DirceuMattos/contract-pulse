

## Diagnóstico: Sincronização Feedz não atualiza salário e cargo

### Causa Raiz Identificada

O problema está na **função de hash de idempotência** (`computePayloadHash`, linha 52-63 do `feedz-sync/index.ts`).

O hash é calculado usando apenas estes campos:
```
['nome', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 'data_admissao', 'data_desligamento']
```

**`remuneracao_mensal` NÃO está incluído no hash.**

O fluxo de atualização (CASE C, linha 458-547) funciona assim:
1. Calcula o `payloadHash` do registro Feedz
2. Compara com o hash da última sincronização (`lastHashMap`)
3. **Se o hash for igual, pula a atualização** (linha 486-489)
4. Só depois verifica os campos alterados individualmente

Como `remuneracao_mensal` não faz parte do hash, quando **apenas o salário muda** (e nome, cargo, equipe, email, etc. permanecem iguais), o hash é idêntico ao anterior e o registro é **ignorado silenciosamente**.

### Sobre o Cargo

O `cargo_id` **está** no hash, então mudanças de cargo deveriam ser detectadas. Porém, se o cargo Feedz não tiver um mapeamento de alias configurado (`feedz_alias_mappings`) **e** não existir um `job_title` com label idêntico, o `cargoId` resolvido será `null` — o mesmo valor de antes — e a mudança não será registrada.

### Como o sistema de contratos consome os dados

O sistema de contratos já está correto: `useResolvedResources` → `resolveResourceForCalc` busca `person.remuneracaoMensal` diretamente do HR Master em tempo real. **Se o HR for atualizado, os contratos refletem automaticamente.** O problema é que o HR não está sendo atualizado pela sincronização.

---

## Plano de Correção

**Arquivo: `supabase/functions/feedz-sync/index.ts`**

### Correção 1 — Incluir `remuneracao_mensal` no hash de idempotência
Adicionar `'remuneracao_mensal'` ao array de chaves na função `computePayloadHash` (linha 53):

```typescript
const keys = ['nome', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 
              'data_admissao', 'data_desligamento', 'remuneracao_mensal']
```

Isso garante que qualquer mudança de salário gere um hash diferente e a atualização seja processada.

### Impacto
- 1 linha alterada no edge function
- Na próxima sincronização, registros com salário diferente serão corretamente detectados e atualizados
- Eventos de timeline ("Remuneração alterada via Feedz") serão criados normalmente (a lógica na linha 536-543 já existe)

### Sobre os cargos
Se cargos também não estão sendo atualizados, pode ser necessário verificar a tabela `feedz_alias_mappings` para confirmar que os cargos do Feedz estão mapeados corretamente. Posso fazer essa verificação se necessário.

