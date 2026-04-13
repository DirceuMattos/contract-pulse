

## Corrigir alucinações na análise de TR/Edital — Parametrizar IA para focar no documento

### Problema

A IA está inventando informações que não estão no documento (alucinando). Isso acontece porque:
1. O prompt pede que ela "INFIRA" perfis e custos quando não encontra no texto — isso abre espaço para invenção
2. Não há contexto real dos contratos já existentes na plataforma para servir de referência
3. Não há instrução explícita para distinguir entre "extraído do documento" e "inferido"

### Solução

Duas mudanças fundamentais:

**1. Reescrever o prompt para eliminar inferências livres**

- Remover instruções como "Se NÃO menciona perfis explicitamente, INFIRA..."
- Adicionar regra explícita: "EXTRAIA APENAS informações presentes no texto. Se um dado não está no documento, retorne null ou array vazio. NUNCA invente valores."
- Para salários, manter estimativas de mercado MAS marcando claramente que são estimativas (não dados do documento)
- Separar no `aiNotes` o que foi extraído vs o que é sugestão

**2. Enviar contratos existentes da plataforma como contexto**

- Na edge function, antes de chamar a IA, buscar contratos existentes no banco (nome, tipo, segmento, valor mensal, quantidade de recursos, perfis alocados) como referência de mercado real
- Incluir esses dados no prompt como "Contratos de referência da empresa" para que a IA calibre estimativas de salários e custos com base no histórico real
- Limitar a 20 contratos mais recentes para não estourar contexto

**3. Adicionar marcadores de confiança**

- No schema da tool, adicionar campo `confidence` (object) indicando quais campos foram extraídos do documento vs estimados
- Isso permite que o frontend sinalize visualmente ao usuário quais valores vieram do TR e quais são sugestões

### Alterações técnicas

| Arquivo | Mudança |
|---|---|
| `supabase/functions/simulation-parse-document/index.ts` | Reescrever prompt anti-alucinação; buscar contratos existentes como contexto; adicionar campo `confidence` |
| `src/components/calculator/Step1Identification.tsx` | (Sem mudança — já funciona) |
| `src/pages/CalculatorWizardPage.tsx` | Propagar campo `confidence` se necessário |

### Detalhes do novo prompt (trecho-chave)

```
REGRAS FUNDAMENTAIS:
1. EXTRAIA APENAS dados que estão EXPLICITAMENTE no documento
2. Se uma informação NÃO consta no texto, retorne null ou array vazio
3. NUNCA invente nomes de órgãos, valores, prazos ou perfis
4. Para salários: use como referência os contratos existentes da empresa (fornecidos abaixo). Se não houver referência, use mercado 2024/2025 mas MARQUE como estimativa
5. Se o documento é vago sobre quantidade de profissionais, retorne a quantidade MÍNIMA mencionada, não uma estimativa inflada

CONTRATOS DE REFERÊNCIA (dados reais da empresa):
[lista de contratos com perfis e valores]
```

