

## Ajustes no módulo de Recursos Humanos

### 1. Migração de dados: Remuneração Mensal ← Remuneração II

Executar um UPDATE no banco para copiar o valor de `remuneracao_ii` para `remuneracao_mensal` em todos os registros de `hr_people` onde `remuneracao_ii` é não nulo e maior que zero.

```sql
UPDATE hr_people
SET remuneracao_mensal = remuneracao_ii
WHERE remuneracao_ii IS NOT NULL AND remuneracao_ii > 0;
```

### 2. Label "Remuneração II (VA/Ajuste)" → "Remuneração Total (mensal + Benefícios)"

No arquivo `src/pages/HRPersonDetailPage.tsx`, na aba Financeiro (linha 219), alterar a label do terceiro card de "Remuneração II (VA/Ajuste)" para **"Remuneração Total (mensal + Benefícios)"** e o valor exibido para `remuneracaoMensal + beneficios`.

### 3. Remover o quadro "Total Mensal (Rem. + Benef. + Rem.II)"

No mesmo arquivo, remover o bloco das linhas 224-228 (o Separator + card com o total de três valores).

### 4. Badge de situação com cores: azul (Ativo) e vermelho (Inativo)

Alterar o Badge de situação em dois locais:
- **HRPersonDetailPage.tsx** (linha 149): badge no resumo
- **HRPeoplePage.tsx** (linha na tabela de listagem)

Trocar de `variant="default"/"secondary"` para classes explícitas:
- Ativo: `className="bg-blue-500 text-white hover:bg-blue-600"`
- Inativo: `className="bg-red-500 text-white hover:bg-red-600"`

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/pages/HRPersonDetailPage.tsx` | Itens 2, 3, 4 |
| `src/pages/HRPeoplePage.tsx` | Item 4 |
| Migração SQL | Item 1 |

### Observação

O item 5 da sua lista parece ter sido cortado. Quando puder completar, incorporo na implementação.

