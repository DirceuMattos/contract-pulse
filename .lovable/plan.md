

## Atualizar Remuneração Mensal com valores da Remuneração II

### Situação Atual
- 134 registros em `hr_people`
- 127 possuem `remuneracao_ii > 0`
- 94 têm `remuneracao_mensal` diferente de `remuneracao_ii`

### Plano

**Executar um único UPDATE no banco de dados:**

```sql
UPDATE hr_people
SET remuneracao_mensal = remuneracao_ii,
    updated_at = now()
WHERE remuneracao_ii > 0;
```

Isso copiará o valor de `remuneracao_ii` para `remuneracao_mensal` em todos os 127 registros que possuem valor positivo. Os 7 registros com `remuneracao_ii = 0` permanecerão inalterados (mantendo seus valores atuais em `remuneracao_mensal`).

### Detalhes Técnicos
- Operação direta no banco via ferramenta de dados (INSERT tool)
- Nenhuma alteração de código necessária
- O campo `updated_at` será atualizado para refletir a modificação

