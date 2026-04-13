

## Aprimorar detalhamento da análise de TR/Edital e dos cenários

### Resumo

Duas frentes de melhoria: (1) tornar o prompt de extração do documento muito mais detalhista e abrangente, e (2) enriquecer os cenários com análise qualitativa da IA e mais variáveis.

### 1. Edge Function `simulation-parse-document` — Prompt mais detalhista

**Problema atual**: O prompt é genérico ("extraia as informações"). A IA retorna o mínimo.

**Solução**: Reescrever o system prompt com instruções explícitas para que a IA:
- Identifique TODOS os perfis profissionais mencionados no documento, incluindo cargos específicos (Analista de Dados, DBA, Scrum Master, etc.) — não apenas os genéricos
- Detecte requisitos de certificações, experiência mínima, formação — e inclua isso na descrição dos perfis
- Identifique custos implícitos: licenças de software, treinamentos, transição de conhecimento, garantia, penalidades contratuais
- Detecte múltiplos tipos de demanda quando o TR cobre sustentação + evolução simultaneamente (campo `demandType` passará a aceitar array)
- Extraia SLAs específicos (tempo de resposta, disponibilidade, janelas de manutenção)
- Identifique riscos contratuais (multas, glosas, indicadores de desempenho)
- Estime volume de usuários e integrações com base em referências no texto
- Adicionar campo `aiNotes` ao retorno — texto livre com observações importantes que não cabem nos campos estruturados (ex: "O edital exige seguro garantia de 5%", "Há exigência de escritório local")

**Mudança no schema da tool**: Adicionar campo `aiNotes` (string) para observações livres da IA sobre o documento.

**Modelo**: Trocar de `gemini-2.5-flash` para `gemini-2.5-pro` para melhor qualidade de extração em documentos complexos.

### 2. Edge Function `simulation-insights` — Análise mais profunda dos cenários

**Problema atual**: A análise recebe apenas dados resumidos (custo, margem, prazo). Não recebe os cenários nem os perfis de RH.

**Solução**: Enviar dados completos para a IA:
- Lista de perfis de RH (cargo, quantidade, custo unitário, tipo de contratação)
- Lista de custos adicionais
- Os 3 cenários calculados (Conservador, Base, Otimista) com receita, custo, margem
- Overhead detalhado

Reescrever o prompt para incluir seções adicionais:
- **Análise de Cenários** — Comentar cada cenário individualmente, indicando probabilidade e condições
- **Composição de Equipe** — Avaliar se o mix de perfis está adequado ao escopo
- **Análise de Riscos Contratuais** — SLA, penalidades, dependências
- **Benchmark** — Comparar margem com referências de mercado
- **Plano de Contingência** — O que fazer se o cenário conservador se materializar

### 3. `Step5Results.tsx` — Exibir notas da IA do documento

Adicionar um card informativo no topo dos resultados mostrando `aiNotes` (se preenchido pela análise do documento), para que o usuário veja observações importantes extraídas do TR antes de avaliar os números.

### 4. `CalculatorWizardPage.tsx` — Propagar `aiNotes`

Capturar o campo `aiNotes` retornado pela edge function e armazená-lo no estado da simulação para exibição no Step 5.

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `supabase/functions/simulation-parse-document/index.ts` | Prompt detalhado, schema com `aiNotes`, modelo `gemini-2.5-pro` |
| `supabase/functions/simulation-insights/index.ts` | Prompt expandido com cenários, equipe, riscos; receber dados completos |
| `src/components/calculator/Step5Results.tsx` | Passar HR/custos/cenários para insights; exibir `aiNotes` |
| `src/pages/CalculatorWizardPage.tsx` | Propagar `aiNotes` do resultado da análise |
| `src/types/index.ts` | Adicionar `aiNotes?: string` em `ContractSimulation` |

