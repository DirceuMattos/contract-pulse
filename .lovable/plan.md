

## Recalibrar a análise de TR/Edital — Corrigir contexto e valores

### Problemas identificados

1. **Bug critico no contexto**: A query que busca contratos de referência NAO seleciona o campo `id`, então o join com recursos SEMPRE falha. A IA nunca recebe os salários reais da empresa — recebe apenas "sem recursos cadastrados" para todos os contratos.

2. **Sem tabela de referência salarial**: A empresa tem dados reais ricos (Tech Lead PJ avg R$10.750, Product Owner PJ avg R$11.368, DevOps PJ avg R$9.200, Desenvolvedor FullStack PJ avg R$5.420, etc.) mas nada disso chega ao prompt.

3. **Campos ficam vazios**: Quando a IA retorna `null` para campos como `termMonths` ou `complexityLevel`, o handler no frontend ignora esses valores (usa `if (result.field)` que é falsy para 0 e null). Campos legítimos do documento podem estar sendo descartados.

### Solucao

**1. Corrigir a query de contexto** (`simulation-parse-document`)
- Adicionar `id` ao SELECT de contracts
- Adicionar uma **tabela agregada de salários por cargo** (média, min, max, tipo) calculada a partir de TODOS os recursos do banco — isso dá à IA uma referência salarial completa independente de quais contratos são carregados

**2. Incluir tabela salarial real no prompt**
- Antes de chamar a IA, fazer uma query agregada: `SELECT cargo, tipo, AVG(custo_base), MIN, MAX, COUNT FROM resources GROUP BY cargo, tipo`
- Incluir como seção "TABELA SALARIAL DA EMPRESA" no prompt, instruindo a IA a usar esses valores como base

**3. Ajustar o prompt para ser menos restritivo em salários**
- Manter a regra anti-alucinação para NOMES e PERFIS (só extrair o que está no documento)
- Mas para VALORES SALARIAIS: instruir a IA a SEMPRE usar a tabela salarial da empresa como primeira referência, nunca subestimar

**4. Corrigir o handler no frontend** (`CalculatorWizardPage.tsx`)
- Trocar `if (result.field)` por checagens que não ignorem valores como `0` ou strings vazias
- Garantir que `termMonths: 12` não seja ignorado

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/simulation-parse-document/index.ts` | Fix query (add `id`), add salary table query, update prompt |
| `src/pages/CalculatorWizardPage.tsx` | Fix handler null checks |

