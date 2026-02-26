

# Rollback da Sincronização Feedz de 26/02/2026 11:53:59

## Contexto

A sincronização com run_id `6503610e-e7cb-4713-aa11-a92be88ec587` (iniciada às 14:53:59 UTC / 11:53:59 BRT) gerou:
- **48 registros criados** indevidamente em `hr_people`
- **90 registros atualizados** em `hr_people` (estes já existiam)
- **2 registros terminados** (mudança de situação para inativo)

## Plano de Rollback

### 1. Deletar os 48 registros criados indevidamente

Usar a ferramenta de deleção para executar em sequência:

```sql
-- Remover timeline events dos 48 registros criados
DELETE FROM hr_timeline WHERE person_id IN (
  SELECT id FROM hr_people WHERE id_externo IN ('2047512','2051079','2051080', ... [48 IDs])
);

-- Remover os 48 registros de hr_people
DELETE FROM hr_people WHERE id_externo IN ('2047512','2051079','2051080', ... [48 IDs]);
```

### 2. Atualizar o status do sync run

```sql
UPDATE feedz_sync_runs 
SET status = 'rolled_back', error_message = 'Rollback manual: 48 registros criados removidos'
WHERE id = '6503610e-e7cb-4713-aa11-a92be88ec587';
```

### Limitação

Os **90 updates** e **2 terminações** feitos em registros existentes **não podem ser revertidos automaticamente** pois não temos snapshot dos valores anteriores. Se precisar reverter algum desses, será necessário corrigir manualmente.

