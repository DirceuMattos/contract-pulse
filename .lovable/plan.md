

## Plano: Importar Eventos de Linha do Tempo (Timeline) para hr_timeline

### Análise da Planilha

A planilha contém até 17 pares de colunas de timeline por pessoa (colunas AP em diante):
- `RAW_Data Ocorrência` / `RAW_Valor` (pares 0-16)
- Valores podem ser numéricos (ex: `3000`, `6000`) ou textuais (ex: `VA +R$1.000,00`, `Nível Pleno`, `Alteração de função...`)

### Mapeamento para `hr_timeline`

| Campo destino | Origem |
|---|---|
| `person_id` | Lookup por `nome` em `hr_people` |
| `event_date` | `RAW_Data Ocorrência.N` |
| `ocorrencia` | `'reajuste'` se valor numérico, `'observacao'` se texto |
| `descricao` | Texto descritivo: "Remuneração: R$ X" ou o texto literal |
| `valor` | Valor numérico (se aplicável) |
| `remuneracao_apos` | Mesmo valor numérico (se aplicável) |
| `atualizar_remuneracao` | `false` (não alterar cadastro atual) |

### Etapas de Implementação

1. **Limpar timeline existente** - DELETE de todos os registros em `hr_timeline` para evitar duplicatas
2. **Inserir eventos em lotes** - SQL INSERTs em batches de ~20 pessoas, usando subquery `(SELECT id FROM hr_people WHERE nome = '...')` para resolver `person_id`
3. **Verificar resultado** - Query de contagem para confirmar total de eventos importados

### Estimativa

~134 pessoas com 0-17 eventos cada. Estimativa de ~400-600 eventos no total. Serão necessários ~7 batches de INSERT via ferramenta de dados.

