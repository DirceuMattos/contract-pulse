

## Análise automática de TR/Edital por IA no Simulador de Contratos

### Resumo

Adicionar um botão "Analisar TR/Edital com IA" no Step 1 do wizard de simulação. O usuário faz upload de um documento (PDF, DOCX), a IA extrai e analisa o conteúdo, e preenche automaticamente os campos dos 4 estágios: identificação, questionário, recursos sugeridos e valores.

### Fluxo do usuário

1. No Step 1 (Identificação), um novo botão/área de upload "📄 Importar TR/Edital" aparece no topo
2. O usuário seleciona um arquivo PDF ou DOCX
3. O sistema exibe um loading "Analisando documento..."
4. A IA processa o documento e preenche todos os campos automaticamente
5. O usuário revisa e ajusta o que for necessário nos 4 passos

### Alterações

**1. Nova Edge Function `simulation-parse-document`**
- Recebe o arquivo via upload (base64 ou multipart)
- Extrai texto do documento (reutilizando lógica do `doc-extract`)
- Envia o texto para a Lovable AI (Gemini) com um prompt estruturado pedindo extração de:
  - Nome, cliente, tipo (gov/privado), esfera, prazo, descrição
  - Complexidade, tipo de demanda, criticidade, integrações, módulos, volume de usuários, SLA, ritmo de entrega
  - Perfis profissionais sugeridos (cargo, tipo CLT/PJ, quantidade, salário estimado)
  - Custos adicionais identificados (viagem, infraestrutura, licenças)
- Retorna JSON estruturado via tool calling (structured output)

**2. `src/components/calculator/Step1Identification.tsx`**
- Adicionar botão "Importar TR/Edital" com ícone `FileUp`
- Input file aceita `.pdf, .docx`
- Ao selecionar, chama a edge function e aplica `onChange()` com todos os campos preenchidos
- Estado de loading durante o processamento

**3. `src/pages/CalculatorWizardPage.tsx`**
- Adicionar handler `handleDocumentAnalysis` que recebe o resultado da IA e distribui os valores para todos os campos da simulação (identification, questionnaire, HR, costs)
- Regenerar sugestões de recursos com base no questionário preenchido pela IA

### Dados extraídos pela IA

| Campo | Origem no documento |
|---|---|
| `name` | Objeto / título do edital |
| `clientName` | Órgão contratante |
| `contractType` | gov/private baseado no contexto |
| `govSphere` | municipal/estadual/federal |
| `termMonths` | Prazo de vigência |
| `description` | Resumo do escopo |
| `complexityLevel` | Inferido da análise |
| `questionnaire.*` | Todos os 8 campos inferidos |
| `customHR[]` | Perfis e quantitativos identificados |
| `customOtherCosts[]` | Custos extras mencionados |

### Detalhes técnicos

- A Edge Function usa structured output (tool calling) para garantir JSON válido com os tipos corretos (`DemandType`, `CriticalityLevel`, etc.)
- O prompt inclui as opções válidas para cada campo enum, evitando valores inválidos
- Limite de tamanho do documento: ~100KB de texto extraído (trunca se necessário)
- Modelo: `google/gemini-2.5-flash` (bom equilíbrio custo/qualidade para documentos longos)
- Autenticação via JWT no edge function

