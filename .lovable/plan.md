

# Correções na Sincronização Feedz + Limpeza do Banco

## 1. Limpeza dos registros Feedz (dados)

Usar a ferramenta de inserção/deleção para executar:

```sql
-- Deletar timeline events de pessoas vindas do Feedz
DELETE FROM hr_timeline WHERE person_id IN (SELECT id FROM hr_people WHERE id_externo IS NOT NULL);

-- Deletar pessoas com id_externo (vindas do Feedz)
DELETE FROM hr_people WHERE id_externo IS NOT NULL;
```

## 2. Corrigir a Edge Function `feedz-sync/index.ts`

Melhorar o matching para encontrar pessoas existentes por **nome normalizado** além de `id_externo` e `email`:

**Matching atual** (insuficiente):
- `id_externo` → `email`
- Se não encontra, cria novo (duplica)

**Matching corrigido**:
- `id_externo` → `email` → **nome normalizado** (lowercase, trim)
- Se encontra por qualquer critério, **atualiza** e seta o `id_externo`
- Só cria se não encontrar por nenhum critério

Alterações no arquivo `supabase/functions/feedz-sync/index.ts`:

1. Adicionar um `nameMap` com nomes normalizados de todas as pessoas existentes
2. No loop de matching (linha ~162), adicionar fallback por nome:
   ```
   existing = peopleMap.get(externalId)
     || emailMap.get(email)
     || nameMap.get(nomeNormalizado)
   ```
3. Quando encontrar por email ou nome (sem id_externo), incluir `id_externo: externalId` no payload de update para vincular o registro existente ao Feedz
4. Manter toda a lógica de update/timeline existente

## Detalhes técnicos

- A normalização do nome será `nome.toLowerCase().trim()` tanto para os registros existentes quanto para o `full_name`/`name` vindo do Feedz
- O `id_externo` será sempre gravado no update para que nas próximas sincronizações o matching seja direto
- Nenhuma alteração de schema necessária

